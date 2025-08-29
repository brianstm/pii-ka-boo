"use client";

import { ChatMessage as ChatMessageType } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { User, Bot, Sparkles, Play, Pause, Mic } from "lucide-react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  };

  const toggleAudioPlayback = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      try {
        await audioRef.current.play();
      } catch (error) {
        console.error("Error playing audio:", error);
        setIsPlaying(false);
      }
    }
  };

  const forceLoadMetadata = () => {
    if (audioRef.current && message.audioUrl && !isPlaying) {
      const tryGetDuration = (attempts = 0) => {
        if (
          audioRef.current &&
          audioRef.current.duration &&
          isFinite(audioRef.current.duration) &&
          audioRef.current.duration > 0
        ) {
          setAudioDuration(audioRef.current.duration);
        } else if (attempts < 15) {
          setTimeout(() => tryGetDuration(attempts + 1), 50);
        }
      };

      tryGetDuration();
    }
  };

  const handleAudioLoaded = () => {
    if (audioRef.current) {
      const duration = audioRef.current.duration;
      if (duration && isFinite(duration) && duration > 0) {
        setAudioDuration(duration);
      } else {
        const tryGetDuration = (attempts = 0) => {
          if (
            audioRef.current &&
            audioRef.current.duration &&
            isFinite(audioRef.current.duration) &&
            audioRef.current.duration > 0
          ) {
            setAudioDuration(audioRef.current.duration);
          } else if (attempts < 10) {
            setTimeout(() => tryGetDuration(attempts + 1), 50);
          }
        };
        tryGetDuration();
      }
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  useEffect(() => {
    if (message.audioUrl) {
      setIsPlaying(false);
      setCurrentTime(0);
      setAudioDuration(0);

      if (audioRef.current) {
        const tryGetDuration = (attempts = 0) => {
          if (
            audioRef.current &&
            audioRef.current.duration &&
            isFinite(audioRef.current.duration) &&
            audioRef.current.duration > 0
          ) {
            setAudioDuration(audioRef.current.duration);
          } else if (attempts < 20) {
            setTimeout(() => tryGetDuration(attempts + 1), 50);
          }
        };
        tryGetDuration();
      }
    }
  }, [message.audioUrl]);

  useEffect(() => {
    if (message.audioUrl && audioRef.current) {
      const tryGetDuration = (attempts = 0) => {
        if (
          audioRef.current &&
          audioRef.current.duration &&
          isFinite(audioRef.current.duration) &&
          audioRef.current.duration > 0
        ) {
          setAudioDuration(audioRef.current.duration);
        } else if (attempts < 25) {
          setTimeout(() => tryGetDuration(attempts + 1), 30);
        }
      };

      tryGetDuration();
      setTimeout(tryGetDuration, 100);
    }
  }, [message.audioUrl]);

  return (
    <div
      className={`flex gap-3 p-4 transition-all duration-300 group ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      <Avatar className="w-8 h-8 flex-shrink-0 transition-transform duration-200 hover:scale-110">
        <AvatarFallback
          className={`transition-colors duration-200 ${
            isUser ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          {isUser ? (
            <User className="w-4 h-4" />
          ) : message.provider === "gemini" ? (
            <Sparkles className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
        </AvatarFallback>
      </Avatar>

      <div
        className={`flex flex-col max-w-[80%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div className="relative min-w-96">
          <Card
            className={`p-3 transition-all duration-200 hover:shadow-md ${
              isUser
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            <div className="space-y-2">
              {(message.imageUrl || message.imageFilename) && (
                <div className="relative w-48 h-48 rounded-md overflow-hidden transition-transform duration-200 hover:scale-105">
                  <Image
                    src={
                      message.imageUrl ||
                      `/api/file-storage/get/${message.imageFilename}?type=image`
                    }
                    alt="Uploaded image"
                    fill
                    className="object-cover transition-transform duration-300"
                  />
                </div>
              )}

              {(message.audioUrl || message.audioFilename) && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                    <Mic className="w-6 h-6 text-muted-foreground" />
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-medium">Audio Message</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleAudioPlayback}
                        className="h-6 w-6 p-0 hover:bg-accent"
                      >
                        {isPlaying ? (
                          <Pause className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                      </Button>
                      <div className="flex-1 bg-muted rounded-full h-1">
                        <div
                          className="bg-primary h-1 rounded-full transition-all duration-100"
                          style={{
                            width:
                              audioDuration > 0 && isFinite(audioDuration)
                                ? `${(currentTime / audioDuration) * 100}%`
                                : "0%",
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground min-w-[40px]">
                        {audioDuration > 0 && isFinite(audioDuration)
                          ? `${Math.floor(currentTime)}s / ${Math.floor(
                              audioDuration
                            )}s`
                          : audioDuration > 0
                          ? `${Math.floor(currentTime)}s`
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* hehe */}
              {(message.audioUrl || message.audioFilename) && (
                <audio
                  ref={audioRef}
                  src={
                    message.audioUrl ||
                    `/api/file-storage/get/${message.audioFilename}?type=audio`
                  }
                  preload="metadata"
                  onLoadedMetadata={handleAudioLoaded}
                  onCanPlay={handleAudioLoaded}
                  onTimeUpdate={handleAudioTimeUpdate}
                  onEnded={handleAudioEnded}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onCanPlayThrough={() => {
                    forceLoadMetadata();
                  }}
                  className="hidden"
                />
              )}

              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: (props) => (
                      <h1 className="text-2xl font-bold mt-2 mb-3" {...props} />
                    ),
                    h2: (props) => (
                      <h2
                        className="text-xl font-semibold mt-2 mb-2"
                        {...props}
                      />
                    ),
                    h3: (props) => (
                      <h3
                        className="text-lg font-semibold mt-2 mb-2"
                        {...props}
                      />
                    ),
                    h4: (props) => (
                      <h4
                        className="text-base font-semibold mt-2 mb-1"
                        {...props}
                      />
                    ),
                    a: (props) => (
                      <a
                        className="underline decoration-dotted hover:decoration-solid"
                        target="_blank"
                        rel="noreferrer noopener"
                        {...props}
                      />
                    ),
                    ul: (props) => <ul className="list-disc pl-6" {...props} />,
                    ol: (props) => (
                      <ol className="list-decimal pl-6" {...props} />
                    ),
                    table: (props) => (
                      <table
                        className="table-auto border-collapse w-full text-left"
                        {...props}
                      />
                    ),
                    thead: (props) => (
                      <thead className="bg-muted/50" {...props} />
                    ),
                    th: (props) => (
                      <th className="border px-3 py-2" {...props} />
                    ),
                    td: (props) => (
                      <td className="border px-3 py-2 align-top" {...props} />
                    ),
                    code({
                      inline,
                      className,
                      children,
                      ...props
                    }: {
                      inline?: boolean;
                      className?: string;
                      children?: React.ReactNode;
                    }) {
                      const isInline = inline || !/\n/.test(String(children));
                      if (isInline) {
                        return (
                          <code
                            className="px-1.5 py-0.5 rounded bg-muted"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      }
                      return (
                        <pre className="p-3 rounded bg-muted overflow-x-auto">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
          </Card>

          {!isUser && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="absolute -bottom-5 -right-2 h-7 w-22 rounded-full opacity-0 bg-primary/20 hover:bg-primary/80 group-hover:opacity-100 transition-opacity z-10 text-black/70 hover:text-white dark:bg-white/40 dark:hover:bg-white/80 dark:text-black/70 dark:hover:text-black"
            >
              {copied ? (
                <>
                  <span className="text-xs">Copied</span>{" "}
                  <Check className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span className="text-xs">Copy</span>{" "}
                  <Copy className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          )}
        </div>

        <span className="text-xs text-muted-foreground mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
