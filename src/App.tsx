import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clipboard,
  Clock3,
  Image,
  KeyRound,
  MessageSquareText,
  Plus,
  RefreshCcw,
  Sparkles,
  Target,
  Wand2,
} from 'lucide-react';
import { sampleKeywords } from './data/keywords';
import { requestCutImages } from './services/requestCutImages';
import {
  requestClaudeShortsScript,
  ScriptGenerationError,
} from './services/requestClaudeShortsScript';
import type {
  DurationOption,
  ShortsScriptOutput,
  TrendKeyword,
} from './types';

const durationOptions: DurationOption[] = ['15초', '30초', '45초'];
const toneOptions = [
  '초등학생도 바로 읽는 짧은 말',
  '첫 줄이 따끔한 말',
  '마케터가 바로 알아듣는 말',
  '광고 티는 적게, 궁금증은 크게',
];

const beatLabels: Record<string, string> = {
  hook: 'HOOK',
  problem: '문제',
  insight: '반전',
  payoff: '결과',
  cta: 'CTA',
};

const defaultGoal =
  '문나이트 논문 리뷰 페이지를 더 많은 연구자와 마케터에게 알리고, 체험 문의로 이어지게 만들고 싶다.';

function App() {
  const [keyStatus, setKeyStatus] = useState({
    anthropicConfigured: false,
    openaiConfigured: false,
  });
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [shouldGenerateImages, setShouldGenerateImages] = useState(false);
  const [keywords, setKeywords] = useState<TrendKeyword[]>(sampleKeywords);
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<string[]>([
    'ai-overview',
    'paper-review',
    'shorts-hook',
  ]);
  const [manualKeyword, setManualKeyword] = useState('');
  const [goal, setGoal] = useState(defaultGoal);
  const [duration, setDuration] = useState<DurationOption>('30초');
  const [tone, setTone] = useState(toneOptions[0]);
  const [ctaGoal, setCtaGoal] = useState('');
  const [revisionRequest, setRevisionRequest] = useState('');
  const [output, setOutput] = useState<ShortsScriptOutput | null>(null);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedKeywords = useMemo(
    () => keywords.filter((keyword) => selectedKeywordIds.includes(keyword.id)),
    [keywords, selectedKeywordIds],
  );

  useEffect(() => {
    let ignore = false;

    async function fetchKeyStatus() {
      try {
        const response = await fetch('/api/key-status');
        const status = (await response.json()) as {
          anthropicConfigured?: boolean;
          openaiConfigured?: boolean;
        };

        if (!ignore) {
          setKeyStatus({
            anthropicConfigured: Boolean(status.anthropicConfigured),
            openaiConfigured: Boolean(status.openaiConfigured),
          });
        }
      } catch {
        if (!ignore) {
          setKeyStatus({
            anthropicConfigured: false,
            openaiConfigured: false,
          });
        }
      }
    }

    void fetchKeyStatus();

    return () => {
      ignore = true;
    };
  }, []);

  const canGenerate =
    (keyStatus.anthropicConfigured || anthropicApiKey.trim().length > 0) &&
    selectedKeywordIds.length > 0 &&
    goal.trim().length > 0;

  async function handleGenerate(nextRevision = revisionRequest) {
    setIsGenerating(true);
    setError('');

    try {
      const result = await requestClaudeShortsScript({
        anthropicApiKey,
        input: {
          selectedKeywords,
          goal,
          format: 'shorts',
          duration,
          tone,
          ctaGoal,
          revisionRequest: nextRevision,
        },
      });
      setOutput(result);

      if (
        shouldGenerateImages &&
        (keyStatus.openaiConfigured || openaiApiKey.trim())
      ) {
        try {
          const cutsWithImages = await requestCutImages({
            cuts: result.cuts,
            openaiApiKey,
          });
          setOutput({
            ...result,
            cuts: cutsWithImages,
          });
        } catch (imageError) {
          setError(getErrorMessage(imageError));
        }
        return;
      }
    } catch (nextError) {
      setOutput(null);
      setError(getErrorMessage(nextError));
    } finally {
      setIsGenerating(false);
    }
  }

  function toggleKeyword(keywordId: string) {
    setSelectedKeywordIds((current) =>
      current.includes(keywordId)
        ? current.filter((id) => id !== keywordId)
        : [...current, keywordId],
    );
  }

  function addManualKeyword() {
    const label = manualKeyword.trim();

    if (!label) {
      return;
    }

    const nextKeyword: TrendKeyword = {
      id: `manual-${Date.now()}`,
      label,
      context: `사용자가 직접 입력한 문나이트 콘텐츠 키워드: ${label}`,
      source: '수동',
    };

    setKeywords((current) => [nextKeyword, ...current]);
    setSelectedKeywordIds((current) => [nextKeyword.id, ...current]);
    setManualKeyword('');
  }

  async function copyText(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1300);
  }

  function useRevisionHint(hint: string) {
    setRevisionRequest(hint);
    void handleGenerate(hint);
  }

  function formatFullOutput(nextOutput: ShortsScriptOutput) {
    return [
      `# ${nextOutput.title}`,
      '',
      `훅: ${nextOutput.hook}`,
      '',
      nextOutput.cuts
        .map((cut, index) =>
          [
            `## 컷 ${index + 1} · ${beatLabels[cut.beat] ?? cut.beat} · ${cut.seconds}`,
            `대사: ${cut.spokenLine}`,
            `자막: ${cut.caption}`,
            `이미지(${cut.imageModel}): ${cut.imagePrompt}`,
            `영상(${cut.videoModel}): ${cut.videoPrompt}`,
          ].join('\n'),
        )
        .join('\n\n'),
      '',
      `CTA: ${nextOutput.leadCta}`,
    ].join('\n');
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <aside className="control-panel" aria-label="생성 입력">
          <header className="app-header">
            <div>
              <p className="eyebrow">Moonlight Content Agent v1</p>
              <h1>문라이트 쇼츠 대본</h1>
            </div>
            <span className="status-badge">
              <Check size={14} aria-hidden="true" />
              짧은 단문
            </span>
          </header>

          <section className="input-section">
            <div className="section-heading">
              <KeyRound size={17} aria-hidden="true" />
              <h2>Claude Key</h2>
              <span>{keyStatus.anthropicConfigured ? '.env OK' : 'Opus 4.8'}</span>
            </div>
            <label className="stacked-field">
              <span>Anthropic API Key</span>
              <input
                type="password"
                value={anthropicApiKey}
                onChange={(event) => setAnthropicApiKey(event.target.value)}
                placeholder="sk-ant-..."
                autoComplete="off"
                spellCheck={false}
                aria-label="Anthropic API Key"
              />
            </label>
            <p className="field-note">
              {keyStatus.anthropicConfigured
                ? '.env에 Claude 키가 있어 입력하지 않아도 됩니다.'
                : '.env가 비어 있으면 여기 입력값을 요청에만 씁니다.'}
            </p>
          </section>

          <section className="input-section">
            <div className="section-heading">
              <Image size={17} aria-hidden="true" />
              <h2>GPT Image 2</h2>
              <span>{keyStatus.openaiConfigured ? '.env OK' : '선택'}</span>
            </div>
            <label className="check-row">
              <input
                checked={shouldGenerateImages}
                onChange={(event) => setShouldGenerateImages(event.target.checked)}
                type="checkbox"
              />
              <span>대본과 함께 실제 이미지 생성</span>
            </label>
            <label className="stacked-field">
              <span>OpenAI API Key</span>
              <input
                type="password"
                value={openaiApiKey}
                onChange={(event) => setOpenaiApiKey(event.target.value)}
                placeholder="sk-..."
                autoComplete="off"
                spellCheck={false}
                aria-label="OpenAI API Key"
              />
            </label>
            <p className="field-note">
              {keyStatus.openaiConfigured
                ? '.env에 OpenAI 키가 있어 입력하지 않아도 됩니다.'
                : '키가 없으면 컷별 gpt-image-2 프롬프트까지만 보여줍니다.'}
            </p>
          </section>

          <section className="input-section">
            <div className="section-heading">
              <Target size={17} aria-hidden="true" />
              <h2>키워드 선택</h2>
              <span>{selectedKeywordIds.length}개</span>
            </div>
            <div className="keyword-grid">
              {keywords.map((keyword) => (
                <button
                  type="button"
                  key={keyword.id}
                  className={`keyword-card ${
                    selectedKeywordIds.includes(keyword.id) ? 'is-selected' : ''
                  }`}
                  onClick={() => toggleKeyword(keyword.id)}
                  aria-pressed={selectedKeywordIds.includes(keyword.id)}
                >
                  <span className="keyword-label">{keyword.label}</span>
                  <span className={`source-chip source-${keyword.source}`}>
                    {keyword.source}
                  </span>
                  <span className="keyword-context">{keyword.context}</span>
                </button>
              ))}
            </div>
            <div className="manual-keyword-row">
              <input
                value={manualKeyword}
                onChange={(event) => setManualKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    addManualKeyword();
                  }
                }}
                placeholder="직접 키워드 추가"
                aria-label="직접 키워드 추가"
              />
              <button
                type="button"
                className="icon-button"
                onClick={addManualKeyword}
                title="키워드 추가"
                aria-label="키워드 추가"
              >
                <Plus size={18} aria-hidden="true" />
              </button>
            </div>
          </section>

          <section className="input-section">
            <div className="section-heading">
              <MessageSquareText size={17} aria-hidden="true" />
              <h2>목표</h2>
            </div>
            <textarea
              className="goal-input"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="무엇을 알리고, 어떤 행동을 바라나요?"
            />
          </section>

          <section className="input-section compact">
            <div className="section-heading">
              <Clock3 size={17} aria-hidden="true" />
              <h2>옵션</h2>
            </div>
            <div className="field-row">
              <label>길이</label>
              <div className="segmented-control" role="group" aria-label="쇼츠 길이">
                {durationOptions.map((option) => (
                  <button
                    type="button"
                    key={option}
                    className={duration === option ? 'is-active' : ''}
                    onClick={() => setDuration(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <label className="stacked-field">
              <span>톤</span>
              <select value={tone} onChange={(event) => setTone(event.target.value)}>
                {toneOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="stacked-field">
              <span>CTA 목표</span>
              <input
                value={ctaGoal}
                onChange={(event) => setCtaGoal(event.target.value)}
                placeholder="비워두면 목표에서 자동 추론"
              />
            </label>
          </section>

          {error ? (
            <div className="error-box" role="alert">
              <AlertTriangle size={17} aria-hidden="true" />
              {error}
            </div>
          ) : null}

          <button
            type="button"
            className="primary-action"
            onClick={() => void handleGenerate()}
            disabled={!canGenerate || isGenerating}
          >
            <Wand2 size={18} aria-hidden="true" />
            {isGenerating ? '생성 중' : '대본 생성'}
          </button>
        </aside>

        <section className="result-panel" aria-label="생성 결과">
          {output ? (
            <>
              <header className="result-header">
                <div>
                  <p className="eyebrow">Generated Output</p>
                  <h2>{output.title}</h2>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  title="전체 대본 복사"
                  aria-label="전체 대본 복사"
                  onClick={() =>
                    void copyText(
                      'script',
                      formatFullOutput(output),
                    )
                  }
                >
                  {copiedKey === 'script' ? (
                    <Check size={18} aria-hidden="true" />
                  ) : (
                    <Clipboard size={18} aria-hidden="true" />
                  )}
                </button>
              </header>

              <section className="hook-band">
                <span>0.5초 훅</span>
                <strong>{output.hook}</strong>
              </section>

              <section className="output-section">
                <div className="section-heading">
                  <MessageSquareText size={17} aria-hidden="true" />
                  <h3>전체 대본</h3>
                </div>
                <pre className="script-box">{output.script}</pre>
              </section>

              <section className="output-section">
                <div className="section-heading">
                  <Image size={17} aria-hidden="true" />
                  <h3>대사 + 이미지 + 영상 프롬프트</h3>
                  <span>{output.cuts.length}컷</span>
                </div>
                <div className="cut-list">
                  {output.cuts.map((cut, index) => (
                    <article key={cut.id} className="cut-row">
                      <div className="cut-meta">
                        <span>{cut.seconds}</span>
                        <small>{beatLabels[cut.beat] ?? cut.beat}</small>
                        <strong>{cut.caption}</strong>
                      </div>
                      <div className="cut-body">
                        <p className="spoken-line">
                          컷 {index + 1}. {cut.spokenLine}
                        </p>
                        {cut.imageUrl ? (
                          <img
                            alt={cut.caption}
                            className="generated-image"
                            src={cut.imageUrl}
                          />
                        ) : null}
                        {cut.imageError ? (
                          <p className="image-error">{cut.imageError}</p>
                        ) : null}
                        <div className="prompt-block">
                          <span className="model-chip">{cut.imageModel}</span>
                          <p className="prompt-text">{cut.imagePrompt}</p>
                        </div>
                        <div className="prompt-block">
                          <span className="model-chip video">{cut.videoModel}</span>
                          <p className="prompt-text video">{cut.videoPrompt}</p>
                        </div>
                        <p className="direction-text">{cut.visualDirection}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="support-grid">
                <div className="support-panel">
                  <h3>이탈 방지 장치</h3>
                  <ul>
                    {output.retentionDevices.map((device) => (
                      <li key={device}>{device}</li>
                    ))}
                  </ul>
                </div>
                <div className="support-panel accent">
                  <h3>리드 CTA</h3>
                  <p>{output.leadCta}</p>
                </div>
              </section>

              <section className="revision-panel">
                <div className="section-heading">
                  <RefreshCcw size={17} aria-hidden="true" />
                  <h3>수정 요청</h3>
                </div>
                <div className="revision-hints">
                  {output.revisionHints.map((hint) => (
                    <button
                      type="button"
                      key={hint}
                      onClick={() => useRevisionHint(hint)}
                    >
                      {hint}
                    </button>
                  ))}
                </div>
                <div className="revision-row">
                  <input
                    value={revisionRequest}
                    onChange={(event) => setRevisionRequest(event.target.value)}
                    placeholder="예: 더 따끔하게, 초등학생도 읽게"
                  />
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => void handleGenerate()}
                    disabled={isGenerating}
                  >
                    <Sparkles size={17} aria-hidden="true" />
                    재생성
                  </button>
                </div>
              </section>
            </>
          ) : (
            <div className="empty-state">
              <Wand2 size={30} aria-hidden="true" />
              <h2>키워드와 목표를 넣으면 바로 대본이 나옵니다</h2>
              <p>
                Claude Key를 넣고 문나이트 키워드를 고른 뒤, 이번 쇼츠가 해야
                할 일을 적어주세요.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof ScriptGenerationError) {
    return formatScriptGenerationError(error);
  }

  if (error instanceof Error) {
    if (error.message === 'CLAUDE_KEY_REQUIRED') {
      return 'Claude API Key를 입력해주세요.';
    }

    if (error.message === 'NO_KEYWORDS') {
      return '키워드를 하나 이상 선택해주세요.';
    }

    if (error.message === 'NO_GOAL') {
      return '홍보 목표를 입력해주세요.';
    }

    if (
      error.message === 'JSON_PARSE_FAILED' ||
      error.message === 'INVALID_SCRIPT_OUTPUT' ||
      error.message === 'CLAUDE_JSON_PARSE_FAILED' ||
      error.message === 'CLAUDE_JSON_NOT_FOUND' ||
      error.message === 'EMPTY_CLAUDE_OUTPUT'
    ) {
      return 'Claude 응답 형식이 맞지 않습니다. 다시 생성해주세요.';
    }

    if (error.message === 'CLAUDE_API_ERROR') {
      return 'Claude 호출에 실패했습니다. 키와 사용 가능 모델을 확인해주세요.';
    }
  }

  return [
    '알 수 없는 오류가 발생했습니다.',
    '페이지를 새로고침한 뒤 다시 생성해주세요.',
  ].join('\n');
}

function formatScriptGenerationError(error: ScriptGenerationError) {
  const titleByCode: Record<string, string> = {
    CLAUDE_AUTHENTICATION_ERROR: 'Claude API Key를 확인해주세요.',
    CLAUDE_INVALID_REQUEST_ERROR: 'Claude 요청 형식이 맞지 않습니다.',
    CLAUDE_JSON_NOT_FOUND: 'Claude가 JSON 대본을 보내지 않았습니다.',
    CLAUDE_JSON_PARSE_FAILED: 'Claude 응답을 대본 형식으로 읽지 못했습니다.',
    CLAUDE_KEY_REQUIRED: 'Claude API Key를 입력해주세요.',
    CLAUDE_NOT_FOUND_ERROR: 'Claude 모델을 찾지 못했습니다.',
    CLAUDE_PERMISSION_ERROR: 'Claude 모델 권한이 없습니다.',
    CLAUDE_RATE_LIMIT_ERROR: 'Claude 요청 한도에 걸렸습니다.',
    INVALID_INPUT: '입력값을 확인해주세요.',
    NETWORK_ERROR: 'Anthropic API에 연결하지 못했습니다.',
    OPENAI_API_ERROR: 'OpenAI 이미지 생성에 실패했습니다.',
    OPENAI_IMAGE_EMPTY: 'OpenAI 이미지 응답이 비어 있습니다.',
    OPENAI_KEY_REQUIRED: 'OpenAI API Key를 입력해주세요.',
    OPENAI_NETWORK_ERROR: 'OpenAI 이미지 API에 연결하지 못했습니다.',
  };
  const title = titleByCode[error.message] || '대본 생성 중 문제가 생겼습니다.';
  const lines = [title];

  if (error.detail) {
    lines.push(`원인: ${error.detail}`);
  }

  if (error.hint) {
    lines.push(`해결: ${error.hint}`);
  }

  if (error.requestId) {
    lines.push(`요청 ID: ${error.requestId}`);
  }

  return lines.join('\n');
}

export default App;
