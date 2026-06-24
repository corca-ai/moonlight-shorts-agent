import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), claudeScriptApi(env)],
    test: {
      environment: 'node',
      globals: true,
    },
  };
});

function claudeScriptApi(env: Record<string, string>) {
  return {
    name: 'claude-script-api',
    configureServer(server: any) {
      server.middlewares.use('/api/key-status', async (req: any, res: any) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
          return;
        }

        sendJson(res, 200, {
          anthropicConfigured: Boolean(env.ANTHROPIC_API_KEY?.trim()),
          openaiConfigured: Boolean(env.OPENAI_API_KEY?.trim()),
        });
      });
      server.middlewares.use('/api/claude-script', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const anthropicApiKey = String(
            body?.anthropicApiKey || env.ANTHROPIC_API_KEY || '',
          ).trim();
          const input = body?.input;

          if (!anthropicApiKey) {
            sendJson(res, 400, { error: 'CLAUDE_KEY_REQUIRED' });
            return;
          }

          if (!input?.goal || !Array.isArray(input?.selectedKeywords)) {
            sendJson(res, 400, { error: 'INVALID_INPUT' });
            return;
          }

          const output = await callClaude({
            anthropicApiKey,
            input,
          });

          sendJson(res, 200, { output });
        } catch (error) {
          const payload = toErrorPayload(error);
          sendJson(res, payload.statusCode, payload);
        }
      });
      server.middlewares.use('/api/generate-cut-images', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const openaiApiKey = String(
            body?.openaiApiKey || env.OPENAI_API_KEY || '',
          ).trim();
          const cuts = Array.isArray(body?.cuts) ? body.cuts : [];

          if (!openaiApiKey) {
            sendJson(res, 400, {
              detail: 'OpenAI API Key가 없습니다.',
              error: 'OPENAI_KEY_REQUIRED',
              hint: '실제 이미지를 만들려면 OpenAI API Key를 입력해주세요.',
              statusCode: 400,
            });
            return;
          }

          if (cuts.length === 0) {
            sendJson(res, 400, {
              detail: '이미지를 만들 컷이 없습니다.',
              error: 'INVALID_IMAGE_INPUT',
              hint: '먼저 대본을 생성해주세요.',
              statusCode: 400,
            });
            return;
          }

          const generatedCuts = await generateCutImages({
            cuts,
            openaiApiKey,
          });

          sendJson(res, 200, { cuts: generatedCuts });
        } catch (error) {
          const payload = toErrorPayload(error);
          sendJson(res, payload.statusCode, payload);
        }
      });
    },
  };
}

async function callClaude({
  anthropicApiKey,
  input,
}: {
  anthropicApiKey: string;
  input: any;
}) {
  let response: Response;

  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 5000,
        system: buildSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: buildUserPrompt(input),
          },
        ],
      }),
    });
  } catch {
    throw new AppError({
      detail: 'Anthropic API에 연결하지 못했습니다.',
      error: 'NETWORK_ERROR',
      hint: '인터넷 연결 또는 로컬 개발 서버의 네트워크 권한을 확인해주세요.',
      statusCode: 502,
    });
  }

  const payload = await response.json();

  if (!response.ok) {
    throw fromClaudeApiError(response, payload);
  }

  const text = extractClaudeText(payload);
  const jsonText = extractJsonObject(text);

  try {
    return JSON.parse(jsonText);
  } catch {
    throw new AppError({
      detail: 'Claude가 JSON으로만 답하지 않았습니다.',
      error: 'CLAUDE_JSON_PARSE_FAILED',
      hint: '다시 생성해주세요. 같은 문제가 반복되면 목표 문장을 더 짧게 줄여주세요.',
      statusCode: 502,
    });
  }
}

function buildSystemPrompt() {
  return [
    '너는 YouTube Shorts PM이자 한국어 숏폼 광고 대본 작가다.',
    '목표는 문나이트 홍보용 쇼츠 대본이다.',
    '최상의 기준: 첫 화면에서 멈춤, 중간 이탈 없음, 끝까지 본 뒤 CTA 행동.',
    '절대 AI 설명문처럼 쓰지 마라.',
    '10살, 12살도 바로 읽어야 한다.',
    '대사는 짧다. 한 줄에 한 감정만 쓴다.',
    '첫 줄은 불편함, 궁금증, 반전, 숫자, 금지 중 하나로 시작한다.',
    '각 컷은 이전 컷보다 하나 더 궁금해야 한다.',
    '3초마다 패턴을 바꾼다: 질문, 반전, 시각 충격, 작은 약속.',
    'CTA는 큰 요구가 아니라 작고 쉬운 한 행동이다.',
    '제품 설명보다 시청자 머릿속 말을 먼저 잡아라.',
    '좋은 줄이면 시청자가 이렇게 느껴야 한다: "내 얘기인데?" 또는 "왜?"',
    '각 컷은 spokenLine 한 마디와 그 말에 딱 맞는 imagePrompt를 가진다.',
    'imagePrompt는 gpt-image-2에 넣을 프롬프트다.',
    'imagePrompt는 대사 한 마디를 한 장면으로 바꾼다.',
    '이미지 프롬프트에는 세로 9:16, 대사와 같은 자막, 큰 자막 여백, 적은 물건, 직관적인 장면을 넣는다.',
    '이미지는 대사의 보조 설명이 아니라 대사의 한 장면 버전이어야 한다.',
    '각 imagePrompt는 반드시 "gpt-image-2" 생성용이라고 읽혀야 한다.',
    '금지 표현: 를 통해, 에 대해, 에 있어서, 바탕으로, 기반하여, 할 수 있습니다, 될 수 있습니다, 것입니다, 결론적으로, 따라서, 또한, 나아가, 시사하는 바, 주목할 만하다.',
    '금지 결과: 좋은 자료를 찾자, 효율을 높이자, 콘텐츠를 만들자 같은 뻔한 말.',
    'JSON만 출력한다. 마크다운, 설명, 코드펜스 금지.',
  ].join('\n');
}

function buildUserPrompt(input: any) {
  const countByDuration: Record<string, number> = {
    '15초': 4,
    '30초': 6,
    '45초': 8,
  };
  const cutCount = countByDuration[input.duration] || 6;

  return JSON.stringify(
    {
      task: '문나이트 쇼츠 대본 생성',
      role: 'YouTube Shorts PM',
      successMetric:
        '첫 컷에서 멈추고, 마지막 컷까지 본 뒤 문나이트를 열어보거나 문의하게 만든다.',
      storyboardFormula: [
        '0초: 찌르는 훅',
        '1-5초: 시청자의 문제를 한 문장으로 못 박기',
        '5-12초: 반전 또는 놓치고 있던 사실',
        '12-끝: 문나이트를 답처럼 보이게 만들기',
        '끝: 한 행동 CTA',
      ],
      requiredOutputShape: {
        title: 'string',
        hook: 'string, 24자 이하',
        script: 'string, spokenLine을 줄바꿈으로 합친 값',
        cuts: [
          {
            id: 'cut-1',
            seconds: '0-5s',
            spokenLine: 'string, 28자 이하, 말하듯 짧게',
            caption: 'string, 18자 이하',
            imageModel: 'gpt-image-2',
            imagePrompt:
              'string, gpt-image-2용. 이 대사 한 마디에 딱 맞는 세로 9:16 이미지 프롬프트',
            visualDirection: 'string, 화면 연출 한 문장',
          },
        ],
        retentionDevices: ['string', 'string', 'string'],
        leadCta: 'string, 광고 티 적게, 한 행동만',
        revisionHints: [
          '더 따끔하게',
          '더 쉬운 말로',
          '초등학생도 읽게',
          'CTA 덜 광고처럼',
        ],
      },
      hardRules: [
        `cuts는 정확히 ${cutCount}개`,
        '각 spokenLine은 28자 이하',
        '각 caption은 18자 이하',
        '각 cut.imageModel은 반드시 gpt-image-2',
        '각 imagePrompt는 spokenLine의 의미와 1:1로 맞아야 함',
        '대본과 imagePrompt는 같은 컷 안에 동시에 있어야 함',
        'imagePrompt는 실제 이미지 생성을 바로 할 수 있을 만큼 구체적이어야 함',
        '어려운 말 금지',
        '문나이트 이름은 자연스럽게 1~2회만',
        '모든 컷은 다음 컷을 보게 만드는 이유가 있어야 함',
        'leadCta는 클릭, 문의, 체험, 페이지 열기 중 하나의 행동만 말해야 함',
        'JSON 외 텍스트 금지',
      ],
      input,
    },
    null,
    2,
  );
}

async function generateCutImages({
  cuts,
  openaiApiKey,
}: {
  cuts: Array<{ id: string; imagePrompt: string }>;
  openaiApiKey: string;
}) {
  const generatedCuts = [];

  for (let index = 0; index < cuts.length; index += 1) {
    const cut = cuts[index];

    try {
      generatedCuts.push({
        id: cut.id,
        imageUrl: await callOpenAiImage({
          openaiApiKey,
          prompt: cut.imagePrompt,
        }),
      });
    } catch (error) {
      const payload = toErrorPayload(error);
      generatedCuts.push({
        id: cut.id,
        imageError: `${payload.detail} 해결: ${payload.hint}`,
      });

      if (payload.statusCode === 401 || payload.statusCode === 403) {
        for (const remainingCut of cuts.slice(index + 1)) {
          generatedCuts.push({
            id: remainingCut.id,
            imageError: `${payload.detail} 해결: ${payload.hint}`,
          });
        }
        break;
      }
    }
  }

  return generatedCuts;
}

async function callOpenAiImage({
  openaiApiKey,
  prompt,
}: {
  openaiApiKey: string;
  prompt: string;
}) {
  let response: Response;

  try {
    response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-2',
        n: 1,
        prompt,
        size: '1024x1536',
      }),
    });
  } catch {
    throw new AppError({
      detail: 'OpenAI 이미지 API에 연결하지 못했습니다.',
      error: 'OPENAI_NETWORK_ERROR',
      hint: '인터넷 연결 또는 로컬 개발 서버의 네트워크 권한을 확인해주세요.',
      statusCode: 502,
    });
  }

  const payload = await response.json();

  if (!response.ok) {
    throw fromOpenAiApiError(response, payload);
  }

  const image = payload?.data?.[0];

  if (image?.b64_json) {
    return `data:image/png;base64,${image.b64_json}`;
  }

  if (image?.url) {
    return image.url;
  }

  throw new AppError({
    detail: 'OpenAI가 이미지 데이터를 돌려주지 않았습니다.',
    error: 'OPENAI_IMAGE_EMPTY',
    hint: '다시 생성해주세요.',
    statusCode: 502,
  });
}

function extractClaudeText(payload: any) {
  const parts = Array.isArray(payload?.content) ? payload.content : [];
  return parts
    .filter((part: any) => part?.type === 'text')
    .map((part: any) => part.text)
    .join('\n')
    .trim();
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);

  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');

  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  throw new Error('CLAUDE_JSON_NOT_FOUND');
}

class AppError extends Error {
  detail: string;
  hint: string;
  requestId?: string;
  statusCode: number;

  constructor({
    detail,
    error,
    hint,
    requestId,
    statusCode,
  }: {
    detail: string;
    error: string;
    hint: string;
    requestId?: string;
    statusCode: number;
  }) {
    super(error);
    this.detail = detail;
    this.hint = hint;
    this.requestId = requestId;
    this.statusCode = statusCode;
  }
}

function fromClaudeApiError(response: Response, payload: any) {
  const type = payload?.error?.type || 'CLAUDE_API_ERROR';
  const message = payload?.error?.message || 'Claude API 호출에 실패했습니다.';
  const requestId = response.headers.get('request-id') || undefined;

  return new AppError({
    detail: message,
    error: `CLAUDE_${String(type).toUpperCase()}`,
    hint: getClaudeErrorHint(response.status, type, message),
    requestId,
    statusCode: response.status,
  });
}

function fromOpenAiApiError(response: Response, payload: any) {
  const code = payload?.error?.code || payload?.error?.type || 'OPENAI_API_ERROR';
  const message = payload?.error?.message || 'OpenAI 이미지 생성에 실패했습니다.';

  return new AppError({
    detail: message,
    error: `OPENAI_${String(code).toUpperCase()}`,
    hint: getOpenAiErrorHint(response.status, message),
    statusCode: response.status,
  });
}

function getClaudeErrorHint(status: number, type: string, message: string) {
  const lowerMessage = message.toLowerCase();

  if (status === 401 || lowerMessage.includes('api key')) {
    return 'Claude API Key가 맞는지 확인해주세요. 앞뒤 공백도 지워주세요.';
  }

  if (status === 403) {
    return '이 키에 Claude Opus 4.8 모델 권한이 없을 수 있습니다.';
  }

  if (status === 404 || lowerMessage.includes('model')) {
    return '모델 이름 또는 계정 권한 문제일 수 있습니다. 현재 요청 모델은 claude-opus-4-8입니다.';
  }

  if (status === 429 || type === 'rate_limit_error') {
    return '요청 한도에 걸렸습니다. 잠시 뒤 다시 시도해주세요.';
  }

  if (status >= 500) {
    return 'Anthropic 쪽 일시 오류일 수 있습니다. 잠시 뒤 다시 시도해주세요.';
  }

  return '키, 모델 권한, 입력 길이를 확인한 뒤 다시 생성해주세요.';
}

function getOpenAiErrorHint(status: number, message: string) {
  const lowerMessage = message.toLowerCase();

  if (status === 401 || lowerMessage.includes('api key')) {
    return 'OpenAI API Key가 맞는지 확인해주세요.';
  }

  if (status === 403) {
    return '이 키에 이미지 생성 권한이 없을 수 있습니다.';
  }

  if (status === 404 || lowerMessage.includes('model')) {
    return '모델 이름 또는 계정 권한 문제일 수 있습니다. 현재 요청 모델은 gpt-image-2입니다.';
  }

  if (status === 429) {
    return '이미지 생성 한도에 걸렸습니다. 잠시 뒤 다시 시도해주세요.';
  }

  if (lowerMessage.includes('size')) {
    return '이미지 크기 옵션이 모델과 맞지 않을 수 있습니다.';
  }

  return 'OpenAI 키, 모델 권한, 이미지 생성 한도를 확인해주세요.';
}

function toErrorPayload(error: unknown) {
  if (error instanceof AppError) {
    return {
      detail: error.detail,
      error: error.message,
      hint: error.hint,
      requestId: error.requestId,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof SyntaxError) {
    return {
      detail: '요청 본문을 JSON으로 읽지 못했습니다.',
      error: 'INVALID_JSON_BODY',
      hint: '페이지를 새로고침한 뒤 다시 생성해주세요.',
      statusCode: 400,
    };
  }

  return {
    detail: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    error: 'SCRIPT_GENERATION_FAILED',
    hint: '같은 문제가 반복되면 입력을 줄이거나 키 권한을 확인해주세요.',
    statusCode: 500,
  };
}

function readJsonBody(req: any) {
  return new Promise<any>((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk: Buffer) => {
      raw += chunk.toString('utf8');
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: any, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}
