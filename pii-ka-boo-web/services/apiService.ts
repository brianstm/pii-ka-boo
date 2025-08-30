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
      response = {
        message: `image! ${
          request.piiEnabled
            ? "(PII scrubbing enabled)"
            : "(PII scrubbing disabled)"
        }`,
        type: "text",
      };
    } else {
      // Audio and text both share the same API call
      const exclude = (request.piiExclusions || []).join(",");
      const qs = exclude ? `?exclude=${encodeURIComponent(exclude)}` : "";

      // Make the API request for audio or text
      const res = await fetch(`/api/text${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: request.message,
          piiEnabled: request.piiEnabled,
          customPatterns: request.customPatterns || [],
        }),
      });

      if (!res.ok) {
        throw new Error(`API request failed: ${res.statusText}`);
      }

      const data = await res.json();

      // Handle audio or text response message
      response = {
        message: data.response, // For text, the response comes from the API
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
