"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

import {
  ArrowUp,
  Plus,
  Mic,
  X,
  MicOff,
  Square,
  Upload,
  Play,
  Pause,
} from "lucide-react";
import Image from "next/image";
import { FileUpload } from "@/types";
import { fileStorageService } from "@/services/fileStorageService";

interface ChatInputProps {
  onSendMessage: (
    message: string,
    image?: File,
    audio?: File,
    imageUrl?: string,
    audioUrl?: string,
    imageFilename?: string,
    audioFilename?: string
  ) => void;
  isLoading: boolean;
  hasMessages: boolean;
}

export function ChatInput({
  onSendMessage,
  isLoading,
  hasMessages,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [uploadedFile, setUploadedFile] = useState<FileUpload | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (uploadedFile?.preview && uploadedFile.type === "audio") {
        URL.revokeObjectURL(uploadedFile.preview);
      }
    };
  }, [uploadedFile]);

  useEffect(() => {
    if (uploadedFile?.type === "audio") {
      setIsPlaying(false);
      setCurrentTime(0);
      setAudioDuration(0);

      if (uploadedFile.preview && audioRef.current) {
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
  }, [uploadedFile]);

  useEffect(() => {
    if (
      uploadedFile?.type === "audio" &&
      uploadedFile.preview &&
      audioRef.current
    ) {
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
  }, [uploadedFile?.preview, uploadedFile?.type]);

  const handleSend = useCallback(() => {
    if (!message.trim() && !uploadedFile) return;

    const imageFile =
      uploadedFile?.type === "image" ? uploadedFile.file : undefined;
    const audioFile =
      uploadedFile?.type === "audio" ? uploadedFile.file : undefined;

    const imageUrl =
      uploadedFile?.type === "image" && uploadedFile?.preview
        ? uploadedFile.preview
        : undefined;
    const audioUrl =
      uploadedFile?.type === "audio" && uploadedFile?.preview
        ? uploadedFile.preview
        : undefined;
    const imageFilename =
      uploadedFile?.type === "image" && uploadedFile?.storedFile?.filename
        ? uploadedFile.storedFile.filename
        : undefined;
    const audioFilename =
      uploadedFile?.type === "audio" && uploadedFile?.storedFile?.filename
        ? uploadedFile.storedFile.filename
        : undefined;

    onSendMessage(
      message,
      imageFile,
      audioFile,
      imageUrl,
      audioUrl,
      imageFilename,
      audioFilename
    );
    setMessage("");
    setUploadedFile(null);
  }, [message, uploadedFile, onSendMessage]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type.startsWith("image/") ? "image" : "audio";

    try {
      const storedFile = await fileStorageService.saveFile(file, fileType);

      const preview =
        fileStorageService.getFileUrl(storedFile.filename) +
        `?type=${fileType}&storageDir=${fileStorageService.getStorageDirectory()}`;

      setUploadedFile({
        file,
        preview,
        type: fileType,
        storedFile,
      });
    } catch (error) {
      console.error("Error saving file:", error);
      const preview = URL.createObjectURL(file);
      setUploadedFile({ file, preview, type: fileType });
    }
  };

  const removeFile = async () => {
    if (uploadedFile?.preview) {
      if (uploadedFile.preview.startsWith("blob:")) {
        URL.revokeObjectURL(uploadedFile.preview);
      }

      if (uploadedFile.storedFile) {
        try {
          await fileStorageService.deleteFile(uploadedFile.storedFile.filename);
        } catch (error) {
          console.error("Error deleting stored file:", error);
        }
      }
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setIsPlaying(false);
    setAudioDuration(0);
    setCurrentTime(0);
    setUploadedFile(null);
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
    if (audioRef.current && uploadedFile?.type === "audio" && !isPlaying) {
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });

        const now = new Date();
        const timestamp = now
          .toISOString()
          .replace(/[:.]/g, "-")
          .replace("T", "_")
          .replace("Z", "");
        const audioFile = new File(
          [audioBlob],
          `voice_recording_${timestamp}.wav`,
          {
            type: "audio/wav",
          }
        );

        try {
          const storedFile = await fileStorageService.saveFile(
            audioFile,
            "audio"
          );

          const audioUrl =
            fileStorageService.getFileUrl(storedFile.filename) +
            `?type=audio&storageDir=${fileStorageService.getStorageDirectory()}`;

          setUploadedFile({
            file: audioFile,
            preview: audioUrl,
            type: "audio",
            storedFile,
          });
        } catch (error) {
          console.error("Error saving recorded audio:", error);
          const audioUrl = URL.createObjectURL(audioBlob);
          setUploadedFile({
            file: audioFile,
            preview: audioUrl,
            type: "audio",
          });
        }

        setAudioDuration(recordingTime);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];

    if (file && file.type.startsWith("image/")) {
      const preview = URL.createObjectURL(file);
      setUploadedFile({ file, preview, type: "image" });
    }
  }, []);

  const inputDisabled = isLoading;

  return (
    <div className={hasMessages ? "border-t bg-background p-6" : "p-6"}>
      <div
        ref={dropZoneRef}
        className={`max-w-3xl mx-auto space-y-3 transition-all duration-200 ${
          isDragging ? "scale-105 opacity-80" : ""
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-3xl flex items-center justify-center z-10 animate-in fade-in-0 duration-200">
            <div className="text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium text-primary">
                Drop image here
              </p>
            </div>
          </div>
        )}

        {uploadedFile && (
          <Card className="p-3">
            <div className="flex items-center gap-3">
              {uploadedFile.type === "image" && uploadedFile.preview ? (
                <div className="relative w-16 h-16 rounded-md overflow-hidden">
                  <Image
                    src={uploadedFile.preview}
                    alt="Upload preview"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                  <Mic className="w-6 h-6 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1">
                <p className="text-sm font-medium">{uploadedFile.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {uploadedFile.type === "image" ? "Image" : "Audio"} •{" "}
                  {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {uploadedFile.type === "audio" && (
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
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {isRecording && (
          <Card className="p-4 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75" />
                </div>
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-red-500 rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 16 + 8}px`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: "0.5s",
                      }}
                    />
                  ))}
                </div>
              </div>
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                Recording: {formatTime(recordingTime)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={stopRecording}
                className="ml-auto h-8 text-red-600 hover:text-red-700 transition-colors"
              >
                <Square className="w-4 h-4 mr-1" />
                Stop
              </Button>
            </div>
          </Card>
        )}

        <div className="relative">
          <div className="flex items-end gap-3 p-4 border border-border rounded-3xl bg-background shadow-sm hover:shadow-md transition-shadow duration-200 focus-within:shadow-md focus-within:border-primary/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-10 w-10 p-0 rounded-full hover:bg-accent transition-colors duration-200 group"
              disabled={inputDisabled || !!uploadedFile}
            >
              <Plus className="w-5 h-5 transition-transform duration-200 group-hover:rotate-45" />
            </Button>

            <div className="flex-1 relative">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  inputDisabled
                    ? "Message disabled for this conversation"
                    : "Message PII-KA-BOO..."
                }
                className="min-h-8 max-h-32 resize-none bg-background bg-none dark:bg-background dark:bg-none border-0 py-2.5 px-3 text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent justify-center border-none shadow-none"
                disabled={inputDisabled}
                style={{ lineHeight: "1.5" }}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={isRecording ? stopRecording : startRecording}
                className={`h-10 w-10 p-0 rounded-full transition-all duration-200 ${
                  isRecording
                    ? "bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50"
                    : "hover:bg-accent"
                }`}
                disabled={inputDisabled || !!uploadedFile}
              >
                {isRecording ? (
                  <div className="relative">
                    <MicOff className="w-5 h-5 text-red-500" />
                    <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                  </div>
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </Button>

              <Button
                onClick={handleSend}
                disabled={inputDisabled || (!message.trim() && !uploadedFile)}
                className="h-10 w-10 p-0 rounded-full transition-all duration-200 disabled:opacity-30 group transform hover:scale-105"
                size="sm"
              >
                <ArrowUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform duration-200" />
              </Button>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Hidden audio element for playback */}
        {uploadedFile?.type === "audio" && uploadedFile.preview && (
          <audio
            ref={audioRef}
            src={uploadedFile.preview}
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
      </div>
    </div>
  );
}
