import { apiClient } from './apiClient';

export interface Topic {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  is_archived?: boolean;
  metadata?: Record<string, any>;
  message_count?: number;
  last_message_at?: string | null;
}

export interface TopicsResponse {
  topics: Topic[];
  total: number;
  page: number;
  page_size: number;
}

export interface ChatMessage {
  id: string;
  topic_id: string;
  role: 'user' | 'assistant';
  content: string;
  reference_documents?: Array<{
    email: string;
    file_id: string;
    filename: string;
    chunk_index: number;
  }>;
  metadata?: {
    refrensi?: any[];
    images?: string[];
  };
  created_at: string;
}

export interface TopicWithMessages {
  topic: Topic;
  messages: ChatMessage[];
}

export interface MessagesResponse {
  messages: ChatMessage[];
  total: number;
  topic: Topic;
}

export interface CreateTopicRequest {
  title: string;
}

export interface UpdateTopicRequest {
  title?: string;
}

/**
 * Chat History Service
 * Handles all API calls related to chat topics and messages
 */
export class ChatHistoryService {
  /**
   * Create a new topic
   */
  static async createTopic(title: string): Promise<Topic> {
    return apiClient.post<Topic>('/chat/topics', { title });
  }

  /**
   * Get all topics for current user
   */
  static async getTopics(): Promise<Topic[]> {
    const response = await apiClient.get<TopicsResponse>('/chat/topics');
    // API mengembalikan { topics: [...], total, page, page_size }
    return response.topics || [];
  }

  /**
   * Get a specific topic by ID
   */
  static async getTopic(topicId: string): Promise<Topic> {
    return apiClient.get<Topic>(`/chat/topics/${topicId}`);
  }

  /**
   * Update topic title
   */
  static async updateTopic(topicId: string, title: string): Promise<Topic> {
    return apiClient.put<Topic>(`/chat/topics/${topicId}`, { title });
  }

  /**
   * Delete a topic
   */
  static async deleteTopic(topicId: string): Promise<void> {
    return apiClient.delete<void>(`/chat/topics/${topicId}`);
  }

  /**
   * Get all messages for a topic
   */
  static async getMessages(topicId: string): Promise<ChatMessage[]> {
    const response = await apiClient.get<MessagesResponse>(`/chat/topics/${topicId}/messages`);
    // API mengembalikan { messages: [...], total, topic }
    return response.messages || [];
  }

  /**
   * Get topic with all its messages
   */
  static async getTopicWithMessages(topicId: string): Promise<TopicWithMessages> {
    return apiClient.get<TopicWithMessages>(`/chat/topics/${topicId}/full`);
  }

  /**
   * Ask agent with topic context
   * This will automatically save the conversation to the topic
   */
  static async askAgent(query: string, topicId?: string, saveHistory: boolean = true) {
    return apiClient.post<any>('/agent/', {
      query,
      topic_id: topicId,
      save_history: saveHistory,
    });
  }
}
