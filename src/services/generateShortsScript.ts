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
    object: string;
  }
> = {
  'ai-overview': {
    spoken: 'AI 요약',
    pain: 'AI 요약에 없으면, 없는 글이에요.',
    image: 'an AI search overview card floating above search results',
    object: 'AI search result card',
  },
  'paper-review': {
    spoken: '논문 리뷰',
    pain: '논문 제목만 봐도 지쳐요.',
    image: 'a laptop filled with dense academic paper titles',
    object: 'academic paper stack',
  },
  'research-fatigue': {
    spoken: '자료 찾기',
    pain: '찾다가 하루가 사라져요.',
    image: 'a desk with too many browser tabs and scattered notes',
    object: 'overloaded research desk',
  },
  'trend-letter': {
    spoken: '트렌드',
    pain: '유행은 빠른데, 정리는 늦어요.',
    image: 'newsletter cards and trend headlines floating on a clean screen',
    object: 'trend newsletter cards',
  },
  'b2b-lead': {
    spoken: '문의',
    pain: '조회수만 높으면, 남는 게 없어요.',
    image: 'a high view count beside an empty lead inbox',
    object: 'empty lead inbox',
  },
  'shorts-hook': {
    spoken: '첫 1초',
    pain: '첫 1초를 놓치면 끝이에요.',
    image: 'a thumb frozen right before swiping away a vertical video',
    object: 'paused thumb over phone',
  },
  'competitor-volume': {
    spoken: '광고 소재',
    pain: '남들은 이미 열 개씩 시험해요.',
    image: 'multiple ad thumbnails arranged like a testing board',
    object: 'ad thumbnail testing board',
  },
  'human-tone': {
    spoken: '사람 말',
    pain: 'AI 말투는 첫 줄에서 걸려요.',
    image: 'a stiff sentence crossed out with a red pen on paper',
    object: 'red-marked copy draft',
  },
};

const beatByDuration: Record<DurationOption, ScriptCut['beat'][]> = {
  '15초': ['hook', 'problem', 'payoff', 'cta'],
  '30초': ['hook', 'problem', 'insight', 'insight', 'payoff', 'cta'],
  '45초': [
    'hook',
    'problem',
    'problem',
    'insight',
    'insight',
    'payoff',
    'payoff',
    'cta',
  ],
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
    return `${duration}, 그냥 넘기기 힘든 문나이트 쇼츠`;
  }

  if (revisionMode === 'b2b') {
    return `${duration}, 문의까지 가는 문나이트 쇼츠`;
  }

  return `${keywordLines[0].spoken}을 멈추게 하는 ${duration} 쇼츠`;
}

function buildHook(
  goal: string,
  keywordLines: KeywordLine[],
  revisionMode: RevisionMode,
) {
  if (revisionMode === 'strong') {
    return '그 키워드, 곧 뺏겨요.';
  }

  if (revisionMode === 'simple') {
    return '찾았는데 더 헷갈리죠?';
  }

  if (revisionMode === 'b2b') {
    return '조회수만 보면 놓쳐요.';
  }

  if (revisionMode === 'softCta') {
    return '좋은 글도 그냥 지나가요.';
  }

  if (/문의|리드|상담|전환|체험/.test(goal)) {
    return '조회수만 높으면 위험해요.';
  }

  if (/논문|리뷰|연구/.test(goal)) {
    return '논문 찾다 하루가 사라져요.';
  }

  if (/인지|알리|홍보/.test(goal)) {
    return '좋아도 안 보이면 끝이에요.';
  }

  return `${keywordLines[0].spoken}, 첫 줄이 전부예요.`;
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
  const beats = beatByDuration[input.duration];
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
      beat: beats[index] ?? 'insight',
      seconds: `${start}-${end}s`,
      spokenLine,
      caption,
      imagePrompt: buildImagePrompt({
        index,
        caption,
        line: spokenLine,
        keyword: keywordLines[index % keywordLines.length],
        seconds: end - start,
      }),
      imageModel: 'gpt-image-2',
      videoPrompt: buildVideoPrompt({
        index,
        seconds: end - start,
        line: spokenLine,
        keyword: keywordLines[index % keywordLines.length],
        beat: beats[index] ?? 'insight',
      }),
      videoModel: 'higgsfield',
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
    '복잡한 말은 버리고, 한 장면만 남겨요.',
    '끝나면 문나이트만 떠오르게 해요.',
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
    return `${keyword.spoken}을 못 잡으면 묻혀요.`;
  }

  if (revisionMode === 'b2b') {
    return '사람은 정보 말고 답을 사요.';
  }

  return `${keyword.spoken}도 쉬워야 멈춰요.`;
}

function buildTurnLine(keyword: KeywordLine, revisionMode: RevisionMode) {
  if (revisionMode === 'simple') {
    return '어려운 말은 바로 넘겨요.';
  }

  if (revisionMode === 'softCta') {
    return '조금 궁금해야 끝까지 봐요.';
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
  seconds,
}: {
  index: number;
  caption: string;
  line: string;
  keyword: KeywordLine;
  seconds: number;
}) {
  const sceneByIndex = [
    'a thumb stopping mid-swipe over a vertical phone screen',
    `${keyword.image}, the person looks tired but alert`,
    'a laptop screen overloaded with dense notes and tabs',
    'messy research notes turning into three clean visual cards',
    'a person calmly looking at a clean Moonlight-style research page',
    'one clear action button on a simple product page',
    'a keyword, a useful article, and a lead form connected by one thin line',
    'a final clean frame with one small call-to-action button',
  ];

  return [
    'GPT Image 2 prompt.',
    `${sceneByIndex[index] ?? sceneByIndex[sceneByIndex.length - 1]}.`,
    `Meaning of the spoken line: "${line}".`,
    `Overlay caption later in Korean: "${caption}". Do not render any text inside the image.`,
    `9:16 vertical composition for a YouTube Shorts cut, about ${seconds}s of screen time.`,
    'Leave the bottom 25% clean and uncluttered for subtitles.',
    'Clean Korean SaaS visual style, white and warm gray background, black text overlays added later, teal accent, realistic workspace details, few objects, strong focal point, no logo unless the product screen is abstract.',
  ].join(' ');
}

function buildVideoPrompt({
  index,
  seconds,
  line,
  keyword,
  beat,
}: {
  index: number;
  seconds: number;
  line: string;
  keyword: KeywordLine;
  beat: ScriptCut['beat'];
}) {
  const cameraByBeat: Record<ScriptCut['beat'], string> = {
    hook: 'fast push-in, abrupt stop',
    problem: 'slow handheld push-in',
    insight: 'smooth match cut',
    payoff: 'calm dolly-in',
    cta: 'static locked-off ending frame',
  };
  const motionByIndex = [
    'a thumb almost swipes away, then freezes',
    `the ${keyword.object} feels crowded, then the subject looks up`,
    'messy information spreads across the desk',
    'the clutter snaps into three simple cards',
    'the subject relaxes as the interface becomes clear',
    'one small button remains on screen',
    'a thin line connects keyword, content, and lead form',
    'the frame settles into a clean ending shot',
  ];

  return [
    'Higgsfield video prompt.',
    `${seconds}s clip, 9:16 vertical.`,
    `${motionByIndex[index] ?? motionByIndex[motionByIndex.length - 1]}.`,
    `Camera: ${cameraByBeat[beat]}.`,
    `Mood: direct, slightly tense at first, then clear and calm. Spoken line meaning: "${line}".`,
    'No on-screen text generated in the video; Korean captions will be added later. Clean SaaS workspace, teal accent, soft realistic lighting.',
  ].join(' ');
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
  object: string;
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
    image: `a simple visual card representing ${spoken}`,
    object: `${spoken} card`,
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
    isBeat(candidate.beat) &&
    typeof candidate.seconds === 'string' &&
    typeof candidate.spokenLine === 'string' &&
    typeof candidate.caption === 'string' &&
    typeof candidate.imagePrompt === 'string' &&
    candidate.imageModel === 'gpt-image-2' &&
    typeof candidate.videoPrompt === 'string' &&
    candidate.videoModel === 'higgsfield' &&
    typeof candidate.visualDirection === 'string'
  );
}

function isBeat(value: unknown): value is ScriptCut['beat'] {
  return (
    value === 'hook' ||
    value === 'problem' ||
    value === 'insight' ||
    value === 'payoff' ||
    value === 'cta'
  );
}

function hasAiTell(line: string) {
  return aiTellPatterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(line);
  });
}
