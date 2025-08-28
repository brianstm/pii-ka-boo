import { useCallback, useEffect, useState, useRef } from '@lynx-js/react';

import './App.css';

import ArrowUpIcon from './assets/arrow-up.png';
import ArrowUpWhiteIcon from './assets/arrow-up-white.png';
import CheckIcon from './assets/check.png';
// import Logo from './assets/logo.png';
import PlusWhiteIcon from './assets/plus-white.png';
import {
  sendMessage as apiSendMessage,
  callGemini,
} from './services/apiService.js';
import { replacePlaceholdersFromOriginal } from './services/piiReplacementService.js';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  imageUrl?: string;
  audioBlob?: Blob;
}

export function App(props: { onRender?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const [expandedTitles, setExpandedTitles] = useState<Set<string>>(new Set());
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages([]);
  }, []);

  props.onRender?.();

  const startNewChat = useCallback(() => {
    setMessages([]);
    setInputText('');
    setHasStarted(false);
    setIsLoading(false);
  }, []);

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

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() && !selectedImage) return;
    if (isLoading || hasStarted) return;

    setIsLoading(true);
    setHasStarted(true);

    const userMessage: Message = {
      id: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 6),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    const currentText = inputText;
    const currentImage = selectedImage;

    setInputText('');
    setSelectedImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      const robot = await apiSendMessage(
        currentText,
        currentImage || undefined,
      );

      const robotMessage: Message = {
        id:
          (Date.now() + 1).toString() +
          '-' +
          Math.random().toString(36).slice(2, 6),
        text: robot,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, robotMessage]);

      const gemini = await callGemini(robot);
      const geminiMessage: Message = {
        id:
          (Date.now() + 2).toString() +
          '-' +
          Math.random().toString(36).slice(2, 6),
        text: gemini,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, geminiMessage]);

      const restored = replacePlaceholdersFromOriginal(currentText, gemini);
      const restoredMessage: Message = {
        id:
          (Date.now() + 3).toString() +
          '-' +
          Math.random().toString(36).slice(2, 6),
        text: restored,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, restoredMessage]);
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
  }, [inputText, selectedImage, isLoading, hasStarted]);

  const showCenteredInput = messages.length === 0 && !hasStarted;

  return (
    <view className="app">
      <view className="main-content">
        <view className="header">
          <view className="header-left">
            <text className="app-title">ScrubbyAI</text>
          </view>
        </view>

        {showCenteredInput ? (
          <view className="centered-input-container">
            <view className="chatgpt-input-area">
              <view className="input-row-large">
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
                  className={`send-btn-large ${isLoading || (!inputText.trim() && !selectedImage) ? 'disabled' : ''}`}
                  bindtap={sendMessage}
                >
                  <image
                    src={
                      isLoading
                        ? CheckIcon
                        : !inputText.trim() && !selectedImage
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
