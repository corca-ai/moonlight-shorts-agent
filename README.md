# 문라이트 쇼츠 대본 Agent v1

데스크탑 웹에서 문라이트 홍보용 쇼츠 대본과 컷별 이미지/영상 프롬프트를 만드는 MVP입니다.

## 실행

의존성은 처음 한 번만 설치합니다. 이후 실행/테스트/빌드는 `npx --no`로 로컬에 설치된 바이너리만 실행합니다.

```bash
npm ci
npx --no -- vite --host 127.0.0.1
```

```bash
npx --no -- vitest run
npx --no -- tsc
npx --no -- vite build
```

`npx --no`를 쓰면 설치되지 않은 패키지를 즉석 다운로드해 실행하지 않으므로, 우발적인 원격 실행을 피할 수 있습니다.

## API 키

로컬에서 `.env` 파일에 키를 넣으면 화면 입력 없이 사용할 수 있습니다.

```bash
ANTHROPIC_API_KEY=sk-ant-your-claude-key
OPENAI_API_KEY=sk-your-openai-key
```

`.env`는 `.gitignore`에 포함되어 GitHub에 올라가지 않습니다. 공개되는 예시는 `.env.example`만 사용하세요.

## 범위

- Claude Opus 4.8(`claude-opus-4-8`) 기반 대본 생성
- 화면에서 Anthropic API Key 입력
  - 키는 파일/브라우저 저장소에 저장하지 않고 로컬 프록시 요청에만 사용
- 선택적으로 OpenAI API Key를 입력해 컷별 실제 이미지를 함께 생성
  - 모델은 `gpt-image-2`
  - 이미지 생성이 실패해도 대본과 이미지 프롬프트는 유지
- 키워드 선택과 직접 키워드 입력
- 홍보 목표, 길이, 톤, CTA 목표 입력
- 쇼츠용 훅, 전체 대본, 컷별 `gpt-image-2` 이미지 프롬프트, `Higgsfield` 영상 프롬프트, 리드 CTA 생성
- 수정 요청 기반 재생성
- `im-not-ai`의 한국어 AI 티 제거 원칙을 참고한 짧은 단문 생성
  - 번역투, 형식명사, 문두 접속사, 긴 설명문 제거
  - 10~12살도 바로 읽을 수 있는 대사와 자막 우선

실제 이미지 생성, 영상 편집, 업로드, 성과 분석은 v2 이후 범위입니다.
