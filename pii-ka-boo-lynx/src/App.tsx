import { useCallback, useEffect, useState, useRef } from '@lynx-js/react';

import './App.css';

import ArrowUpIcon from './assets/arrow-up.png';
import ArrowUpWhiteIcon from './assets/arrow-up-white.png';
import BotIcon from './assets/bot.png';
import CheckIcon from './assets/check.png';
import LogoBrownIcon from './assets/logo_brown.png';
import PlusWhiteIcon from './assets/plus-white.png';
import SparklesIcon from './assets/sparkles.png';
import UserIcon from './assets/user.png';

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
  messageType?: 'user' | 'pii' | 'gemini' | 'restored';
}

interface ProcessedMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  messageType?: 'user' | 'pii' | 'gemini' | 'restored';
  isPiiProcessingMessage?: boolean;
  piiInput?: string;
  geminiOutput?: string;
  showPiiOnly?: boolean;
}

export function App(props: { onRender?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const [expandedTitles, setExpandedTitles] = useState<Set<string>>(new Set());
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const [showGeminiInputDialog, setShowGeminiInputDialog] = useState(false);
  const [showGeminiOutputDialog, setShowGeminiOutputDialog] = useState(false);

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

  const getMessageIcon = useCallback((message: Message) => {
    if (message.isUser) {
      return UserIcon;
    }

    switch (message.messageType) {
      case 'pii':
        return BotIcon;
      case 'gemini':
        return SparklesIcon;
      case 'restored':
        return BotIcon;
      default:
        return BotIcon;
    }
  }, []);

  // Process messages to create the display structure
  const processMessages = useCallback(
    (messages: Message[]): ProcessedMessage[] => {
      const processed: ProcessedMessage[] = [];

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];

        // Check if this is part of a PII processing flow
        const isPiiProcessingMessage =
          message.messageType === 'restored' &&
          i >= 2 &&
          messages[i - 1]?.messageType === 'gemini' &&
          messages[i - 2]?.messageType === 'pii';

        // Check if we're still loading (only PII message exists)
        const isStillLoading =
          message.messageType === 'pii' &&
          i === messages.length - 1 &&
          isLoading;

        if (isPiiProcessingMessage) {
          // This is the final restored message - show the full PII processing UI
          const piiInput = messages[i - 2]?.text;
          const geminiOutput = messages[i - 1]?.text;

          processed.push({
            ...message,
            isPiiProcessingMessage: true,
            piiInput,
            geminiOutput,
          });
        } else if (isStillLoading) {
          // This is a PII message and we're still loading - show PII only
          processed.push({
            ...message,
            showPiiOnly: true,
          });
        } else if (
          message.messageType === 'pii' ||
          message.messageType === 'gemini'
        ) {
          // Hide individual PII and Gemini messages when they're part of a flow
          const isPartOfFlow =
            (message.messageType === 'pii' &&
              i < messages.length - 1 &&
              messages[i + 1]?.messageType === 'gemini' &&
              messages[i + 2]?.messageType === 'restored') ||
            (message.messageType === 'gemini' &&
              i > 0 &&
              i < messages.length - 1 &&
              messages[i - 1]?.messageType === 'pii' &&
              messages[i + 1]?.messageType === 'restored');

          if (!isPartOfFlow) {
            processed.push(message);
          }
        } else {
          // Regular message (user or other)
          processed.push(message);
        }
      }

      return processed;
    },
    [isLoading],
  );

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
      messageType: 'user',
    };

    setMessages((prev) => [...prev, userMessage]);

    const currentText = inputText;
    setInputText('');
    setSelectedImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      const robot = await apiSendMessage(currentText);

      const robotMessage: Message = {
        id:
          (Date.now() + 1).toString() +
          '-' +
          Math.random().toString(36).slice(2, 6),
        text: robot,
        isUser: false,
        timestamp: new Date(),
        messageType: 'pii',
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
        messageType: 'gemini',
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
        messageType: 'restored',
      };
      setMessages((prev) => [...prev, restoredMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, there was an error processing your request.',
        isUser: false,
        timestamp: new Date(),
        messageType: 'pii',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, selectedImage, isLoading, hasStarted]);

  const showCenteredInput = messages.length === 0 && !hasStarted;
  const processedMessages = processMessages(messages);

  return (
    <view className="app">
      <view className="main-content">
        <view className="header">
          <view className="header-left">
            <image
              src={LogoBrownIcon}
              className="header-logo"
              style="width:32px;height:32px;margin-right:10px"
            />
            <text className="app-title">PII-KA-BOO</text>
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
                    placeholder="Message PII-KA-BOO..."
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
                {processedMessages.map((message) => (
                  <view
                    key={message.id}
                    className={`response-item ${message.isUser ? 'user-prompt' : 'ai-response'}`}
                  >
                    {message.isUser ? (
                      <view className="message-icon">
                        <image
                          src={getMessageIcon(message)}
                          className="icon"
                          style="width:16px;height:16px"
                        />
                      </view>
                    ) : (
                      <view className="message-icon">
                        <image
                          src={getMessageIcon(message)}
                          className="icon"
                          style="width:16px;height:16px"
                        />
                      </view>
                    )}

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
                    ) : message.showPiiOnly ? (
                      <view className="response-content">
                        <text className="response-text">{message.text}</text>
                      </view>
                    ) : message.isPiiProcessingMessage &&
                      message.piiInput &&
                      message.geminiOutput ? (
                      <view className="pii-processing-message">
                        <view className="message-sections">
                          <view
                            className="gemini-input-section"
                            bindtap={() => setShowGeminiInputDialog(true)}
                          >
                            <view className="section-container blue-section">
                              <view className="section-header">
                                <text className="section-title">
                                  Input to Gemini
                                </text>
                                <view className="chevron-right"></view>
                              </view>
                              <view className="section-content">
                                <text className="section-text">
                                  {message.piiInput.length > 185
                                    ? message.piiInput.substring(0, 185) + '...'
                                    : message.piiInput}
                                </text>
                              </view>
                            </view>
                          </view>

                          <view
                            className="gemini-output-section"
                            bindtap={() => setShowGeminiOutputDialog(true)}
                          >
                            <view className="section-container green-section">
                              <view className="section-header">
                                <text className="section-title">
                                  Gemini's Output
                                </text>
                                <view className="chevron-right"></view>
                              </view>
                              <view className="section-content">
                                <text className="section-text">
                                  {message.geminiOutput.length > 185
                                    ? message.geminiOutput.substring(0, 185) +
                                      '...'
                                    : message.geminiOutput}
                                </text>
                              </view>
                            </view>
                          </view>
                        </view>

                        <view className="final-result-section">
                          <text className="response-text">{message.text}</text>
                        </view>
                      </view>
                    ) : (
                      <view className="response-content">
                        <text className="response-text">{message.text}</text>
                      </view>
                    )}
                  </view>
                ))}
              </scroll-view>
            </view>

            {showGeminiInputDialog && (
              <view
                className="dialog-overlay"
                bindtap={() => setShowGeminiInputDialog(false)}
              >
                <view className="dialog-content" bindtap={() => {}}>
                  <view
                    className="dialog-header"
                    style={{ backgroundColor: '#ECF3FE' }}
                  >
                    <view className="dialog-title-section">
                      <text className="dialog-title">Input to Gemini</text>
                      <text className="dialog-description">
                        The text that was sent to Gemini
                      </text>
                    </view>
                  </view>
                  <scroll-view className="dialog-body" scroll-y>
                    <text className="dialog-text">
                      {messages.find((m) => m.messageType === 'pii')?.text ||
                        ''}
                    </text>
                  </scroll-view>
                </view>
              </view>
            )}

            {showGeminiOutputDialog && (
              <view
                className="dialog-overlay"
                bindtap={() => setShowGeminiOutputDialog(false)}
              >
                <view className="dialog-content" bindtap={() => {}}>
                  <view
                    className="dialog-header"
                    style={{ backgroundColor: '#E8F8F3' }}
                  >
                    <view className="dialog-title-section">
                      <text className="dialog-title">Gemini's Output</text>
                      <text className="dialog-description">
                        The response from Gemini
                      </text>
                    </view>
                  </view>
                  <scroll-view className="dialog-body" scroll-y>
                    <text className="dialog-text">
                      {messages.find((m) => m.messageType === 'gemini')?.text ||
                        ''}
                    </text>
                  </scroll-view>
                </view>
              </view>
            )}

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
