import axios, { AxiosInstance } from "axios";

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
}

export interface SendMessageResponse {
  message: string;
  type: "text" | "image" | "audio";
  audioUrl?: string;
  imageUrl?: string;
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
    console.log("here");
    console.log("Sending message:", request);

    let response: SendMessageResponse;

    if (request.image) {
      response = {
        message: `image! ${
          request.piiEnabled
            ? "(PII scrubbing enabled)"
            : "(PII scrubbing disabled)"
        }`,
        type: "text",
      };
    } else if (request.audio) {
      response = {
        message: `audio! ${
          request.piiEnabled
            ? "(PII scrubbing enabled)"
            : "(PII scrubbing disabled)"
        }`,
        type: "text",
      };
    } else {
      // 🔥 call your Next.js API
      const res = await fetch("/api/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: request.message }),
      });

      if (!res.ok) {
        throw new Error(`API request failed: ${res.statusText}`);
      }

      const data = await res.json();

      response = {
        message: data.response, // comes from Python JSON { "response": ... }
        type: "text",
      };
    }

    console.log("API Response:", response);
    return response;
  }

  async transcribeAudio(audioFile: File): Promise<string> {
    console.log("Transcribing audio file:", audioFile.name);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const mockTranscription = "audio transcription!";
    console.log("Mock transcription result:", mockTranscription);
    return mockTranscription;
  }

  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

export const apiService = new ApiService();
