import type { TrendKeyword } from '../types';

export const sampleKeywords: TrendKeyword[] = [
  {
    id: 'ai-overview',
    label: 'AI Overview 노출',
    context: '검색 결과에서 AI 요약에 잡히는 고품질 콘텐츠 흐름',
    source: '정량',
  },
  {
    id: 'paper-review',
    label: '논문 리뷰 롱테일',
    context: '논문 제목과 세부 연구 주제로 들어오는 검색 유입',
    source: '정량',
  },
  {
    id: 'research-fatigue',
    label: '자료 찾기 피로',
    context: '좋은 자료를 찾느라 정작 읽고 판단할 시간이 줄어드는 문제',
    source: '정성',
  },
  {
    id: 'trend-letter',
    label: '트렌드 레터',
    context: '뉴스레터와 아티클에서 빠르게 잡히는 업계 맥락',
    source: '정성',
  },
  {
    id: 'b2b-lead',
    label: 'B2B 리드 전환',
    context: '조회수보다 문의와 체험 신청으로 이어지는 콘텐츠 목표',
    source: '정성',
  },
  {
    id: 'shorts-hook',
    label: '0.5초 훅',
    context: '첫 장면에서 멈칫하게 만드는 강한 문장과 이미지',
    source: '정성',
  },
  {
    id: 'competitor-volume',
    label: '경쟁사 대량 소재',
    context: 'AI로 카피와 영상 변형을 많이 만들어 성과 좋은 조합을 찾는 방식',
    source: '정량',
  },
  {
    id: 'human-tone',
    label: '사람 같은 톤',
    context: 'AI 글처럼 딱딱하지 않고 실제 마케터가 말하는 듯한 문장',
    source: '정성',
  },
];
