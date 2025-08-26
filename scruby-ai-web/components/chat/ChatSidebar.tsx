"use client";

import { useState } from "react";
import { ChatSession } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { Switch } from "@/components/ui/switch";
import {
  Plus,
  MessageSquare,
  Settings,
  Shield,
  Moon,
  Sun,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Image from "next/image";

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId?: string;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  piiEnabled: boolean;
  onPiiToggle: (enabled: boolean) => void;
  darkMode: boolean;
  onDarkModeToggle: (enabled: boolean) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function ChatSidebar({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  piiEnabled,
  onPiiToggle,
  darkMode,
  onDarkModeToggle,
  collapsed,
  onToggleCollapse,
}: ChatSidebarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getSessionDate = (session: ChatSession) => {
    return formatDate(session.updatedAt);
  };

  if (collapsed) {
    return (
      <div className="w-16 bg-muted/30 border-r flex flex-col h-full items-center py-4 transition-all duration-300">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="mb-4 h-10 w-10 p-0 transition-all duration-200 hover:scale-110"
        >
          <ChevronRight className="w-4 h-4 transition-transform duration-200" />
        </Button>

        <Button
          onClick={onNewChat}
          size="sm"
          className="h-10 w-10 p-0 mb-4 transition-all duration-200 hover:scale-110"
        >
          <Plus className="w-4 h-4 transition-transform duration-200 hover:rotate-90" />
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSettingsOpen(true)}
          className="h-10 w-10 p-0 transition-all duration-200 hover:scale-110"
        >
          <Settings className="w-4 h-4 transition-transform duration-200 hover:rotate-90" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-muted/30 border-r flex flex-col h-full transition-all duration-300">
      <div className="p-4 border-b">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-8 w-8 p-0 mr-2 transition-all duration-200 hover:scale-110"
          >
            <ChevronLeft className="w-4 h-4 transition-transform duration-200" />
          </Button>

          <div className="relative w-8 h-8">
            <Image
              src="/logo.png"
              alt="ScrubbyAI Logo"
              fill
              className="object-contain"
            />
          </div>
          <div className="flex-1">
            <h1 className="font-semibold text-lg">ScrubbyAI</h1>
            <p className="text-xs text-muted-foreground">PII-Safe AI Chat</p>
          </div>
        </div>

        <Button
          onClick={onNewChat}
          className="w-full transition-all duration-200 hover:opacity-80"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:rotate-90" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No chat history yet.
              <br />
              Start a new conversation!
            </div>
          ) : (
            sessions.map((session, index) => (
              <Card
                key={session.id}
                className={`p-3 cursor-pointer transition-all duration-200 hover:bg-accent hover:opacity-80 hover:shadow-md group ${
                  currentSessionId === session.id
                    ? "bg-accent border-primary shadow-sm"
                    : ""
                } animate-in slide-in-from-left-4 duration-300`}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => onSelectSession(session.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        {getSessionDate(session)}
                      </span>
                    </div>
                    <p className="text-sm font-medium truncate mb-1 leading-tight bg-muted/50 px-2 py-1 rounded-md border">
                      {session.title}
                    </p>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this chat? This action
                          cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteSession(session.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" className="w-full justify-start" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
              <DialogDescription>
                Configure your ScrubbyAI preferences
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span className="font-medium">PII Scrubbing</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Automatically remove personal information before sending to
                    AI
                  </p>
                </div>
                <Switch checked={piiEnabled} onCheckedChange={onPiiToggle} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    {darkMode ? (
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
                <Switch checked={darkMode} onCheckedChange={onDarkModeToggle} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Configure your ScrubbyAI preferences
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">PII Scrubbing</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Automatically remove personal information before sending to AI
                </p>
              </div>
              <Switch checked={piiEnabled} onCheckedChange={onPiiToggle} />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  {darkMode ? (
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
              <Switch checked={darkMode} onCheckedChange={onDarkModeToggle} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
