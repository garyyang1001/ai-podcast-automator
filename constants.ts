import { VoiceOption, Speaker } from './types';

export const APP_TITLE = "AI Podcast 產生器";
export const GEMINI_MODEL_TEXT = "gemini-2.5-flash-preview-04-17";

// 🌟 Gemini API 原生 TTS 語音（30種高品質語音）
export const AVAILABLE_VOICES: VoiceOption[] = [
  { id: 'Zephyr', name: '✨ Zephyr (明亮風格)' },
  { id: 'Puck', name: '✨ Puck (樂觀風格)' },
  { id: 'Charon', name: '✨ Charon (資訊性風格)' },
  { id: 'Kore', name: '✨ Kore (堅定風格)' },
  { id: 'Fenrir', name: '✨ Fenrir (興奮風格)' },
  { id: 'Leda', name: '✨ Leda (年輕風格)' },
  { id: 'Orus', name: '✨ Orus (堅定風格)' },
  { id: 'Aoede', name: '✨ Aoede (清新風格)' },
  { id: 'Callirhoe', name: '✨ Callirhoe (隨和風格)' },
  { id: 'Autonoe', name: '✨ Autonoe (明亮風格)' },
  { id: 'Enceladus', name: '✨ Enceladus (氣息感)' },
  { id: 'Iapetus', name: '✨ Iapetus (清晰風格)' },
  { id: 'Umbriel', name: '✨ Umbriel (輕鬆風格)' },
  { id: 'Algieba', name: '✨ Algieba (平滑風格)' },
  { id: 'Despina', name: '✨ Despina (平滑風格)' },
  { id: 'Erinome', name: '✨ Erinome (清晰風格)' },
  { id: 'Algenib', name: '✨ Algenib (沙啞風格)' },
  { id: 'Rasalgethi', name: '✨ Rasalgethi (資訊性)' },
  { id: 'Laomedeia', name: '✨ Laomedeia (樂觀風格)' },
  { id: 'Achernar', name: '✨ Achernar (柔和風格)' },
  { id: 'Alnilam', name: '✨ Alnilam (堅定風格)' },
  { id: 'Schedar', name: '✨ Schedar (平穩風格)' },
  { id: 'Gacrux', name: '✨ Gacrux (成熟風格)' },
  { id: 'Pulcherrima', name: '✨ Pulcherrima (直接風格)' },
  { id: 'Achird', name: '✨ Achird (友善風格)' },
  { id: 'Zubenelgenubi', name: '✨ Zubenelgenubi (休閒風格)' },
  { id: 'Vindemiatrix', name: '✨ Vindemiatrix (溫和風格)' },
  { id: 'Sadachbia', name: '✨ Sadachbia (活潑風格)' },
  { id: 'Sadaltager', name: '✨ Sadaltager (知識性)' },
  { id: 'Sulafar', name: '✨ Sulafar (溫暖風格)' },
];

// 更新預設發言人使用新的Gemini TTS語音
export const INITIAL_SPEAKERS: Speaker[] = [
  { 
    id: 'speaker1', 
    name: '主持人 Alpha', 
    voice: AVAILABLE_VOICES[0].id, // 使用 Zephyr (明亮風格)
    color: 'text-yellow-400', 
    dotColor: 'bg-yellow-400' 
  },
  { 
    id: 'speaker2', 
    name: '來賓 Beta', 
    voice: AVAILABLE_VOICES[3].id, // 使用 Kore (堅定風格)
    color: 'text-purple-400', 
    dotColor: 'bg-purple-400' 
  },
];

export const DEFAULT_WEB_CONTENT_PLACEHOLDER = `請在此貼上網頁內容，或輸入您想轉換為 Podcast 的文字。

例如：
標題：探索宇宙的奧秘

內容：
宇宙，一個充滿未知與奇蹟的廣闊領域。從巨大的星系到微小的粒子，每一個角落都隱藏著等待被揭開的秘密。科學家們透過望遠鏡和探測器，不斷拓展我們對宇宙的認知邊界。

最近的發現指出，暗物質與暗能量佔據了宇宙的大部分組成，但它們的本質仍然是個謎。同時，對於系外行星的探索也如火如荼地進行中，尋找潛在的生命跡象成為了重要的研究方向。

火星，作為我們太陽系的近鄰，一直是人類探索的焦點。未來的載人任務將可能揭示這顆紅色星球的更多秘密，甚至找到過去或現在生命的證據。`;

export const DEFAULT_STYLE_INSTRUCTIONS = "以輕鬆、引人入勝的對談方式，介紹提供的網頁內容。讓聽眾像是參與一場有趣的知識分享。使用繁體中文。";
export const DEFAULT_BRAND_PROFILE = "我們的品牌致力於傳播新知，風格現代、親切且具啟發性。";

export const AVERAGE_WPM_CN = 220; // Average Chinese words per minute for podcasting