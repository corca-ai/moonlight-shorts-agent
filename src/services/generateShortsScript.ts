import type {
  DurationOption,
  ScriptCut,
  ShortsScriptInput,
  ShortsScriptOutput,
  TrendKeyword,
} from '../types';

const cutCountByDuration: Record<DurationOption, number> = {
  '15초': 4,
  '30초': 6,
  '45초': 8,
};

const durationSeconds: Record<DurationOption, number> = {
  '15초': 15,
  '30초': 30,
  '45초': 45,
};

const keywordCopy: Record<
  string,
  {
    spoken: string;
    pain: string;
    image: string;
  }
> = {
  'ai-overview': {
    spoken: 'AI 요약',
    pain: 'AI 요약에 안 뜨면, 없는 글 같아요.',
    image: '검색창 위에 뜬 AI 요약 카드',
  },
  'paper-review': {
    spoken: '논문 리뷰',
    pain: '논문 제목만 봐도 머리가 아파요.',
    image: '논문 제목이 빽빽한 노트북 화면',
  },
  'research-fatigue': {
    spoken: '자료 찾기',
    pain: '찾다가 하루가 사라져요.',
    image: '자료 탭이 너무 많이 열린 책상',
  },
  'trend-letter': {
    spoken: '트렌드',
    pain: '유행은 빠른데, 정리는 느려요.',
    image: '뉴스레터 문장이 카드처럼 떠 있는 화면',
  },
  'b2b-lead': {
    spoken: '문의',
    pain: '조회수만 많고 문의가 없으면 아깝죠.',
    image: '조회수 숫자 옆에 비어 있는 문의함',
  },
  'shorts-hook': {
    spoken: '첫 1초',
    pain: '첫 1초에 못 잡으면 그냥 넘어가요.',
    image: '손가락이 영상을 넘기기 직전 멈춘 장면',
  },
  'competitor-volume': {
    spoken: '광고 소재',
    pain: '남들은 이미 여러 개를 시험해요.',
    image: '여러 광고 썸네일이 한 화면에 놓인 장면',
  },
  'human-tone': {
    spoken: '사람 말',
    pain: 'AI 말투는 첫 줄에서 티가 나요.',
    image: '딱딱한 문장이 빨간 펜으로 지워진 종이',
  },
};

const aiTellPatterns = [
  /를 통해/g,
  /통하여/g,
  /에 대해/g,
  /에 있어서/g,
  /와 관련하여/g,
  /관련된/g,
  /바탕으로/g,
  /기반하여/g,
  /가능합니다/g,
  /할 수 있습니다/g,
  /될 수 있습니다/g,
  /것입니다/g,
  /것이다/g,
  /결론적으로/g,
  /따라서/g,
  /또한/g,
  /나아가/g,
  /시사하는 바/g,
  /주목할 만/g,
];

export async function generateShortsScript(
  input: ShortsScriptInput,
): Promise<ShortsScriptOutput> {
  validateInput(input);

  const rawJson = JSON.stringify(createDraftPayload(input));
  return parseGeneratedPayload(rawJson);
}

export function parseGeneratedPayload(rawJson: string): ShortsScriptOutput {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('JSON_PARSE_FAILED');
  }

  if (!isOutputShape(parsed)) {
    throw new Error('INVALID_SCRIPT_OUTPUT');
  }

  return parsed;
}

function validateInput(input: ShortsScriptInput) {
  if (input.selectedKeywords.length === 0) {
    throw new Error('NO_KEYWORDS');
  }

  if (!input.goal.trim()) {
    throw new Error('NO_GOAL');
  }
}

function createDraftPayload(input: ShortsScriptInput): ShortsScriptOutput {
  const goal = cleanMultiline(input.goal);
  const revisionMode = getRevisionMode(input.revisionRequest);
  const keywordLines = input.selectedKeywords.map(getKeywordLine);
  const hook = buildHook(goal, keywordLines, revisionMode);
  const cta = buildLeadCta(goal, input.ctaGoal, revisionMode);
  const cuts = buildCuts(input, hook, cta, keywordLines, revisionMode);

  return {
    title: buildTitle(input.duration, keywordLines, revisionMode),
    hook,
    script: cuts.map((cut) => cut.spokenLine).join('\n'),
    cuts,
    retentionDevices: [
      '한 컷에 한 말만 남긴다.',
      '제품 설명은 뒤로 미룬다.',
      '마지막에는 한 행동만 말한다.',
    ],
    leadCta: cta,
    revisionHints: [
      '더 따끔하게',
      '더 쉬운 말로',
      '초등학생도 읽게',
      'CTA 덜 광고처럼',
    ],
  };
}

function buildTitle(
  duration: DurationOption,
  keywordLines: KeywordLine[],
  revisionMode: RevisionMode,
) {
  if (revisionMode === 'strong') {
    return `스크롤을 멈추는 ${duration} 문나이트 쇼츠`;
  }

  if (revisionMode === 'b2b') {
    return `문의까지 생각한 ${duration} 문나이트 쇼츠`;
  }

  return `${keywordLines[0].spoken}을 쉽게 찌르는 ${duration} 쇼츠`;
}

function buildHook(
  goal: string,
  keywordLines: KeywordLine[],
  revisionMode: RevisionMode,
) {
  if (revisionMode === 'strong') {
    return '그 검색어, 남이 먼저 잡습니다.';
  }

  if (revisionMode === 'simple') {
    return '검색했는데 더 헷갈리죠?';
  }

  if (revisionMode === 'b2b') {
    return '조회수만 보면 문의를 놓쳐요.';
  }

  if (revisionMode === 'softCta') {
    return '좋은 자료도 그냥 지나쳐요.';
  }

  if (/문의|리드|상담|전환|체험/.test(goal)) {
    return '조회수는 많은데 문의가 없나요?';
  }

  if (/논문|리뷰|연구/.test(goal)) {
    return '논문 찾다 하루가 사라졌나요?';
  }

  if (/인지|알리|홍보/.test(goal)) {
    return '좋은 서비스도 안 보이면 끝이에요.';
  }

  return `${keywordLines[0].spoken}, 첫 줄에서 잡아야 해요.`;
}

function buildCuts(
  input: ShortsScriptInput,
  hook: string,
  leadCta: string,
  keywordLines: KeywordLine[],
  revisionMode: RevisionMode,
): ScriptCut[] {
  const count = cutCountByDuration[input.duration];
  const totalSeconds = durationSeconds[input.duration];
  const secondsPerCut = Math.max(2, Math.round(totalSeconds / count));
  const lines = buildLineSequence({
    count,
    hook,
    leadCta,
    keywordLines,
    revisionMode,
  });

  return lines.map((rawLine, index) => {
    const start = index * secondsPerCut;
    const end =
      index === count - 1
        ? totalSeconds
        : Math.min(totalSeconds, start + secondsPerCut);
    const spokenLine = humanizeLine(rawLine);
    const caption = makeCaption(spokenLine);

    return {
      id: `cut-${index + 1}`,
      seconds: `${start}-${end}s`,
      spokenLine,
      caption,
      imagePrompt: buildImagePrompt({
        index,
        caption,
        line: spokenLine,
        keyword: keywordLines[index % keywordLines.length],
      }),
      imageModel: 'gpt-image-2',
      visualDirection: buildVisualDirection(index, count),
    };
  });
}

function buildLineSequence({
  count,
  hook,
  leadCta,
  keywordLines,
  revisionMode,
}: {
  count: number;
  hook: string;
  leadCta: string;
  keywordLines: KeywordLine[];
  revisionMode: RevisionMode;
}) {
  const lead = keywordLines[0];
  const second = keywordLines[1] ?? lead;
  const third = keywordLines[2] ?? second;
  const linesByRole = [
    hook,
    lead.pain,
    buildProblemLine(second, revisionMode),
    buildTurnLine(third, revisionMode),
    buildMoonlightLine(revisionMode),
    leadCta,
    '기억나는 글은 어렵지 않아요.',
    '문나이트만 남기고 끝내요.',
  ];

  if (count === 4) {
    return [linesByRole[0], linesByRole[1], linesByRole[4], linesByRole[5]];
  }

  if (count === 6) {
    return linesByRole.slice(0, 6);
  }

  return linesByRole;
}

function buildProblemLine(keyword: KeywordLine, revisionMode: RevisionMode) {
  if (revisionMode === 'strong') {
    return `${keyword.spoken}을 못 잡으면 바로 묻혀요.`;
  }

  if (revisionMode === 'b2b') {
    return '사람은 정보보다 답을 사요.';
  }

  return `${keyword.spoken}도 쉬워야 멈춰요.`;
}

function buildTurnLine(keyword: KeywordLine, revisionMode: RevisionMode) {
  if (revisionMode === 'simple') {
    return '어려운 말은 바로 넘겨요.';
  }

  if (revisionMode === 'softCta') {
    return '작게 궁금해야 끝까지 봐요.';
  }

  return `${keyword.spoken}, 한눈에 보여야 해요.`;
}

function buildMoonlightLine(revisionMode: RevisionMode) {
  if (revisionMode === 'b2b') {
    return '문나이트는 관심을 문의로 잇습니다.';
  }

  if (revisionMode === 'simple') {
    return '문나이트가 먼저 쉽게 보여줘요.';
  }

  return '문나이트가 읽을 길을 보여줘요.';
}

function buildImagePrompt({
  index,
  caption,
  line,
  keyword,
}: {
  index: number;
  caption: string;
  line: string;
  keyword: KeywordLine;
}) {
  const sceneByIndex = [
    '세로 9:16. 손가락이 화면을 넘기려다 멈춘 순간.',
    `${keyword.image}. 사람 표정은 살짝 지친 느낌.`,
    '노트북 화면 위에 복잡한 글이 흩어져 있다.',
    '복잡한 글이 카드 세 장으로 정리된다.',
    '문나이트 화면을 보는 사람의 표정이 편해진다.',
    '하얀 배경. 문나이트 이름과 작은 버튼 하나.',
    '검색어, 글, 문의가 선 하나로 이어진다.',
    '마지막 프레임. 자막이 크게 남는다.',
  ];

  return humanizePrompt(
    [
      sceneByIndex[index] ?? sceneByIndex[sceneByIndex.length - 1],
      `자막: "${caption}"`,
      `느낌: ${line}`,
      '색: 흰색, 검정, 청록 포인트.',
      '물건은 적게. 글자는 크게. 바로 이해되게.',
    ].join(' '),
  );
}

function buildVisualDirection(index: number, count: number) {
  if (index === 0) {
    return '첫 화면은 크게. 자막은 네 단어 이하.';
  }

  if (index === count - 1) {
    return '끝에는 버튼 하나만 남긴다.';
  }

  if (index % 2 === 0) {
    return '복잡한 화면을 단순하게 바꾼다.';
  }

  return '사람 표정을 보여준다. 길게 설명하지 않는다.';
}

function buildLeadCta(
  goal: string,
  ctaGoal: string | undefined,
  revisionMode: RevisionMode,
) {
  const explicitGoal = ctaGoal?.trim();

  if (explicitGoal) {
    return humanizeLine(`${explicitGoal}. 문나이트에서 확인하세요.`);
  }

  if (revisionMode === 'softCta') {
    return '궁금하면 문나이트만 열어보세요.';
  }

  if (/문의|리드|상담|전환|체험/.test(goal) || revisionMode === 'b2b') {
    return '필요하면 문나이트에서 물어보세요.';
  }

  if (/이벤트|신청|참여/.test(goal)) {
    return '신청 전, 문나이트에서 먼저 보세요.';
  }

  return '문나이트 이름만 기억해도 좋아요.';
}

type RevisionMode = 'default' | 'strong' | 'simple' | 'b2b' | 'softCta';

interface KeywordLine {
  spoken: string;
  pain: string;
  image: string;
}

function getKeywordLine(keyword: TrendKeyword): KeywordLine {
  const preset = keywordCopy[keyword.id];

  if (preset) {
    return preset;
  }

  const spoken = shortenLabel(keyword.label);
  return {
    spoken,
    pain: `${spoken}이 어려우면 바로 넘겨요.`,
    image: `${spoken}이 크게 적힌 작은 카드`,
  };
}

function shortenLabel(label: string) {
  const cleaned = label
    .replace(/\([^)]*\)/g, '')
    .replace(/[^\p{Script=Hangul}A-Za-z0-9\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(' ');

  return cleaned.length > 12 ? `${cleaned.slice(0, 12)}...` : cleaned || '키워드';
}

function humanizeLine(line: string) {
  return line
    .replace(/를 통해/g, '로')
    .replace(/통하여/g, '로')
    .replace(/에 대해/g, '를')
    .replace(/에 있어서/g, '에서')
    .replace(/와 관련하여/g, '를')
    .replace(/관련된/g, '의')
    .replace(/바탕으로/g, '보고')
    .replace(/기반하여/g, '보고')
    .replace(/할 수 있습니다/g, '해요')
    .replace(/될 수 있습니다/g, '돼요')
    .replace(/가능합니다/g, '돼요')
    .replace(/것입니다/g, '이에요')
    .replace(/것이다/g, '이다')
    .replace(/결론적으로|따라서|또한|나아가/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function humanizePrompt(prompt: string) {
  return humanizeLine(prompt)
    .replace(/프롬프트/g, '장면')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function makeCaption(line: string) {
  const caption = line.replace(/[.?!]/g, '').trim();

  if (caption.length <= 18) {
    return caption;
  }

  const commaCut = caption.split(',')[0]?.trim();

  if (commaCut && commaCut.length >= 6 && commaCut.length <= 18) {
    return commaCut;
  }

  const words = caption.split(/\s+/);
  let nextCaption = '';

  for (const word of words) {
    const candidate = nextCaption ? `${nextCaption} ${word}` : word;

    if (candidate.length > 18) {
      break;
    }

    nextCaption = candidate;
  }

  return nextCaption || `${caption.slice(0, 17)}…`;
}

function cleanMultiline(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');
}

function getRevisionMode(revisionRequest?: string): RevisionMode {
  const request = revisionRequest?.trim() ?? '';

  if (!request) {
    return 'default';
  }

  if (/자극|강하게|후킹|세게|따끔/.test(request)) {
    return 'strong';
  }

  if (/쉽|초등|간단|짧게|10살|12살/.test(request)) {
    return 'simple';
  }

  if (/B2B|비투비|리드|전환|세일즈|문의/i.test(request)) {
    return 'b2b';
  }

  if (/CTA 약|덜 팔|부드럽|자연|광고처럼/.test(request)) {
    return 'softCta';
  }

  return 'default';
}

function isOutputShape(value: unknown): value is ShortsScriptOutput {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ShortsScriptOutput>;
  return (
    typeof candidate.title === 'string' &&
    typeof candidate.hook === 'string' &&
    candidate.hook.trim().length > 0 &&
    typeof candidate.script === 'string' &&
    Array.isArray(candidate.cuts) &&
    candidate.cuts.length > 0 &&
    candidate.cuts.every(isCutShape) &&
    Array.isArray(candidate.retentionDevices) &&
    typeof candidate.leadCta === 'string' &&
    Array.isArray(candidate.revisionHints) &&
    candidate.cuts.every((cut) => !hasAiTell(cut.spokenLine))
  );
}

function isCutShape(value: unknown): value is ScriptCut {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ScriptCut>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.seconds === 'string' &&
    typeof candidate.spokenLine === 'string' &&
    typeof candidate.caption === 'string' &&
    typeof candidate.imagePrompt === 'string' &&
    candidate.imageModel === 'gpt-image-2' &&
    typeof candidate.visualDirection === 'string'
  );
}

function hasAiTell(line: string) {
  return aiTellPatterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(line);
  });
}
