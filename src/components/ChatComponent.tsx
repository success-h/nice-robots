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
  Edit2,
  PanelRight,
} from 'lucide-react';
import useUserStore, {
  Message,
  useModerationHandling,
} from '@/zustand/useStore';
import { useApi } from '@/hooks/useApi';
import Image from 'next/image';
import Link from 'next/link';
import ChatList from '@/components/ChatList';
import CreditsComponent from '@/components/CreditsComponent';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MdLocationPin } from 'react-icons/md';
import { toast } from 'sonner';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

type Props = {
  access_token?: string;
};

export default function ChatPage({ access_token }: Props) {
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [relationshipTypes, setRelationshipTypes] = useState<string[]>([]);
  const [selectedRelationship, setSelectedRelationship] = useState<string>('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [highlightRelPrompt, setHighlightRelPrompt] = useState(false);
  const inlineRelHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const relTriggerRef = useRef<HTMLButtonElement | null>(null);

  const {
    currentChat,
    updateChatHistory,
    response_type,
    setChats,
    setResponseType,
    setCurrentChat,
    setCharacter,
    chats,
    isLoggedIn,
    characters,
    deleteChat,
    deleteCharacter,
    character,
    user,
    updateCharacterVideoPlayed,
    plan,
    userPlan,
  } = useUserStore();

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768;
      setIsMobile(isMobileDevice);
      if (isMobileDevice) {
        setSidebarOpen(false);
        setIsRightSidebarOpen(false);
      } else {
        setSidebarOpen(true);
        setIsRightSidebarOpen(true);
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

  const isChatReady = !!currentChat?.data?.id && !isCreatingChat;

  const handlePromptRelationship = () => {
    setHighlightRelPrompt(true);
    if (inlineRelHeadingRef.current) {
      inlineRelHeadingRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    } else {
      // Try to open header relationship popover if possible
      relTriggerRef.current?.click?.();
    }
    window.setTimeout(() => setHighlightRelPrompt(false), 1600);
  };

  const sendMessage = async (message: Message, chatId: string) => {
    setInputMessage('');
    setIsTyping(true);

    try {
      const controller = new AbortController();
      abortController.current = controller;

      const sanitizedHistory = (currentChat?.chatHistory || []).map((msg) => ({
        role: msg.role,
        content: msg.content || '',
      }));

      const response = await useApi(
        `/chat-completions/${chatId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [...sanitizedHistory, message],
          }),
          signal: controller.signal,
        },
        access_token
      );

      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
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
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  details: moderationDetails,
                }),
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
              const assistantMessage: Message = {
                role: 'assistant',
                content: moderationParsedData.data.text,
              };
              updateChatHistory(assistantMessage, currentChat?.data.id!);
            }
            return;
          }
        }

        const parsedData = await response.json();

        const examplesBlock: string = parsedData.data.examples?.length
          ? `\n\n**Examples:**\n${parsedData.data.examples.join('\n\n')}`
          : '';
        const linksBlock: string = parsedData.data.links?.length
          ? `\n\n**Links:**\n${parsedData.data.links.join('\n')}`
          : '';

        let emojiString: string = '';
        if (parsedData.data.emojis?.length > 0) {
          emojiString = parsedData.data.emojis.join(' ') + ' ';
        } else if (parsedData.data.reaction?.length > 0) {
          emojiString = parsedData.data.reaction.join(' ') + ' ';
        }
        const fullContent = [
          parsedData.data.text || '',
          examplesBlock,
          linksBlock,
        ]
          .filter(Boolean)
          .join('');

        const assistantMessage: Message = {
          role: 'assistant',
          content: fullContent,
          displayContent: [],
        };

        if (parsedData.data.text || emojiString) {
          assistantMessage.displayContent!.push({
            type: 'text',
            value: parsedData.data.text
              ? emojiString + parsedData.data.text
              : emojiString.trim(),
          });
        }

        if (parsedData.data.examples?.length > 0) {
          assistantMessage.displayContent!.push({
            type: 'html',
            value: `<br/><br/><strong>Examples:</strong>`,
          });
          parsedData.data.examples.forEach((example: string) => {
            const codeMatch = example.match(
              /<pre><code>([\s\S]*?)<\/code><\/pre>/
            );
            const textMatch = example.match(/<\/code><\/pre>(.*)/);

            if (codeMatch && codeMatch[1]) {
              assistantMessage.displayContent!.push({
                type: 'code',
                value: codeMatch[1].trim(),
              });
              if (textMatch && textMatch[1]) {
                assistantMessage.displayContent!.push({
                  type: 'html',
                  value: `<p>${textMatch[1].trim()}</p>`,
                });
              }
            } else {
              assistantMessage.displayContent!.push({
                type: 'html',
                value: example,
              });
            }
          });
        }

        if (parsedData.data.links?.length > 0) {
          const formattedLinks: string = parsedData.data.links
            .map(
              (link: string) =>
                `<li><a class="text-blue-400" href="${link}" target="_blank" rel="noopener noreferrer">${link}</a></li>`
            )
            .join('');
          assistantMessage.displayContent!.push({
            type: 'html',
            value: `<br/><br/><strong class="text-emerald-500">Links:</strong><ul class="list-disc list-inside">${formattedLinks}</ul>`,
          });
        }

        const isSingleEmoji: boolean = /^\p{Emoji}$/u.test(
          assistantMessage.content.trim()
        );
        if (isSingleEmoji) {
          assistantMessage.isBouncyEmoji = true;
        }

        const isBouncy: boolean =
          parsedData.data.text === '' &&
          (parsedData.data.emojis?.length > 0 ||
            parsedData.data.reaction?.length > 0);

        updateChatHistory(assistantMessage, currentChat?.data.id!, isBouncy);

        if (response_type === 'voice' && parsedData.data.text) {
          await fetchAudioStream(parsedData.data.message_id);
        }
      }
    } catch (error) {
      // @ts-expect-error AbortError
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
        updateChatHistory(userMessage, chatData?.data?.id);
        updateChatHistory(assistantMessage, chatData?.data?.id);
        fetchAudioStream(data?.data?.message_id);
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
    createNewChat();
  }, [selectedRelationship]);

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
        } catch (error) {
          console.error('Failed to fetch relationship types:', error);
        }
      }
    };

    if (!currentChat) {
      fetchRelationshipTypes();
    }
  }, [character?.id, currentChat, access_token]);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.chatHistory]);

  const lastAssistantIndex = currentChat?.chatHistory
    ? currentChat.chatHistory.reduce(
        (acc: number, msg: Message, i: number) =>
          msg.role === 'assistant' ? i : acc,
        -1
      )
    : -1;

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

  const handleUserMessage = () => {
    if (!isChatReady || !inputMessage.trim() || isTyping) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage.trim(),
    };

    updateChatHistory(userMessage, currentChat!.data.id);

    setInputMessage('');

    sendMessage(userMessage, currentChat!.data.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isChatReady || !inputMessage.trim() || isTyping) return;

      const userMessage: Message = {
        role: 'user',
        content: inputMessage.trim(),
      };

      updateChatHistory(userMessage, currentChat!.data.id);

      setInputMessage('');

      sendMessage(userMessage, currentChat!.data.id);
    }
  };

  const handleDeleteChat = async (
    id: string | undefined,
    character_id: string
  ) => {
    try {
      setDeleteLoading(true);

      if (!id) {
        deleteCharacter(character_id!);
        deleteCharacter(character_id!);
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
      }
      await useApi(
        `/chats/${id}`,
        {
          method: 'DELETE',
        },
        access_token
      );
      deleteChat(id!);
      deleteCharacter(character_id!);
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
    } catch (error) {
      setDeleteLoading(false);
      toast('Unable to delete chat', {
        description: 'Please try again',
        action: {
          label: 'Undo',
          onClick: () => console.log('Undo'),
        },
      });
    }
  };

  useEffect(() => {
    if (user?.data) {
      if (!characters?.length) {
        router.push('/');
      }
      return;
    }
  }, [characters]);

  async function handleRelationshipChange(type: string) {
    try {
      await useApi(
        `/chats/${currentChat?.data?.id}/update-relationship`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            data: { attributes: { relationship_type: type } },
          }),
        },
        access_token
      );
      setSelectedRelationship(type);
      loadChatHistory();
      const userMessage: Message = {
        role: 'user',
        content: `Be my ${type}`,
      };
      updateChatHistory(userMessage, currentChat?.data?.id!);
      sendMessage(userMessage, currentChat?.data?.id!);
    } catch (error) {}
  }

  const introVideo = character?.relationships?.videos?.find(
    (video) => video.attributes.type === 'intro'
  );

  const showVideoIntro = character?.attributes?.video_played;

  useEffect(() => {
    const handleBeforeUnload = () => {
      updateCharacterVideoPlayed(character?.id!);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-900">
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {isMobile && isRightSidebarOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-40 md:hidden"
          onClick={() => setIsRightSidebarOpen(false)}
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
        <div className="relative p-3 border-b border-gray-700 py-4">
          <Link
            href={'/'}
            onClick={() => {
              setCurrentChat(null);
              updateCharacterVideoPlayed(character?.id!);
            }}
            className="flex items-center w-full p-2 pr-10 text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">New chat</span>
          </Link>
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label="Close sidebar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        <ChatList
          characters={characters}
          chats={chats}
          currentChat={currentChat!}
          setCharacter={setCharacter}
          deleteLoading={deleteLoading}
          updateCharacterVideoPlayed={() => {
            updateCharacterVideoPlayed(character?.id!);
          }}
          handleDeleteChat={(id: string, character_id: string) => {
            handleDeleteChat(id, character_id);
          }}
        />

        <div className="p-3 border-t border-gray-700">
          <Link
            href={'/profile'}
            className="flex cursor-pointer items-center space-x-3 w-full text-left text-gray-400 hover:text-white"
          >
            <Image
              src={user?.data?.attributes?.avatar || '/default-avatar.png'}
              alt={character?.attributes?.name || 'profile'}
              width={32}
              height={32}
              className="rounded-full"
            />
            <span>Profile settings</span>
          </Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-800">
        <div className="border-b border-gray-700 p-4">
          <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pl-12 pr-12">
            {/* Mobile sidebar toggles pinned to corners */}
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="absolute top-2 left-2 p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <PanelRight className="w-5 h-5" />
            </button>
            {/* Left utility (sidebar toggle) */}
            <div className="hidden lg:order-1"></div>

            {/* Plan/Credits/Response type and sidebar buttons */}
            <div className="flex flex-col items-start gap-2 lg:flex-row lg:items-center lg:space-x-5 lg:order-2">
              {isLoggedIn && plan && (
                <Popover>
                  <PopoverTrigger asChild>
                    <h1 className="capitalize border rounded-lg flex items-center gap-1 px-3 py-1 font-semibold text-gray-100 cursor-pointer">
                      {((plan as any)?.attributes?.name ?? (plan as any)?.data?.attributes?.name ?? 'Plan')}
                    </h1>
                  </PopoverTrigger>
                  <PopoverContent className="border bg-gray-700 border-gray-400">
                    <div className="space-y-3 text-white">
                      <h3 className="text-xl font-semibold">
                        {((plan as any)?.attributes?.name ?? (plan as any)?.data?.attributes?.name ?? 'Plan')}
                      </h3>
                      {(((plan as any)?.attributes?.description) ?? ((plan as any)?.data?.attributes?.description)) && (
                        <p className="text-sm whitespace-pre-wrap">
                          {((plan as any)?.attributes?.description ?? (plan as any)?.data?.attributes?.description)}
                        </p>
                      )}
                      <div className="text-sm space-y-1">
                        {((((plan as any)?.attributes?.price) ?? ((plan as any)?.data?.attributes?.price)) !== undefined) && (
                          <div>
                            <span className="text-gray-300">Price: </span>
                            <span className="font-medium">
                              {((plan as any)?.attributes?.price ?? (plan as any)?.data?.attributes?.price)}
                            </span>
                          </div>
                        )}
                        {(((plan as any)?.attributes?.duration) ?? ((plan as any)?.data?.attributes?.duration)) && (
                          <div>
                            <span className="text-gray-300">Duration: </span>
                            <span className="font-medium">
                              {((plan as any)?.attributes?.duration ?? (plan as any)?.data?.attributes?.duration)}{' '}
                              {((plan as any)?.attributes?.duration_unit ?? (plan as any)?.data?.attributes?.duration_unit)}
                            </span>
                          </div>
                        )}
                        {(userPlan as any)?.attributes?.start_date && (
                          (() => {
                            const slug = (((plan as any)?.attributes?.slug) ?? ((plan as any)?.data?.attributes?.slug)) as string | undefined;
                            const start = new Date((userPlan as any).attributes.start_date);
                            const end = new Date((userPlan as any).attributes.end_date);
                            const isFreeOrBonus = slug === 'free' || slug === 'bonus';
                            if (isFreeOrBonus) {
                              return (
                                <div>
                                  <span className="text-gray-300">Period: </span>
                                  <span className="font-medium">
                                    {start.toLocaleDateString()} - {end.toLocaleDateString()}
                                  </span>
                                </div>
                              );
                            }
                            const nextCharge = new Date(end);
                            nextCharge.setDate(nextCharge.getDate() + 1);
                            return (
                              <>
                                <div>
                                  <span className="text-gray-300">Last paid on: </span>
                                  <span className="font-medium">{start.toLocaleDateString()}</span>
                                </div>
                                <div>
                                  <span className="text-gray-300">Next charge date: </span>
                                  <span className="font-medium">{nextCharge.toLocaleDateString()}</span>
                                </div>
                              </>
                            );
                          })()
                        )}
                      </div>

                      {(() => {
                        const slug = (((plan as any)?.attributes?.slug) ?? ((plan as any)?.data?.attributes?.slug)) as
                          | string
                          | undefined;
                        return slug && (slug === 'free' || slug === 'bonus');
                      })() && (
                        <div className="pt-2">
                          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => router.push('/plans?from=chat')}>
                            Upgrade to Premium
                          </Button>
                        </div>
                      )}

                      {(() => {
                        const slug = (((plan as any)?.attributes?.slug) ?? ((plan as any)?.data?.attributes?.slug)) as
                          | string
                          | undefined;
                        return slug && slug !== 'free' && slug !== 'bonus';
                      })() && (
                        <div className="pt-2">
                          <Button
                            className="border border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 bg-transparent"
                            onClick={() => router.push('/credits?from=chat')}
                          >
                            Buy credits
                          </Button>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              {isLoggedIn && <CreditsComponent />}
              <Popover>
                <PopoverTrigger asChild>
                  <h1 className="capitalize border rounded-lg flex items-center gap-1 px-3 py-1 font-semibold text-gray-100 cursor-pointer">
                    {response_type} <Edit2 size={15} />
                  </h1>
                </PopoverTrigger>
                <PopoverContent className="border bg-gray-700 border-gray-400">
                  <div className="space-y-4">
                    <RadioGroup
                      onValueChange={(res) => {
                        setResponseType(res);
                        return res;
                      }}
                      value={response_type}
                    >
                      {[
                        {
                          value: 'voice',
                          label: 'Voice',
                        },
                        {
                          value: 'text',
                          label: 'Text',
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center cursor-pointer text-white space-x-2"
                        >
                          <RadioGroupItem value={item.value} id={item.value} />
                          <Label htmlFor={item.value}>{item.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Inline sidebar toggles hidden globally to keep corner icons exclusive */}
              <div className="hidden" />
            </div>

            {/* Relationship selector - placed last on mobile for visibility */}
            <div className="flex items-center gap-x-1 lg:order-3 order-last">
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        disabled={!currentChat}
                        className="text-lg flex items-center font-semibold capitalize text-gray-100 cursor-pointer"
                        ref={relTriggerRef}
                      >
                        <span className="font-bold">
                          {character?.attributes?.name}
                        </span>
                        {currentChat?.data?.attributes?.relationship_type &&
                          ` (${currentChat?.data?.attributes?.relationship_type})`}{' '}
                        <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Change relationship</p>
                  </TooltipContent>
                </Tooltip>

                <PopoverContent className="border bg-gray-700 border-gray-400">
                  <div className="space-y-4">
                    <h3
                      className={`text-xl font-semibold text-white ${
                        highlightRelPrompt
                          ? 'ring-2 ring-emerald-400 rounded-md animate-pulse'
                          : ''
                      }`}
                    >
                      Choose a relationship
                    </h3>
                    <div className="flex flex-wrap justify-self-auto gap-2 text-sm">
                      {relationshipTypes.map((type) => {
                        const isCurrent =
                          currentChat?.data?.attributes?.relationship_type === type;
                        const isSelected = selectedRelationship === type || isCurrent;
                        return (
                          <Button
                            key={type}
                            variant={isSelected ? 'default' : 'outline'}
                            className={`text-white capitalize border-white bg-transparent ${
                              isSelected && 'border bg-black/60 text-white'
                            }`}
                            onClick={() => {
                              if (!isCurrent) handleRelationshipChange(type);
                            }}
                            disabled={isCreatingChat || isCurrent}
                          >
                            {isCreatingChat && isSelected && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {type}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {!isLoading && !currentChat && character && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            {introVideo && (
              <video
                src={introVideo?.attributes?.url}
                autoPlay={!showVideoIntro}
                controls
                className="w-full max-w-md rounded-xl shadow-lg"
                poster={character?.attributes?.avatar}
              >
                Your browser does not support the video tag.
              </video>
            )}

            {/* Relationship Selection */}
            <div className="mt-8 space-y-4">
              <h3
                ref={inlineRelHeadingRef}
                className={`text-xl font-semibold text-white ${
                  highlightRelPrompt
                    ? 'ring-2 ring-emerald-400 rounded-md animate-pulse'
                    : ''
                }`}
              >
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
                    disabled={isCreatingChat && selectedRelationship === type}
                  >
                    {isCreatingChat && selectedRelationship === type && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {type}
                  </Button>
                ))}
              </div>
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
                            src={
                              character?.attributes?.avatar ||
                              '/default-avatar.png'
                            }
                            alt={character?.attributes?.name!}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                            <Image
                              src={
                                user?.data?.attributes?.avatar ||
                                '/default-avatar.png'
                              }
                              alt={character?.attributes?.name!}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                          </div>
                        )}
                      </div>
                      <div
                        className={`flex-1 max-w-[80%] flex ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.messageType === 'video' ? (
                          <div className="inline-block bg-gray-800 rounded-lg overflow-hidden">
                            <video
                              src={message.videoUrl}
                              controls
                              className="w-80 h-auto rounded-lg"
                              poster={character?.attributes?.avatar}
                            >
                              Your browser does not support the video tag.
                            </video>
                          </div>
                        ) : (
                          <div className={`relative inline-block`}>
                            <div
                              className={`inline-block p-3 rounded-lg ${
                                message.role === 'user'
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-gray-800 text-gray-100'
                              }`}
                            >
                            {message.displayContent &&
                            message.displayContent.length > 0 ? (
                              message.displayContent.map(
                                (item, contentIndex) => {
                                  if (item.type === 'code') {
                                    return (
                                      <div key={contentIndex} dir="ltr" style={{ textAlign: 'left' }}>
                                        <SyntaxHighlighter
                                          language="python"
                                          style={oneDark}
                                          customStyle={{
                                            borderRadius: '0.5rem',
                                            marginBottom: '0.75rem',
                                            marginTop: '0.75rem',
                                          }}
                                        >
                                          {item.value}
                                        </SyntaxHighlighter>
                                      </div>
                                    );
                                  } else if (item.type === 'html') {
                                    return (
                                      <div
                                        key={contentIndex}
                                        className={`message-bubble whitespace-pre-wrap ${
                                          message.isBouncyEmoji &&
                                          contentIndex === 0
                                            ? 'bounce-effect text-4xl'
                                            : 'text-sm'
                                        }`}
                                        dir="auto"
                                        dangerouslySetInnerHTML={{
                                          __html: item.value,
                                        }}
                                      />
                                    );
                                  } else if (item.type === 'text') {
                                    const textClasses = message.isBouncyEmoji
                                      ? 'bounce-effect text-4xl'
                                      : 'text-sm whitespace-pre-wrap';
                                    return (
                                      <div
                                        key={contentIndex}
                                        className={`message-bubble ${textClasses}`}
                                        dir="auto"
                                      >
                                        {item.value}
                                      </div>
                                    );
                                  }
                                  return null;
                                }
                              )
                            ) : (
                              <div
                                className={`message-bubble whitespace-pre-wrap ${
                                  message.isBouncyEmoji
                                    ? 'bounce-effect text-4xl'
                                    : 'text-sm'
                                }`}
                                dir="auto"
                                dangerouslySetInnerHTML={{
                                  __html: message.content,
                                }}
                              />
                            )}
                            </div>
                            {message.role === 'assistant' &&
                              response_type === 'voice' &&
                              isSpeaking &&
                              index === lastAssistantIndex && (
                                <div className="pointer-events-none absolute inset-0 rounded-lg overflow-hidden">
                                  <div
                                    className="w-full h-full opacity-100"
                                    style={{
                                      background:
                                        'linear-gradient(120deg, rgba(255,99,132,0.95), rgba(255,205,86,0.95), rgba(54,162,235,0.95), rgba(153,102,255,0.95))',
                                      backgroundSize: '300% 300%',
                                      animation: 'rainbowSheen 8.4s ease-in-out infinite',
                                      backdropFilter: 'blur(4px)'
                                    }}
                                  />
                                  <div
                                    className="absolute top-0 right-0 h-full"
                                    style={{
                                      width: '33%',
                                      backgroundImage: `url(${character?.attributes?.avatar || '/default-avatar.png'})`,
                                      backgroundSize: 'cover',
                                      backgroundPosition: 'center',
                                      backgroundRepeat: 'no-repeat',
                                      opacity: 0.32,
                                      mixBlendMode: 'soft-light',
                                      animation: 'pulseGlow 2.6s ease-in-out infinite'
                                    }}
                                  />
                                  <div
                                    className="absolute inset-0 opacity-50"
                                    style={{
                                      background:
                                        'repeating-conic-gradient(from 0deg, rgba(255,255,255,0.18) 0deg, rgba(255,255,255,0.18) 6deg, transparent 8deg, transparent 16deg)',
                                      transform: 'rotate(0deg)',
                                      animation: 'rotateRays 30s linear infinite',
                                      mixBlendMode: 'soft-light',
                                      WebkitMaskImage:
                                        'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0.5) 65%, rgba(0,0,0,0) 100%)',
                                      maskImage:
                                        'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0.5) 65%, rgba(0,0,0,0) 100%)'
                                    }}
                                  />
                                </div>
                              )}
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

          <div className="max-w-3xl mx-auto relative">
            {!isChatReady && (
              <button
                type="button"
                aria-label="Choose a relationship first"
                onClick={handlePromptRelationship}
                className="absolute inset-0 z-10 bg-transparent cursor-not-allowed"
              />
            )}
            <div className="flex items-center space-x-3">
              {/* Voice Recording Button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!isChatReady || isTranscribing}
                className={`hidden lg:inline-flex flex-shrink-0 p-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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
                  disabled={!isChatReady || isRecording || isTranscribing}
                  className="w-full p-3 text-lg pr-12 border border-gray-600 rounded-xl bg-zinc-800 text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed max-h-32"
                  rows={1}
                />
              </div>

              {/* Send Button */}
              <Button
                onClick={handleUserMessage}
                disabled={
                  !isChatReady ||
                  !inputMessage.trim() ||
                  isTyping ||
                  isRecording ||
                  isTranscribing
                }
                className="hidden lg:inline-flex flex-shrink-0 p-3 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>

            {/* Mobile compose bar (mic + send below textarea) */}
            {!isTyping && !isSpeaking && (
              <div className="lg:hidden mt-3 flex items-center justify-center gap-4">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!isChatReady || isTranscribing}
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
                <Button
                  onClick={handleUserMessage}
                  disabled={
                    !isChatReady ||
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
            )}

            {/* Control Buttons */}
            {(isTyping || isSpeaking) && (
              <div className="hidden lg:flex justify-center mt-3 space-x-2">
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

            {/* Mobile interrupt bar */}
            {(isTyping || isSpeaking) && (
              <div className="lg:hidden mt-3 flex items-center justify-center gap-2">
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
      <div
        className={`
        ${isMobile ? 'fixed right-0 top-0 h-full z-50' : 'relative'}
        ${isRightSidebarOpen ? (isMobile ? 'w-80' : 'w-72') : 'w-0'} 
        transition-all duration-300 bg-gray-900 border-l border-gray-700 flex flex-col overflow-hidden
        ${
          isMobile && !isRightSidebarOpen ? 'translate-x-full' : 'translate-x-0'
        }
      `}
      >
        {isRightSidebarOpen && character && (
          <div>
            <Carousel>
              <CarouselContent className="h-[400px]">
                {character?.relationships?.images?.map((item, key) => {
                  return (
                    <CarouselItem className="w-full h-full" key={key}>
                      <Image
                        key={item.id}
                        className="h-full w-full object-cover"
                        src={item?.attributes?.url}
                        height={500}
                        width={300}
                        alt={item?.type}
                      />
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselPrevious className="ml-12 text-black" />
              <CarouselNext className="mr-12 text-black" />
            </Carousel>

            <div className="p-4 flex flex-col items-center space-y-4 h-full">
              <div className=" bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="text-white">
                  <h2 className="text-2xl font-bold">
                    {character.attributes.name}
                  </h2>
                  <p className="text-sm mt-1 whitespace-pre-wrap">
                    {character.attributes.summary}
                  </p>
                  <div className="mt-3 gap-2 flex items-start">
                    <MdLocationPin size={20} />

                    <p className="text-sm text-gray-400 whitespace-pre-wrap">
                      {character.attributes.residence_intro}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes rainbowSheen {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes rotateRays {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulseGlow {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
