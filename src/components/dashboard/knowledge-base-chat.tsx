'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Plus, Trash2, Flag, CheckCircle2, Zap, FileText, AlertCircle, Download } from 'lucide-react';
import { validateResponse, ChatResponseSchema, DeleteResponseSchema } from '@/lib/knowledge-base-validation';
import { useKnowledgeBase } from '@/hooks/use-knowledge-base';

/**
 * KnowledgeBaseChat Component
 *
 * Enables chat-based querying of the knowledge base.
 * Does NOT save KB configuration - that's done in Settings→KB tab.
 *
 * Uses the chat completion provider configuration (Azure OpenAI endpoint, API key, model, temperature, max tokens) 
 * saved in Settings→KB tab to generate responses based on knowledge base embeddings.
 *
 * Workflow:
 * 1. User creates new chat thread and sends query
 * 2. Backend fetches KB config from MongoDB (chat completion provider)
 * 3. Query is converted to embedding using the configured embeddings model
 * 4. Similarity search finds relevant documents from vector database
 * 5. Relevant context passed to chat completion model
 * 6. Chat completion generates response with context awareness
 * 7. Response displayed with source references
 */

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
  const [error, setError] = useState<string | null>(null);
  const [kbConfigValid, setKbConfigValid] = useState(true);
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    avgQueryTime: number;
    totalQueries: number;
    avgSearchTime: number;
    lastQueryTime: number;
  }>({
    avgQueryTime: 0,
    totalQueries: 0,
    avgSearchTime: 0,
    lastQueryTime: 0,
  });

  // Fetch KB configuration from Settings→KB tab for this application
  // This includes: chat completion provider (Azure endpoint, API key, model, temperature, max tokens)
  // Backend handles decryption of sensitive credentials transparently
  const { config, isLoadingConfig, configError } = useKnowledgeBase(applicationId);

  // Load threads from localStorage on mount
  useEffect(() => {
    const storageKey = `kb-threads-${applicationId}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setThreads(parsed);
        console.log('[v0] Loaded', parsed.length, 'threads from storage');
      }
    } catch (err) {
      console.error('[v0] Error loading threads from storage:', err);
    }
  }, [applicationId]);

  // Save threads to localStorage whenever they change
  useEffect(() => {
    const storageKey = `kb-threads-${applicationId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(threads));
      console.log('[v0] Saved', threads.length, 'threads to storage');
    } catch (err) {
      console.error('[v0] Error saving threads to storage:', err);
    }
  }, [threads, applicationId]);

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
    if (!userInput.trim()) {
      setError('Please enter a message');
      return;
    }

    if (!activeThreadId) {
      setError('No active chat thread. Please create a new chat first.');
      return;
    }

    if (!applicationId) {
      setError('Application ID missing. Please refresh the page.');
      return;
    }

    const queryStartTime = performance.now();
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
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

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
        const errorText = await response.text();
        if (response.status === 400) {
          throw new Error('Invalid request. KB Config may not be configured.');
        } else if (response.status === 404) {
          throw new Error('Knowledge base not found for this application.');
        } else if (response.status === 500) {
          throw new Error('Server error. Azure service may be unavailable.');
        }
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }

      const rawData = await response.json();
      
      if (!rawData.success) {
        throw new Error(rawData.error || 'Failed to generate response');
      }

      const data = validateResponse(ChatResponseSchema, rawData.data);

      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.assistantMessage,
        contextUsed: data.contextUsed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Calculate and track performance
      const queryEndTime = performance.now();
      const queryDuration = queryEndTime - queryStartTime;
      
      setPerformanceMetrics((prev) => ({
        lastQueryTime: queryDuration,
        totalQueries: prev.totalQueries + 1,
        avgQueryTime: (prev.avgQueryTime * prev.totalQueries + queryDuration) / (prev.totalQueries + 1),
        avgSearchTime: prev.avgSearchTime,
      }));

      console.log('[v0] Query completed in', Math.round(queryDuration), 'ms');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate response from KB';
      console.error('[v0] Chat error:', err);
      setError(errorMessage);

      const errorMessage_: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `⚠️ Error: ${errorMessage}. Please check your KB Config settings and try again.`,
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

  const exportChatHistory = () => {
    if (!activeThreadId || messages.length === 0) {
      alert('No messages to export');
      return;
    }

    const thread = threads.find((t) => t.threadId === activeThreadId);
    if (!thread) return;

    const exportData = {
      exportDate: new Date().toISOString(),
      applicationId,
      thread: {
        threadId: thread.threadId,
        topic: thread.topic,
        createdAt: thread.createdAt,
        messageCount: messages.length,
      },
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        contextUsed: m.contextUsed?.map((c) => ({
          documentId: c.documentId,
          chunkId: c.chunkId,
          relevanceScore: c.relevanceScore,
        })),
      })),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kb-chat-${thread.topic.replace(/\s+/g, '-')}-${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('[v0] Chat history exported');
  };

  const badgePrompt = async (messageId: string) => {
    if (!confirm('Badge this prompt for BA Review? It will be sent to the review queue.')) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      
      // Find the message to get its context
      const message = messages.find((m) => m.id === messageId);
      if (!message) {
        alert('Message not found');
        return;
      }

      if (message.role !== 'assistant') {
        alert('Only assistant responses can be badged');
        return;
      }

      // Find the user query (previous message)
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      const userMessage = messageIndex > 0 ? messages[messageIndex - 1] : null;
      const userQuery = userMessage?.content || 'Unknown query';

      console.log(`[v0] Badging prompt: query="${userQuery.substring(0, 50)}", response="${message.content.substring(0, 50)}"`);

      // POST to create/badge a KB prompt record
      const response = await fetch(`${apiUrl}/api/knowledge-base/prompts/badge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          userQuery,
          llmGeneratedResponse: message.content,
          contextRetrieved: message.contextUsed || [],
          badgeStatus: 'approved',
          badgedBy: 'tester',
          badgeNotes: badgeNotes,
          embeddingModelUsed: 'text-embedding-3-large',
          ragSessionId: activeThreadId || 'transient-session',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[v0] Badge response error:', error);
        throw new Error(`Failed to badge prompt: ${response.status} ${error}`);
      }

      const data = await response.json();
      console.log('[v0] Prompt badged successfully:', data);

      // Clear state
      setBadgingMessageId(null);
      setBadgeNotes('');
      alert('Prompt badged and sent to BA Review Queue!');
    } catch (err) {
      console.error('[v0] Error badging prompt:', err);
      alert(`Failed to badge prompt: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
              <Textarea
                placeholder="Enter chat topic or initial question..."
                value={topicInput}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setTopicInput(e.target.value)}
                className="resize-none"
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
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{messages.length} messages</span>
                  {performanceMetrics.totalQueries > 0 && (
                    <>
                      <span>•</span>
                      <span title="Average response time">⏱ {Math.round(performanceMetrics.avgQueryTime)}ms avg</span>
                      {performanceMetrics.lastQueryTime > 0 && (
                        <>
                          <span>•</span>
                          <span title="Last response time">{Math.round(performanceMetrics.lastQueryTime)}ms last</span>
                        </>
                      )}
                    </>
                  )}
                </div>
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
                  onClick={exportChatHistory}
                  variant="outline"
                  className="text-blue-600 hover:bg-blue-50 text-sm gap-2 border-blue-200"
                >
                  <Download className="w-4 h-4" />
                  Export
                </Button>

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
              {/* Error Banner */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-900">{error}</p>
                    <p className="text-xs text-red-700 mt-1">Check KB settings and ensure Azure credentials are configured.</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-600 hover:text-red-800 flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              )}

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
