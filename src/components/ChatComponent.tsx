'use client';

import CharacterDetailsSidebar from '@/components/CharacterDetailsSidebar';
import ChatHeader from '@/components/ChatHeader';
import ChatSidebar from '@/components/ChatSidebar';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useApi } from '@/hooks/useApi';
import useUserStore, {
  Message,
  useModerationHandling,
} from '@/zustand/useStore';
import { Loader2, Mic, Send, Square, Volume2, VolumeX, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { toast } from 'sonner';

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
  const [isMobile, setIsMobile] = useState(false);
  const [currentPlayingMessageId, setCurrentPlayingMessageId] = useState<
    string | null
  >(null);
  const [finishedAudioMessageIds, setFinishedAudioMessageIds] = useState<
    Set<string>
  >(new Set());
  // Load sidebar state from localStorage
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rightSidebarOpen');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [viewportWidth, setViewportWidth] = useState(0);
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
      setViewportWidth(window.innerWidth);
      if (isMobileDevice) {
        // On mobile, close right sidebar
        setIsRightSidebarOpen(false);
      } else {
        // On desktop, respect user's preference for right sidebar
        const saved = localStorage.getItem('rightSidebarOpen');
        if (saved !== null) {
          setIsRightSidebarOpen(saved === 'true');
        }
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Save right sidebar state to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && !isMobile) {
      localStorage.setItem('rightSidebarOpen', String(isRightSidebarOpen));
    }
  }, [isRightSidebarOpen, isMobile]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { handleModerationFailure } = useModerationHandling();

  const isChatReady = !!currentChat?.data?.id && !isCreatingChat;

  // Auto-resize textarea to fit content while keeping mic/send aligned to top
  const autoResizeTextarea = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    // Baseline = original height (h-11 ≈ 44px)
    const basePx = 44;
    const maxPx = 240; // soft cap (~15 lines)
    // Reset to baseline first to measure correctly
    el.style.height = `${basePx}px`;
    const needed = Math.max(el.scrollHeight, basePx);
    el.style.height = `${Math.min(needed, maxPx)}px`;
  };

  useEffect(() => {
    // Re-calc when programmatically setting text (e.g., transcript appended)
    autoResizeTextarea(textareaRef.current);
  }, [inputMessage]);

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
    // Validation: Check required parameters
    if (!currentChat?.data?.id) {
      console.error('Cannot send message: currentChat.data.id is missing');
      return;
    }
    if (!chatId || chatId.trim() === '') {
      console.error('Cannot send message: chatId is missing or empty');
      toast.error('Invalid chat ID. Please try again.');
      return;
    }
    if (!message || !message.content || message.content.trim() === '') {
      console.error('Cannot send message: message content is missing or empty');
      return;
    }

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
              currentChat.data.id,
              errorData.details
            );
            // Validation: Check required parameters for moderation resolution
            if (!currentChat?.data?.id) {
              console.error(
                'Cannot resolve moderation: currentChat.data.id is missing'
              );
              return;
            }
            if (!moderationDetails) {
              console.error(
                'Cannot resolve moderation: moderationDetails is missing'
              );
              return;
            }

            const moderationResponse = await useApi(
              `/moderation-resolutions/${currentChat.data.id}`,
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
                // Validation is handled inside fetchAudioStream
                await fetchAudioStream(moderationParsedData.data.message_id);
              }
              const assistantMessage: Message = {
                role: 'assistant',
                content: moderationParsedData.data.text,
                messageId: moderationParsedData.data.message_id,
              };
              updateChatHistory(assistantMessage, currentChat.data.id);
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

        // For text mode, strip markdown formatting; for voice mode, keep it for displayContent
        const textContent = parsedData.data.text || '';
        const shouldStripMarkdown = response_type === 'text';

        // Helper to process text and extract code blocks
        const processTextWithCodeBlocks = (
          text: string
        ): Array<{ type: 'text' | 'code'; value: string }> => {
          const result: Array<{ type: 'text' | 'code'; value: string }> = [];

          // Match code blocks (```language\ncode\n```)
          const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
          let lastIndex = 0;
          let match;

          while ((match = codeBlockRegex.exec(text)) !== null) {
            // Add text before code block
            if (match.index > lastIndex) {
              const textBefore = text.substring(lastIndex, match.index);
              if (textBefore.trim()) {
                result.push({
                  type: 'text',
                  value: shouldStripMarkdown
                    ? stripMarkdown(textBefore)
                    : textBefore,
                });
              }
            }

            // Add code block
            result.push({
              type: 'code',
              value: match[2].trim(),
            });

            lastIndex = match.index + match[0].length;
          }

          // Add remaining text after last code block
          if (lastIndex < text.length) {
            const textAfter = text.substring(lastIndex);
            if (textAfter.trim()) {
              result.push({
                type: 'text',
                value: shouldStripMarkdown
                  ? stripMarkdown(textAfter)
                  : textAfter,
              });
            }
          }

          // If no code blocks found, return entire text as single item
          if (result.length === 0) {
            result.push({
              type: 'text',
              value: shouldStripMarkdown ? stripMarkdown(text) : text,
            });
          }

          return result;
        };

        // Helper to strip markdown (but preserve code blocks which are handled separately)
        const stripMarkdown = (text: string): string => {
          return text
            .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
            .replace(/\*(.*?)\*/g, '$1') // Italic
            .replace(/__(.*?)__/g, '$1') // Bold alt
            .replace(/_(.*?)_/g, '$1') // Italic alt
            .replace(/`([^`]+)`/g, '$1') // Inline code (but not code blocks)
            .replace(/#{1,6}\s+(.*)/g, '$1') // Headers
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Links
            .replace(/^\s*[-*+]\s+/gm, '') // List items
            .replace(/^\s*\d+\.\s+/gm, '') // Numbered lists
            .trim();
        };

        const assistantMessage: Message = {
          role: 'assistant',
          content: fullContent,
          displayContent: [],
          messageId: parsedData.data.message_id,
        };

        if (parsedData.data.text || emojiString) {
          if (!assistantMessage.displayContent) {
            assistantMessage.displayContent = [];
          }

          // Process text and extract code blocks
          const processedParts = processTextWithCodeBlocks(
            parsedData.data.text || ''
          );

          processedParts.forEach((part, idx) => {
            if (part.type === 'code') {
              assistantMessage.displayContent!.push({
                type: 'code',
                value: part.value,
              });
            } else {
              // Add emoji prefix only to first text part
              const textValue =
                idx === 0 && emojiString
                  ? emojiString + part.value
                  : part.value;
              if (textValue.trim()) {
                assistantMessage.displayContent!.push({
                  type: 'text',
                  value: textValue,
                });
              }
            }
          });
        }

        if (parsedData.data.examples?.length > 0) {
          if (!assistantMessage.displayContent) {
            assistantMessage.displayContent = [];
          }
          assistantMessage.displayContent.push({
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
          if (!assistantMessage.displayContent) {
            assistantMessage.displayContent = [];
          }
          const formattedLinks: string = parsedData.data.links
            .map(
              (link: string) =>
                `<li><a class="text-blue-400" href="${link}" target="_blank" rel="noopener noreferrer">${link}</a></li>`
            )
            .join('');
          assistantMessage.displayContent.push({
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

        updateChatHistory(assistantMessage, currentChat.data.id, isBouncy);

        if (
          response_type === 'voice' &&
          parsedData.data.text &&
          parsedData.data.message_id
        ) {
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
    // Validation: Check required parameters
    if (!messageId || messageId.trim() === '') {
      console.error('Cannot fetch audio stream: messageId is missing or empty');
      toast.error('Invalid message ID. Cannot fetch audio.');
      return;
    }

    try {
      setIsSpeaking(true);
      setCurrentPlayingMessageId(messageId);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        URL.revokeObjectURL(audioRef.current.src);
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
        setCurrentPlayingMessageId(null);
        // Mark as finished even if empty, so text shows
        setFinishedAudioMessageIds((prev) => new Set(prev).add(messageId));
        return;
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        setCurrentPlayingMessageId(null);
        setFinishedAudioMessageIds((prev) => new Set(prev).add(messageId));
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setCurrentPlayingMessageId(null);
        // Mark as finished on error too, so text shows
        setFinishedAudioMessageIds((prev) => new Set(prev).add(messageId));
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      if (!isMuted) {
        await audio.play();
      } else {
        // If muted, mark as finished immediately so text shows
        setFinishedAudioMessageIds((prev) => new Set(prev).add(messageId));
      }
    } catch (error) {
      console.error('Speech stream error:', error);
      setIsSpeaking(false);
      setCurrentPlayingMessageId(null);
      // Mark as finished on error, so text shows
      setFinishedAudioMessageIds((prev) => new Set(prev).add(messageId));
    }
  };

  const createNewChat = async () => {
    // Validation: Check required parameters
    if (!character?.id || character.id.trim() === '') {
      console.error('Cannot create chat: character.id is missing or empty');
      toast.error('Character ID is required to create a chat.');
      return;
    }
    if (!selectedRelationship || selectedRelationship.trim() === '') {
      console.error(
        'Cannot create chat: selectedRelationship is missing or empty'
      );
      toast.error('Please select a relationship type.');
      return;
    }
    if (isCreatingChat) {
      console.warn('Chat creation already in progress');
      return;
    }

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

      // Check if the chat already exists (422 error)
      if (!response.ok && response.status === 422) {
        const errorMessage = data?.errors?.user_id?.[0] || '';
        if (errorMessage.includes('already exists')) {
          // Chat already exists, fetch the existing chat instead
          const chatData = await loadChatHistory();
          if (chatData?.data?.id) {
            // Chat loaded successfully, no need to add initial messages
            return;
          }
        }
        // If it's a different error, throw it
        throw new Error(errorMessage || 'Failed to create chat');
      }

      if (data?.data) {
        const chatData = await loadChatHistory();
        if (chatData?.data?.id) {
          const userMessage: Message = {
            role: 'user',
            content: `Be my ${selectedRelationship}`,
          };
          const assistantMessage: Message = {
            role: 'assistant',
            content: data.data.text || '',
            messageId: data.data.message_id,
          };
          updateChatHistory(userMessage, chatData.data.id);
          updateChatHistory(assistantMessage, chatData.data.id);
          if (data.data.message_id && response_type === 'voice') {
            await fetchAudioStream(data.data.message_id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to create new chat:', error);
      toast.error('Failed to create chat. Please try again.');
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
      const src = audioRef.current.src;
      audioRef.current.src = '';
      if (src && src.startsWith('blob:')) {
        URL.revokeObjectURL(src);
      }
      audioRef.current = null;
    }
    setIsSpeaking(false);
  };

  useEffect(() => {
    if (selectedRelationship && character?.id && !isCreatingChat) {
      createNewChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRelationship]);

  useEffect(() => {
    const fetchRelationshipTypes = async () => {
      // Validation: Check required parameters
      if (!character?.id || character.id.trim() === '') {
        console.error(
          'Cannot fetch relationship types: character.id is missing or empty'
        );
        return;
      }

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
    };

    if (!currentChat) {
      fetchRelationshipTypes();
    }
  }, [character?.id, currentChat, access_token]);

  // Removed auto-resize to keep textarea at fixed height (h-11)

  const loadChatHistory = async () => {
    // Validation: Check required parameters
    if (!character?.id || character.id.trim() === '') {
      console.error(
        'Cannot load chat history: character.id is missing or empty'
      );
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await useApi(
        `/chats/by-character/${character.id}`,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id]);

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
    // Validation: Check required parameters
    if (!audioBlob) {
      console.error('Cannot transcribe audio: audioBlob is missing');
      throw new Error('Audio blob is missing');
    }
    if (audioBlob.size === 0) {
      console.error('Cannot transcribe audio: audioBlob is empty');
      throw new Error('Audio blob is empty');
    }

    try {
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
      const transcribedText =
        result.text || result.data?.text || result.data?.transcription;
      if (!transcribedText) {
        console.error('Transcription response:', result);
        throw new Error('No transcription text found in response');
      }
      return transcribedText;
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
            } else {
              toast.error('No transcription received. Please try again.');
            }
          } catch (error) {
            console.error('Failed to transcribe audio:', error);
            const errorMessage =
              error instanceof Error ? error.message : 'Transcription failed';
            toast.error(`Transcription failed: ${errorMessage}`);
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
    if (
      !isChatReady ||
      !inputMessage.trim() ||
      isTyping ||
      !currentChat?.data?.id
    )
      return;

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
      if (
        !isChatReady ||
        !inputMessage.trim() ||
        isTyping ||
        !currentChat?.data?.id
      )
        return;

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
    // Validation: Check required parameters
    if (!character_id || character_id.trim() === '') {
      console.error('Cannot delete chat: character_id is missing or empty');
      toast.error('Character ID is required to delete chat.');
      return;
    }

    try {
      setDeleteLoading(true);

      if (!id) {
        // If no chat ID, just delete the character from local state
        deleteCharacter(character_id);
        const nextCharacter = characters?.[0];
        if (nextCharacter) {
          setCharacter(nextCharacter);
          const nextChat = chats?.find(
            (chat) =>
              chat?.data?.relationships?.character?.id === nextCharacter.id
          );
          if (nextChat) {
            setChats(nextChat);
            setCurrentChat(nextChat);
          } else {
            setCurrentChat(null);
          }
        } else {
          setCharacter(null);
          setCurrentChat(null);
        }
        setDeleteLoading(false);
        return;
      }

      // Validation: Check chat ID before API call
      if (id.trim() === '') {
        console.error('Cannot delete chat: chat id is empty');
        toast.error('Invalid chat ID. Cannot delete chat.');
        setDeleteLoading(false);
        return;
      }

      await useApi(
        `/chats/${id}`,
        {
          method: 'DELETE',
        },
        access_token
      );
      deleteChat(id);
      deleteCharacter(character_id);
      const nextCharacter = characters?.[0];
      if (nextCharacter) {
        setCharacter(nextCharacter);
        const nextChat = chats?.find(
          (chat) =>
            chat?.data?.relationships?.character?.id === nextCharacter.id
        );
        if (nextChat) {
          setChats(nextChat);
          setCurrentChat(nextChat);
        } else {
          setCurrentChat(null);
        }
      } else {
        setCharacter(null);
        setCurrentChat(null);
      }
      setDeleteLoading(false);
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
    }
  }, [characters, user?.data, router]);

  async function handleRelationshipChange(type: string) {
    // Validation: Check required parameters
    if (!currentChat?.data?.id || currentChat.data.id.trim() === '') {
      console.error(
        'Cannot update relationship: currentChat.data.id is missing or empty'
      );
      toast.error('Chat ID is required to update relationship.');
      return;
    }
    if (!type || type.trim() === '') {
      console.error(
        'Cannot update relationship: relationship type is missing or empty'
      );
      toast.error('Please select a valid relationship type.');
      return;
    }

    try {
      await useApi(
        `/chats/${currentChat.data.id}/update-relationship`,
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
      updateChatHistory(userMessage, currentChat.data.id);
      sendMessage(userMessage, currentChat.data.id);
    } catch (error) {
      console.error('Failed to update relationship:', error);
    }
  }

  const introVideo = character?.relationships?.videos?.find(
    (video) => video.attributes.type === 'intro'
  );

  const showVideoIntro = !character?.attributes?.video_played;
  const computedAutoPlay = showVideoIntro;

  // (debug instrumentation removed)

  useEffect(() => {
    if (!character?.id) return;

    const handleBeforeUnload = () => {
      updateCharacterVideoPlayed(character.id);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [character?.id, updateCharacterVideoPlayed]);

  return (
    <SidebarProvider>
      {isMobile && isRightSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
          onClick={() => {
            setIsRightSidebarOpen(false);
            if (typeof window !== 'undefined') {
              localStorage.setItem('rightSidebarOpen', 'false');
            }
          }}
        />
      )}

      <ChatSidebar
        deleteLoading={deleteLoading}
        handleDeleteChat={handleDeleteChat}
        relationshipTypes={relationshipTypes}
        selectedRelationship={selectedRelationship}
        handleRelationshipChange={handleRelationshipChange}
        highlightRelPrompt={highlightRelPrompt}
        relTriggerRef={relTriggerRef}
        isCreatingChat={isCreatingChat}
      />

      <SidebarInset className="flex flex-col bg-background overflow-x-hidden h-screen">
        <ChatHeader
          isRightSidebarOpen={isRightSidebarOpen}
          setIsRightSidebarOpen={setIsRightSidebarOpen}
          relationshipTypes={relationshipTypes}
          selectedRelationship={selectedRelationship}
          handleRelationshipChange={handleRelationshipChange}
          highlightRelPrompt={highlightRelPrompt}
          relTriggerRef={relTriggerRef}
          isCreatingChat={isCreatingChat}
        />

        {!isLoading && !currentChat && character && (
          <div className="flex flex-col items-center justify-center h-full text-center p-3 sm:p-4">
            {introVideo && (
              <video
                src={introVideo?.attributes?.url}
                autoPlay={computedAutoPlay}
                controls
                className="w-full max-w-[calc(100vw-2rem)] sm:max-w-md rounded-xl shadow-lg"
                poster={character?.attributes?.avatar}
                preload="metadata"
                onPlay={() => {
                  // Mark video as played exactly when it starts to avoid re-autoplay on revisits
                  if (character?.id) {
                    updateCharacterVideoPlayed(character.id);
                  }
                }}
                onError={(e) => {
                  const videoElement = e.currentTarget as HTMLVideoElement;
                  const errorDetails = {
                    error: videoElement.error,
                    errorCode: videoElement.error?.code,
                    errorMessage: videoElement.error?.message,
                    networkState: videoElement.networkState,
                    readyState: videoElement.readyState,
                    src: videoElement.src,
                    currentSrc: videoElement.currentSrc,
                    videoUrl: introVideo?.attributes?.url,
                    characterId: character?.id,
                    characterName: character?.attributes?.name,
                    videoType: introVideo?.attributes?.type,
                    timestamp: new Date().toISOString(),
                  };

                  console.error(
                    'Video loading error - Full details:',
                    errorDetails
                  );
                  console.error('Video element state:', {
                    networkState: videoElement.networkState,
                    readyState: videoElement.readyState,
                    paused: videoElement.paused,
                    ended: videoElement.ended,
                    duration: videoElement.duration,
                    currentTime: videoElement.currentTime,
                    buffered:
                      videoElement.buffered.length > 0
                        ? {
                            start: videoElement.buffered.start(0),
                            end: videoElement.buffered.end(0),
                          }
                        : null,
                  });

                  if (videoElement.error) {
                    const errorMessages: Record<number, string> = {
                      1: 'MEDIA_ERR_ABORTED - The video download was aborted',
                      2: 'MEDIA_ERR_NETWORK - A network error occurred',
                      3: 'MEDIA_ERR_DECODE - The video could not be decoded',
                      4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - The video format is not supported',
                    };
                    console.error(
                      'Video error code:',
                      videoElement.error.code,
                      '-',
                      errorMessages[videoElement.error.code] || 'Unknown error'
                    );
                    console.error(
                      'Video error message:',
                      videoElement.error.message
                    );
                  }

                  toast.error(
                    'Failed to load intro video. Please try refreshing.'
                  );
                }}
                onLoadStart={() => {
                  const videoElement = document.querySelector(
                    'video[preload="metadata"]'
                  ) as HTMLVideoElement;
                  console.log('Video loading started:', {
                    src: introVideo?.attributes?.url,
                    characterId: character?.id,
                    characterName: character?.attributes?.name,
                    timestamp: new Date().toISOString(),
                  });
                }}
                onCanPlay={() => {
                  const videoElement = document.querySelector(
                    'video[preload="metadata"]'
                  ) as HTMLVideoElement;
                  console.log('Video can play:', {
                    duration: videoElement?.duration,
                    readyState: videoElement?.readyState,
                    networkState: videoElement?.networkState,
                    timestamp: new Date().toISOString(),
                  });
                }}
                onLoadedMetadata={() => {
                  const videoElement = document.querySelector(
                    'video[preload="metadata"]'
                  ) as HTMLVideoElement;
                  console.log('Video metadata loaded:', {
                    duration: videoElement?.duration,
                    videoWidth: videoElement?.videoWidth,
                    videoHeight: videoElement?.videoHeight,
                    readyState: videoElement?.readyState,
                    timestamp: new Date().toISOString(),
                  });
                }}
                onLoadedData={() => {
                  console.log('Video data loaded:', {
                    characterId: character?.id,
                    timestamp: new Date().toISOString(),
                  });
                }}
                onProgress={() => {
                  const videoElement = document.querySelector(
                    'video[preload="metadata"]'
                  ) as HTMLVideoElement;
                  if (videoElement && videoElement.buffered.length > 0) {
                    const bufferedEnd = videoElement.buffered.end(
                      videoElement.buffered.length - 1
                    );
                    const duration = videoElement.duration;
                    if (duration > 0) {
                      const bufferedPercent = (bufferedEnd / duration) * 100;
                      console.log('Video buffering progress:', {
                        bufferedPercent: `${bufferedPercent.toFixed(2)}%`,
                        bufferedEnd,
                        duration,
                        timestamp: new Date().toISOString(),
                      });
                    }
                  }
                }}
                onStalled={() => {
                  console.warn('Video stalled - buffering:', {
                    characterId: character?.id,
                    timestamp: new Date().toISOString(),
                  });
                }}
                onSuspend={() => {
                  console.warn('Video loading suspended:', {
                    characterId: character?.id,
                    timestamp: new Date().toISOString(),
                  });
                }}
              >
                Your browser does not support the video tag.
              </video>
            )}

            {/* Relationship Selection */}
            <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4 px-4">
              <h3
                ref={inlineRelHeadingRef}
                className={`text-lg sm:text-xl font-bold text-foreground text-center ${
                  highlightRelPrompt
                    ? 'ring-2 ring-pink-400 rounded-lg animate-pulse'
                    : ''
                }`}
              >
                Choose a relationship
              </h3>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                {relationshipTypes.map((type) => (
                  <Button
                    key={type}
                    variant={
                      selectedRelationship === type ? 'default' : 'outline'
                    }
                    className={`bg-card text-foreground border-border hover:bg-accent text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 active:scale-95 touch-manipulation ${
                      selectedRelationship === type &&
                      'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0 shadow-md hover:shadow-lg'
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-10 w-10 m-auto animate-spin text-pink-500" />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto p-4 space-y-4 overflow-x-hidden">
              {currentChat?.chatHistory?.map((message, index) => {
                return (
                  <div key={index} className="group">
                    <div
                      className={`flex items-start space-x-3 w-full overflow-visible ${
                        message.role === 'user'
                          ? 'flex-row-reverse space-x-reverse'
                          : ''
                      }`}
                    >
                      <div className="shrink-0">
                        {message.role === 'assistant' ? (
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full ring-2 ring-slate-200 overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100">
                            <Image
                              src={
                                character?.attributes?.avatar ||
                                '/default-avatar.png'
                              }
                              alt={
                                character?.attributes?.name ||
                                'Character avatar'
                              }
                              width={40}
                              height={40}
                              className="rounded-full w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full ring-2 ring-emerald-200 overflow-hidden bg-gradient-to-br from-emerald-100 to-blue-100">
                            <Image
                              src={
                                user?.data?.attributes?.avatar ||
                                '/default-avatar.png'
                              }
                              alt={
                                character?.attributes?.name ||
                                'Character avatar'
                              }
                              width={40}
                              height={40}
                              className="rounded-full w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                      <div
                        className={`flex-1 max-w-[85%] sm:max-w-[80%] flex ${
                          message.role === 'user'
                            ? 'justify-end'
                            : 'justify-start'
                        }`}
                      >
                        {message.messageType === 'video' ? (
                          <div className="inline-block bg-card rounded-2xl overflow-hidden shadow-lg max-w-full">
                            <video
                              src={message.videoUrl}
                              controls
                              className="w-full max-w-xs sm:max-w-sm md:w-80 h-auto rounded-2xl"
                              poster={character?.attributes?.avatar}
                            >
                              Your browser does not support the video tag.
                            </video>
                          </div>
                        ) : (
                          <div className={`relative inline-block max-w-full`}>
                            <div
                              className={`inline-block p-3 sm:p-4 rounded-2xl shadow-none ${
                                message.role === 'user'
                                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                                  : 'bg-card text-card-foreground border-none ring-0 outline-none'
                              }`}
                            >
                              {message.displayContent &&
                              message.displayContent.length > 0 ? (
                                message.displayContent.map(
                                  (item, contentIndex) => {
                                    if (item.type === 'code') {
                                      return (
                                        <div
                                          key={contentIndex}
                                          dir="ltr"
                                          style={{
                                            textAlign: 'left',
                                            maxWidth: '100%',
                                          }}
                                        >
                                          <SyntaxHighlighter
                                            language="python"
                                            style={oneDark}
                                            customStyle={{
                                              borderRadius: '0.5rem',
                                              marginBottom: '0.75rem',
                                              marginTop: '0.75rem',
                                              maxWidth: '100%',
                                              overflowX: 'auto',
                                              whiteSpace: 'pre-wrap',
                                              wordBreak: 'break-word',
                                            }}
                                            wrapLongLines
                                          >
                                            {item.value}
                                          </SyntaxHighlighter>
                                        </div>
                                      );
                                    } else if (item.type === 'html') {
                                      // For voice mode, hide text while audio is currently playing for this message
                                      if (
                                        response_type === 'voice' &&
                                        message.messageId &&
                                        currentPlayingMessageId ===
                                          message.messageId
                                      ) {
                                        // Render placeholder bars but invisible to preserve layout
                                        if (contentIndex === 0) {
                                          return (
                                            <div
                                              key={contentIndex}
                                              className="flex items-center gap-2 text-muted-foreground"
                                            >
                                              <div className="flex items-center gap-1 opacity-0">
                                                <div
                                                  className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse"
                                                  style={{
                                                    animationDelay: '0s',
                                                  }}
                                                />
                                                <div
                                                  className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse"
                                                  style={{
                                                    animationDelay: '0.2s',
                                                  }}
                                                />
                                                <div
                                                  className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse"
                                                  style={{
                                                    animationDelay: '0.4s',
                                                  }}
                                                />
                                              </div>
                                            </div>
                                          );
                                        }
                                        return null;
                                      }
                                      return (
                                        <div
                                          key={contentIndex}
                                          className={`message-bubble whitespace-pre-wrap break-words max-w-full ${
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
                                      // For voice mode, hide text while audio is currently playing for this message
                                      if (
                                        response_type === 'voice' &&
                                        message.messageId &&
                                        currentPlayingMessageId ===
                                          message.messageId
                                      ) {
                                        // Render placeholder bars but invisible to preserve layout
                                        if (contentIndex === 0) {
                                          return (
                                            <div
                                              key={contentIndex}
                                              className="flex items-center gap-2 text-muted-foreground"
                                            >
                                              <div className="flex items-center gap-1 opacity-0">
                                                <div
                                                  className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse"
                                                  style={{
                                                    animationDelay: '0s',
                                                  }}
                                                />
                                                <div
                                                  className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse"
                                                  style={{
                                                    animationDelay: '0.2s',
                                                  }}
                                                />
                                                <div
                                                  className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse"
                                                  style={{
                                                    animationDelay: '0.4s',
                                                  }}
                                                />
                                              </div>
                                            </div>
                                          );
                                        }
                                        return null;
                                      }
                                      const textClasses = message.isBouncyEmoji
                                        ? 'bounce-effect text-4xl'
                                        : 'text-sm whitespace-pre-wrap break-words max-w-full';
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
                                  className={`message-bubble whitespace-pre-wrap break-words max-w-full ${
                                    message.isBouncyEmoji
                                      ? 'bounce-effect text-4xl'
                                      : 'text-sm'
                                  }`}
                                  dir="auto"
                                >
                                  {response_type === 'text'
                                    ? // For text mode, process content and extract code blocks
                                      (() => {
                                        const stripMarkdown = (
                                          text: string
                                        ): string => {
                                          return text
                                            .replace(/\*\*(.*?)\*\*/g, '$1')
                                            .replace(/\*(.*?)\*/g, '$1')
                                            .replace(/__(.*?)__/g, '$1')
                                            .replace(/_(.*?)_/g, '$1')
                                            .replace(/`([^`]+)`/g, '$1')
                                            .replace(/#{1,6}\s+(.*)/g, '$1')
                                            .replace(
                                              /\[([^\]]+)\]\([^\)]+\)/g,
                                              '$1'
                                            )
                                            .replace(/^\s*[-*+]\s+/gm, '')
                                            .replace(/^\s*\d+\.\s+/gm, '')
                                            .trim();
                                        };

                                        const codeBlockRegex =
                                          /```(\w+)?\n([\s\S]*?)```/g;
                                        const parts: Array<{
                                          type: 'text' | 'code';
                                          value: string;
                                        }> = [];
                                        let lastIndex = 0;
                                        let match;

                                        while (
                                          (match = codeBlockRegex.exec(
                                            message.content
                                          )) !== null
                                        ) {
                                          if (match.index > lastIndex) {
                                            const textBefore =
                                              message.content.substring(
                                                lastIndex,
                                                match.index
                                              );
                                            if (textBefore.trim()) {
                                              parts.push({
                                                type: 'text',
                                                value:
                                                  stripMarkdown(textBefore),
                                              });
                                            }
                                          }
                                          parts.push({
                                            type: 'code',
                                            value: match[2].trim(),
                                          });
                                          lastIndex =
                                            match.index + match[0].length;
                                        }

                                        if (
                                          lastIndex < message.content.length
                                        ) {
                                          const textAfter =
                                            message.content.substring(
                                              lastIndex
                                            );
                                          if (textAfter.trim()) {
                                            parts.push({
                                              type: 'text',
                                              value: stripMarkdown(textAfter),
                                            });
                                          }
                                        }

                                        if (parts.length === 0) {
                                          return stripMarkdown(message.content);
                                        }

                                        return (
                                          <>
                                            {parts.map((part, idx) => {
                                              if (part.type === 'code') {
                                                return (
                                                  <div
                                                    key={idx}
                                                    dir="ltr"
                                                    style={{
                                                      textAlign: 'left',
                                                      maxWidth: '100%',
                                                      marginTop: '0.75rem',
                                                      marginBottom: '0.75rem',
                                                    }}
                                                  >
                                                    <SyntaxHighlighter
                                                      language="python"
                                                      style={oneDark}
                                                      customStyle={{
                                                        borderRadius: '0.5rem',
                                                        maxWidth: '100%',
                                                        overflowX: 'auto',
                                                        whiteSpace: 'pre-wrap',
                                                        wordBreak: 'break-word',
                                                      }}
                                                      wrapLongLines
                                                    >
                                                      {part.value}
                                                    </SyntaxHighlighter>
                                                  </div>
                                                );
                                              }
                                              return (
                                                <span key={idx}>
                                                  {part.value}
                                                </span>
                                              );
                                            })}
                                          </>
                                        );
                                      })()
                                    : // For voice mode, hide text while audio is currently playing
                                      (() => {
                                        const isCurrentlyPlaying =
                                          message.messageId &&
                                          currentPlayingMessageId ===
                                            message.messageId;

                                        if (isCurrentlyPlaying) {
                                          // Hide placeholder bars entirely during voice playback
                                          return null;
                                        }

                                        return (
                                          <span
                                            dangerouslySetInnerHTML={{
                                              __html: message.content,
                                            }}
                                          />
                                        );
                                      })()}
                                </div>
                              )}
                            </div>
                            {message.role === 'assistant' &&
                              response_type === 'voice' &&
                              isSpeaking &&
                              index === lastAssistantIndex && (
                                <div className="pointer-events-none absolute inset-0 rounded-lg overflow-hidden">
                                  {/* Subtle breathing glow effect */}
                                  <div
                                    className="absolute inset-0 rounded-lg"
                                    style={{
                                      background: 'transparent',
                                      animation: 'none',
                                    }}
                                  />
                                  {/* Subtle border pulse */}
                                  <div
                                    className="absolute inset-0 rounded-lg"
                                    style={{
                                      boxShadow: 'none',
                                      animation: 'none',
                                    }}
                                  />
                                  {/* Small audio wave indicator */}
                                  <div
                                    className="absolute bottom-2 right-2 flex items-center gap-1"
                                    style={{
                                      opacity: 0.6,
                                    }}
                                  >
                                    <div
                                      className="w-1 bg-emerald-400 rounded-full"
                                      style={{
                                        height: '4px',
                                        animation:
                                          'wave1 1.2s ease-in-out infinite',
                                      }}
                                    />
                                    <div
                                      className="w-1 bg-emerald-400 rounded-full"
                                      style={{
                                        height: '6px',
                                        animation:
                                          'wave2 1.2s ease-in-out infinite 0.2s',
                                      }}
                                    />
                                    <div
                                      className="w-1 bg-emerald-400 rounded-full"
                                      style={{
                                        height: '8px',
                                        animation:
                                          'wave3 1.2s ease-in-out infinite 0.4s',
                                      }}
                                    />
                                    <div
                                      className="w-1 bg-emerald-400 rounded-full"
                                      style={{
                                        height: '6px',
                                        animation:
                                          'wave2 1.2s ease-in-out infinite 0.6s',
                                      }}
                                    />
                                    <div
                                      className="w-1 bg-emerald-400 rounded-full"
                                      style={{
                                        height: '4px',
                                        animation:
                                          'wave1 1.2s ease-in-out infinite 0.8s',
                                      }}
                                    />
                                  </div>
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

              {isTyping && !isSpeaking && (
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-full ring-2 ring-slate-200 overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100">
                    <Image
                      src={
                        character?.attributes?.avatar || '/default-avatar.png'
                      }
                      alt={character?.attributes?.name || 'Character avatar'}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                    <div className="flex space-x-1.5">
                      <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      ></div>
                      <div
                        className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce"
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
        <div className="border-t border-border bg-background/80 backdrop-blur-sm py-4">
          {/* Recording Status */}
          {(isRecording || isTranscribing) && (
            <div className="mb-2 sm:mb-3 text-center px-4">
              {isRecording && (
                <div className="flex items-center justify-center space-x-2 text-red-600">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-full animate-pulse ring-2 ring-red-200"></div>
                  <span className="text-xs sm:text-sm font-medium">
                    Recording... {formatTime(recordingTime)}
                  </span>
                </div>
              )}
              {isTranscribing && (
                <div className="flex items-center justify-center space-x-2 text-emerald-600">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 rounded-full animate-pulse ring-2 ring-emerald-200"></div>
                  <span className="text-xs sm:text-sm font-medium">
                    Transcribing...
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="max-w-3xl mx-auto relative p-3 sm:p-4">
            {!isChatReady && (
              <button
                type="button"
                aria-label="Choose a relationship first"
                onClick={handlePromptRelationship}
                className="absolute inset-0 z-10 bg-transparent cursor-not-allowed"
              />
            )}
            {!isTyping && !isSpeaking && (
              <div className="flex items-start justify-center gap-2 sm:gap-3">
                {/* Mic Button - Left (wrapped to equalize width with Send) */}
                <div className="shrink-0 w-10 flex justify-center">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={!isChatReady || isTranscribing}
                    className={`inline-flex items-center justify-center w-10 h-10 p-0 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95 touch-manipulation ${
                      isRecording
                        ? 'bg-red-500 text-white animate-pulse ring-2 ring-red-200'
                        : isTranscribing
                        ? 'bg-yellow-500 text-white ring-2 ring-yellow-200'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'
                    }`}
                    aria-label={
                      isRecording
                        ? 'Stop recording'
                        : isTranscribing
                        ? 'Transcribing'
                        : 'Start recording'
                    }
                  >
                    {isRecording ? (
                      <Square className="w-4 h-4" />
                    ) : isTranscribing ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Textarea - Center */}
                <div className="relative w-full max-w-md">
                  <textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onInput={(e) => autoResizeTextarea(e.currentTarget)}
                    placeholder={
                      isRecording
                        ? 'Recording audio...'
                        : isTranscribing
                        ? 'Transcribing audio...'
                        : 'Type a message...'
                    }
                    disabled={!isChatReady || isRecording || isTranscribing}
                    className="w-full h-11 p-2 text-sm border-2 border-border rounded-lg bg-background dark:bg-muted text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed shadow-sm focus:shadow-md transition-all leading-normal"
                  />
                </div>

                {/* Send Button - Right */}
                {/* Send Button - Right (wrapped to equalize width with Mic) */}
                <div className="shrink-0 w-10 flex justify-center">
                  <Button
                    onClick={handleUserMessage}
                    disabled={
                      !isChatReady ||
                      !inputMessage.trim() ||
                      isTyping ||
                      isRecording ||
                      isTranscribing
                    }
                    className="inline-flex items-center justify-center w-10 h-10 p-0 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full hover:from-emerald-600 hover:to-emerald-700 disabled:bg-muted disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg disabled:shadow-sm active:scale-95 touch-manipulation"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Control Buttons */}
            {(isTyping || isSpeaking) && (
              <div className="hidden lg:flex justify-center mt-3 space-x-2">
                {isSpeaking && (
                  <button
                    onClick={toggleMute}
                    className="px-3 py-1 bg-muted text-muted-foreground rounded-lg text-sm hover:bg-muted/80 transition-colors flex items-center space-x-1"
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
              <div className="lg:hidden mt-3 flex items-center justify-center gap-2 sm:gap-3">
                {isSpeaking && (
                  <button
                    onClick={toggleMute}
                    className="px-3 sm:px-4 py-2 bg-muted text-foreground rounded-xl text-xs sm:text-sm hover:bg-muted/80 transition-colors flex items-center space-x-1.5 active:scale-95 touch-manipulation shadow-md"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                    <span className="font-medium">
                      {isMuted ? 'Unmute' : 'Mute'}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsTyping(false);
                    setIsSpeaking(false);
                    stopResponse();
                  }}
                  className="px-3 sm:px-4 py-2 bg-red-500 text-white rounded-xl text-xs sm:text-sm hover:bg-red-600 transition-colors flex items-center space-x-1.5 active:scale-95 touch-manipulation shadow-md"
                  aria-label="Stop response"
                >
                  <X className="w-4 h-4" />
                  <span className="font-medium">Stop</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
      <style jsx>{`
        @keyframes gentleBreath {
          0%,
          100% {
            opacity: 0.08;
            transform: scale(1);
          }
          50% {
            opacity: 0.15;
            transform: scale(1.01);
          }
        }

        @keyframes borderPulse {
          0%,
          100% {
            border-color: rgba(16, 185, 129, 0.2);
            opacity: 0.6;
          }
          50% {
            border-color: rgba(16, 185, 129, 0.4);
            opacity: 1;
          }
        }

        @keyframes wave1 {
          0%,
          100% {
            height: 4px;
            opacity: 0.4;
          }
          50% {
            height: 8px;
            opacity: 0.8;
          }
        }

        @keyframes wave2 {
          0%,
          100% {
            height: 6px;
            opacity: 0.5;
          }
          50% {
            height: 10px;
            opacity: 0.9;
          }
        }

        @keyframes wave3 {
          0%,
          100% {
            height: 8px;
            opacity: 0.6;
          }
          50% {
            height: 12px;
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
          }
        }
      `}</style>

      <CharacterDetailsSidebar
        isRightSidebarOpen={isRightSidebarOpen}
        setIsRightSidebarOpen={setIsRightSidebarOpen}
        isMobile={isMobile}
      />
    </SidebarProvider>
  );
}
