export type DurationOption = '15초' | '30초' | '45초';

export type FormatOption = 'shorts';

export interface TrendKeyword {
  id: string;
  label: string;
  context: string;
  source: '정량' | '정성' | '수동';
}

export interface ShortsScriptInput {
  selectedKeywords: TrendKeyword[];
  goal: string;
  format: FormatOption;
  duration: DurationOption;
  tone: string;
  ctaGoal?: string;
  revisionRequest?: string;
}

export interface ScriptCut {
  id: string;
  seconds: string;
  spokenLine: string;
  caption: string;
  imagePrompt: string;
  imageModel: 'gpt-image-2';
  imageUrl?: string;
  imageError?: string;
  visualDirection: string;
}

export interface ShortsScriptOutput {
  title: string;
  hook: string;
  script: string;
  cuts: ScriptCut[];
  retentionDevices: string[];
  leadCta: string;
  revisionHints: string[];
}
