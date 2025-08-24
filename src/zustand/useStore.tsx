import { CookieValueTypes } from 'cookies-next';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CharacterData {
  id: string;
  type: string;
  attributes: {
    name: string;
    summary: string;
    age: number;
    avatar: string;
    gender: 'female' | 'male' | string;
    hobbies_intro: string;
    residence_intro: string;
    mission_intro: string;
    available_relationship_types: string[];
  };
  relationships: {
    images: {
      attributes: {
        comment: string | null;
        url: string;
      };
      id: string;
      type: 'image';
    }[];
    model: {
      attributes: {
        name: string;
        type: string;
        description: string;
      };
      id: string;
      type: 'model';
    };
    videos: {
      attributes: {
        type: string;
        title: string | null;
        comment: string | null;
        url: string;
      };
      id: string;
      type: 'video';
    }[];
  };
}

export type User = {
  data: {
    attributes: {
      age_type: string;
      avatar: string;
      language: string;
      name: string;
      parent_ok: boolean;
    };
    id: string;
    type: string;
  };
};

export type ChatData = {
  data: {
    attributes: {
      return_type: string;
      relationship_type: string;
      user_summary: string | null;
    };
    id: string;
    type: 'chat';
    relationships: {
      user: {
        attributes: {
          name: string;
          summary: string | null;
          age: number;
          avatar: string;
          gender: string;
          language: string;
          legal_age: boolean;
          parent_ok: boolean;
        };
        id: string;
        type: 'user';
      };
      character: CharacterData;
    };
  };
  chatHistory?: Message[];
};
export type Message = {
  role: string;
  content: string;
  messageId?: string;
  moderationFailed?: boolean;
  isResolutionResponse?: boolean;
  messageType?: 'text' | 'video'; // Add this line
  videoUrl?: string;
};

export type ModerationDetails = {
  category: string;
  severity: string;
}[];

export interface UserState {
  user: User | null;
  access_token: string;
  isLoggedIn: boolean;
  setUser: (userData: User | null) => void;
  setCharacter: (characterData: CharacterData | null) => void;
  setCharacters: (characterData: CharacterData[] | null) => void;
  updateChatHistory: (message: Message, chatId: string) => void;
  setChats: (chatsData: ChatData) => void;
  setCurrentChat: (chatData: ChatData | null) => void;
  setResponseType: (type: string) => void;
  updateUser: (updatedData: Partial<User>) => void;
  deleteChat: (chatId: string) => void;
  logout: () => void;
  hasCharacter: boolean;
  character: CharacterData | null;
  characters: CharacterData[] | null;
  response_type: string;
  chats: ChatData[] | null;
  currentChat: ChatData | null;
  chatHistoryUpdateSignal: number;
  addModerationFailedMessage: (message: Message, chatId: string) => void;
  addModerationResolutionResponse: (message: Message, chatId: string) => void;
  trimChatHistory: (chatId: string) => void;
  setToken: (token: CookieValueTypes) => unknown;
  addCharacter: (characterData: CharacterData) => void;
  deleteCharacter: (characterId: string) => void;
}

const trimMessagesToLimit = (
  messages: Message[],
  limit: number = 70
): Message[] => {
  if (messages.length <= limit) {
    return messages;
  }
  return messages.slice(messages.length - limit);
};

const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      hasCharacter: false,
      user: null,
      isLoggedIn: false,
      character: null,
      characters: null,
      chatHistoryUpdateSignal: 0,
      response_type: 'voice',
      chats: null,
      currentChat: null,
      access_token: '',

      setCharacters(characterData) {
        set({
          characters: characterData,
        });
      },

      addCharacter(characterData) {
        set((state) => {
          const existingCharacters = state.characters || [];

          const characterExists = existingCharacters.some(
            (char) => char.id === characterData.id
          );

          if (characterExists) {
            return state;
          }

          return {
            characters: [...existingCharacters, characterData],
          };
        });
      },
      deleteCharacter: (characterId) => {
        set((state) => {
          if (!state.characters) {
            return state;
          }

          const updatedCharacters = state.characters.filter(
            (character) => character.id !== characterId
          );

          const newCurrentCharacter =
            state.character?.id === characterId ? null : state.character;

          return {
            characters: updatedCharacters.length > 0 ? updatedCharacters : null,
            character: newCurrentCharacter,
          };
        });
      },

      updateChatHistory(message, chatId) {
        set((state) => {
          if (!state.currentChat || state?.currentChat?.data?.id !== chatId) {
            return state;
          }

          const updatedCurrentChat = {
            ...state.currentChat,
            chatHistory: (() => {
              const history = [...(state.currentChat.chatHistory || [])];
              const last = history[history.length - 1];

              // Always push video messages, never replace them
              if (message.messageType === 'video') {
                history.push(message);
              }
              // For other messages, only replace if same role and NOT following a video
              else if (
                last?.role === message.role &&
                last?.messageType !== 'video'
              ) {
                history[history.length - 1] = message;
              } else {
                history.push(message);
              }

              return trimMessagesToLimit(history, 70);
            })(),
          };

          const updatedChats =
            state.chats?.map((chat) =>
              chat?.data?.id === chatId ? updatedCurrentChat : chat
            ) || null;

          return {
            currentChat: updatedCurrentChat,
            chats: updatedChats,
            chatHistoryUpdateSignal:
              message.role === 'user'
                ? state.chatHistoryUpdateSignal + 1
                : state.chatHistoryUpdateSignal,
          };
        });
      },

      addModerationFailedMessage(message, chatId) {
        const messageWithModerationFlag = {
          ...message,
          moderationFailed: true,
        };
        get().updateChatHistory(messageWithModerationFlag, chatId);
      },

      addModerationResolutionResponse(message, chatId) {
        const resolutionMessage = {
          ...message,
          isResolutionResponse: true,
          role: 'assistant',
        };
        get().updateChatHistory(resolutionMessage, chatId);
      },

      trimChatHistory(chatId) {
        set((state) => {
          if (!state.currentChat || state.currentChat.data.id !== chatId) {
            return state;
          }

          const currentHistory = state.currentChat.chatHistory || [];
          if (currentHistory.length <= 70) {
            return state;
          }

          const trimmedHistory = trimMessagesToLimit(currentHistory, 70);

          const updatedCurrentChat = {
            ...state.currentChat,
            chatHistory: trimmedHistory,
          };

          const updatedChats =
            state.chats?.map((chat) =>
              chat?.data?.id === chatId ? updatedCurrentChat : chat
            ) || null;

          return {
            currentChat: updatedCurrentChat,
            chats: updatedChats,
          };
        });
      },
      setChats(chatData) {
        set((state) => {
          const existingChats = state.chats || [];

          if (!Array.isArray(chatData)) {
            // Validate single chat data

            //@ts-expect-error error
            if (!chatData?.data?.id || chatData?.errors) {
              console.warn('Invalid chat data received:', chatData);
              return state; // Don't update state with invalid data
            }

            const existingChatIndex = existingChats.findIndex(
              (chat) => chat?.data?.id === chatData?.data?.id
            );

            if (existingChatIndex !== -1) {
              const updatedChats = [...existingChats];
              updatedChats[existingChatIndex] = {
                ...updatedChats[existingChatIndex],
                data: {
                  ...updatedChats[existingChatIndex].data,
                  attributes: {
                    ...updatedChats[existingChatIndex].data.attributes,
                    ...chatData?.data?.attributes,
                  },
                },
                chatHistory: chatData?.chatHistory
                  ? trimMessagesToLimit(chatData.chatHistory, 70)
                  : updatedChats[existingChatIndex].chatHistory,
              };

              return {
                chats: updatedChats,
              };
            } else {
              const newChatData = {
                ...chatData,
                chatHistory: chatData?.chatHistory
                  ? trimMessagesToLimit(chatData.chatHistory, 70)
                  : undefined,
              };
              return {
                chats: [...existingChats, newChatData],
              };
            }
          }

          const updatedChats = [...existingChats];

          // Filter out invalid chat data and process valid ones
          const validChats = chatData.filter(
            (chat) => chat?.data?.id && !chat.errors
          );

          if (validChats.length !== chatData.length) {
            console.warn(
              'Some invalid chat data filtered out:',
              chatData.length - validChats.length
            );
          }

          validChats.forEach((newChat) => {
            const existingIndex = updatedChats.findIndex(
              (existingChat) => existingChat?.data?.id === newChat?.data?.id
            );

            if (existingIndex !== -1) {
              updatedChats[existingIndex] = {
                ...updatedChats[existingIndex],
                data: {
                  ...updatedChats[existingIndex].data,
                  attributes: {
                    ...updatedChats[existingIndex].data.attributes,
                    ...newChat?.data?.attributes,
                  },
                },
                chatHistory: newChat?.chatHistory
                  ? trimMessagesToLimit(newChat.chatHistory, 70)
                  : updatedChats[existingIndex].chatHistory,
              };
            } else {
              const newChatData = {
                ...newChat,
                chatHistory: newChat?.chatHistory
                  ? trimMessagesToLimit(newChat.chatHistory, 70)
                  : undefined,
              };
              updatedChats.push(newChatData);
            }
          });

          return {
            chats: updatedChats,
          };
        });
      },

      setCurrentChat(chatData) {
        set((state) => {
          if (!chatData) return { currentChat: null };

          const existingChatIndex =
            state.chats?.findIndex(
              (chat) => chat?.data?.id === chatData?.data?.id
            ) ?? -1;

          let updatedChats = state.chats;

          if (existingChatIndex !== -1 && state.chats) {
            updatedChats = [...state.chats];
            updatedChats[existingChatIndex] = {
              ...updatedChats[existingChatIndex],
              data: {
                ...updatedChats[existingChatIndex]?.data,
                attributes: {
                  ...updatedChats[existingChatIndex]?.data?.attributes,
                  ...chatData?.data?.attributes,
                },
              },
              chatHistory: trimMessagesToLimit(
                chatData?.chatHistory ||
                  updatedChats[existingChatIndex].chatHistory ||
                  [],
                70
              ),
            };
          }

          const chatToSet =
            existingChatIndex !== -1 && updatedChats
              ? updatedChats[existingChatIndex]
              : {
                  ...chatData,
                  chatHistory: trimMessagesToLimit(
                    chatData?.chatHistory || [],
                    70
                  ),
                };

          return {
            currentChat: chatToSet,
            chats: updatedChats,
          };
        });
      },

      deleteChat: (chatId) =>
        set((state) => {
          if (!state.chats) return state;

          const updatedChats = state.chats.filter(
            (chat) => chat?.data?.id !== chatId
          );

          const updatedCurrentChat =
            state.currentChat?.data.id === chatId ? null : state.currentChat;

          return {
            chats: updatedChats.length > 0 ? updatedChats : null,
            currentChat: updatedCurrentChat,
          };
        }),

      setUser: (userData) =>
        set({
          user: userData,
          isLoggedIn: !!userData,
        }),

      setToken: (token: CookieValueTypes) =>
        set({
          access_token: token,
        }),

      setCharacter: (characterData) =>
        set({
          character: characterData,
          hasCharacter: !!characterData,
        }),

      setResponseType: (type) =>
        set({
          response_type: type,
        }),

      updateUser: (updatedData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedData } : null,
        })),

      logout: () =>
        set({
          user: null,
          isLoggedIn: false,
        }),
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
        character: state.character,
        hasCharacter: state.hasCharacter,
        response_type: state.response_type,
        chats: state.chats,
        currentChat: state.currentChat,
        characters: state.characters,
        access_token: state.access_token,
      }),
    }
  )
);

export const useModerationHandling = () => {
  const store = useUserStore();

  return {
    handleModerationFailure: (
      userMessage: Message,
      chatId: string,
      moderationDetails: ModerationDetails
    ) => {
      store.addModerationFailedMessage(userMessage, chatId);
      return moderationDetails;
    },

    handleModerationResponse: (characterResponse: Message, chatId: string) => {
      store.addModerationResolutionResponse(characterResponse, chatId);
    },
  };
};

export default useUserStore;
