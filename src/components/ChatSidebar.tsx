'use client';

import { ArrowLeft, Plus, Edit2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ChatList from '@/components/ChatList';
import useUserStore from '@/zustand/useStore';
import CreditsComponent from '@/components/CreditsComponent';
import {
  getPlanName,
  getPlanDescription,
  getPlanPrice,
  getPlanDuration,
  getPlanDurationUnit,
  getPlanSlug,
  isFreeOrBonusPlan,
  getUserPlanAttributes,
} from '@/utils/planHelpers';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChatSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isMobile: boolean;
  deleteLoading: boolean;
  handleDeleteChat: (id: string, character_id: string) => void;
  relationshipTypes: string[];
  selectedRelationship: string;
  handleRelationshipChange: (type: string) => Promise<void>;
  highlightRelPrompt: boolean;
  relTriggerRef: React.RefObject<HTMLButtonElement | null>;
  isCreatingChat: boolean;
}

export default function ChatSidebar({
  sidebarOpen,
  setSidebarOpen,
  isMobile,
  deleteLoading,
  handleDeleteChat,
  relationshipTypes,
  selectedRelationship,
  handleRelationshipChange,
  highlightRelPrompt,
  relTriggerRef,
  isCreatingChat,
}: ChatSidebarProps) {
  const router = useRouter();
  const {
    characters,
    chats,
    currentChat,
    setCharacter,
    setCurrentChat,
    character,
    user,
    updateCharacterVideoPlayed,
    isLoggedIn,
    plan,
    userPlan,
    response_type,
    setResponseType,
  } = useUserStore();

  return (
    <div
      className={`
        ${isMobile ? 'fixed left-0 top-0 h-full z-[60] shadow-2xl' : 'relative'}
        ${sidebarOpen ? (isMobile ? 'w-80' : 'w-64') : 'w-0'} 
        transition-all duration-300 bg-slate-100 border-r border-slate-200 flex flex-col overflow-hidden
        ${
          isMobile && !sidebarOpen
            ? '-translate-x-full pointer-events-none'
            : 'translate-x-0 pointer-events-auto'
        }
      `}
    >
      <div className="flex flex-col h-full">
        {/* Header Section */}
        <div className="relative p-4 border-b border-slate-200 bg-gradient-to-r from-pink-50 to-purple-50 space-y-3">
          <Link
            href={'/'}
            onClick={() => {
              setCurrentChat(null);
              if (character?.id) {
                updateCharacterVideoPlayed(character.id);
              }
            }}
            className="flex items-center justify-center w-full p-3 text-slate-700 hover:bg-white/90 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md font-semibold bg-white/60 backdrop-blur-sm"
          >
            <Plus className="w-5 h-5 mr-2 text-pink-500" />
            <span className="text-sm">New chat</span>
          </Link>
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-2.5 text-slate-700 hover:text-slate-900 rounded-xl bg-white/90 backdrop-blur-sm hover:bg-white transition-all shadow-md hover:shadow-lg border border-slate-200 z-10"
              aria-label="Close sidebar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Plan and Credits - Mobile Only */}
          {isLoggedIn && isMobile && (
            <div className="space-y-2">
              {plan && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full capitalize border border-slate-300 rounded-xl flex items-center gap-2 px-3 py-2 font-semibold text-slate-700 cursor-pointer hover:bg-white transition-all shadow-sm hover:shadow-md bg-white text-xs sm:text-sm">
                      <span className="text-xs bg-gradient-to-r from-pink-500 to-purple-500 text-white px-2 py-0.5 rounded-full font-bold">
                        Plan
                      </span>
                      <span className="flex-1 text-left truncate">{getPlanName(plan)}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="border-0 bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 shadow-2xl p-4 sm:p-6 w-[calc(100vw-2rem)] sm:w-96 max-w-md">
                    <div className="space-y-5 text-slate-100">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500"></div>
                          <h3 className="text-2xl font-bold text-white">
                            {getPlanName(plan)}
                          </h3>
                        </div>
                        {getPlanDescription(plan) && (
                          <p className="text-sm whitespace-pre-wrap text-slate-300 leading-relaxed pl-4">
                            {getPlanDescription(plan)}
                          </p>
                        )}
                      </div>
                      <div className="space-y-3 pt-4 border-t border-slate-700/50">
                        {getPlanPrice(plan) !== undefined && (
                          <div className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-slate-700/30">
                            <span className="text-slate-400 text-sm">Price</span>
                            <span className="font-bold text-white text-base">
                              {getPlanPrice(plan)}
                            </span>
                          </div>
                        )}
                        {getPlanDuration(plan) && (
                          <div className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-slate-700/30">
                            <span className="text-slate-400 text-sm">Duration</span>
                            <span className="font-bold text-white text-base">
                              {getPlanDuration(plan)} {getPlanDurationUnit(plan)}
                            </span>
                          </div>
                        )}
                        {(() => {
                          const userPlanAttrs = getUserPlanAttributes(userPlan);
                          if (
                            !userPlanAttrs?.start_date ||
                            !userPlanAttrs?.end_date
                          )
                            return null;
                          const slug = getPlanSlug(plan);
                          const start = new Date(userPlanAttrs.start_date);
                          const end = new Date(userPlanAttrs.end_date);
                          const isFreeOrBonus = slug === 'free' || slug === 'bonus';
                          if (isFreeOrBonus) {
                            return (
                              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-slate-700/30">
                                <span className="text-slate-400 text-sm">Period</span>
                                <span className="font-bold text-white text-base">
                                  {start.toLocaleDateString()} -{' '}
                                  {end.toLocaleDateString()}
                                </span>
                              </div>
                            );
                          }
                          const nextCharge = new Date(end);
                          nextCharge.setDate(nextCharge.getDate() + 1);
                          return (
                            <>
                              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-slate-700/30">
                                <span className="text-slate-400 text-sm">Last paid on</span>
                                <span className="font-bold text-white text-base">
                                  {start.toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-slate-700/30">
                                <span className="text-slate-400 text-sm">Next charge</span>
                                <span className="font-bold text-white text-base">
                                  {nextCharge.toLocaleDateString()}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      {isFreeOrBonusPlan(plan) && (
                        <div className="pt-2">
                          <Button
                            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl border-0"
                            onClick={() => router.push('/plans?from=chat')}
                          >
                            Upgrade to Premium
                          </Button>
                        </div>
                      )}
                      {(() => {
                        const slug = getPlanSlug(plan);
                        return slug && slug !== 'free' && slug !== 'bonus';
                      })() && (
                        <div className="pt-2">
                          <Button
                            className="w-full border-2 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500 bg-transparent font-semibold py-3 rounded-xl transition-all"
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
              <CreditsComponent />
            </div>
          )}

          {/* Response Type Selector - Mobile Only */}
          {isMobile && (
            <Popover>
            <PopoverTrigger asChild>
              <button className="w-full capitalize border border-slate-300 rounded-xl flex items-center justify-between px-3 py-2 font-semibold text-slate-700 cursor-pointer hover:bg-white transition-all shadow-sm hover:shadow-md bg-white text-xs sm:text-sm">
                <span>{response_type}</span>
                <Edit2 size={14} className="text-slate-400" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="border bg-white border-slate-200 shadow-xl">
              <div className="space-y-4">
                <RadioGroup
                  onValueChange={(res) => {
                    setResponseType(res);
                    return res;
                  }}
                  value={response_type}
                >
                  {[
                    { value: 'voice', label: 'Voice' },
                    { value: 'text', label: 'Text' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center cursor-pointer text-slate-700 space-x-2 hover:bg-slate-50 p-2 rounded-lg transition-colors"
                    >
                      <RadioGroupItem value={item.value} id={item.value} />
                      <Label
                        htmlFor={item.value}
                        className="cursor-pointer font-medium"
                      >
                        {item.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </PopoverContent>
          </Popover>
          )}

          {/* Relationship Selector - Mobile Only */}
          {isMobile && (
            <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    disabled={!currentChat}
                    className="w-full text-xs sm:text-sm flex items-center justify-between font-semibold capitalize text-slate-700 cursor-pointer hover:bg-white border border-slate-300 rounded-xl px-3 py-2 shadow-sm hover:shadow-md bg-white transition-all disabled:opacity-50"
                    ref={relTriggerRef}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-bold text-slate-900 truncate">
                        {character?.attributes?.name}
                      </span>
                      {currentChat?.data?.attributes?.relationship_type && (
                        <span className="text-xs bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                          {currentChat?.data?.attributes?.relationship_type}
                        </span>
                      )}
                    </div>
                    <div className="h-2 w-2 bg-emerald-500 rounded-full ring-2 ring-emerald-200 animate-pulse shrink-0 ml-2"></div>
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Change relationship</p>
              </TooltipContent>
            </Tooltip>
            <PopoverContent className="border bg-white border-slate-200 shadow-xl">
              <div className="space-y-4">
                <h3
                  className={`text-xl font-bold text-slate-900 ${
                    highlightRelPrompt
                      ? 'ring-2 ring-pink-400 rounded-lg animate-pulse'
                      : ''
                  }`}
                >
                  Choose a relationship
                </h3>
                <div className="flex flex-wrap justify-self-auto gap-2 text-sm">
                  {relationshipTypes.map((type) => {
                    const isCurrent =
                      currentChat?.data?.attributes?.relationship_type === type;
                    const isSelected =
                      selectedRelationship === type || isCurrent;
                    return (
                      <Button
                        key={type}
                        variant={isSelected ? 'default' : 'outline'}
                        className={`capitalize transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0 shadow-md hover:shadow-lg'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-50 bg-white'
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
          )}
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-hidden">
          <ChatList
            characters={characters}
            chats={chats}
            currentChat={currentChat!}
            setCharacter={setCharacter}
            deleteLoading={deleteLoading}
            updateCharacterVideoPlayed={() => {
              if (character?.id) {
                updateCharacterVideoPlayed(character.id);
              }
            }}
            handleDeleteChat={handleDeleteChat}
          />
        </div>

        {/* Profile Settings */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        <Link
          href={'/profile'}
          className="flex cursor-pointer items-center space-x-3 w-full text-left text-slate-600 hover:text-slate-900 p-2 rounded-lg hover:bg-white transition-colors"
        >
          <Image
            src={user?.data?.attributes?.avatar || '/default-avatar.png'}
            alt={character?.attributes?.name || 'profile'}
            width={36}
            height={36}
            className="rounded-full ring-2 ring-slate-200"
          />
          <span className="font-medium text-sm">Profile settings</span>
        </Link>
        </div>
      </div>
    </div>
  );
}

