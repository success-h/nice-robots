// const handleDeleteChat = async (id: string) => {
//   setDeleteLoading(true);
//   try {
//     await useApi(
//       `/chats/${id}`,
//       {
//         method: 'DELETE',
//       },
//       access_token
//     );
//     deleteChat(id);
//     setDeleteLoading(false);
//     setCharacter(chats?.[0]?.data?.relationships?.character!);
//     setChats(chats?.find());
//     setCurrentChat(chats.find);
//     return;
//   } catch (error) {
//     setDeleteLoading(false);
//     return error;
//   }
// };

// // delete modal
//    <div className="flex-1 min-w-0">
//                   <p className="text-sm font-medium truncate">
//                     {chat?.data?.relationships?.character?.attributes.name}
//                   </p>
//                   <p className="text-xs text-gray-400 truncate">
//                     {chat?.chatHistory && chat?.chatHistory?.length > 0
//                       ? chat?.chatHistory[
//                           chat?.chatHistory?.length - 1
//                         ].content.slice(0, 30) + '...'
//                       : 'New conversation'}
//                   </p>
//                 </div>
//                 <div className="ml-2">
//                   <Dialog>
//                     <DialogTrigger className="cursor-pointer">
//                       <FiTrash />
//                     </DialogTrigger>
//                     <DialogContent>
//                       <DialogHeader>
//                         <DialogTitle className="text-black">
//                           Are you absolutely sure?
//                         </DialogTitle>
//                         <DialogDescription>
//                           This action cannot be undone. This will permanently
//                           delete your account and remove your data from our
//                           servers.
//                         </DialogDescription>
//                       </DialogHeader>
//                       <DialogFooter>
//                         <DialogClose>
//                           <Button variant={'outline'} className="text-black">
//                             Cancel
//                           </Button>
//                         </DialogClose>
//                         <Button
//                           onClick={() => {
//                             handleDeleteChat(chat.data.id);
//                           }}
//                           className="bg-red-500"
//                         >
//                           {deleteLoading && (
//                             <Loader2 className="mr-2 h-6 w-6 animate-spin text-pink-500" />
//                           )}{' '}
//                           Yes, Delete chat
//                         </Button>
//                       </DialogFooter>
//                     </DialogContent>
//                   </Dialog>
//                 </div>

// // create chat

const response = await useApi(
  '/chats',
  {
    method: 'POST',
    body: JSON.stringify({
      data: {
        attributes: {
          character_id: character?.id,
          relationship_type:
            character?.attributes?.available_relationship_types?.[0] ||
            'friend',
          return_type: response_type,
        },
      },
    }),
  },
  access_token
);
const data = await parseApiResponse(response);
setCurrentChat(data);
setChats(data);
