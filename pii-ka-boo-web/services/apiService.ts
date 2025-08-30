import axios, { AxiosInstance } from "axios";
import { PatternComponent } from "./patternService";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type: "text" | "image" | "audio";
  imageUrl?: string;
  audioUrl?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SendMessageRequest {
  message: string;
  image?: File;
  audio?: File;
  piiEnabled: boolean;
  piiExclusions?: string[];
  customPatterns?: PatternComponent[];
}

export interface SendMessageResponse {
  message: string;
  type: "text" | "image" | "audio";
  audioUrl?: string;
  imageUrl?: string;
}

export interface GeminiResponse {
  message: string;
}

class ApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api",
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        console.log("API Request:", config.method?.toUpperCase(), config.url);
        return config;
      },
      (error) => {
        console.error("Request Error:", error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log("API Response:", response.status, response.config.url);
        return response;
      },
      (error) => {
        console.error("Response Error:", error.response?.status, error.message);
        return Promise.reject(error);
      }
    );
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    let response: SendMessageResponse;

    if (request.image) {
      const pattern = /get\/([^?]+)/;
      const match = request.image.name.match(pattern);
      let imageName = "";
      if (match && match[1]) {
        imageName = match[1];
        console.log("Image Name:", imageName);
      } else {
        console.log("No image name found in the URL.");
      }

      const requestBody = {
        input: "./uploads/image/" + imageName,
        output: "./IMAGE_BLUR_OUTPUT/",
        config: "./app/api/images/image_detection/config.json",
      };

      const res = await fetch(`/api/images/image_detection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        throw new Error(`API request failed: ${res.statusText}`);
      }

      response = {
        message: imageName,
        imageUrl: `/api/serve-image?filename=${imageName}`,
        type: "image",
      };
    } else {
      let processedMessage = request.message;

      // Apply custom patterns first if any
      if (request.customPatterns && request.customPatterns.length > 0) {
        console.log("Applying custom patterns via pattern API...");

        // Group patterns by preset (assuming patterns from same preset are consecutive)
        // For now, we'll apply all patterns sequentially
        for (let i = 0; i < request.customPatterns.length; i++) {
          const pattern = request.customPatterns[i];
          console.log(
            `Applying pattern ${i + 1}/${request.customPatterns.length}:`,
            pattern
          );

          try {
            const patternRequest = {
              text: processedMessage, // Use the processed message from previous iteration
              pattern_sequence: [pattern], // Apply one pattern at a time
              replace_by: "[BLURRED]",
            };

            const patternResponse = await fetch(`/api/pattern`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(patternRequest),
            });

            if (patternResponse.ok) {
              const patternResult = await patternResponse.json();
              processedMessage = patternResult.processed;
              console.log(
                `Pattern ${i + 1} applied successfully. New text:`,
                processedMessage
              );
            } else {
              console.error(
                `Pattern ${i + 1} API error:`,
                await patternResponse.text()
              );
            }
          } catch (error) {
            console.error(`Error applying pattern ${i + 1}:`, error);
          }
        }
      }

      // Now send the processed message to the text API for regular PII detection
      const exclude = (request.piiExclusions || []).join(",");
      const requestBody = {
        message: processedMessage,
        labels: exclude.split(","),
        customPatterns: [], // No custom patterns needed since we already processed them
      };

      console.log("Sending processed message to text API:", processedMessage);

      const res = await fetch(`/api/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        throw new Error(`API request failed: ${res.statusText}`);
      }

      const data = await res.json();

      response = {
        message: data.response,
        type: "text",
      };
    }

    return response;
  }

  async callGemini(message: string): Promise<GeminiResponse> {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      throw new Error(`Gemini API request failed: ${res.statusText}`);
    }
    const data = await res.json();
    return { message: data.response };
  }

  async transcribeAudio(audioFile: File): Promise<string> {
    console.log("Transcribing audio file:", audioFile.name);
    const audioName = audioFile.name;

    const res = await fetch(`/api/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: audioName,
      }),
    });

    if (!res.ok) {
      throw new Error(`API request failed: ${res.statusText}`);
    }

    const data = await res.json();

    const response = data.response;
    console.log("Transcription result:", response);
    return response;
  }

  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

export const apiService = new ApiService();
