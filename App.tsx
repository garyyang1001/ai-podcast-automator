import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { LeftPanel } from './components/LeftPanel';
import { MiddlePanel } from './components/MiddlePanel';
import { RightPanel } from './components/RightPanel';
import { Speaker, DialogLine, SeoMeta, ScriptMode, WebContentSource, FirecrawlApiResponse } from './types';
import { INITIAL_SPEAKERS, DEFAULT_WEB_CONTENT_PLACEHOLDER, DEFAULT_STYLE_INSTRUCTIONS, DEFAULT_BRAND_PROFILE, AVAILABLE_VOICES, AVERAGE_WPM_CN } from './constants';
import { GoogleGenAI } from "@google/genai";
import { v4 as uuidv4 } from 'uuid';

// 簡化的環境變數獲取函數
const getEnvVar = (key: string): string | undefined => {
  // 嘗試從不同來源獲取環境變數
  if (typeof window !== 'undefined') {
    // 瀏覽器環境
    return (window as any)?.env?.[key] || (import.meta as any)?.env?.[`VITE_${key}`] || (import.meta as any)?.env?.[key];
  }
  // Node.js 環境
  return process.env[key] || process.env[`VITE_${key}`];
};

const App: React.FC = () => {
  const [webContentSource, setWebContentSource] = useState<WebContentSource>({ url: '', text: DEFAULT_WEB_CONTENT_PLACEHOLDER });
  const [styleInstructions, setStyleInstructions] = useState<string>(DEFAULT_STYLE_INSTRUCTIONS);
  const [brandProfile, setBrandProfile] = useState<string>(DEFAULT_BRAND_PROFILE);
  
  const [scriptMode, setScriptMode] = useState<ScriptMode>(ScriptMode.MULTI);
  const [speakers, setSpeakers] = useState<Speaker[]>(INITIAL_SPEAKERS);
  const [dialogLines, setDialogLines] = useState<DialogLine[]>([]);
  const [actualAudioDurations, setActualAudioDurations] = useState<Record<string, number>>({});
  
  const [seoMeta, setSeoMeta] = useState<SeoMeta | null>(null);
  const [rssFeedUrl, setRssFeedUrl] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetchingWebContent, setIsFetchingWebContent] = useState<boolean>(false);
  const [isSynthesizingAudio, setIsSynthesizingAudio] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [estimatedAudioLengthMinutes, setEstimatedAudioLengthMinutes] = useState<number | null>(null);
  const [targetAudioLengthMinutes, setTargetAudioLengthMinutes] = useState<string>('');

  // Clear error after a few seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 7000); 
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Estimate audio length based on web content text
  useEffect(() => {
    if (webContentSource.text && webContentSource.text !== DEFAULT_WEB_CONTENT_PLACEHOLDER) {
      const wordCount = webContentSource.text.length; 
      const estimatedMinutes = Math.round(wordCount / AVERAGE_WPM_CN);
      setEstimatedAudioLengthMinutes(estimatedMinutes > 0 ? estimatedMinutes : 1); 
    } else {
      setEstimatedAudioLengthMinutes(null);
    }
  }, [webContentSource.text]);

  const clearAudioDurations = useCallback(() => {
    setActualAudioDurations({});
  }, []);

  const updateDialogLinesAndClearDurations = useCallback((newLines: DialogLine[]) => {
    setDialogLines(newLines);
    clearAudioDurations();
  }, [clearAudioDurations]);

  const handleAudioSegmentSynthesized = useCallback((lineId: string, duration: number) => {
    setActualAudioDurations(prev => ({ ...prev, [lineId]: duration }));
  }, []);
  
// 在 App.tsx 中的 handleFetchWebContent 函數修正

const handleFetchWebContent = useCallback(async (url: string) => {
  if (!url) {
    setError("請輸入要抓取內容的URL。");
    return;
  }
  setIsFetchingWebContent(true);
  setError(null);

  const firecrawlApiKey = getEnvVar('FIRECRAWL_API_KEY');
  if (!firecrawlApiKey) {
    setError("Firecrawl API Key 未找到。請在 .env 檔案中設定 VITE_FIRECRAWL_API_KEY。");
    setIsFetchingWebContent(false);
    return;
  }

  try {
    // 修正：直接調用 Firecrawl API 而不是代理
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firecrawlApiKey}`,
      },
      body: JSON.stringify({ 
        url: url,
        formats: ['markdown']  // 添加格式指定
      }),
    });

    if (!response.ok) {
      let errorDetails = `抓取內容失敗: ${response.statusText}`;
      try {
          const errorData = await response.json();
          errorDetails = errorData.error || errorDetails;
      } catch (e) {
          // Ignore if response is not JSON
      }
      throw new Error(errorDetails);
    }

    const result: FirecrawlApiResponse = await response.json();

    if (result.success && result.data?.markdown) { 
      setWebContentSource(prev => ({ ...prev, url, text: result.data!.markdown }));
      clearAudioDurations();
    } else {
      throw new Error(result.error || "Firecrawl API 沒有成功返回內容。請確保API回應格式正確（包含markdown欄位）。");
    }
  } catch (e) {
    console.error("抓取網頁內容錯誤:", e);
    setError(e instanceof Error ? e.message : "抓取網頁內容時發生未知錯誤。");
  } finally {
    setIsFetchingWebContent(false);
  }
}, [clearAudioDurations]);
  const handleGenerateScript = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    clearAudioDurations();

    const geminiApiKey = getEnvVar('API_KEY');
    if (!geminiApiKey) {
      setError("Gemini API Key (API_KEY) 未找到。請在 .env 檔案中設定 VITE_API_KEY。");
      setIsLoading(false);
      return;
    }
    if (!webContentSource.text || webContentSource.text === DEFAULT_WEB_CONTENT_PLACEHOLDER) {
        setError("請先提供網頁內容再生成腳本。");
        setIsLoading(false);
        return;
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const activeSpeakers = scriptMode === ScriptMode.SINGLE ? [speakers[0]] : speakers;
    const speakerNames = activeSpeakers.map(s => s.name).join(" 和 ");
    
    const speakerDetails = activeSpeakers.map(s => {
        const voiceOption = AVAILABLE_VOICES.find(v => v.id === s.voice);
        const voiceStyleName = voiceOption ? voiceOption.name : s.voice; 
        return `${s.name} (${voiceStyleName}風格)`;
    }).join(", ");

    let lengthInstruction = "";
    if (targetAudioLengthMinutes && !isNaN(parseFloat(targetAudioLengthMinutes))) {
      const targetMinutes = parseFloat(targetAudioLengthMinutes);
      if (targetMinutes > 0) {
        lengthInstruction = `\n請確保生成的 Podcast 腳本閱讀時長約為 ${targetMinutes} 分鐘。`;
      }
    }

    const prompt = `
      您是一位專業的 Podcast 腳本作家。請根據以下提供的網頁內容、風格指示和品牌特色，為 ${activeSpeakers.length} 位主持人（${speakerNames}）撰寫一份引人入勝的繁體中文 Podcast 對話腳本。

      網頁內容摘要:
      \`\`\`
      ${webContentSource.text}
      \`\`\`

      風格指示:
      ${styleInstructions}

      品牌特色:
      ${brandProfile}

      主持人詳情 (用於風格參考，實際發言人名稱請嚴格使用下面指定的名稱):
      ${speakerDetails}
      ${lengthInstruction}

      腳本輸出指示：
      1. 您的輸出必須**只包含**主持人的對話。
      2. 每一行對話都必須嚴格遵循格式：\`主持人名稱: 對話內容\`。
         例如：
         \`${activeSpeakers[0].name}: 今天我們來聊聊這個有趣的話題。\`
         ${activeSpeakers.length > 1 ? `\`${activeSpeakers[1].name}: 沒錯，${activeSpeakers[0].name}，這確實值得深入探討。\`` : ''}
      3. **禁止**在任何對話行中或作為獨立行輸出任何非對話元素，例如：
          - 任何形式的開場白或關於腳本本身的解釋 (例如，"好的，這是一份腳本..." 或 "以下是腳本內容...")。
          - 節目名稱、集數標題。
          - 場景描述、音效指示 (例如：[開場音樂 淡出]、--- 等視覺分隔符)。
      4. 整個回應的**第一行**必須是第一位指定主持人的第一句實際對話，遵循上述格式。不要有任何前置文字。
      5. 對話內容應針對聽眾，流暢自然，內容豐富且符合品牌調性。
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: prompt,
      });
      
      const scriptText = response.text ?? '';
      
      const lines = scriptText.split('\n');
      const newDialogLines: DialogLine[] = [];

      lines.forEach((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine === "") return; 

        let matchedSpeaker = null;
        let textContent = trimmedLine;

        for (const speaker of activeSpeakers) {
          if (trimmedLine.startsWith(`${speaker.name}:`)) {
            const potentialTextContent = trimmedLine.substring(speaker.name.length + 1).trim();
            if (potentialTextContent.length > 0) { 
              matchedSpeaker = speaker;
              textContent = potentialTextContent;
              break;
            }
          }
        }

        if (matchedSpeaker) {
          newDialogLines.push({ id: uuidv4(), speakerId: matchedSpeaker.id, text: textContent });
        } else {
          console.warn(`跳過不符合格式的行: "${trimmedLine}"`);
        }
      });
      setDialogLines(newDialogLines); 

    } catch (e) {
      console.error("生成腳本錯誤:", e);
      setError(e instanceof Error ? e.message : "生成腳本時發生未知錯誤。");
    } finally {
      setIsLoading(false);
    }
  }, [webContentSource.text, styleInstructions, brandProfile, scriptMode, speakers, targetAudioLengthMinutes, clearAudioDurations]);

  const handleGenerateSeoMeta = useCallback(async () => {
    if (dialogLines.length === 0) {
      setError("請先生成腳本。");
      return;
    }
    setIsLoading(true);
    setError(null);
    
    const geminiApiKey = getEnvVar('API_KEY');
    if (!geminiApiKey) {
      setError("Gemini API Key (API_KEY) 未找到。請在 .env 檔案中設定 VITE_API_KEY。");
      setIsLoading(false);
      return;
    }
    
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const scriptText = dialogLines.map(line => `${speakers.find(s=>s.id === line.speakerId)?.name || 'Unknown Speaker'}: ${line.text}`).join('\n');

    const prompt = `
      根據以下 Podcast 腳本內容，生成一段 SEO 優化的 Meta Title (最多60個繁體中文字) 和 Meta Description (最多160個繁體中文字)。
      請以 JSON 格式返回，包含 "title" 和 "description" 兩個鍵。

      Podcast 腳本:
      \`\`\`
      ${scriptText}
      \`\`\`
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      let jsonStr = response.text ?? '';
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
      }
      
      const parsedMeta = JSON.parse(jsonStr) as SeoMeta;
      setSeoMeta(parsedMeta);
    } catch (e) {
      console.error("生成SEO meta錯誤:", e);
      setError(e instanceof Error ? e.message : "生成SEO meta時發生未知錯誤。");
      setSeoMeta(null);
    } finally {
      setIsLoading(false);
    }
  }, [dialogLines, speakers]);

  const updateSpeaker = (index: number, updatedSpeaker: Speaker) => {
    const newSpeakers = [...speakers];
    newSpeakers[index] = updatedSpeaker;
    setSpeakers(newSpeakers);
    clearAudioDurations();
  };

  const handleDownloadScriptText = () => {
    if (dialogLines.length === 0) {
      setError("沒有腳本可供下載。");
      return;
    }
    const scriptContent = dialogLines.map((line) => {
      const speakerName = speakers.find(s => s.id === line.speakerId)?.name || 'Unknown Speaker';
      return `${speakerName}: ${line.text}`;
    }).join('\n\n');

    const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'podcast_script.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };
  
  const formatSrtTime = (timeInSeconds: number): string => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.round((timeInSeconds % 1) * 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
  };

  const handleDownloadTimedTranscriptSrt = () => {
    if (dialogLines.length === 0) {
      setError("沒有腳本可供下載。");
      return;
    }
    if (Object.keys(actualAudioDurations).length < dialogLines.length) {
        setError("部分或全部音訊片段尚未生成或時長未知。請先「產生 AI Podcast 語音」以獲取精確時間戳。");
        return;
    }

    let srtContent = "";
    let cumulativeTime = 0;

    dialogLines.forEach((line, index) => {
      const speakerName = speakers.find(s => s.id === line.speakerId)?.name || 'Unknown Speaker';
      const duration = actualAudioDurations[line.id];

      if (duration === undefined || duration < 0) {
        console.warn(`第 ${index + 1} 行的實際時長遺失或無效。在SRT中跳過。`);
        return;
      }
      
      const startTime = cumulativeTime;
      const endTime = cumulativeTime + duration;

      srtContent += `${index + 1}\n`;
      srtContent += `${formatSrtTime(startTime)} --> ${formatSrtTime(endTime)}\n`;
      srtContent += `${speakerName}: ${line.text}\n\n`;
      
      cumulativeTime += duration;
    });

    if (!srtContent) {
        setError("無法生成SRT字幕，所有片段的實際時長均未知。");
        return;
    }

    const blob = new Blob([srtContent], { type: 'text/srt;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'podcast_transcript.srt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };
  
  const headerHeightRem = 4;
  const errorFixedPlaceholderHeightRem = 3; 
  const mainContainerVerticalPaddingRem = 2; 

  let panelHeightCalculation: string;
  if (error) {
    panelHeightCalculation = `calc(100vh - ${headerHeightRem}rem - ${errorFixedPlaceholderHeightRem}rem - ${mainContainerVerticalPaddingRem}rem)`; 
  } else {
    panelHeightCalculation = `calc(100vh - ${headerHeightRem}rem - ${mainContainerVerticalPaddingRem}rem)`; 
  }
  const panelHeightClass = `lg:h-[${panelHeightCalculation}]`;

  const mainContentMarginTopClass = error ? 'mt-[7rem]' : 'mt-16'; 

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <Header />
      {error && (
        <div 
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="bg-red-600 text-white p-3 text-center fixed top-16 left-0 right-0 z-50 shadow-lg" 
          >
          錯誤: {error} 
          <button 
            onClick={() => setError(null)} 
            className="ml-4 font-bold py-1 px-2 hover:bg-red-700 rounded"
            aria-label="關閉錯誤訊息"
          >
            X
          </button>
        </div>
      )}
      <main className={`flex-grow flex flex-col lg:flex-row p-4 gap-4 ${mainContentMarginTopClass} transition-all duration-300 max-w-screen-2xl mx-auto w-full`}>
        <LeftPanel
          webContentSource={webContentSource}
          setWebContentSource={(newSource) => {
            setWebContentSource(newSource);
            if (newSource.text !== webContentSource.text) clearAudioDurations();
          }}
          styleInstructions={styleInstructions}
          setStyleInstructions={(newStyle) => {
            setStyleInstructions(newStyle);
            clearAudioDurations();
          }}
          brandProfile={brandProfile}
          setBrandProfile={(newProfile) => {
            setBrandProfile(newProfile);
            clearAudioDurations();
          }}
          onFetchWebContent={handleFetchWebContent}
          isFetchingWebContent={isFetchingWebContent}
          panelHeightClass={panelHeightClass}
          estimatedAudioLengthMinutes={estimatedAudioLengthMinutes}
          targetAudioLengthMinutes={targetAudioLengthMinutes}
          setTargetAudioLengthMinutes={(newLength) => {
            setTargetAudioLengthMinutes(newLength);
            clearAudioDurations();
          }}
        />
        <MiddlePanel
          dialogLines={dialogLines}
          setDialogLines={updateDialogLinesAndClearDurations}
          speakers={speakers}
          scriptMode={scriptMode}
          onGenerateScript={handleGenerateScript}
          isLoading={isLoading}
        />
        <RightPanel
          scriptMode={scriptMode}
          setScriptMode={(newMode) => {
            setScriptMode(newMode);
            clearAudioDurations();
          }}
          speakers={speakers}
          updateSpeaker={updateSpeaker}
          onGenerateScript={handleGenerateScript}
          onGenerateSeoMeta={handleGenerateSeoMeta}
          onDownloadScriptText={handleDownloadScriptText}
          onDownloadTimedTranscriptSrt={handleDownloadTimedTranscriptSrt}
          seoMeta={seoMeta}
          rssFeedUrl={rssFeedUrl}
          setRssFeedUrl={setRssFeedUrl}
          isLoading={isLoading} 
          isSynthesizingAudio={isSynthesizingAudio} 
          setIsSynthesizingAudio={setIsSynthesizingAudio} 
          setError={setError}
          dialogLines={dialogLines}
          actualAudioDurations={actualAudioDurations}
          panelHeightClass={panelHeightClass}
          onAudioSegmentSynthesized={handleAudioSegmentSynthesized}
        />
      </main>
    </div>
  );
};

export default App;