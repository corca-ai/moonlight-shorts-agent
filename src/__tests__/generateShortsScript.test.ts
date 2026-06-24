import { describe, expect, it } from 'vitest';
import { sampleKeywords } from '../data/keywords';
import {
  generateShortsScript,
  parseGeneratedPayload,
} from '../services/generateShortsScript';

const baseInput = {
  selectedKeywords: sampleKeywords.slice(0, 3),
  goal: '문나이트 논문 리뷰 페이지를 알리고 체험 문의로 이어지게 만들고 싶다.',
  format: 'shorts' as const,
  duration: '30초' as const,
  tone: '초등학생도 바로 읽는 짧은 말',
  ctaGoal: '',
};

const bannedAiTell = [
  '를 통해',
  '에 대해',
  '에 있어서',
  '바탕으로',
  '기반하여',
  '할 수 있습니다',
  '될 수 있습니다',
  '것입니다',
  '결론적으로',
  '따라서',
  '또한',
  '나아가',
  '시사하는 바',
  '주목할 만',
];

describe('generateShortsScript', () => {
  it('creates a full shorts script with cuts and CTA', async () => {
    const output = await generateShortsScript(baseInput);

    expect(output.hook).toBeTruthy();
    expect(output.script).toContain('문나이트');
    expect(output.cuts).toHaveLength(6);
    expect(output.cuts[0].imagePrompt).toContain('세로 9:16');
    expect(output.cuts.every((cut) => cut.imageModel === 'gpt-image-2')).toBe(
      true,
    );
    expect(output.leadCta).toContain('문나이트');
  });

  it('uses duration to change cut count', async () => {
    const shortOutput = await generateShortsScript({
      ...baseInput,
      duration: '15초',
    });
    const longOutput = await generateShortsScript({
      ...baseInput,
      duration: '45초',
    });

    expect(shortOutput.cuts).toHaveLength(4);
    expect(longOutput.cuts).toHaveLength(8);
  });

  it('accepts multiline goals and keeps the core intent', async () => {
    const output = await generateShortsScript({
      ...baseInput,
      goal: '문나이트를 알리고 싶다.\n연구자 문의를 늘리고 싶다.',
    });

    expect(output.cuts.some((cut) => cut.imagePrompt.includes('연구자 문의'))).toBe(
      false,
    );
    expect(output.leadCta).toContain('물어보세요');
  });

  it('keeps spoken copy short enough for shorts captions', async () => {
    const output = await generateShortsScript(baseInput);

    expect(output.hook.length).toBeLessThanOrEqual(24);
    expect(output.cuts.every((cut) => cut.spokenLine.length <= 26)).toBe(true);
    expect(output.cuts.every((cut) => cut.caption.length <= 18)).toBe(true);
  });

  it('removes common Korean AI tells from spoken copy', async () => {
    const output = await generateShortsScript(baseInput);
    const spokenCopy = output.cuts.map((cut) => cut.spokenLine).join('\n');

    for (const phrase of bannedAiTell) {
      expect(spokenCopy).not.toContain(phrase);
    }
  });

  it('uses simpler copy when requested', async () => {
    const output = await generateShortsScript({
      ...baseInput,
      revisionRequest: '초등학생도 읽게',
    });

    expect(output.hook).toBe('검색했는데 더 헷갈리죠?');
    expect(output.script).toContain('어려운 말은 바로 넘겨요.');
  });

  it('rejects empty keyword selection', async () => {
    await expect(
      generateShortsScript({
        ...baseInput,
        selectedKeywords: [],
      }),
    ).rejects.toThrow('NO_KEYWORDS');
  });

  it('rejects invalid generated JSON shape', () => {
    expect(() => parseGeneratedPayload('{"hook":"","cuts":[]}')).toThrow(
      'INVALID_SCRIPT_OUTPUT',
    );
  });
});
