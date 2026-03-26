import { APIResponseError, isNotionClientError } from '@notionhq/client';

export class NotionCliError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'NotionCliError';
  }
}

export function formatError(error: unknown): Record<string, unknown> {
  if (isNotionClientError(error) && error instanceof APIResponseError) {
    return {
      error: error.message,
      code: error.code,
      status: error.status,
    };
  }
  if (error instanceof Error) {
    return { error: error.message };
  }
  return { error: String(error) };
}
