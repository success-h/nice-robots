import React, { useMemo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils'; // Assuming you have a utility function for class names
import { CharacterData, ChatData } from '@/zustand/useStore';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { FiTrash } from 'react-icons/fi';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';

type Props = {
  characters: CharacterData[] | null;
  chats: ChatData[] | null;
  setCharacter: (characterData: CharacterData | null) => void;
  currentChat: ChatData;
  handleDeleteChat: (id: string, character_id: string) => void;
  deleteLoading: boolean;
};

function ChatList({
  characters,
  chats,
  setCharacter,
  currentChat,
  handleDeleteChat,
  deleteLoading,
}: Props) {
  const chatHistoryMap = useMemo(() => {
    if (!chats) return new Map();
    return chats.reduce((map, item) => {
      if (item?.data?.relationships?.character?.id) {
        map.set(item.data.relationships.character.id, item.chatHistory);
      }
      return map;
    }, new Map());
  }, [chats]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-2 space-y-1">
        {characters?.map((character: CharacterData) => {
          const isCurrentChat =
            currentChat?.data?.relationships?.character?.id === character?.id;
          const chatHistory = chatHistoryMap.get(character?.id);
          const lastMessage =
            chatHistory && chatHistory.length > 0
              ? chatHistory[chatHistory.length - 1].content
              : 'New conversation';

          return (
            <div
              key={character?.id}
              onClick={() => {
                setCharacter(character);
              }}
              className={cn(
                'flex w-full cursor-pointer p-3 items-center text-left rounded-lg transition-colors group',
                {
                  'bg-gray-700 text-gray-100': isCurrentChat,
                  'text-gray-300 hover:bg-gray-700': !isCurrentChat,
                }
              )}
            >
              <Image
                src={character?.attributes?.avatar}
                alt={character?.attributes.name}
                width={32}
                height={32}
                className="rounded-full mr-3 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {character?.attributes.name}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {lastMessage?.slice(0, 30)}
                  {lastMessage?.length > 30 ? '...' : ''}
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
                        This action cannot be undone. This will permanently
                        delete your chat from our servers.
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
                                character.id
                            )?.data?.id!,
                            character?.id
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
          );
        })}
      </div>
    </div>
  );
}

export default ChatList;
