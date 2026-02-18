// kie.ai API Client for Virtual Staging and Floor Plan generation
// Standalone version for MCP server (no Next.js, no Supabase, no webhooks)

const KIE_BASE_URL = 'https://api.kie.ai/api/v1';

// Error categorization for user-friendly error messages
export enum StagingErrorType {
  INVALID_IMAGE_URL = 'invalid_image_url',
  QUOTA_EXCEEDED = 'quota_exceeded',
  KIE_API_ERROR = 'kie_api_error',
  NETWORK_TIMEOUT = 'network_timeout',
  UNKNOWN = 'unknown',
}

export function categorizeKieError(error: Error): StagingErrorType {
  const msg = error.message.toLowerCase();
  if (msg.includes('401') || msg.includes('unauthorized'))
    return StagingErrorType.QUOTA_EXCEEDED;
  if (msg.includes('404') || msg.includes('not found') || msg.includes('invalid'))
    return StagingErrorType.INVALID_IMAGE_URL;
  if (msg.includes('timeout') || msg.includes('timed out'))
    return StagingErrorType.NETWORK_TIMEOUT;
  if (msg.includes('500') || msg.includes('502') || msg.includes('503'))
    return StagingErrorType.KIE_API_ERROR;
  return StagingErrorType.UNKNOWN;
}

interface TaskResponse {
  code: number;
  msg: string;
  data: { taskId: string };
}

export interface TaskStatus {
  code: number;
  msg: string;
  data: {
    taskId: string;
    model: string;
    state: 'waiting' | 'success' | 'fail';
    param: string;
    resultJson: string;
    failCode?: string;
    failMsg?: string;
    costTime?: number;
    completeTime?: number;
    createTime: number;
  };
}

function getHeaders(): HeadersInit {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    throw new Error('KIE_API_KEY environment variable is not set');
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Create a Virtual Staging task using gpt-image/1.5-image-to-image
 * sourceImageUrl MUST be a publicly accessible URL
 *
 * @param prompt - Staging prompt (max 3000 chars)
 * @param sourceImageUrl - Public URL of the source image
 * @param aspectRatio - Output aspect ratio
 * @param quality - medium (4 credits) or high (22 credits)
 * @returns taskId for polling
 */
export async function createStagingTask(
  prompt: string,
  sourceImageUrl: string,
  aspectRatio: '1:1' | '2:3' | '3:2' = '3:2',
  quality: 'medium' | 'high' = 'medium'
): Promise<string> {
  const requestBody = {
    model: 'gpt-image/1.5-image-to-image',
    input: {
      aspect_ratio: aspectRatio,
      prompt,
      input_urls: [sourceImageUrl],
      quality,
    },
  };

  const response = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(requestBody),
  });

  const result: TaskResponse = await response.json();

  if (result.code !== 200) {
    throw new Error(`kie.ai error: ${result.msg}`);
  }

  return result.data.taskId;
}

/**
 * Create a Floor Plan Beautification task using gpt-image/1.5-image-to-image
 * sourceImageUrl MUST be a publicly accessible URL
 *
 * @param prompt - Floor plan prompt
 * @param sourceImageUrl - Public URL of the source floor plan image
 * @param quality - medium (4 credits) or high (22 credits)
 * @returns taskId for polling
 */
export async function createFloorPlanTask(
  prompt: string,
  sourceImageUrl: string,
  quality: 'medium' | 'high' = 'medium'
): Promise<string> {
  const requestBody = {
    model: 'gpt-image/1.5-image-to-image',
    input: {
      prompt,
      input_urls: [sourceImageUrl],
      aspect_ratio: '1:1' as const,
      quality,
    },
  };

  const response = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(requestBody),
  });

  const result: TaskResponse = await response.json();

  if (result.code !== 200) {
    throw new Error(`kie.ai error: ${result.msg}`);
  }

  return result.data.taskId;
}

/**
 * Check the status of a task
 * Uses jobs/recordInfo endpoint (NOT jobs/getTask which was deprecated)
 */
export async function checkTaskStatus(taskId: string): Promise<TaskStatus> {
  const response = await fetch(`${KIE_BASE_URL}/jobs/recordInfo?taskId=${taskId}`, {
    headers: getHeaders(),
  });

  return response.json();
}

/**
 * Poll for task completion with timeout
 *
 * @param taskId - The task ID to poll
 * @param maxWaitMs - Maximum wait time (default 120s)
 * @param pollIntervalMs - Poll interval (default 3s)
 * @returns Final task status (success or fail)
 * @throws Error on timeout
 */
export async function waitForTaskCompletion(
  taskId: string,
  maxWaitMs: number = 120000,
  pollIntervalMs: number = 3000
): Promise<TaskStatus> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status = await checkTaskStatus(taskId);

    if (status.data.state === 'success' || status.data.state === 'fail') {
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Task ${taskId} timed out after ${maxWaitMs}ms`);
}

/**
 * Parse result URLs from a completed task status
 * Returns empty array if task not successful or no results
 */
export function parseResultUrls(status: TaskStatus): string[] {
  if (status.data.state !== 'success' || !status.data.resultJson) {
    return [];
  }

  try {
    const result = JSON.parse(status.data.resultJson);
    return result.resultUrls || [];
  } catch {
    return [];
  }
}

/**
 * Retry wrapper with exponential backoff
 * Skips retry on 401/402 (auth/billing errors)
 */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  let delay = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry auth/billing errors
      const msg = lastError.message;
      if (msg.includes('401') || msg.includes('402')) {
        throw lastError;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  throw lastError;
}

// Error codes reference
export const KIE_ERROR_CODES = {
  400: 'Invalid parameters or content policy violation',
  401: 'Authentication failed - check API key',
  402: 'Insufficient credits',
  404: 'Resource not found',
  422: 'Validation failed',
  429: 'Rate limited - implement backoff',
  500: 'Server error - retry',
} as const;
