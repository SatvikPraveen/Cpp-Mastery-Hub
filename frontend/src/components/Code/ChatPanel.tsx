import { Send } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import type { ChatMessage, CollaborationUser, User } from '@/types';

interface ChatPanelProps {
  messages: ChatMessage[];
  users: CollaborationUser[];
  currentUser: User | null;
  onSendMessage: (content: string) => void;
}

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** Session chat sidebar for the collaborative editor. */
export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  users,
  currentUser,
  onSendMessage,
}) => {
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    onSendMessage(content);
    setDraft('');
  };

  return (
    <div className="flex flex-col h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-white">Chat</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">{users.length} in session</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-center text-gray-500 dark:text-gray-400">No messages yet.</p>
        )}
        {messages.map((message) => {
          if (message.type === 'system') {
            return (
              <p key={message.id} className="text-xs text-center text-gray-500 dark:text-gray-400">
                {message.content}
              </p>
            );
          }
          const isOwn = message.user.id === currentUser?.id;
          return (
            <div key={message.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {isOwn ? 'You' : message.user.username} · {formatTime(message.timestamp)}
              </span>
              <p
                className={`mt-1 max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  isOwn
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                }`}
              >
                {message.content}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 p-3 border-t border-gray-200 dark:border-gray-700"
      >
        <label htmlFor="collab-chat-input" className="sr-only">
          Message
        </label>
        <input
          id="collab-chat-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Send message"
          className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
