export interface Speaker {
  id: string;
  name: string;
  voice: string; 
  color: string; 
  dotColor: string;
  // 🆕 新增語音控制欄位
  emotion?: string;     // 情緒：興奮、平靜、專業、友善等
  pace?: string;        // 語速：很慢、慢、正常、快、很快
  tone?: string;        // 音調：低沉、正常、高亢
  style?: string;       // 風格：輕語、正常、有力、耳語
}

export interface DialogLine {
  id: string;
  speakerId: string;
  text: string;
}

export interface PodcastScript {
  dialogs: DialogLine[];
}

export interface SeoMeta {
  title: string;
  description: string;
}

export enum ScriptMode {
  SINGLE = 'single-speaker',
  MULTI = 'multi-speaker',
}

// 簡化的 VoiceOption 介面（移除 provider 屬性，因為全部使用 Gemini TTS）
export interface VoiceOption {
  id: string;
  name: string;
}

export interface WebContentSource {
  url: string;
  text: string;
}

// 保持 Firecrawl API 回應介面不變
export interface FirecrawlScrapeData {
  markdown: string;
  metadata?: {
    ogTitle?: string;
    description?: string;
    [key: string]: any;
  }
}

export interface FirecrawlApiResponse {
  data?: FirecrawlScrapeData;
  success: boolean;
  error?: string;
}