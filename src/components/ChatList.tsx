import { cn } from '@/lib/utils'; // Assuming you have a utility function for class names
import { CharacterData, ChatData } from '@/zustand/useStore';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useMemo } from 'react';
import { FiTrash } from 'react-icons/fi';
import { Button } from './ui/button';
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

type Props = {
	characters: CharacterData[] | null;
	chats: ChatData[] | null;
	setCharacter: (characterData: CharacterData | null) => void;
	currentChat: ChatData;
	handleDeleteChat: (id: string, character_id: string) => void;
	deleteLoading: boolean;
	updateCharacterVideoPlayed: () => void;
};

function ChatList({
	characters,
	chats,
	setCharacter,
	currentChat,
	handleDeleteChat,
	deleteLoading,
	updateCharacterVideoPlayed,
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
		<div className='flex-1 overflow-y-auto overscroll-contain'>
			<div className='p-2 sm:p-3 space-y-1.5 sm:space-y-2'>
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
								updateCharacterVideoPlayed();
								setCharacter(character);
							}}
							className={cn(
								'flex w-full cursor-pointer p-2.5 sm:p-3 items-center text-left rounded-xl transition-all group shadow-sm hover:shadow-md active:scale-[0.98] touch-manipulation',
								{
									'bg-sidebar-accent text-sidebar-foreground border-2 border-pink-200':
										isCurrentChat,
									'text-sidebar-foreground hover:bg-sidebar-accent border-2 border-transparent hover:border-sidebar-border':
										!isCurrentChat,
								}
							)}
						>
							<div className='w-9 h-9 sm:w-10 sm:h-10 rounded-full ring-2 ring-sidebar-border overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100 mr-2 sm:mr-3 flex-shrink-0'>
								<Image
									src={character?.attributes?.avatar}
									alt={character?.attributes.name}
									width={40}
									height={40}
									className='rounded-full w-full h-full object-cover'
								/>
							</div>
							<div className='flex-1 min-w-0'>
								<p className='text-xs sm:text-sm font-semibold truncate text-sidebar-foreground'>
									{character?.attributes.name}
								</p>
								<p className='text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5'>
									{lastMessage?.slice(0, 25)}
									{lastMessage?.length > 25 ? '...' : ''}
								</p>
							</div>
							<div className='ml-1 sm:ml-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0'>
								<Dialog>
									<DialogTrigger className='cursor-pointer p-2 rounded-lg hover:bg-red-50 active:bg-red-100 text-muted-foreground hover:text-red-500 transition-colors touch-manipulation'>
										<FiTrash className='w-4 h-4 sm:w-5 sm:h-5' />
									</DialogTrigger>
									<DialogContent className='max-w-[calc(100vw-2rem)] sm:max-w-md'>
										<DialogHeader>
											<DialogTitle className='text-popover-foreground text-lg sm:text-xl'>
												Are you absolutely sure?
											</DialogTitle>
											<DialogDescription className='text-muted-foreground text-sm'>
												This action cannot be undone. This will permanently
												delete your chat from our servers.
											</DialogDescription>
										</DialogHeader>
										<DialogFooter className='flex-col sm:flex-row gap-2 sm:gap-0'>
											<DialogClose asChild>
												<Button
													variant={'outline'}
													className='w-full sm:w-auto text-foreground border-border hover:bg-accent'
												>
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
												disabled={deleteLoading}
												className='w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white'
											>
												{deleteLoading && (
													<Loader2 className='mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin' />
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
