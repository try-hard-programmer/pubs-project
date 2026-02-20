import { supabase } from "@/integrations/supabase/client";
import { env } from "@/config/env";

/**
 * Centralized API client with automatic JWT token injection
 * Automatically adds Authorization header with Bearer token from Supabase
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    // Remove trailing slash from baseUrl to prevent double slashes
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  /**
   * Get JWT token from Supabase session
   */
  private async getAuthToken(): Promise<string | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  /**
   * Make an authenticated fetch request
   */
  private async authenticatedFetch(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const token = await this.getAuthToken();

    const headers: HeadersInit = {
      ...options.headers,
    };

    // Add Authorization header if token exists
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData (browser will set it with boundary)
    if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const url = `${this.baseUrl}${endpoint}`;

    // Log request for debugging (remove in production if needed)
    console.log(`[API Request] ${options.method || "GET"} ${url}`);

    return fetch(url, {
      ...options,
      headers,
    });
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await this.authenticatedFetch(endpoint, {
      ...options,
      method: "GET",
    });

    if (!response.ok) {
      const message = await response.json();
      const text = message.detail;
      throw new Error(text || `GET request failed (${response.status})`);
    }

    return response.json();
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body?: any,
    options?: RequestInit,
  ): Promise<T> {
    const requestOptions: RequestInit = {
      ...options,
      method: "POST",
    };

    // Handle FormData vs JSON
    if (body instanceof FormData) {
      requestOptions.body = body;
    } else if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    const response = await this.authenticatedFetch(endpoint, requestOptions);

    if (!response.ok) {
      const message = await response.json();
      const text = message.detail;
      throw new Error(text || `POST request failed (${response.status})`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { status: "ok" } as T;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }

    return { status: "ok" } as T;
  }

  /**
   * DELETE request
   */
  async delete<T>(
    endpoint: string,
    body?: any,
    options?: RequestInit,
  ): Promise<T> {
    const requestOptions: RequestInit = {
      ...options,
      method: "DELETE",
    };

    if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    const response = await this.authenticatedFetch(endpoint, requestOptions);

    if (!response.ok) {
      const message = await response.json();
      const text = message.detail;
      throw new Error(text || `DELETE request failed (${response.status})`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { status: "ok" } as T;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }

    return { status: "ok" } as T;
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    body?: any,
    options?: RequestInit,
  ): Promise<T> {
    const requestOptions: RequestInit = {
      ...options,
      method: "PUT",
    };

    if (body instanceof FormData) {
      requestOptions.body = body;
    } else if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    const response = await this.authenticatedFetch(endpoint, requestOptions);

    if (!response.ok) {
      const message = await response.json();
      const text = message.detail;
      throw new Error(text || `PUT request failed (${response.status})`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { status: "ok" } as T;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }

    return { status: "ok" } as T;
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    body?: any,
    options?: RequestInit,
  ): Promise<T> {
    const requestOptions: RequestInit = {
      ...options,
      method: "PATCH",
    };

    if (body instanceof FormData) {
      requestOptions.body = body;
    } else if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    const response = await this.authenticatedFetch(endpoint, requestOptions);

    if (!response.ok) {
      const message = await response.json();
      const text = message.detail;
      throw new Error(text || `PATCH request failed (${response.status})`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { status: "ok" } as T;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }

    return { status: "ok" } as T;
  }

  /**
   * GET request returning a Blob (for file downloads)
   */
  async getBlob(endpoint: string, options?: RequestInit): Promise<Blob> {
    const response = await this.authenticatedFetch(endpoint, {
      ...options,
      method: "GET",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `GET Blob request failed (${response.status})`);
    }

    return response.blob();
  }
}

// Export singleton instance
export const apiClient = new ApiClient(env.agentApiUrl);

// Export type for responses
export interface ApiResponse<T = any> {
  data?: T;
  status?: string;
  message?: string;
}
