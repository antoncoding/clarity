"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { MenuItem } from "./menu-item";
import { useConversation } from "@/context/conversation-context";
import { SyncLoader } from "react-spinners";
import { CirclePlus, TrashIcon, List, ListEnd } from "lucide-react";
import { ConversationItem } from "./conversation-item";

// Define conversation type
type Conversation = {
  id: string;
  created_at: string;
  title: string;
};

// Add to props interface
interface ConversationsListProps {
  isExpanded: boolean;
  onConversationClick: (conversationId: string) => void;
  activePath?: string;
}

export function ConversationsList({
  isExpanded,
  onConversationClick,
  activePath
}: ConversationsListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [conversationTitleToDelete, setConversationTitleToDelete] = useState<string>("");
  const { selectedConversationId, setSelectedConversationId } = useConversation();

  // Function to generate a random number for conversation title
  const generateRandomTitle = () => {
    return `Conversation #${Math.floor(Math.random() * 10000)}`;
  };

  // Fetch conversations from the database
  const fetchConversations = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
    } else {
      setConversations(data || []);
    }
    setIsLoading(false);
  };

  // Show deletion confirmation
  const confirmDelete = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the conversation selection
    setConversationToDelete(id);
    setConversationTitleToDelete(title || generateRandomTitle());
    setDeleteModalOpen(true);
  };

  // Cancel deletion
  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setConversationToDelete(null);
    setConversationTitleToDelete("");
  };

  // Proceed with deletion
  const proceedWithDeletion = async () => {
    if (!conversationToDelete) return;

    setIsDeleting(true);

    try {
      console.log(`Attempting to delete conversation: ${conversationToDelete}`);

      // Delete the messages first (since they reference the conversation)
      const { error: messagesError } = await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", conversationToDelete);

      if (messagesError) {
        console.error("Error deleting conversation messages:", messagesError);
        alert(`Error deleting messages: ${messagesError.message}`);
        setIsDeleting(false);
        return;
      } else {
        console.log(`Successfully deleted messages for conversation: ${conversationToDelete}`);
      }

      // Then delete the conversation
      const { error: conversationError, data: deleteResult } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationToDelete)
        .select();

      if (conversationError) {
        console.error("Error deleting conversation:", conversationError);
        alert(`Error deleting conversation: ${conversationError.message}`);
        setIsDeleting(false);
        return;
      }

      console.log(`Deletion result:`, deleteResult);

      // If deleted conversation was selected, reset to new chat
      if (selectedConversationId === conversationToDelete) {
        console.log(`Resetting selected conversation since ${conversationToDelete} was deleted`);
        setSelectedConversationId(null);
      }

      // Refresh the conversation list
      await fetchConversations();

      // Force refresh if the UI doesn't update
      setConversations(prev => [...prev.filter(c => c.id !== conversationToDelete)]);

    } catch (err) {
      console.error("Error in deleteConversation:", err);
      alert(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      // Close the modal
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setConversationToDelete(null);
      setConversationTitleToDelete("");
    }
  };

  // Set up real-time subscription for conversations
  useEffect(() => {
    fetchConversations();

    const channel = supabase.channel('public:conversations');

    channel
      .on('postgres_changes', {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'conversations',
      }, () => {
        fetchConversations(); // Refresh the entire list on any change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);


  // Create a new conversation
  const createNewChat = () => {
    router.push('/news');
  };

  // Get active conversation
  const activeConversation = conversations.find(c => `/news/${c.id}` === activePath);

  if (isLoading && conversations.length === 0) {
    return <div className="px-2 py-1 text-xs text-gray-500 flex justify-center items-center">
      <SyncLoader color="#0047AB" className="py-2" size={8} />
    </div>;
  }

  return (
    <>
      <ul className="space-y-1 mt-2 pl-3 max-h-[300px] overflow-y-scroll transition-all duration-300 ease-in-out
        scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800 
        scrollbar-track-transparent hover:scrollbar-thumb-gray-300 dark:hover:scrollbar-thumb-gray-700
        pr-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200
        [&::-webkit-scrollbar-thumb]:dark:bg-gray-800 [&::-webkit-scrollbar-thumb]:hover:bg-gray-300
        [&::-webkit-scrollbar-thumb]:dark:hover:bg-gray-700">
        {/* New Chat option with Collapse button */}
        <li className="flex items-center gap-1 sticky top-0 z-20 py-1 transition-all duration-300 bg-white dark:bg-gray-dark">
          <MenuItem
            className={cn(
              "flex-1 flex items-center gap-3 py-1 text-xs font-normal transition-all duration-300",
              !isExpanded && "justify-center px-0"
            )}
            onClick={createNewChat}
            isActive={pathname === "/"}
          >
            {isExpanded && (
              <div className="p-1 flex items-center gap-2 transition-all duration-300"> 
                <CirclePlus className="h-4 w-4" /> 
                <span className="text-sm">Search</span> 
              </div>
            )}
          </MenuItem>

          {/* Collapse/Expand button */}
          {isExpanded && conversations.length > 0 && (
            <button
              onClick={() => setIsListCollapsed(!isListCollapsed)}
              className={cn(
                "p-1.5 rounded-md hover:bg-primary-50 dark:hover:bg-primary-900/30",
                "text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-300",
                "transition-all duration-300"
              )}
              aria-label={isListCollapsed ? "Show all conversations" : "Hide other conversations"}
            >
              {isListCollapsed ? (
                <List className="h-4 w-4 transition-transform duration-300" />
              ) : (
                <ListEnd className="h-4 w-4 transition-transform duration-300" />
              )}
            </button>
          )}
        </li>

        {/* List of existing conversations */}
        <div className="transition-all duration-300 relative z-10">
          {(isListCollapsed ? [activeConversation].filter(Boolean) : conversations).map((conversation) => {
            if (!conversation) return null;
            
            const conversationPath = `/news/${conversation.id}`;
            const isActive = activePath === conversationPath;

            return (
              <li key={conversation.id} className="relative">
                <ConversationItem
                  isExpanded={isExpanded}
                  isActive={isActive}
                  onClick={() => {
                    setSelectedConversationId(conversation.id);
                    if (onConversationClick) onConversationClick(conversation.id);
                  }}
                  className="h-auto p-1 pl-4 pr-2"
                >
                  {isExpanded ? (
                    <div className="flex w-full items-center justify-between">
                      <span className="truncate max-w-[120px] text-inherit" title={conversation.title || generateRandomTitle()}>
                        {conversation.title || generateRandomTitle()}
                      </span>

                      {/* Delete button - always aligned right */}
                      <button
                        onClick={(e) => confirmDelete(conversation.id, conversation.title, e)}
                        className="ml-auto p-2 text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Delete conversation"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-[10px]">#</span>
                      {/* Small delete button for collapsed view */}
                      <button
                        onClick={(e) => confirmDelete(conversation.id, conversation.title, e)}
                        className="absolute -right-1 -top-1 p-2 text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Delete conversation"
                      >
                        <TrashIcon className="h-2 w-2" />
                      </button>
                    </>
                  )}
                </ConversationItem>
              </li>
            );
          })}
        </div>
      </ul>

      {/* Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            cancelDelete();
          }
        }}
        title="Delete Conversation"
        size="sm"
        className="z-[900]" // Add higher z-index to ensure modal content appears above everything
        footer={
          <>
            <button
              onClick={cancelDelete}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={proceedWithDeletion}
              className={`px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm ${isDeleting ? 'opacity-75 cursor-not-allowed' : 'hover:bg-red-700'
                } focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2`}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <span className="inline-block animate-spin mr-2">⟳</span>
                  Deleting...
                </>
              ) : 'Delete'}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to delete <strong>{conversationTitleToDelete}</strong>? This action cannot be undone.
        </p>
        {isDeleting && (
          <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-500 dark:text-gray-400">
            Deleting conversation and related messages...
          </div>
        )}
      </Modal>
    </>
  );
}
