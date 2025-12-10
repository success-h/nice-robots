'use client';

import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from '@/components/ui/carousel';
import useUserStore from '@/zustand/useStore';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { MdLocationPin } from 'react-icons/md';

interface CharacterDetailsSidebarProps {
	isRightSidebarOpen: boolean;
	setIsRightSidebarOpen: (open: boolean) => void;
	isMobile: boolean;
}

export default function CharacterDetailsSidebar({
	isRightSidebarOpen,
	setIsRightSidebarOpen,
	isMobile,
}: CharacterDetailsSidebarProps) {
	const { character } = useUserStore();

	return (
		<div
			className={`
        ${
					isMobile ? 'fixed right-0 top-0 h-full z-[60] shadow-2xl' : 'relative'
				}
        ${isRightSidebarOpen ? (isMobile ? 'w-80' : 'w-72') : 'w-0'} 
        transition-all duration-300 bg-background border-l border-border flex flex-col overflow-hidden relative
        ${
					isMobile && !isRightSidebarOpen ? 'translate-x-full' : 'translate-x-0'
				}
      `}
		>
			{isRightSidebarOpen && character && (
				<div className='h-full flex flex-col'>
					<button
						onClick={() => {
							setIsRightSidebarOpen(false);
							if (typeof window !== 'undefined') {
								localStorage.setItem('rightSidebarOpen', 'false');
							}
						}}
						className='absolute top-3 left-3 z-50 p-2.5 rounded-xl bg-card/90 backdrop-blur-sm text-foreground hover:text-foreground hover:bg-card transition-all shadow-md hover:shadow-lg border border-border'
						aria-label='Close character details'
					>
						<ArrowRight className='w-5 h-5' />
					</button>
					<Carousel>
						<CarouselContent className='h-[400px]'>
							{character?.relationships?.images?.map((item, key) => {
								return (
									<CarouselItem className='w-full h-full' key={key}>
										<Image
											key={item.id}
											className='h-full w-full object-cover'
											src={item?.attributes?.url}
											height={500}
											width={300}
											alt={item?.type}
										/>
									</CarouselItem>
								);
							})}
						</CarouselContent>
						<CarouselPrevious className='ml-12 text-foreground bg-card/90 hover:bg-card shadow-md' />
						<CarouselNext className='mr-12 text-foreground bg-card/90 hover:bg-card shadow-md' />
					</Carousel>

					<div className='p-6 flex flex-col space-y-4 flex-1 bg-background'>
						<div className='space-y-3'>
							<h2 className='text-2xl font-bold text-foreground'>
								{character.attributes.name}
							</h2>
							<p className='text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed'>
								{character.attributes.summary}
							</p>
							<div className='mt-4 gap-2 flex items-start pt-4 border-t border-border'>
								<MdLocationPin
									size={20}
									className='text-pink-500 mt-0.5 flex-shrink-0'
								/>
								<p className='text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed'>
									{character.attributes.residence_intro}
								</p>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
