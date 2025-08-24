'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Mic,
  Send,
  Volume2,
  VolumeX,
  X,
  Square,
  Plus,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import useUserStore, {
  Message,
  useModerationHandling,
} from '@/zustand/useStore';
import { useApi } from '@/hooks/useApi';
import Image from 'next/image';
import Link from 'next/link';
import ChatList from '@/components/ChatList';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FiTrash } from 'react-icons/fi';
import { Button } from '@/components/ui/button';

export default function ChatPage() {
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [relationshipTypes, setRelationshipTypes] = useState<string[]>([]);
  const [selectedRelationship, setSelectedRelationship] = useState<string>('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [hasChatObject, setHasChatObject] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    currentChat,
    character,
    updateChatHistory,
    response_type,
    setChats,
    setCurrentChat,
    setCharacter,
    chats,
    access_token,
    characters,
    deleteChat,
    deleteCharacter,
  } = useUserStore();
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { handleModerationFailure } = useModerationHandling();

  const sendMessage = async (message: Message, chatId: string) => {
    setInputMessage('');
    setIsTyping(true);

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
    };

    try {
      const controller = new AbortController();
      abortController.current = controller;

      const response = await useApi(
        `/chat-completions/${chatId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...(currentChat?.chatHistory || []), message],
          }),
          signal: controller.signal,
        },
        access_token
      );

      const contentType = response.headers.get('content-type');

      if (contentType?.includes('text/event-stream')) {
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

            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine) continue;

              if (trimmedLine.startsWith('event: ')) {
                eventType = trimmedLine.substring(7);
              } else if (trimmedLine.startsWith('data: ')) {
                const jsonStr = trimmedLine.substring(6).trim();
                if (jsonStr && jsonStr !== '[DONE]' && jsonStr !== 'null') {
                  try {
                    const parsed = JSON.parse(jsonStr);

                    if (eventType === 'error' || parsed.error) {
                      const moderationDetails = handleModerationFailure(
                        message,
                        currentChat?.data?.id!,
                        parsed.details || []
                      );

                      const moderationResponse = await useApi(
                        `/moderation-resolutions/${currentChat?.data?.id}`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ details: moderationDetails }),
                          signal: controller.signal,
                        },
                        access_token
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

                      if (parsed.message_id) {
                        messageId = parsed.message_id;
                      }

                      if (content) {
                        assistantMessage.content += content;
                        if (response_type === 'text') {
                          updateChatHistory(
                            assistantMessage,
                            currentChat?.data.id!
                          );
                        }
                      }
                    }
                  } catch (parseError) {
                    // console.log('Error parsing SSE chunk:', parseError);
                  }
                }
              }
            }
          }

          // After streaming is complete
          if (response_type === 'voice') {
            updateChatHistory(assistantMessage, currentChat?.data.id!);
            if (messageId) {
              await fetchAudioStream(messageId);
            }
          } else if (response_type === 'text' && messageId) {
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
            const moderationDetails = handleModerationFailure(
              message,
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
              access_token
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
        access_token
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

  const createNewChat = async () => {
    if (!character?.id || !selectedRelationship || isCreatingChat) return;

    setIsCreatingChat(true);
    try {
      const response = await useApi(
        '/chats',
        {
          method: 'POST',
          body: JSON.stringify({
            data: {
              attributes: {
                character_id: character.id,
                relationship_type: selectedRelationship,
                return_type: response_type,
              },
            },
          }),
        },
        access_token
      );

      // const data = await parseApiResponse(response);
      const data = await response.json();
      if (data) {
        const chatData = await loadChatHistory();
        const userMessage: Message = {
          role: 'user',
          content: `Be my ${selectedRelationship}`,
        };
        const assistantMessage: Message = {
          role: 'assistant',
          content: data?.data?.text,
        };
        updateChatHistory(userMessage, chatData.data.id);
        updateChatHistory(assistantMessage, chatData.data.id);
        fetchAudioStream(data.data.message_id);

        // sendMessage(userMessage, data?.data?.id);
      }
    } catch (error) {
      console.error('Failed to create new chat:', error);
    } finally {
      setIsCreatingChat(false);
    }
  };

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

  useEffect(() => {
    const fetchRelationshipTypes = async () => {
      if (character?.id) {
        try {
          const response = await useApi(
            `/characters/${character.id}/relationship-types`,
            { method: 'GET' },
            access_token
          );
          const data = await response.json();
          const types = data.relationship_types || [];
          setRelationshipTypes(types);
          if (types.length > 0) {
            setSelectedRelationship(types[0]);
          }
        } catch (error) {
          console.error('Failed to fetch relationship types:', error);
        }
      }
    };

    if (!currentChat) {
      fetchRelationshipTypes();
    }
  }, [character?.id, currentChat, access_token]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + 'px';
    }
  }, [inputMessage]);

  const loadChatHistory = async () => {
    try {
      setIsLoading(true);
      const response = await useApi(
        `/chats/by-character/${character?.id}`,
        { method: 'GET' },
        access_token
      );
      const data = await response.json();
      setIsLoading(false);
      if (!data?.errors) {
        setCurrentChat(data);
        setChats(data);
        setHasChatObject(true);
        return data;
      }
    } catch (error) {
      setIsLoading(false);
      return error;
    }
  };

  useEffect(() => {
    setCurrentChat(null);
    if (character?.id) {
      loadChatHistory();
    }
  }, [character]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.chatHistory]);

  // Audio transcription function (your existing implementation)
  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Audio blob is empty or invalid');
      }

      const formData = new FormData();
      formData.append('voice', audioBlob, 'recording.webm');
      formData.append('data_type', 'binary_audio');
      formData.append('model_name', 'gpt_4o_mini_transcribe');
      formData.append('file_name', 'recording.webm');

      const response = await useApi(
        '/transcription',
        {
          method: 'POST',
          body: formData,
        },
        access_token
      );

      if (!response.ok) {
        const errorText = await response.text();
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

  // Recording functions (your existing implementation)
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

      audioChunksRef.current = [];
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
        stream.getTracks().forEach((track) => track.stop());

        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: 'audio/webm;codecs=opus',
          });

          setIsTranscribing(true);

          try {
            const transcribedText = await transcribeAudio(audioBlob);
            if (transcribedText && transcribedText.trim()) {
              setInputMessage((prev) => {
                const newText = transcribedText.trim();
                return prev.trim() ? prev + ' ' + newText : newText;
              });
            }
          } catch (error) {
            console.error('Failed to transcribe audio:', error);
          } finally {
            setIsTranscribing(false);
          }
        } else {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;

    try {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }

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
        access_token
      );
      loadChatHistory();
    } catch (error) {
      console.error('Failed toggling return type:', error);
    }
  };

  const handleUserMessage = () => {
    if (!inputMessage.trim() || isTyping || !currentChat?.data.id) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage.trim(),
    };

    updateChatHistory(userMessage, currentChat.data.id);

    setInputMessage('');

    sendMessage(userMessage, currentChat.data.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!inputMessage.trim() || isTyping || !currentChat?.data.id) return;

      const userMessage: Message = {
        role: 'user',
        content: inputMessage.trim(),
      };

      updateChatHistory(userMessage, currentChat.data.id);

      setInputMessage('');

      sendMessage(userMessage, currentChat.data.id);
    }
  };

  const handleDeleteChat = async (
    id: string | undefined,
    character_id: string
  ) => {
    setDeleteLoading(true);
    try {
      await useApi(
        `/chats/${id}`,
        {
          method: 'DELETE',
        },
        access_token
      );
      deleteChat(id!);
      deleteCharacter(character_id!);
      setDeleteLoading(false);

      const nextCharacter = characters?.[0];
      setCharacter(nextCharacter!);
      setChats(
        chats?.find(
          (chat) =>
            chat?.data?.relationships?.character?.id === nextCharacter?.id
        )!
      );
      setCurrentChat(
        chats?.find(
          (chat) =>
            chat?.data?.relationships?.character?.id === nextCharacter?.id
        )!
      );
      return;
    } catch (error) {
      setDeleteLoading(false);
      return error;
    }
  };

  const introVideo = character?.relationships?.videos?.find(
    (video) => video.attributes.type === 'intro'
  );

  console.log({ introVideo, currentChat, character });
  return (
    <div className="flex h-screen bg-gray-900">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        ${isMobile ? 'fixed left-0 top-0 h-full z-50' : 'relative'}
        ${sidebarOpen ? (isMobile ? 'w-80' : 'w-64') : 'w-0'} 
        transition-all duration-300 bg-gray-900 border-r border-gray-700 flex flex-col overflow-hidden
        ${isMobile && !sidebarOpen ? 'translate-x-full' : 'translate-x-0'}
      `}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-b border-gray-700 py-4">
          <Link
            href={'/'}
            onClick={() => {
              setCurrentChat(null);
            }}
            className="flex items-center w-full p-2 text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">New chat</span>
          </Link>
        </div>

        {/* Chat List */}
        <ChatList
          characters={characters}
          chats={chats}
          currentChat={currentChat!}
          setCharacter={setCharacter}
          deleteLoading={deleteLoading}
          handleDeleteChat={(id: string, character_id: string) => {
            handleDeleteChat(id, character_id);
          }}
        />

        <div className="p-3 border-t border-gray-700">
          <div className="flex items-center space-x-3">
            <Image
              src={character?.attributes?.avatar || '/default-avatar.png'}
              alt={character?.attributes?.name || 'User'}
              width={32}
              height={32}
              className="rounded-full"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {character?.attributes.name}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {chats?.find(
                  (c) => c?.data?.relationships?.character?.id === character?.id
                )?.chatHistory &&
                chats?.find(
                  (c) => c?.data?.relationships?.character?.id === character?.id
                )?.chatHistory?.length! > 0
                  ? chats
                      ?.find(
                        (c) =>
                          c?.data?.relationships?.character?.id ===
                          character?.id
                      )
                      ?.chatHistory?.[
                        chats?.find(
                          (c) =>
                            c?.data?.relationships?.character?.id ===
                            character?.id
                        )?.chatHistory?.length! - 1
                      ]?.content.slice(0, 30) + '...'
                  : 'New conversation'}
              </p>
            </div>
            <div className="ml-2">
              <Dialog>
                <DialogTrigger className="cursor-pointer">
                  <FiTrash />
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-black">
                      Are you absolutely sure?
                    </DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. This will permanently delete
                      your account and remove your data from our servers.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose>
                      <Button variant={'outline'} className="text-black">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      onClick={() => {
                        handleDeleteChat(
                          chats?.find(
                            (chat) =>
                              chat.data.relationships.character.id ===
                              character?.id
                          )?.data?.id,
                          character?.id!
                        );
                      }}
                      className="bg-red-500"
                    >
                      {deleteLoading && (
                        <Loader2 className="mr-2 h-6 w-6 animate-spin text-pink-500" />
                      )}
                      Yes, Delete chat
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gray-800">
        {/* Header */}
        <div className="border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 cursor-pointer text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center gap-x-1">
                <h1 className="text-lg font-semibold text-gray-100">
                  {character?.attributes?.name}
                </h1>
                <div className="bg-green-400 h-2 w-2 rounded-full"></div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Response Type Toggle */}
              <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-2">
                <span className="text-xs text-gray-400">
                  {currentChat?.data?.attributes?.return_type || response_type}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer text-lg"
                    checked={response_type === 'voice'}
                    onChange={toggleResponseType}
                  />
                  <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {sidebarOpen && (
                <Button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              {/* <button className="p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition-colors">
                <Settings className="w-5 h-5" />
              </button> */}
            </div>
          </div>
        </div>

        {!isLoading && !currentChat && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            {/* Intro Video */}
            {introVideo && (
              <video
                src={introVideo.attributes.url}
                autoPlay
                controls
                className="w-full max-w-md rounded-xl shadow-lg"
                poster={character?.attributes?.avatar}
              >
                Your browser does not support the video tag.
              </video>
            )}

            {/* Relationship Selection */}
            <div className="mt-8 space-y-4">
              <h3 className="text-xl font-semibold text-white">
                Choose a relationship
              </h3>
              <div className="flex flex-wrap justify-center gap-2">
                {relationshipTypes.map((type) => (
                  <Button
                    key={type}
                    variant={
                      selectedRelationship === type ? 'default' : 'outline'
                    }
                    className={`bg-white text-black ${
                      selectedRelationship === type &&
                      'border bg-emerald-500 text-white'
                    }`}
                    onClick={() => setSelectedRelationship(type)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
              <Button
                onClick={createNewChat}
                disabled={isCreatingChat || !selectedRelationship}
                className="bg-gray-900 border h-12 px-7 rounded-full"
              >
                {isCreatingChat && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Befriend
              </Button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-10 w-10 m-auto animate-spin text-pink-500" />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto p-4 space-y-4">
              {currentChat?.chatHistory?.map((message, index) => {
                return (
                  <div key={index} className="group">
                    <div
                      className={`flex items-start space-x-3 ${
                        message.role === 'user'
                          ? 'flex-row-reverse space-x-reverse'
                          : ''
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {message.role === 'assistant' ? (
                          <Image
                            src={character?.attributes?.avatar!}
                            alt={character?.attributes?.name!}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              U
                            </span>
                          </div>
                        )}
                      </div>
                      <div
                        className={`flex-1 max-w-[80%] ${
                          message.role === 'user' ? 'text-right' : ''
                        }`}
                      >
                        {message.messageType === 'video' ? (
                          <div className="inline-block bg-gray-800 rounded-lg overflow-hidden">
                            <video
                              src={message.videoUrl}
                              controls
                              className="w-80 h-auto rounded-lg"
                              poster={character?.attributes?.avatar} // Use character avatar as poster
                            >
                              Your browser does not support the video tag.
                            </video>
                          </div>
                        ) : (
                          // Regular text message
                          <div
                            className={`inline-block p-3 rounded-lg ${
                              message.role === 'user'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-gray-800 text-gray-100'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">
                              {message.content}
                            </p>
                          </div>
                        )}
                        {message.moderationFailed && (
                          <p className="text-xs text-red-500 mt-1">
                            ⚠️ Message flagged
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex items-start space-x-3">
                  <Image
                    src={character?.attributes?.avatar!}
                    alt={character?.attributes?.name!}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                  <div className="bg-gray-800 rounded-lg p-3">
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
          )}
        </div>

        {/* Input Area */}
        <div className="border-gray-700 py-4">
          {/* Recording Status */}
          {(isRecording || isTranscribing) && (
            <div className="mb-3 text-center">
              {isRecording && (
                <div className="flex items-center justify-center space-x-2 text-red-500">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">
                    Recording... {formatTime(recordingTime)}
                  </span>
                </div>
              )}
              {isTranscribing && (
                <div className="flex items-center justify-center space-x-2 text-emerald-500">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">Transcribing...</span>
                </div>
              )}
            </div>
          )}

          <div className="max-w-3xl mx-auto">
            <div className="flex items-center space-x-3">
              {/* Voice Recording Button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
                className={`flex-shrink-0 p-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : isTranscribing
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {isRecording ? (
                  <Square className="w-5 h-5" />
                ) : isTranscribing ? (
                  <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isRecording
                      ? 'Recording audio...'
                      : isTranscribing
                      ? 'Transcribing audio...'
                      : 'Type a message...'
                  }
                  disabled={isRecording || isTranscribing}
                  className="w-full p-3 text-lg pr-12 border border-gray-600 rounded-xl bg-zinc-800 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed max-h-32"
                  rows={1}
                />
              </div>

              {/* Send Button */}
              <Button
                onClick={handleUserMessage}
                disabled={
                  !inputMessage.trim() ||
                  isTyping ||
                  isRecording ||
                  isTranscribing
                }
                className="flex-shrink-0 p-3 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>

            {/* Control Buttons */}
            {(isTyping || isSpeaking) && (
              <div className="flex justify-center mt-3 space-x-2">
                {isSpeaking && (
                  <button
                    onClick={toggleMute}
                    className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors flex items-center space-x-1"
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                    <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsTyping(false);
                    setIsSpeaking(false);
                    stopResponse();
                  }}
                  className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors flex items-center space-x-1"
                >
                  <X className="w-4 h-4" />
                  <span>Stop</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
