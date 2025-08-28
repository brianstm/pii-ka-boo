export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'audio';
  imageUrl?: string;
  audioUrl?: string;
  provider?: 'robot' | 'gemini';
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettings {
  piiEnabled: boolean;
  darkMode: boolean;
}

export interface FileUpload {
  file: File;
  preview?: string;
  type: 'image' | 'audio';
}
