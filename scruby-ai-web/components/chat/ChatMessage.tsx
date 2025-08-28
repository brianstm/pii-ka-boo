"use client";

import { ChatMessage as ChatMessageType } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { User, Bot, Sparkles } from "lucide-react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  };

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
        <div className="relative">
          <Card
            className={`p-3 transition-all duration-200 hover:shadow-md ${
              isUser
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            <div className="space-y-2">
              {message.imageUrl && (
                <div className="relative w-48 h-48 rounded-md overflow-hidden transition-transform duration-200 hover:scale-105">
                  <Image
                    src={message.imageUrl}
                    alt="Uploaded image"
                    fill
                    className="object-cover transition-transform duration-300"
                  />
                </div>
              )}

              {message.audioUrl && (
                <audio
                  controls
                  className="w-full transition-all duration-200 hover:shadow-sm"
                >
                  <source src={message.audioUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
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
              className="absolute -bottom-5 -right-2 h-7 w-22 rounded-full opacity-0 bg-primary/50 hover:bg-primary/80 group-hover:opacity-100 transition-opacity z-10 text-black/70 hover:text-white"
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
