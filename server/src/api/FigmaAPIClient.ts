import axios, { AxiosInstance, AxiosError } from 'axios';
import type { FigmaFile } from '../types/figma.js';
import { logger } from '../utils/logger.js';

export class FigmaAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'FigmaAPIError';
  }
}

export class FigmaAPIClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: 'https://api.figma.com/v1',
      headers: {
        'X-Figma-Token': apiKey,
      },
      timeout: 30000,
    });
  }

  async getFile(fileId: string): Promise<FigmaFile> {
    try {
      logger.info(`Fetching Figma file: ${fileId}`);
      
      const response = await this.retryRequest(async () => {
        return await this.client.get<FigmaFile>(`/files/${fileId}`);
      });

      logger.info(`Successfully fetched Figma file: ${fileId}`);
      return response.data;
    } catch (error) {
      return this.handleError(error, fileId);
    }
  }

  async getImageUrls(
    fileId: string,
    nodeIds: string[]
  ): Promise<Record<string, string>> {
    if (nodeIds.length === 0) {
      return {};
    }

    try {
      logger.info(`Fetching image URLs for ${nodeIds.length} nodes`);
      
      const response = await this.retryRequest(async () => {
        return await this.client.get(`/images/${fileId}`, {
          params: {
            ids: nodeIds.join(','),
            format: 'png',
            scale: 2,
          },
        });
      });

      logger.info(`Successfully fetched image URLs`);
      return response.data.images || {};
    } catch (error) {
      logger.error('Failed to fetch image URLs', { error, nodeIds });
      // Return empty object instead of throwing - images are not critical
      return {};
    }
  }

  async getFileComponents(fileId: string): Promise<Record<string, any>> {
    try {
      logger.info(`Fetching components for file: ${fileId}`);
      
      const response = await this.retryRequest(async () => {
        return await this.client.get(`/files/${fileId}/components`);
      });

      logger.info(`Successfully fetched components`);
      return response.data.meta?.components || {};
    } catch (error) {
      logger.warn('Failed to fetch components', { error });
      return {};
    }
  }

  async getFileStyles(fileId: string): Promise<Record<string, any>> {
    try {
      logger.info(`Fetching styles for file: ${fileId}`);
      
      const response = await this.retryRequest(async () => {
        return await this.client.get(`/files/${fileId}/styles`);
      });

      logger.info(`Successfully fetched styles`);
      return response.data.meta?.styles || {};
    } catch (error) {
      logger.warn('Failed to fetch styles', { error });
      return {};
    }
  }

  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        if (axios.isAxiosError(error)) {
          const statusCode = error.response?.status;
          
          // Don't retry on client errors (4xx except 429)
          if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
            throw error;
          }
          
          // Retry on server errors (5xx) or rate limiting (429)
          if (attempt < maxRetries) {
            const delay = this.getRetryDelay(attempt, statusCode);
            logger.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
            await this.sleep(delay);
            continue;
          }
        }
        
        throw error;
      }
    }
    
    throw lastError;
  }

  private getRetryDelay(attempt: number, statusCode?: number): number {
    // Exponential backoff: 1s, 2s, 4s
    const baseDelay = Math.pow(2, attempt - 1) * 1000;
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    
    return baseDelay + jitter;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private handleError(error: any, fileId: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const statusCode = axiosError.response?.status;
      const responseData = axiosError.response?.data as any;

      let message = 'Failed to fetch Figma file';
      
      if (statusCode === 401 || statusCode === 403) {
        message = 'Invalid Figma API key. Please check your API key and try again.';
      } else if (statusCode === 404) {
        message = `Figma file not found: ${fileId}. Please check the file ID or URL.`;
      } else if (statusCode === 429) {
        message = 'Rate limit exceeded. Please try again in a few moments.';
      } else if (axiosError.code === 'ECONNABORTED') {
        message = 'Request timeout. The Figma API is taking too long to respond.';
      } else if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
        message = 'Network error. Please check your internet connection.';
      } else if (responseData?.err) {
        message = `Figma API error: ${responseData.err}`;
      } else if (responseData?.message) {
        message = `Figma API error: ${responseData.message}`;
      }

      logger.error(message, { statusCode, fileId, error: axiosError.message });
      throw new FigmaAPIError(message, statusCode, error);
    }

    // Unknown error
    logger.error('Unknown error fetching Figma file', { fileId, error });
    throw new FigmaAPIError(
      'An unexpected error occurred while fetching the Figma file',
      undefined,
      error
    );
  }
}
