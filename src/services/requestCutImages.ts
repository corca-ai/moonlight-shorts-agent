import type { ScriptCut } from '../types';
import { ScriptGenerationError } from './requestClaudeShortsScript';

interface CutImageResponse {
  cuts: Array<{
    id: string;
    imageError?: string;
    imageUrl?: string;
  }>;
}

export async function requestCutImages({
  openaiApiKey,
  cuts,
}: {
  openaiApiKey: string;
  cuts: ScriptCut[];
}) {
  const response = await fetch('/api/generate-cut-images', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cuts: cuts.map((cut) => ({
        id: cut.id,
        imagePrompt: cut.imagePrompt,
      })),
      openaiApiKey,
    }),
  });

  const payload = (await response.json()) as CutImageResponse & {
    detail?: string;
    error?: string;
    hint?: string;
    requestId?: string;
    statusCode?: number;
  };

  if (!response.ok) {
    throw new ScriptGenerationError({
      detail: payload.detail,
      error: payload.error || 'IMAGE_GENERATION_FAILED',
      hint: payload.hint,
      requestId: payload.requestId,
      statusCode: payload.statusCode || response.status,
    });
  }

  const imageById = new Map(payload.cuts.map((cut) => [cut.id, cut]));

  return cuts.map((cut) => {
    const image = imageById.get(cut.id);

    return {
      ...cut,
      imageError: image?.imageError,
      imageUrl: image?.imageUrl,
    };
  });
}
