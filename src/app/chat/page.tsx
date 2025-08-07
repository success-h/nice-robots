'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Phone,
  MoreHorizontal,
  Mic,
  MicOff,
  Send,
  Settings,
  Volume2,
  VolumeX,
  X,
  Square,
} from 'lucide-react';
import useUserStore, {
  Message,
  useModerationHandling,
} from '@/zustand/useStore';
import { useApi } from '@/hooks/useApi';
import Image from 'next/image';

export default function ChatPage() {
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    currentChat,
    character,
    user,
    updateChatHistory,
    response_type,
    isLoggedIn,
    setChats,
    setCurrentChat,
    setCharacter,
    chats,
  } = useUserStore();

  const { handleModerationFailure, handleModerationResponse } =
    useModerationHandling();
  const router = useRouter();

  // Load chat history
  const loadChatHistory = async () => {
    try {
      const response = await useApi(
        `/chats/by-character/${character?.id}`,
        {
          method: 'GET',
        },
        user?.access_token
      );
      const data = await response.json();
      console.log({ data });
      setCurrentChat(data);
      setChats(data);
      return data;
    } catch (error) {
      console.log('err:', error);
      return error;
    }
  };

  useEffect(() => {
    if (character?.id) {
      loadChatHistory();
    }
  }, [character]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.chatHistory]);

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Audio blob is empty or invalid');
      }

      console.log('Audio blob info:', {
        size: audioBlob.size,
        type: audioBlob.type,
      });

      const formData = new FormData();
      formData.append('voice', audioBlob, 'recording.webm');
      formData.append('data_type', 'binary_audio');
      formData.append('model_name', 'gpt_4o_mini_transcribe');
      formData.append('file_name', 'recording.webm');

      // Direct fetch instead of useApi
      const response = await useApi('/transcription', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${user?.access_token}`, // Adjust based on your auth format
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response body:', errorText);
        throw new Error(
          `Transcription failed: ${response.status} - ${errorText}`
        );
      }

      const result = await response.json();
      return result.text || result.data?.text;
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  };
  const startRecording = async () => {
    if (isRecording || isTranscribing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      // Reset chunks
      audioChunksRef.current = [];

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());

        // Process recorded audio
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: 'audio/webm;codecs=opus',
          });

          console.log('Created audio blob:', {
            size: audioBlob.size,
            type: audioBlob.type,
          });

          // Start transcription
          setIsTranscribing(true);

          try {
            const transcribedText = await transcribeAudio(audioBlob);

            if (transcribedText && transcribedText.trim()) {
              // Append to existing input message if there's already text
              setInputMessage((prev) => {
                const newText = transcribedText.trim();
                if (prev.trim()) {
                  return prev + ' ' + newText;
                }
                return newText;
              });
            }
          } catch (error) {
            console.error('Failed to transcribe audio:', error);
            // You could show an error message to user here
          } finally {
            setIsTranscribing(false);
          }
        } else {
          console.warn('No audio chunks recorded');
          setIsTranscribing(false);
        }
      };

      mediaRecorder.onerror = (error) => {
        console.error('MediaRecorder error:', error);
        setIsRecording(false);
        setIsTranscribing(false);
        stream.getTracks().forEach((track) => track.stop());
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      console.log('Recording started successfully');
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    setInputMessage('');
    if (!isRecording || !mediaRecorderRef.current) return;

    try {
      // Stop the MediaRecorder - this will trigger the onstop event
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }

    // Clear timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsRecording(false);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Toggle response type
  const toggleResponseType = async () => {
    try {
      await useApi(
        `/chats/${currentChat?.data.id}/toggle-return-type`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        user?.access_token
      );
      loadChatHistory();
    } catch (error) {
      console.error('Failed toggling return type:', error);
    }
  };

  // Handle sending messages with real-time streaming
  const sendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage.trim(),
    };

    // Add user message to chat
    updateChatHistory(userMessage, currentChat?.data.id!);
    setInputMessage('');
    setIsTyping(true);

    // Initialize assistant message
    let assistantMessage: Message = {
      role: 'assistant',
      content: '',
    };

    try {
      const controller = new AbortController();
      abortController.current = controller;

      const response = await useApi(
        `/chat-completions/${currentChat?.data?.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...(currentChat?.chatHistory || []), userMessage],
          }),
          signal: controller.signal,
        },
        user?.access_token
      );

      const contentType = response.headers.get('content-type');

      if (contentType?.includes('text/event-stream')) {
        // Handle streaming response with real-time updates
        if (!response.body) {
          throw new Error('No response body available for streaming');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let eventType = null;
        let buffer = '';
        let messageId = '';

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            // Decode the chunk and add to buffer
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine) continue;

              // Check for SSE event type
              if (trimmedLine.startsWith('event: ')) {
                eventType = trimmedLine.substring(7);
              } else if (trimmedLine.startsWith('data: ')) {
                const jsonStr = trimmedLine.substring(6).trim();
                if (jsonStr && jsonStr !== '[DONE]' && jsonStr !== 'null') {
                  try {
                    const parsed = JSON.parse(jsonStr);

                    // Check if this is an error event
                    if (eventType === 'error' || parsed.error) {
                      const moderationDetails = handleModerationFailure(
                        userMessage,
                        currentChat?.data?.id!,
                        parsed.details || []
                      );

                      // Handle moderation response
                      const moderationResponse = await useApi(
                        `/moderation-resolutions/${currentChat?.data?.id}`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ details: moderationDetails }),
                          signal: controller.signal,
                        },
                        user?.access_token
                      );

                      if (moderationResponse.ok) {
                        const moderationParsedData =
                          await moderationResponse.json();
                        if (
                          moderationParsedData.data.message_id &&
                          response_type === 'voice'
                        ) {
                          await fetchAudioStream(
                            moderationParsedData.data.message_id
                          );
                        }
                        assistantMessage.content =
                          moderationParsedData.data.text;
                        updateChatHistory(
                          assistantMessage,
                          currentChat?.data.id!
                        );
                      }
                      return;
                    } else {
                      // Regular streaming content
                      let content = '';
                      if (parsed.choices?.[0]?.delta?.content) {
                        content = parsed.choices[0].delta.content;
                      } else if (parsed.content) {
                        content = parsed.content;
                      } else if (parsed.text) {
                        content = parsed.text;
                      }

                      // Check for message_id for audio
                      if (parsed.message_id) {
                        messageId = parsed.message_id;
                      }

                      if (content) {
                        assistantMessage.content += content;
                        // For text responses, show real-time streaming
                        if (response_type === 'text') {
                          updateChatHistory(
                            assistantMessage,
                            currentChat?.data.id!
                          );
                        }
                      }
                    }
                  } catch (parseError) {
                    console.log('Error parsing SSE chunk:', parseError);
                  }
                }
              }
            }
          }

          // After streaming is complete
          if (response_type === 'voice') {
            // For voice responses, show full text and play audio
            updateChatHistory(assistantMessage, currentChat?.data.id!);
            if (messageId) {
              await fetchAudioStream(messageId);
            }
          } else if (response_type === 'text' && messageId) {
            // For text responses, just fetch audio for potential playback
            await fetchAudioStream(messageId);
          }
        } finally {
          reader.releaseLock();
        }
      } else if (contentType?.includes('application/json')) {
        // Handle regular JSON response
        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.reason === 'filtering' && errorData.details) {
            // Handle moderation failure
            const moderationDetails = handleModerationFailure(
              userMessage,
              currentChat?.data?.id!,
              errorData.details
            );

            const moderationResponse = await useApi(
              `/moderation-resolutions/${currentChat?.data?.id}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ details: moderationDetails }),
                signal: controller.signal,
              },
              user?.access_token
            );

            if (moderationResponse.ok) {
              const moderationParsedData = await moderationResponse.json();
              if (
                moderationParsedData.data.message_id &&
                response_type === 'voice'
              ) {
                await fetchAudioStream(moderationParsedData.data.message_id);
              }
              assistantMessage.content = moderationParsedData.data.text;
              updateChatHistory(assistantMessage, currentChat?.data.id!);
            }
            return;
          }
        }

        const parsedData = await response.json();
        assistantMessage.content = parsedData.data.text;
        updateChatHistory(assistantMessage, currentChat?.data.id!);

        if (parsedData.data.message_id && response_type === 'voice') {
          await fetchAudioStream(parsedData.data.message_id);
        }
      }
    } catch (error) {
      //@ts-expect-error AbortError
      if (error.name !== 'AbortError') {
        console.error('Error sending message:', error);
      }
    } finally {
      setIsTyping(false);
    }
  };

  // Fetch and play audio stream
  const fetchAudioStream = async (messageId: string) => {
    try {
      setIsSpeaking(true);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const response = await useApi(
        `/stream-speech/${messageId}`,
        { method: 'GET' },
        user?.access_token
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const audioBlob = await response.blob();
      if (!audioBlob || audioBlob.size === 0) {
        console.error('Empty audio blob received');
        setIsSpeaking(false);
        return;
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      audio.onerror = () => {
        console.error('Audio playback error');
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      if (!isMuted) {
        await audio.play();
      }
    } catch (error) {
      console.error('Speech stream error:', error);
      setIsSpeaking(false);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = 1.0;
      } else {
        audioRef.current.volume = 0.0;
      }
    }
    setIsMuted(!isMuted);
  };

  // Stop response generation
  const stopResponse = () => {
    if (abortController.current) {
      abortController.current.abort();
    }
    setIsTyping(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  if (!isLoggedIn || !character || !currentChat) {
    return null; // Will redirect
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Left Sidebar - Character List */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold">Chat</h2>
          </div>
        </div>

        {/* Current Active Chat */}
        {currentChat && (
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">
              CURRENT CHAT
            </h3>
            <div className="flex items-center space-x-3 p-3 bg-pink-500/20 border border-pink-500/30 rounded-lg">
              <Image
                src={character.attributes.avatar}
                alt={character.attributes.name}
                width={40}
                height={40}
                className="rounded-full"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {character.attributes.name}
                </p>
                <p className="text-sm text-gray-400 truncate">
                  {isTyping
                    ? 'Typing...'
                    : isSpeaking
                    ? 'Speaking...'
                    : 'Online'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* All Active Chats */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">
              ALL CHATS
            </h3>
            <div className="space-y-2">
              {chats?.map((chat, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setCharacter(chat?.data?.relationships?.character);
                    setCurrentChat(chat);
                  }}
                  className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    currentChat?.data?.id === chat?.data?.id
                      ? 'bg-pink-500/20 border border-pink-500/30'
                      : 'hover:bg-gray-700'
                  }`}
                >
                  <Image
                    src={
                      chat?.data?.relationships?.character?.attributes?.avatar
                    }
                    alt={chat?.data?.relationships?.character?.attributes.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {chat?.data?.relationships?.character?.attributes.name}
                    </p>
                    <p className="text-sm text-gray-400 truncate">
                      {chat?.chatHistory && chat?.chatHistory?.length > 0
                        ? chat?.chatHistory[
                            chat?.chatHistory?.length - 1
                          ].content.slice(0, 30) + '...'
                        : 'New conversation'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {currentChat?.data?.id === chat?.data?.id ? 'Active' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Image
                src={character.attributes.avatar}
                alt={character.attributes.name}
                width={48}
                height={48}
                className="rounded-full"
              />
              <div>
                <h3 className="font-semibold text-lg">
                  {character.attributes.name}
                </h3>
                <p className="text-sm text-gray-400">
                  {isTyping
                    ? 'Typing...'
                    : isSpeaking
                    ? 'Speaking...'
                    : 'Online'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                <Phone className="h-5 w-5 text-green-500" />
              </button>

              {/* Response Type Toggle */}
              <div className="flex items-center space-x-2 bg-gray-700 rounded-lg p-2">
                <span className="text-xs text-gray-400">
                  {currentChat?.data?.attributes?.return_type || response_type}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={response_type === 'voice'}
                    onChange={toggleResponseType}
                  />
                  <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500"></div>
                </label>
              </div>

              <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                <Settings className="h-5 w-5" />
              </button>
              <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {currentChat.chatHistory?.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-700 text-white'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.moderationFailed && (
                  <p className="text-xs text-red-300 mt-1">
                    ⚠️ Message flagged
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-700 p-3 rounded-2xl">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <div className="flex items-end space-x-3">
            {/* Voice Recording Button */}
            <div className="relative">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
                className={`p-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : isTranscribing
                    ? 'bg-yellow-500'
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
              >
                {isRecording ? (
                  <Square className="h-5 w-5" />
                ) : isTranscribing ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </button>

              {/* Recording Time Display */}
              {isRecording && (
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-3 py-1 rounded-full whitespace-nowrap animate-pulse">
                  🎙️ {formatTime(recordingTime)}
                </div>
              )}
            </div>

            {/* Text Input */}
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  isRecording
                    ? 'Recording audio...'
                    : isTranscribing
                    ? 'Transcribing audio...'
                    : 'Write a message or record audio...'
                }
                disabled={isRecording || isTranscribing}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-2xl resize-none focus:outline-none focus:border-pink-500 text-white placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>

            {/* Send Button */}
            <button
              onClick={sendMessage}
              disabled={
                !inputMessage.trim() ||
                isTyping ||
                isRecording ||
                isTranscribing
              }
              className="p-3 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full transition-colors"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>

          {/* Status Messages */}
          {(isRecording || isTranscribing) && (
            <div className="mt-3 text-center">
              {isRecording && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <p className="text-sm text-red-400">
                    Recording audio... Click stop when finished
                  </p>
                </div>
              )}
              {isTranscribing && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <p className="text-sm text-yellow-400">
                    Transcribing your audio...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Control Buttons */}
          {(isTyping || isSpeaking) && (
            <div className="flex justify-center mt-2 space-x-3">
              {isSpeaking && (
                <button
                  onClick={toggleMute}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                  <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>
              )}
              <button
                onClick={stopResponse}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Stop</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
