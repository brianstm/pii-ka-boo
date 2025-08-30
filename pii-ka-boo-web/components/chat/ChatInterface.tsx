"use client";

import { useState, useEffect, useRef } from "react";
import { ChatMessage as ChatMessageType, AppSettings } from "@/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { apiService } from "@/services/apiService";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Moon, Sun, Settings, FolderOpen } from "lucide-react";
import { replacePlaceholdersFromOriginal } from "@/services/piiReplacementService";
import { fileStorageService } from "@/services/fileStorageService";
import { StorageSettings } from "./StorageSettings";
import PiiFilters from "./PiiFilters";
import { PatternComponent } from "@/services/patternService";

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [settings, setSettings] = useLocalStorage<AppSettings>("appSettings", {
    piiEnabled: true,
    darkMode: false,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showStorageSettings, setShowStorageSettings] = useState(false);
  const [piiFiltersOpen, setPiiFiltersOpen] = useState(false);
  const [piiExclusions, setPiiExclusions] = useLocalStorage<string[]>(
    "piiExclusions",
    []
  );
  const [customPatterns, setCustomPatterns] = useLocalStorage<
    PatternComponent[]
  >("customPatterns", []);

  const [isLoading, setIsLoading] = useState(false);
  const [chatLocked, setChatLocked] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.darkMode]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      } else if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector(
          "[data-radix-scroll-area-viewport]"
        ) as HTMLElement | null;
        if (viewport) viewport.scrollTop = viewport.scrollHeight;
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [messages, isLoading]);

  const handleDarkModeToggle = (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, darkMode: enabled }));
  };

  const handleSendMessage = async (
    message: string,
    image?: File,
    audio?: File,
    imageUrlFromInput?: string,
    audioUrlFromInput?: string,
    imageFilenameFromInput?: string,
    audioFilenameFromInput?: string
  ) => {
    if (!message.trim() && !image && !audio) return;

    let finalMessage = message;
    if (audio && !message.trim()) {
      try {
        finalMessage = await apiService.transcribeAudio(audio);
      } catch (error) {
        console.error("Transcription failed:", error);
        finalMessage = "Failed to transcribe audio";
      }
    }

    let imageUrl: string | undefined = imageUrlFromInput;
    let audioUrl: string | undefined = audioUrlFromInput;

    if (!imageUrl && image) {
      try {
        const storedFile = await fileStorageService.saveFile(image, "image");
        imageUrl =
          fileStorageService.getFileUrl(storedFile.filename) +
          `?type=image&storageDir=${fileStorageService.getStorageDirectory()}`;
      } catch (error) {
        console.error("Error saving image:", error);
        imageUrl = URL.createObjectURL(image);
      }
    }

    if (!audioUrl && audio) {
      try {
        const storedFile = await fileStorageService.saveFile(audio, "audio");
        audioUrl =
          fileStorageService.getFileUrl(storedFile.filename) +
          `?type=audio&storageDir=${fileStorageService.getStorageDirectory()}`;
      } catch (error) {
        console.error("Error saving audio:", error);
        audioUrl = URL.createObjectURL(audio);
      }
    }

    const userMessage: ChatMessageType = {
      id: uuidv4(),
      role: "user",
      content: finalMessage,
      timestamp: new Date(),
      type: image ? "image" : audio ? "audio" : "text",
      imageUrl,
      audioUrl,
      imageFilename: imageFilenameFromInput,
      audioFilename: audioFilenameFromInput,
    };

    setMessages((prev) => [...prev, userMessage]);

    setIsLoading(true);
    setChatLocked(true);

    try {
      const response = await apiService.sendMessage({
        message: finalMessage,
        image,
        audio,
        piiEnabled: settings.piiEnabled,
        piiExclusions,
        customPatterns,
      });

      const assistantMessage: ChatMessageType = {
        id: uuidv4(),
        role: "assistant",
        content: response.message,
        timestamp: new Date(),
        type: response.type,
        imageUrl: response.imageUrl,
        audioUrl: response.audioUrl,
        provider: "robot",
      };
      setMessages((prev) => [...prev, assistantMessage]);

      const gemini = await apiService.callGemini(response.message);
      const geminiMessage: ChatMessageType = {
        id: uuidv4(),
        role: "assistant",
        content: gemini.message,
        timestamp: new Date(),
        type: "text",
        provider: "gemini",
      };
      setMessages((prev) => [...prev, geminiMessage]);

      const restored = replacePlaceholdersFromOriginal(
        finalMessage,
        gemini.message
      );
      const restoredMessage: ChatMessageType = {
        id: uuidv4(),
        role: "assistant",
        content: restored,
        timestamp: new Date(),
        type: "text",
        provider: "robot",
      };
      setMessages((prev) => [...prev, restoredMessage]);
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

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col relative">
        <div className="border-b p-4 flex items-center justify-between transition-all duration-300">
          <div className="flex justify-between gap-3 w-full">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => window.location.reload()}
            >
              <div className="relative w-8 h-8">
                <Image
                  src={
                    settings.darkMode ? "/logo_white.png" : "/logo_brown.png"
                  }
                  alt="PII-KA-BOO Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <h1 className="text-md font-bold text-primary dark:text-white">
                PII-KA-BOO
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Dialog open={piiFiltersOpen} onOpenChange={setPiiFiltersOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    PII Filters
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>PII Filters</DialogTitle>
                    <DialogDescription>
                      Uncheck any PII categories to exclude from scrubbing.
                    </DialogDescription>
                  </DialogHeader>
                  <PiiFilters
                    exclusions={piiExclusions}
                    onChange={setPiiExclusions}
                    customPatterns={customPatterns}
                    onCustomPatternsChange={setCustomPatterns}
                  />
                </DialogContent>
              </Dialog>

              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-fit justify-start"
                    size="sm"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>
                      Configure your PII-KA-BOO preferences
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          {settings.darkMode ? (
                            <Moon className="w-4 h-4" />
                          ) : (
                            <Sun className="w-4 h-4" />
                          )}
                          <span className="font-medium">Dark Mode</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Toggle between light and dark themes
                        </p>
                      </div>
                      <Switch
                        checked={settings.darkMode}
                        onCheckedChange={handleDarkModeToggle}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4" />
                          <span className="font-medium">File Storage</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Configure local file storage settings
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowStorageSettings(true)}
                      >
                        Configure
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog
                open={showStorageSettings}
                onOpenChange={setShowStorageSettings}
              >
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Storage Settings</DialogTitle>
                    <DialogDescription>
                      Configure local file storage preferences
                    </DialogDescription>
                  </DialogHeader>
                  <StorageSettings
                    onClose={() => setShowStorageSettings(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <>
            <ScrollArea
              className="flex-1 transition-all duration-300 mb-10 mt-6"
              ref={scrollAreaRef}
            >
              <div
                className={`max-w-4xl mx-auto px-4 ${
                  messages.length === 0 ? "mt-64" : "mt-0"
                }`}
              >
                {messages.length === 0 && (
                  <div className="text-center space-y-2 max-w-md mx-auto pb-3 opacity-80">
                    <h3 className="text-3xl font-semibold">
                      Let the suffering end...
                    </h3>
                  </div>
                )}

                {!chatLocked && (
                  <div className="w-full max-w-3xl mx-auto">
                    <ChatInput
                      onSendMessage={handleSendMessage}
                      isLoading={isLoading}
                      hasMessages={messages.length > 0}
                    />
                  </div>
                )}

                {messages.map((message, index) => {
                  const isPiiProcessingMessage =
                    message.provider === "robot" &&
                    index > 0 &&
                    messages[index - 1]?.provider === "gemini" &&
                    messages[index - 2]?.provider === "robot";

                  const shouldHide =
                    (message.provider === "robot" &&
                      index < messages.length - 1 &&
                      messages[index + 1]?.provider === "gemini" &&
                      messages[index + 2]?.provider === "robot") ||
                    (message.provider === "gemini" &&
                      index > 0 &&
                      index < messages.length - 1 &&
                      messages[index - 1]?.provider === "robot" &&
                      messages[index + 1]?.provider === "robot");

                  let piiInput: string | undefined;
                  let geminiOutput: string | undefined;

                  if (isPiiProcessingMessage && index >= 2) {
                    piiInput = messages[index - 2]?.content;
                    geminiOutput = messages[index - 1]?.content;
                  }

                  if (shouldHide) {
                    return null;
                  }

                  return (
                    <div
                      key={message.id}
                      className="animate-in slide-in-from-bottom-4 duration-500"
                    >
                      <ChatMessage
                        message={message}
                        isPiiProcessingMessage={isPiiProcessingMessage}
                        piiInput={piiInput}
                        geminiOutput={geminiOutput}
                      />
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex gap-3 p-4 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                    <Card className="p-3 bg-muted animate-pulse">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">
                          PII-KA-BOO is thinking...
                        </span>
                      </div>
                    </Card>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </>
        </div>

        {messages.length > 0 && (
          <Button
            onClick={() => window.location.reload()}
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
