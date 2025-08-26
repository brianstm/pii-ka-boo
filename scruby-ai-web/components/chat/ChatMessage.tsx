'use client';

import { ChatMessage as ChatMessageType } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { User, Bot } from 'lucide-react';
import Image from 'next/image';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 p-4 transition-all duration-300 hover:bg-accent/30 group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar className="w-8 h-8 flex-shrink-0 transition-transform duration-200 hover:scale-110">
        <AvatarFallback className={`transition-colors duration-200 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <Card className={`p-3 transition-all duration-200 hover:shadow-md ${
          isUser 
            ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
            : 'bg-muted hover:bg-muted/80'
        }`}>
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
              <audio controls className="w-full transition-all duration-200 hover:shadow-sm">
                <source src={message.audioUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            )}
            
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        </Card>
        
        <span className="text-xs text-muted-foreground mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      </div>
    </div>
  );
}
