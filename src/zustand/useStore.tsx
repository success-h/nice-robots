import { CookieValueTypes } from 'cookies-next';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware'

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
    video_played?: boolean; // Added this field
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
    relationships?: {
      account?: {
        data?: {
          id: string;
          type: string;
          attributes?: {
            credit: string;
          };
        };
      };
      plan?: {
        // Supports both wrapped and flattened forms
        data?: { id: string; type: string; attributes?: Record<string, unknown> };
        id?: string;
        type?: string;
        attributes?: Record<string, unknown>;
      };
      // Support both legacy `user_plan` and new `users_plan`, and both wrapped/flattened
      user_plan?: {
        data?: { id: string; type: string; attributes?: Record<string, unknown> };
        id?: string;
        type?: string;
        attributes?: Record<string, unknown>;
      };
      users_plan?: {
        data?: { id: string; type: string; attributes?: Record<string, unknown> };
        id?: string;
        type?: string;
        attributes?: Record<string, unknown>;
      };
    };
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
  messageType?: 'text' | 'video';
  videoUrl?: string;
  isBouncyEmoji?: boolean;
  displayContent?: Array<{
    type: 'text' | 'links' | 'code' | 'html';
    value: string;
  }>;
};

export type ModerationDetails = {
  category: string;
  severity: string;
}[];

export type PlanResource = {
  id: string;
  type: string;
  attributes: {
    name: string;
    description?: string;
    duration?: number;
    duration_unit?: string;
    slug?: string;
    price?: string | number;
    credit_included?: string | number;
  };
};

export type CreditPackResource = {
  id: string;
  type: string;
  attributes: {
    name: string;
    description?: string;
    quantity?: number;
    slug?: string;
    price?: string | number;
  };
};

export type PlanData = {
  id: string;
  type: string;
  attributes?: {
    name?: string;
    description?: string;
    slug?: string;
    price?: string | number;
    duration?: number;
    duration_unit?: string;
    credit_included?: string | number;
  };
};

export interface UserState {
  user: User | null;
  access_token: string;
  isLoggedIn: boolean;
  credits: number;
  accountId: string | null;
  plan: PlanData | null;
  userPlan: PlanData | null;
  paidPlans: PlanResource[] | null;
  creditPacks: CreditPackResource[] | null;
  // Global modal for insufficient credits/plan
  insufficientModalOpen: boolean;
  insufficientModalType: 'credits' | 'plan' | null;
  insufficientModalMessage: string | null;
  insufficientModalFrom: 'home' | 'chat' | 'settings' | null;
  setUser: (userData: User | null) => void;
  setCredits: (credits: number) => void;
  setAccountId: (accountId: string | null) => void;
  setCharacter: (characterData: CharacterData | null) => void;
  setCharacters: (characterData: CharacterData[] | null) => void;
  updateChatHistory: (
    message: Message,
    chatId: string,
    isBouncy?: boolean
  ) => void;
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
  updateCharacterVideoPlayed: (characterId: string) => void; // Added this method
  setPaidPlans: (plans: PlanResource[] | null) => void;
  setCreditPacks: (packs: CreditPackResource[] | null) => void;
  openInsufficientModal: (args: {
    type: 'credits' | 'plan';
    message?: string | null;
    from?: 'home' | 'chat' | 'settings' | null;
  }) => void;
  closeInsufficientModal: () => void;
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

// No relation normalization helper needed; we directly read wrapped `data` objects

const useUserStore = create<UserState>()(
 devtools(
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
      credits: 0,
      accountId: null,
      plan: null,
      userPlan: null,
      paidPlans: null,
      creditPacks: null,
      insufficientModalOpen: false,
      insufficientModalType: null,
      insufficientModalMessage: null,
      insufficientModalFrom: null,

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

          const newCharacterData = {
            ...characterData,
            attributes: {
              ...characterData.attributes,
              video_played: false,
            },
          };

          return {
            characters: [...existingCharacters, newCharacterData],
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
      updateCharacterVideoPlayed: (characterId) => {
        set((state) => {
          const updatedCharacters =
            state.characters?.map((char) => {
              if (char.id === characterId) {
                return {
                  ...char,
                  attributes: {
                    ...char.attributes,
                    video_played: true,
                  },
                };
              }
              return char;
            }) || null;

          const updatedCurrentCharacter =
            state.character?.id === characterId
              ? {
                  ...state.character,
                  attributes: {
                    ...state.character.attributes,
                    video_played: true,
                  },
                }
              : state.character;

          return {
            characters: updatedCharacters,
            character: updatedCurrentCharacter,
          };
        });
      },

      updateChatHistory(message, chatId, isBouncy) {
        set((state) => {
          if (!state.currentChat || state?.currentChat?.data?.id !== chatId) {
            return state;
          }

          const updatedCurrentChat = {
            ...state.currentChat,
            chatHistory: (() => {
              const history = [...(state.currentChat.chatHistory || [])];
              const last = history[history.length - 1];

              const newMessage: Message = {
                ...message,
                isBouncyEmoji: isBouncy,
              };

              if (newMessage.messageType === 'video') {
                history.push(newMessage);
              } else if (
                last?.role === newMessage.role &&
                last?.messageType !== 'video'
              ) {
                history[history.length - 1] = newMessage;
              } else {
                history.push(newMessage);
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
            if (!chatData || !('data' in chatData) || !chatData.data?.id || ('errors' in chatData && chatData.errors)) {
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

      setUser: (userData) => {
        console.log('[useStore.setUser] received userData:', userData);
        set({
          user: userData,
          isLoggedIn: !!userData,
        });

        // Extract accountId and credits from user data
        if (userData?.data?.relationships?.account?.data) {
          const accountData = userData.data.relationships.account.data;
          set({
            accountId: accountData.id || null,
            credits: accountData.attributes?.credit
              ? parseFloat(accountData.attributes.credit)
              : 0,
          });
        } else {
          set({
            accountId: null,
            credits: 0,
          });
        }

        // Extract plan and (users_)user_plan from user data; support wrapped or flattened
        const rel = userData?.data?.relationships;
        const rawPlan = rel?.plan || null;
        const planData = (rawPlan && ('data' in rawPlan ? (rawPlan as { data: PlanData }).data : rawPlan as PlanData)) || null;

        const rawUserPlan = rel?.users_plan || rel?.user_plan || null;
        const userPlanData = (rawUserPlan && ('data' in rawUserPlan ? (rawUserPlan as { data: PlanData }).data : rawUserPlan as PlanData)) || null;

        set({
          plan: planData
            ? { id: planData.id, type: planData.type, attributes: planData.attributes }
            : null,
          userPlan: userPlanData
            ? {
                id: userPlanData.id,
                type: userPlanData.type,
                attributes: userPlanData.attributes,
              }
            : null,
        });
      },

      setToken: (token: CookieValueTypes) =>
        set({
          access_token: token,
        }),

      setCredits: (credits: number) =>
        set({
          credits: credits,
        }),

      setAccountId: (accountId: string | null) =>
        set({
          accountId: accountId,
        }),

      setCharacter: (characterData) => {
        set((state) => {
          const videoPlayed =
            characterData?.attributes?.video_played !== undefined
              ? characterData.attributes.video_played
              : false;
          return {
            character: characterData
              ? {
                  ...characterData,
                  attributes: {
                    ...characterData.attributes,
                    video_played: videoPlayed,
                  },
                }
              : null,
            hasCharacter: !!characterData,
          };
        });
      },

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

      setPaidPlans: (plans) =>
        set({
          paidPlans: Array.isArray(plans) ? plans : null,
        }),

      setCreditPacks: (packs) =>
        set({
          creditPacks: Array.isArray(packs) ? packs : null,
        }),

      openInsufficientModal: ({ type, message = null, from = null }) =>
        set({
          insufficientModalOpen: true,
          insufficientModalType: type,
          insufficientModalMessage: message,
          insufficientModalFrom: from,
        }),

      closeInsufficientModal: () =>
        set({
          insufficientModalOpen: false,
          insufficientModalType: null,
          insufficientModalMessage: null,
          insufficientModalFrom: null,
        }),
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => localStorage),
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
        credits: state.credits,
        accountId: state.accountId,
        plan: state.plan,
        userPlan: state.userPlan,
        paidPlans: state.paidPlans,
        creditPacks: state.creditPacks,
      }),
    }
  )
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
