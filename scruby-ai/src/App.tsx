import { useCallback, useEffect, useState, useRef } from '@lynx-js/react';

import './App.css';

import ArrowUpIcon from './assets/arrow-up.png';
import ArrowUpWhiteIcon from './assets/arrow-up-white.png';
import AudioLinesIcon from './assets/audio-lines.png';
import CheckIcon from './assets/check.png';
import MenuIcon from './assets/menu.png';
import PlusIcon from './assets/plus.png';
import TrashIcon from './assets/trash.png';
import MicIcon from './assets/mic.png';
import Logo from './assets/logo.png';
import PlusWhiteIcon from './assets/plus-white.png';
import XIcon from './assets/x.png';

import {
  transcribeAudio,
  sendMessage as apiSendMessage,
} from './services/apiService.js';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  imageUrl?: string;
  audioBlob?: Blob;
}

interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

export function App(props: { onRender?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [piiScrubbing, setPiiScrubbing] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>('');

  const [expandedTitles, setExpandedTitles] = useState<Set<string>>(new Set());
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );

  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages([]);
  }, []);

  props.onRender?.();

  // Save current chat to history
  const saveCurrentChat = useCallback(() => {
    if (messages.length === 0) return;

    const chatTitle =
      messages.find((m) => m.isUser)?.text.slice(0, 30) + '...' ||
      `Chat ${chatHistory.length + 1}`;
    const newChat: ChatHistory = {
      id: currentChatId || Date.now().toString(),
      title: chatTitle,
      messages: [...messages],
      createdAt: new Date(),
    };

    setChatHistory((prev) => {
      const existing = prev.find((c) => c.id === newChat.id);
      if (existing) {
        return prev.map((c) => (c.id === newChat.id ? newChat : c));
      }
      return [newChat, ...prev];
    });
  }, [messages, currentChatId, chatHistory.length]);

  // Start new chat
  const startNewChat = useCallback(() => {
    if (messages.length > 0) {
      saveCurrentChat();
    }
    setMessages([]);
    setInputText('');
    setHasStarted(false);
    setIsLoading(false);
    setCurrentChatId('');
    setSidebarOpen(false);
  }, [messages, saveCurrentChat]);

  // Load a chat from history
  const loadChat = useCallback(
    (chat: ChatHistory) => {
      if (messages.length > 0) {
        saveCurrentChat();
      }
      setMessages(chat.messages);
      setCurrentChatId(chat.id);
      setHasStarted(chat.messages.length > 0);
      setIsLoading(false);
      setSidebarOpen(false);
    },
    [messages, saveCurrentChat],
  );

  const deleteChat = useCallback(
    (chatId: string) => {
      setChatHistory((prev) => prev.filter((chat) => chat.id !== chatId));

      // If deleting current chat, start a new one
      if (chatId === currentChatId) {
        setMessages([]);
        setInputText('');
        setHasStarted(false);
        setIsLoading(false);
        setCurrentChatId('');
      }
    },
    [currentChatId],
  );

  const toggleTitleExpand = useCallback((messageId: string) => {
    setExpandedTitles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  }, []);

  // Handle image upload
  const handleImageUpload = useCallback((event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Remove selected image
  const removeImage = useCallback(() => {
    setSelectedImage(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Start audio recording
  const startAudioRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        setRecordedAudio(audioBlob);

        console.log('Audio recorded:', audioBlob.size, 'bytes');

        // Call transcription API
        try {
          const transcription = await transcribeAudio(audioBlob);
          setInputText(transcription);
        } catch (error) {
          console.error('Transcription failed:', error);
        }

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      setMediaRecorder(recorder);

      recorder.start();
    } catch (error) {
      console.error('Error starting audio recording:', error);
    }
  }, []);

  // Stop audio recording
  const stopAudioRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  }, [mediaRecorder]);

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() && !selectedImage && !recordedAudio) return;
    if (isLoading || hasStarted) return;

    setIsLoading(true);
    setHasStarted(true);

    // Set chat ID if not set
    if (!currentChatId) {
      setCurrentChatId(Date.now().toString());
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
      imageUrl: imagePreview,
      audioBlob: recordedAudio || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);

    // Clear inputs
    const currentText = inputText;
    const currentImage = selectedImage;
    const currentAudio = recordedAudio;

    setInputText('');
    setSelectedImage(null);
    setImagePreview('');
    setRecordedAudio(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      // Call API service with all data
      const response = await apiSendMessage(
        currentText,
        currentImage || undefined,
        currentAudio || undefined,
      );

      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, responseMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, there was an error processing your request.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [
    inputText,
    selectedImage,
    recordedAudio,
    imagePreview,
    isLoading,
    hasStarted,
    currentChatId,
  ]);

  const toggleRecording = useCallback(() => {
    if (hasStarted) return;

    if (!isRecording) {
      console.log('Starting audio recording...');
      setIsRecording(true);
      startAudioRecording();
    } else {
      console.log('Stopping audio recording...');
      setIsRecording(false);
      stopAudioRecording();
    }
  }, [isRecording, hasStarted, startAudioRecording, stopAudioRecording]);

  const showCenteredInput = messages.length === 0 && !hasStarted;

  return (
    <view className="app">
      {/* Overlay */}
      <view
        className={`overlay ${sidebarOpen ? 'visible' : ''}`}
        bindtap={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <view className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <view className="sidebar-header">
          <view className="logo-container">
            <image
              src={Logo}
              className="sidebar-logo"
              style="width:32px;height:32px"
            />
            <text className="sidebar-title">ScrubbyAI</text>
          </view>
          <view className="close-sidebar" bindtap={() => setSidebarOpen(false)}>
            <image src={XIcon} style="width:16px;height:16px" />
          </view>
        </view>

        <view className="history-list">
          {chatHistory.length > 0 &&
            chatHistory.map((chat) => (
              <view
                key={chat.id}
                className={`history-item ${chat.id === currentChatId ? 'active' : ''}`}
              >
                <view
                  className="history-content"
                  bindtap={() => loadChat(chat)}
                >
                  <text className="history-title">{chat.title}</text>
                </view>
                <view
                  className="delete-chat-btn"
                  bindtap={() => deleteChat(chat.id)}
                >
                  <image
                    src={TrashIcon}
                    className="trash-icon"
                    style="width:14px;height:14px"
                  />
                </view>
              </view>
            ))}
        </view>

        <view className="sidebar-footer">
          <view className="new-chat-btn" bindtap={startNewChat}>
            <image
              src={PlusWhiteIcon}
              className="plus-icon"
              style="width:16px;height:16px"
            />
            <text style="color: white">New Chat</text>
          </view>
        </view>
      </view>

      <view className="main-content">
        <view className="header">
          <view className="header-left">
            <view
              className="hamburger-btn"
              bindtap={() => setSidebarOpen(true)}
            >
              <image src={MenuIcon} style="width:18px;height:18px" />
            </view>
            <text className="app-title">ScrubbyAI</text>
          </view>
          <view className="controls">
            <view className="pii-toggle">
              <text className="toggle-label">PII Protection</text>
              <view
                className={`toggle ${piiScrubbing ? 'active' : ''}`}
                bindtap={() => setPiiScrubbing((prev) => !prev)}
              >
                <view className="toggle-slider" />
              </view>
            </view>
          </view>
        </view>

        {showCenteredInput ? (
          <view className="centered-input-container">
            {/* Image Preview */}
            {imagePreview && (
              <view className="image-preview-container">
                <view className="image-preview-wrapper">
                  <image
                    src={imagePreview}
                    className="preview-image"
                    style="max-width: 200px; max-height: 200px; border-radius: 8px;"
                  />
                  <view className="remove-image-btn" bindtap={removeImage}>
                    <image src={XIcon} style="width: 16px; height: 16px;" />
                  </view>
                </view>
              </view>
            )}

            <view className="chatgpt-input-area">
              <view className="input-row-large">
                <view
                  className="add-btn"
                  bindtap={() => fileInputRef.current?.click()}
                >
                  <image
                    src={PlusIcon}
                    className="plus-icon"
                    style="width:16px;height:16px"
                  />
                </view>
                {/* Hidden file input */}
                {/* @ts-expect-error - dont remove! */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style="display: none"
                  bindinput={handleImageUpload}
                />

                <view className="input-wrapper-large">
                  {/* @ts-expect-error - dont remove! */}
                  <input
                    className="native-text-input"
                    value={inputText}
                    bindinput={(e: { detail: { value: string } }) =>
                      setInputText(e.detail.value)
                    }
                    placeholder="Message ScrubbyAI..."
                    type="text"
                    confirmType="send"
                    bindconfirm={sendMessage}
                  />
                </view>

                <view
                  className={`audio-btn ${isRecording ? 'recording' : ''}`}
                  bindtap={toggleRecording}
                >
                  <image
                    src={isRecording ? AudioLinesIcon : MicIcon}
                    className="audio-icon"
                    style="width:16px;height:16px"
                  />
                </view>

                <view
                  className={`send-btn-large ${isLoading || (!inputText.trim() && !selectedImage && !recordedAudio) ? 'disabled' : ''}`}
                  bindtap={sendMessage}
                >
                  <image
                    src={
                      isLoading
                        ? CheckIcon
                        : !inputText.trim() && !selectedImage && !recordedAudio
                          ? ArrowUpIcon
                          : ArrowUpWhiteIcon
                    }
                    className="send-icon-large"
                    style="width:16px;height:16px"
                  />
                </view>
              </view>
            </view>
          </view>
        ) : (
          <>
            <view className="response-container">
              <scroll-view className="messages" scroll-y>
                {messages.map((message) => (
                  <view
                    key={message.id}
                    className={`response-item ${message.isUser ? 'user-prompt' : 'ai-response'}`}
                  >
                    {message.isUser ? (
                      <view className="user-message-content">
                        {message.imageUrl && (
                          <view className="message-image">
                            <image
                              src={message.imageUrl}
                              style="max-width: 200px; max-height: 200px; border-radius: 8px; margin-bottom: 8px;"
                            />
                          </view>
                        )}
                        {message.audioBlob && (
                          <view className="message-audio">
                            <text style="font-size: 12px; color: #666; margin-bottom: 8px;">
                              🎵 Audio message
                            </text>
                          </view>
                        )}
                        <view
                          className="prompt-title"
                          bindtap={() => toggleTitleExpand(message.id)}
                        >
                          <text
                            className={`prompt-text ${expandedTitles.size > 0 && expandedTitles.has(message.id) ? 'expanded' : ''}`}
                          >
                            {expandedTitles.size > 0 &&
                            expandedTitles.has(message.id)
                              ? message.text
                              : message.text.length > 50
                                ? message.text.slice(0, 50) + '...'
                                : message.text}
                          </text>
                        </view>
                      </view>
                    ) : (
                      <view className="response-scrollable">
                        <scroll-view
                          className="response-content-scroll"
                          scroll-y
                        >
                          <text className="response-text">{message.text}</text>
                        </scroll-view>
                      </view>
                    )}
                  </view>
                ))}
              </scroll-view>
            </view>

            {/* Floating Plus Bubble */}
            <view className="floating-plus" bindtap={startNewChat}>
              <image
                src={PlusWhiteIcon}
                className="plus-icon"
                style="width:20px;height:20px"
              />
            </view>

            {hasStarted && isLoading && (
              <view className="loading-container">
                <text className="loading-text">Processing your request...</text>
              </view>
            )}
          </>
        )}
      </view>
    </view>
  );
}
