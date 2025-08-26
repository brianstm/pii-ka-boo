"use client";

import { useState, useEffect, useRef } from "react";
import {
  ChatSession,
  ChatMessage as ChatMessageType,
  AppSettings,
} from "@/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { apiService } from "@/services/apiService";
import { ChatSidebar } from "./ChatSidebar";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Shield, Plus } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export function ChatInterface() {
  const [sessions, setSessions] = useLocalStorage<ChatSession[]>(
    "chatSessions",
    []
  );
  const [settings, setSettings] = useLocalStorage<AppSettings>("appSettings", {
    piiEnabled: true,
    darkMode: false,
  });

  const [currentSessionId, setCurrentSessionId] = useState<
    string | undefined
  >();
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [imageCounter, setImageCounter] = useLocalStorage("imageCounter", 1);
  const [audioCounter, setAudioCounter] = useLocalStorage("audioCounter", 1);

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  const generateTitle = (
    message: string,
    image?: File,
    audio?: File
  ): string => {
    if (image && !message.trim() && !audio) {
      return `Image ${imageCounter}`;
    }
    if (audio && !message.trim() && !image) {
      return `Audio Recording ${audioCounter}`;
    }
    if (message.trim()) {
      return message.length > 30 ? message.slice(0, 30) + "..." : message;
    }
    return "New Chat";
  };

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.darkMode]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [currentSession?.messages]);

  const createNewSession = (): ChatSession => {
    const newSession: ChatSession = {
      id: uuidv4(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return newSession;
  };

  useEffect(() => {
    if (sessions.length === 0 && !currentSessionId) {
      const newSession = createNewSession();
      setSessions([newSession]);
      setCurrentSessionId(newSession.id);
    } else if (sessions.length > 0 && !currentSessionId) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions, currentSessionId, setSessions]);

  const handleNewChat = () => {
    const newSession = createNewSession();
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      const remaining = sessions.filter((s) => s.id !== sessionId);
      setCurrentSessionId(remaining.length > 0 ? remaining[0].id : undefined);
    }
  };

  const handleSendMessage = async (
    message: string,
    image?: File,
    audio?: File
  ) => {
    if (!message.trim() && !image && !audio) return;

    let sessionId = currentSessionId;

    if (!sessionId) {
      const newSession = createNewSession();
      setSessions((prev) => [newSession, ...prev]);
      sessionId = newSession.id;
      setCurrentSessionId(sessionId);
    }

    let finalMessage = message;
    if (audio && !message.trim()) {
      try {
        finalMessage = await apiService.transcribeAudio(audio);
      } catch (error) {
        console.error("Transcription failed:", error);
        finalMessage = "Failed to transcribe audio";
      }
    }

    const title = generateTitle(finalMessage, image, audio);

    const userMessage: ChatMessageType = {
      id: uuidv4(),
      role: "user",
      content: finalMessage,
      timestamp: new Date(),
      type: image ? "image" : audio ? "audio" : "text",
      imageUrl: image ? URL.createObjectURL(image) : undefined,
      audioUrl: audio ? URL.createObjectURL(audio) : undefined,
    };

    setSessions((prev) =>
      prev.map((session) => {
        if (session.id === sessionId) {
          const shouldUpdateTitle = session.messages.length === 0;
          const newTitle = shouldUpdateTitle ? title : session.title;

          let updatedMessages: ChatMessageType[];
          if (shouldUpdateTitle) {
            const promptMessage: ChatMessageType = {
              id: uuidv4(),
              role: "user",
              content: finalMessage,
              timestamp: new Date(),
              type: image ? "image" : audio ? "audio" : "text",
              imageUrl: image ? URL.createObjectURL(image) : undefined,
              audioUrl: audio ? URL.createObjectURL(audio) : undefined,
            };
            updatedMessages = [...session.messages, promptMessage];
          } else {
            updatedMessages = [...session.messages, userMessage];
          }

          if (shouldUpdateTitle) {
            if (image && !finalMessage.trim() && !audio) {
              setImageCounter((prev) => prev + 1);
            }
            if (audio && !finalMessage.trim() && !image) {
              setAudioCounter((prev) => prev + 1);
            }
          }

          return {
            ...session,
            messages: updatedMessages,
            title: newTitle,
            updatedAt: new Date(),
          };
        }
        return session;
      })
    );

    setIsLoading(true);

    try {
      const response = await apiService.sendMessage({
        message: finalMessage,
        image,
        audio,
        piiEnabled: settings.piiEnabled,
      });

      const assistantMessage: ChatMessageType = {
        id: uuidv4(),
        role: "assistant",
        content: response.message,
        timestamp: new Date(),
        type: response.type,
        imageUrl: response.imageUrl,
        audioUrl: response.audioUrl,
      };

      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                messages: [...session.messages, assistantMessage],
                updatedAt: new Date(),
              }
            : session
        )
      );
    } catch (error) {
      console.error("Failed to send message:", error);

      const errorMessage: ChatMessageType = {
        id: uuidv4(),
        role: "assistant",
        content:
          "Sorry, I encountered an error while processing your message. Please try again.",
        timestamp: new Date(),
        type: "text",
      };

      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                messages: [...session.messages, errorMessage],
                updatedAt: new Date(),
              }
            : session
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePiiToggle = (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, piiEnabled: enabled }));
  };

  const handleDarkModeToggle = (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, darkMode: enabled }));
  };

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        piiEnabled={settings.piiEnabled}
        onPiiToggle={handlePiiToggle}
        darkMode={settings.darkMode}
        onDarkModeToggle={handleDarkModeToggle}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col relative">
        <div className="border-b p-4 flex items-center justify-between transition-all duration-300">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors duration-200">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">PII Scrubbing</span>
              <Switch
                checked={settings.piiEnabled}
                onCheckedChange={handlePiiToggle}
                className="transition-all duration-200"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {currentSession?.messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-4">
              <div className="text-center space-y-6 max-w-md animate-in fade-in-50 duration-500">
                <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-500">
                  <h3 className="text-3xl font-semibold">WHAT U WANT SIAL</h3>
                </div>
              </div>

              <div className="w-full max-w-3xl">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  piiEnabled={settings.piiEnabled}
                  hasMessages={false}
                />
              </div>
            </div>
          ) : (
            <>
              <ScrollArea
                className="flex-1 transition-all duration-300"
                ref={scrollAreaRef}
              >
                <div className="max-w-4xl mx-auto px-4">
                  {currentSession?.messages.map((message, index) => (
                    <div
                      key={message.id}
                      className="animate-in slide-in-from-bottom-4 duration-500"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <ChatMessage message={message} />
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex gap-3 p-4 animate-in slide-in-from-bottom-2 duration-300">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                      <Card className="p-3 bg-muted animate-pulse">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">
                            ScrubbyAI is thinking...
                          </span>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        {currentSession && currentSession.messages.length > 0 && (
          <Button
            onClick={handleNewChat}
            className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 animate-in slide-in-from-bottom-8 delay-300 group"
            size="lg"
          >
            <Plus className="w-6 h-6 transition-transform duration-200 group-hover:rotate-90" />
          </Button>
        )}
      </div>
    </div>
  );
}
