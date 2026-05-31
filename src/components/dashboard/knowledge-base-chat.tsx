'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { MessageSquare, Plus, Trash2, Flag, CheckCircle2, Zap, FileText } from 'lucide-react';
import { validateResponse, ChatResponseSchema, DeleteResponseSchema } from '@/lib/knowledge-base-validation';

interface ContextSource {
  documentId: string;
  chunkId: string;
  content: string;
  relevanceScore: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contextUsed?: ContextSource[];
  timestamp: Date;
}

interface ChatThread {
  threadId: string;
  createdAt: Date;
  topic: string;
  messages: Message[];
  usedInTemplate: boolean;
}

interface KnowledgeBaseChatProps {
  applicationId: string;
}

export function KnowledgeBaseChat({ applicationId }: KnowledgeBaseChatProps) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showContextDetails, setShowContextDetails] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [topicInput, setTopicInput] = useState('');
  const [showNewChatForm, setShowNewChatForm] = useState(false);
  const [badgingMessageId, setBadgingMessageId] = useState<string | null>(null);
  const [badgeNotes, setBadgeNotes] = useState('');

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load messages when active thread changes
  useEffect(() => {
    if (activeThreadId) {
      const thread = threads.find((t) => t.threadId === activeThreadId);
      if (thread) {
        setMessages(thread.messages);
      }
    } else {
      setMessages([]);
    }
  }, [activeThreadId, threads]);

  const createNewChatThread = async () => {
    if (!topicInput.trim()) {
      alert('Please enter a topic for the chat');
      return;
    }

    try {
      const threadId = `thread-${Date.now()}`;
      const newThread: ChatThread = {
        threadId,
        createdAt: new Date(),
        topic: topicInput,
        messages: [],
        usedInTemplate: false,
      };

      setThreads((prev) => [newThread, ...prev]);
      setActiveThreadId(threadId);
      setTopicInput('');
      setShowNewChatForm(false);

      console.log('[v0] New chat thread created:', threadId, topicInput);
    } catch (err) {
      console.error('[v0] Error creating chat thread:', err);
      alert('Failed to create chat thread');
    }
  };

  const sendMessage = async () => {
    if (!userInput.trim() || !activeThreadId) {
      return;
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userInput,
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

      console.log('[v0] Sending chat message:', userMessage.content);

      const response = await fetch(`${apiUrl}/api/knowledge-base/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          threadId: activeThreadId,
          userMessage: userInput,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const rawData = await response.json();
      const data = validateResponse(ChatResponseSchema, rawData);

      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.assistantMessage,
        contextUsed: data.contextUsed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      console.log('[v0] Assistant message received with', data.contextUsed?.length || 0, 'context sources');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
      console.error('[v0] Chat error:', err);

      const errorMessage_: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `Error: ${errorMessage}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage_]);
    } finally {
      setIsLoading(false);
    }
  };

  const finalizeThreadToTemplate = async (threadId: string) => {
    if (!confirm('Mark this chat as finalized for template creation? This will be preserved when deleting knowledge data.')) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

      const response = await fetch(`${apiUrl}/api/knowledge-base/finalize-to-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, threadId }),
      });

      if (!response.ok) {
        throw new Error('Failed to finalize');
      }

      const rawData = await response.json();
      validateResponse(DeleteResponseSchema, rawData);

      // Update thread state
      setThreads((prev) =>
        prev.map((thread) => (thread.threadId === threadId ? { ...thread, usedInTemplate: true } : { ...thread, usedInTemplate: false }))
      );

      console.log('[v0] Thread finalized to template:', threadId);
    } catch (err) {
      console.error('[v0] Error finalizing thread:', err);
      alert('Failed to finalize thread');
    }
  };

  const badgePrompt = async (messageId: string) => {
    if (!confirm('Badge this prompt as approved for template creation?')) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

      // For now, use messageId as promptId (would be replaced with actual prompt ID in production)
      const response = await fetch(`${apiUrl}/api/knowledge-base/prompts/${messageId}/badge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          badgeStatus: 'approved',
          badgedBy: 'tester',
          badgeNotes: badgeNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to badge prompt');
      }

      const data = await response.json();
      console.log('[v0] Prompt badged successfully:', data);

      // Update UI to show badge
      setBadgingMessageId(null);
      setBadgeNotes('');
      alert('Prompt badged successfully!');
    } catch (err) {
      console.error('[v0] Error badging prompt:', err);
      alert('Failed to badge prompt');
    }
  };

  const deleteThread = async (threadId: string) => {
    if (!confirm('Delete this chat thread? This cannot be undone.')) {
      return;
    }

    try {
      // For now, just remove from UI
      setThreads((prev) => prev.filter((t) => t.threadId !== threadId));
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
      }

      console.log('[v0] Thread deleted:', threadId);
    } catch (err) {
      console.error('[v0] Error deleting thread:', err);
      alert('Failed to delete thread');
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Left Sidebar - Chat Threads */}
      <div className="w-80 flex flex-col border border-gray-200 rounded-lg bg-gray-50">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Chat Threads</h3>

          {!showNewChatForm ? (
            <Button onClick={() => setShowNewChatForm(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white justify-center gap-2">
              <Plus className="w-4 h-4" />
              New Chat
            </Button>
          ) : (
            <div className="space-y-2">
              <textarea
                placeholder="Enter chat topic or initial question..."
                value={topicInput}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setTopicInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    createNewChatThread();
                  }
                }}
              />
              <div className="flex gap-2">
                <Button onClick={createNewChatThread} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm">
                  Create
                </Button>
                <Button onClick={() => setShowNewChatForm(false)} variant="outline" className="flex-1 text-sm">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Threads List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-xs text-gray-500">No chat threads yet</p>
            </div>
          ) : (
            threads.map((thread) => (
              <Card
                key={thread.threadId}
                onClick={() => setActiveThreadId(thread.threadId)}
                className={`p-3 cursor-pointer transition-colors ${
                  activeThreadId === thread.threadId ? 'bg-blue-100 border-blue-300' : 'bg-white hover:bg-gray-100'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{thread.topic}</p>
                      <p className="text-xs text-gray-500">{formatDate(thread.createdAt)}</p>
                    </div>
                    {thread.usedInTemplate && (
                      <Badge className="bg-green-100 text-green-800 border-green-300 flex-shrink-0 text-xs whitespace-nowrap">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Finalized
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-gray-600 truncate">{thread.messages.length} messages</div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Right - Chat Area */}
      <div className="flex-1 flex flex-col border border-gray-200 rounded-lg bg-white">
        {activeThreadId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{threads.find((t) => t.threadId === activeThreadId)?.topic}</h2>
                <p className="text-xs text-gray-500 mt-1">{messages.length} messages</p>
              </div>

              <div className="flex gap-2">
                {!threads.find((t) => t.threadId === activeThreadId)?.usedInTemplate && (
                  <Button
                    onClick={() => finalizeThreadToTemplate(activeThreadId)}
                    className="bg-green-600 hover:bg-green-700 text-white gap-2 text-sm"
                  >
                    <Flag className="w-4 h-4" />
                    Finalize
                  </Button>
                )}

                <Button
                  onClick={() => deleteThread(activeThreadId)}
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">Start chatting about your knowledge base</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="space-y-2">
                    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-2xl rounded-lg px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-900 rounded-bl-none'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                          {formatDate(message.timestamp)}
                        </p>
                      </div>
                    </div>

                    {/* Badge button for assistant messages */}
                    {message.role === 'assistant' && !message.content.startsWith('Error:') && (
                      <div className="flex justify-start ml-0">
                        {badgingMessageId === message.id ? (
                          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-3 max-w-2xl w-full">
                            <div className="space-y-2">
                              <textarea
                                placeholder="Add notes for this badged prompt (optional)..."
                                value={badgeNotes}
                                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setBadgeNotes(e.target.value)}
                                className="w-full px-3 py-2 border border-green-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                                rows={2}
                              />
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => badgePrompt(message.id)}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm"
                                >
                                  Confirm Badge
                                </Button>
                                <Button
                                  onClick={() => {
                                    setBadgingMessageId(null);
                                    setBadgeNotes('');
                                  }}
                                  variant="outline"
                                  className="flex-1 text-sm"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ) : (
                          <Button
                            onClick={() => setBadgingMessageId(message.id)}
                            className="bg-green-600 hover:bg-green-700 text-white gap-2 text-sm"
                          >
                            <Flag className="w-4 h-4" />
                            Badge Prompt
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Context Used */}
                    {message.contextUsed && message.contextUsed.length > 0 && (
                      <div className="ml-0 flex justify-start">
                        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 p-3 max-w-2xl">
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setShowContextDetails(showContextDetails === message.id ? null : message.id)}
                          >
                            <Zap className="w-4 h-4 text-purple-600 flex-shrink-0" />
                            <span className="text-xs font-medium text-purple-900">
                              Context Used ({message.contextUsed.length} {message.contextUsed.length === 1 ? 'source' : 'sources'})
                            </span>
                          </div>

                          {showContextDetails === message.id && (
                            <div className="mt-3 space-y-2 pt-3 border-t border-purple-200">
                              {message.contextUsed.map((source, idx) => (
                                <div key={idx} className="bg-white rounded p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-purple-600" />
                                      <span className="text-xs font-medium text-gray-900">{source.documentId}</span>
                                    </div>
                                    <span className={`text-xs font-medium ${formatScoreColor(source.relevanceScore)}`}>
                                      {(source.relevanceScore * 100).toFixed(0)}% relevance
                                    </span>
                                  </div>

                                  <p className="text-xs text-gray-700 line-clamp-3 italic">"{source.content.substring(0, 150)}..."</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </Card>
                      </div>
                    )}
                  </div>
                ))
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-3">
                <textarea
                  value={userInput}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Ask a question about your knowledge base... (Shift+Enter for new line)"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  rows={3}
                  disabled={isLoading}
                />

                <Button
                  onClick={sendMessage}
                  disabled={isLoading || !userInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-auto px-6"
                >
                  {isLoading ? <Spinner className="w-4 h-4" /> : 'Send'}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500">Select or create a chat thread to start</p>
          </div>
        )}
      </div>
    </div>
  );
}
