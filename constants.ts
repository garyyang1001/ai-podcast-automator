
import { VoiceOption, Speaker } from './types';

export const APP_TITLE = "AI Podcast 產生器";
export const GEMINI_MODEL_TEXT = "gemini-2.5-flash-preview-04-17";

// Updated to use Google Cloud Text-to-Speech voice names
// The 'name' field is for user display and Gemini script style instructions.
// The 'id' field is the actual Google Cloud TTS voice identifier.
export const AVAILABLE_VOICES: VoiceOption[] = [
  { id: 'cmn-TW-Wavenet-A', name: '氣質女聲 (WaveNet)' }, // Google Cloud TTS voice ID
  { id: 'cmn-TW-Wavenet-B', name: '沉穩男聲 (WaveNet)' }, // Google Cloud TTS voice ID
  { id: 'cmn-TW-Wavenet-C', name: '甜美女聲 (WaveNet)' }, // Google Cloud TTS voice ID
  { id: 'cmn-TW-Standard-A', name: '標準女聲 (Standard)' }, // Google Cloud TTS voice ID
  { id: 'cmn-TW-Standard-B', name: '標準男聲 (Standard)' }, // Google Cloud TTS voice ID
];

export const INITIAL_SPEAKERS: Speaker[] = [
  { id: 'speaker1', name: '主持人 Alpha', voice: AVAILABLE_VOICES[0].id, color: 'text-yellow-400', dotColor: 'bg-yellow-400' },
  { id: 'speaker2', name: '來賓 Beta', voice: AVAILABLE_VOICES[1].id, color: 'text-purple-400', dotColor: 'bg-purple-400' },
];

export const DEFAULT_WEB_CONTENT_PLACEHOLDER = `請在此貼上網頁內容，或輸入您想轉換為 Podcast 的文字。\n\n例如：\n標題：探索宇宙的奧秘\n\n內容：\n宇宙，一個充滿未知與奇蹟的廣闊領域。從巨大的星系到微小的粒子，每一個角落都隱藏著等待被揭開的秘密。科學家們透過望遠鏡和探測器，不斷拓展我們對宇宙的認知邊界。\n\n最近的發現指出，暗物質與暗能量佔據了宇宙的大部分組成，但它們的本質仍然是個謎。同時，對於系外行星的探索也如火如荼地進行中，尋找潛在的生命跡象成為了重要的研究方向。\n\n火星，作為我們太陽系的近鄰，一直是人類探索的焦點。未來的載人任務將可能揭示這顆紅色星球的更多秘密，甚至找到過去或現在生命的證據。`;

export const DEFAULT_STYLE_INSTRUCTIONS = "以輕鬆、引人入勝的對談方式，介紹提供的網頁內容。讓聽眾像是參與一場有趣的知識分享。使用繁體中文。";
export const DEFAULT_BRAND_PROFILE = "我們的品牌致力於傳播新知，風格現代、親切且具啟發性。";

export const AVERAGE_WPM_CN = 220; // Average Chinese words per minute for podcasting