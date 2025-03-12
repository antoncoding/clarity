"use client";

import { useState } from "react";
import { BounceLoader } from "react-spinners";

interface NewMessageInterfaceProps {
  isLoading: boolean;
  onSendMessage: (message: string) => Promise<void>;
}

export function NewMessageInterface({ onSendMessage }: NewMessageInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await onSendMessage(inputValue);
      setInputValue(""); // Clear input after sending
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendSuggestion = (suggestion: string) => {
    if (!isLoading) {
      setInputValue(suggestion);
      onSendMessage(suggestion);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center h-full">
      <div className="w-full max-w-xl px-4">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-center text-primary-700 dark:text-primary-300">
            Clarity
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Ask about recent news events, trends, or any topic you're curious about
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="flex space-x-2 mb-6">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md"
            disabled={!inputValue.trim() || isLoading}
          >
            {isLoading ? (
              <BounceLoader color="#0047AB" size={24} />
            ) : (
              "Send"
            )}
          </button>
        </form>
        
        <div className="flex flex-col items-center">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Try asking about:</h3>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => sendSuggestion("What are the top news stories today?")}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm transition-colors"
              disabled={isLoading}
            >
              Top stories today
            </button>
            <button
              onClick={() => sendSuggestion("What's happening in technology news?")}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm transition-colors"
              disabled={isLoading}
            >
              Technology news
            </button>
            <button
              onClick={() => sendSuggestion("Tell me the latest from the business world")}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm transition-colors"
              disabled={isLoading}
            >
              Business updates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
