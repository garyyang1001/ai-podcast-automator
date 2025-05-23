
export interface Speaker {
  id: string;
  name: string;
  voice: string; 
  color: string; 
  dotColor: string;
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

export interface VoiceOption {
  id: string;
  name: string;
}

export interface WebContentSource {
  url: string;
  text: string;
}

// Updated to match Firecrawl API response
export interface FirecrawlScrapeData {
  markdown: string; // Changed from 'content' to 'markdown'
  // Add other fields if needed, like metadata, title, etc.
  metadata?: { // Adding metadata as it's present in the example response
    ogTitle?: string;
    description?: string;
    [key: string]: any; // For other potential metadata fields
  }
}

export interface FirecrawlApiResponse {
  data?: FirecrawlScrapeData;
  success: boolean;
  error?: string;
}