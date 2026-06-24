import type { ShortsScriptInput, ShortsScriptOutput } from '../types';
import { parseGeneratedPayload } from './generateShortsScript';

interface ClaudeScriptRequest {
  anthropicApiKey: string;
  input: ShortsScriptInput;
}

interface ClaudeScriptErrorPayload {
  detail?: string;
  error?: string;
  hint?: string;
  requestId?: string;
  statusCode?: number;
}

export class ScriptGenerationError extends Error {
  detail?: string;
  hint?: string;
  requestId?: string;
  statusCode?: number;

  constructor(payload: ClaudeScriptErrorPayload) {
    super(payload.error || 'CLAUDE_REQUEST_FAILED');
    this.detail = payload.detail;
    this.hint = payload.hint;
    this.requestId = payload.requestId;
    this.statusCode = payload.statusCode;
  }
}

export async function requestClaudeShortsScript(
  request: ClaudeScriptRequest,
): Promise<ShortsScriptOutput> {
  const response = await fetch('/api/claude-script', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const payload = (await response.json()) as {
    detail?: string;
    error?: string;
    hint?: string;
    output?: unknown;
    rawText?: string;
    requestId?: string;
    statusCode?: number;
  };

  if (!response.ok) {
    throw new ScriptGenerationError({
      detail: payload.detail,
      error: payload.error || 'CLAUDE_REQUEST_FAILED',
      hint: payload.hint,
      requestId: payload.requestId,
      statusCode: payload.statusCode || response.status,
    });
  }

  if (payload.output) {
    return parseGeneratedPayload(JSON.stringify(payload.output));
  }

  if (payload.rawText) {
    return parseGeneratedPayload(payload.rawText);
  }

  throw new Error('EMPTY_CLAUDE_OUTPUT');
}
