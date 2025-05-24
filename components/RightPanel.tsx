import React, { useState, useCallback } from 'react';
import { Speaker, SeoMeta, ScriptMode, DialogLine } from '../types';
import { AVAILABLE_VOICES, GEMINI_MODEL_TEXT } from '../constants';
import { Button, Select, TextInput } from './shared/FormControls';
import { ChevronDownIcon, ChevronUpIcon, Cog8ToothIcon, DocumentTextIcon, MusicalNoteIcon, UserIcon, UsersIcon, SparklesIcon, PlayCircleIcon, ClockIcon } from './icons/HeroIcons';
import { Spinner } from './shared/Spinner';

import JSZip from 'jszip';

// ---- Local helper type ----
type SynthesizedAudio = { data: string; mimeType: string };

interface RightPanelProps {
  scriptMode: ScriptMode;
  setScriptMode: (mode: ScriptMode) => void;
  speakers: Speaker[];
  updateSpeaker: (index: number, speaker: Speaker) => void;
  onGenerateScript: () => void;
  onGenerateSeoMeta: () => void;
  onDownloadScriptText: () => void;
  onDownloadTimedTranscriptSrt: () => void;
  seoMeta: SeoMeta | null;
  rssFeedUrl: string;
  setRssFeedUrl: (url: string) => void;
  isLoading: boolean; 
  isSynthesizingAudio: boolean; 
  setIsSynthesizingAudio: (loading: boolean) => void; 
  setError: (message: string | null) => void;
  dialogLines: DialogLine[];
  actualAudioDurations: Record<string, number>;
  panelHeightClass?: string; 
  onAudioSegmentSynthesized: (lineId: string, duration: number) => void;
}

const getEnvVar = (key: string): string | undefined => {
  if (typeof window !== 'undefined') {
    return (window as any)?.env?.[key] || (import.meta as any)?.env?.[`VITE_${key}`] || (import.meta as any)?.env?.[key];
  }
  return process.env[key] || process.env[`VITE_${key}`];
};

const AccordionSection: React.FC<{ title: string, icon?: React.ReactNode, children: React.ReactNode, defaultOpen?: boolean, id?: string }> = ({ title, icon, children, defaultOpen = false, id }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const sectionId = id || `accordion-${title.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="border border-slate-700 rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-3 bg-slate-800 hover:bg-slate-750 transition-colors rounded-t-lg"
        aria-expanded={isOpen}
        aria-controls={sectionId}
      >
        <div className="flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          <span className="font-semibold text-slate-200">{title}</span>
        </div>
        {isOpen ? <ChevronUpIcon className="w-5 h-5 text-slate-400" /> : <ChevronDownIcon className="w-5 h-5 text-slate-400" />}
      </button>
      {isOpen && <div id={sectionId} className="p-4 bg-slate-850 rounded-b-lg space-y-3">{children}</div>}
    </div>
  );
};

export const RightPanel: React.FC<RightPanelProps> = ({
  scriptMode,
  setScriptMode,
  speakers,
  updateSpeaker,
  onGenerateScript,
  onGenerateSeoMeta,
  onDownloadScriptText,
  onDownloadTimedTranscriptSrt,
  seoMeta,
  rssFeedUrl,
  setRssFeedUrl,
  isLoading,
  isSynthesizingAudio,
  setIsSynthesizingAudio,
  setError,
  dialogLines,
  actualAudioDurations,
  panelHeightClass,
  onAudioSegmentSynthesized,
}) => {
  // 只針對「正在語音預覽的發言人」的 index；null 代表目前沒有在預覽
  const [previewingSpeakerIndex, setPreviewingSpeakerIndex] = useState<number | null>(null);
  const handleSpeakerChange = (index: number, field: keyof Omit<Speaker, 'id'|'color'|'dotColor'>, value: string) => {
    updateSpeaker(index, { ...speakers[index], [field]: value });
  };

  const synthesizeWithGeminiTTS = useCallback(async (text: string, voiceId: string): Promise<SynthesizedAudio | null> => {
    const geminiApiKey = getEnvVar('API_KEY');

    if (!geminiApiKey) {
      setError("Gemini API Key (API_KEY) 未找到。請在 .env 檔案中設定 VITE_API_KEY。");
      return null;
    }

    // Use official Google endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${geminiApiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: text
            }]
          }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              audioEncoding: "MP3",
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceId
                }
              }
            }
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let msg = response.statusText;
        try {
          const errJson = JSON.parse(errorText);
          msg = errJson.error?.message || errorText;
        } catch {
          msg = errorText || msg;
        }
        console.error('Gemini TTS API Error:', msg);
        throw new Error(`Gemini TTS API 請求失敗: ${msg}`);
      }

      const result = await response.json();
      if (result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
        const inline = result.candidates[0].content.parts[0].inlineData;
        return { data: inline.data, mimeType: inline.mimeType || 'audio/mpeg' };
      } else {
        console.error("Gemini TTS API 沒有返回預期的音頻內容:", result);
        throw new Error("Gemini TTS API 沒有返回音頻內容。");
      }
    } catch (e) {
      console.error("Gemini TTS 語音合成錯誤:", e);
      throw e;
    }
  }, [setError]);

  const synthesizeMultiSpeakerWithGemini = useCallback(async (dialogLines: DialogLine[], speakers: Speaker[]): Promise<SynthesizedAudio | null> => {
    const geminiApiKey = getEnvVar('API_KEY');

    if (!geminiApiKey) {
      setError("Gemini API Key (API_KEY) 未找到。");
      return null;
    }

    // Use official Google endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${geminiApiKey}`;

    const script = dialogLines.map(line => {
      const speaker = speakers.find(s => s.id === line.speakerId);
      return `${speaker?.name || 'Speaker'}: ${line.text}`;
    }).join('\n');

    const activeSpeakers = scriptMode === ScriptMode.SINGLE ? [speakers[0]] : speakers.slice(0, 2);
    const speakerConfigs = activeSpeakers.map(speaker => ({
      speaker: speaker.name,
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: speaker.voice
        }
      }
    }));

    const prompt = `TTS the following conversation between ${activeSpeakers.map(s => s.name).join(' and ')}:\n${script}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              audioEncoding: "MP3",
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: speakerConfigs
              }
            }
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let msg = response.statusText;
        try {
          const errJson = JSON.parse(errorText);
          msg = errJson.error?.message || errorText;
        } catch {
          msg = errorText || msg;
        }
        console.error('Gemini TTS API Error:', msg);
        throw new Error(`Gemini TTS API 請求失敗: ${msg}`);
      }

      const result = await response.json();
      if (result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
        const inline = result.candidates[0].content.parts[0].inlineData;
        return { data: inline.data, mimeType: inline.mimeType || 'audio/mpeg' };
      } else {
        throw new Error("Gemini TTS 沒有返回音頻內容。");
      }
    } catch (e) {
      console.error("Gemini 多人對話 TTS 錯誤:", e);
      throw e;
    }
  }, [setError, scriptMode]);

  const synthesizeSpeechInternal = useCallback(async (text: string, voiceId: string): Promise<SynthesizedAudio | null> => {
    return await synthesizeWithGeminiTTS(text, voiceId);
  }, [synthesizeWithGeminiTTS]);

  const handlePreviewVoice = useCallback(async (speakerIndex: number) => {
    const speaker = speakers[speakerIndex];
    if (!speaker || isSynthesizingAudio) return;
    setPreviewingSpeakerIndex(speakerIndex);
    setIsSynthesizingAudio(true);
    setError(null);

    const voiceOption = AVAILABLE_VOICES.find(v => v.id === speaker.voice);
    const voiceStyleName = voiceOption ? voiceOption.name : "預設風格";
    const speakerName = speaker.name || `發言人 ${speakerIndex + 1}`;
    const textToSpeak = `這是 ${speakerName} 使用 ${voiceStyleName} 風格設定的語音預覽。您好，這是由 Gemini AI 原生語音技術產生的高品質語音。`;
    
    try {
        const synthesized = await synthesizeSpeechInternal(textToSpeak, speaker.voice);
        if (synthesized) {
            // 以 Blob + objectURL 方式播放，兼容性較好
            const byteCharacters = atob(synthesized.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: synthesized.mimeType });
            const audioSrc = URL.createObjectURL(blob);
            const audio = new Audio(audioSrc);
            audio.play().catch(e => {
                console.error("播放音頻錯誤:", e);
                setError("無法播放預覽語音，瀏覽器可能限制了自動播放。");
            });
        }
    } catch (e) {
        setError(e instanceof Error ? e.message : "語音預覽合成時發生未知錯誤。");
    } finally {
        setPreviewingSpeakerIndex(null);
        setIsSynthesizingAudio(false);
    }
  }, [speakers, synthesizeSpeechInternal, setError, isSynthesizingAudio, setIsSynthesizingAudio]);

  const handleGenerateFullPodcastAudio = useCallback(async () => {
    if (dialogLines.length === 0) {
      setError("請先生成腳本才能產生語音。");
      return;
    }

    setIsSynthesizingAudio(true);
    setError(null);

    try {
      if (scriptMode === ScriptMode.MULTI && speakers.length <= 2) {
        console.log("使用 Gemini 多人對話 TTS 生成完整對話...");
        
        const synthesized = await synthesizeMultiSpeakerWithGemini(dialogLines, speakers);
        
        if (synthesized) {
          const byteCharacters = atob(synthesized.data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let j = 0; j < byteCharacters.length; j++) {
            byteNumbers[j] = byteCharacters.charCodeAt(j);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: synthesized.mimeType });

          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          const ext = synthesized.mimeType.includes('mpeg') ? 'mp3' : 'wav';
          link.download = `gemini_podcast_full_conversation.${ext}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);

          dialogLines.forEach(line => {
            const lineDuration = line.text.length * 0.1;
            onAudioSegmentSynthesized(line.id, lineDuration);
          });
        }
      } else {
        console.log("使用逐行音訊生成模式...");
        
        const audioSegments: { name: string; data: Blob }[] = [];
        let hasErrorOccurred = false;

        for (let i = 0; i < dialogLines.length; i++) {
          const line = dialogLines[i];
          const speaker = speakers.find(s => s.id === line.speakerId);

          if (!speaker) {
            setError(`第 ${i + 1} 行對話找不到發言人設定。`);
            hasErrorOccurred = true;
            break; 
          }
          
          try {
            const synthesized = await synthesizeSpeechInternal(line.text, speaker.voice);

            if (synthesized) {
              const byteCharacters = atob(synthesized.data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let j = 0; j < byteCharacters.length; j++) {
                byteNumbers[j] = byteCharacters.charCodeAt(j);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: synthesized.mimeType });
              
              const lineDuration = line.text.length * 0.1;
              onAudioSegmentSynthesized(line.id, lineDuration);

              const safeSpeakerName = speaker.name.replace(/[^\w\s\u4e00-\u9fa5]/gi, '').replace(/\s+/g, '_'); 
              const ext = synthesized.mimeType.includes('mpeg') ? 'mp3' : 'wav';
              const fileName = `podcast_segment_${String(i + 1).padStart(2, '0')}_${safeSpeakerName}.${ext}`;
              audioSegments.push({ name: fileName, data: blob });
            } else {
               setError(`第 ${i + 1} 行語音合成失敗，未收到音訊內容。`);
               hasErrorOccurred = true;
               break;
            }
          } catch (e) {
            console.error(`第 ${i + 1} 行音頻合成錯誤:`, e);
            setError(`第 ${i + 1} 行語音合成失敗: ${e instanceof Error ? e.message : "未知錯誤"}`);
            hasErrorOccurred = true;
            break; 
          }
        } 

        if (!hasErrorOccurred && audioSegments.length > 0) {
          try {
            const zip = new JSZip();
            audioSegments.forEach(segment => {
              zip.file(segment.name, segment.data);
            });
            
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = 'gemini_podcast_audio_segments.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
          } catch (e) {
            console.error("創建或下載ZIP檔案錯誤:", e);
            setError(`生成 ZIP 壓縮檔失敗: ${e instanceof Error ? e.message : "未知錯誤"}`);
          }
        }
      }
    } catch (e) {
      setError(`語音合成失敗: ${e instanceof Error ? e.message : "未知錯誤"}`);
    } finally {
      setIsSynthesizingAudio(false);
    }
  }, [dialogLines, speakers, scriptMode, synthesizeMultiSpeakerWithGemini, synthesizeSpeechInternal, setError, setIsSynthesizingAudio, onAudioSegmentSynthesized]);

  const canDownloadTimedTranscript = dialogLines.length > 0 && 
                                   Object.keys(actualAudioDurations).length === dialogLines.length &&
                                   dialogLines.every(line => actualAudioDurations[line.id] !== undefined && actualAudioDurations[line.id] >= 0);

  return (
    <div 
      className={`lg:w-1/3 bg-slate-900 p-6 rounded-lg shadow-xl space-y-6 overflow-y-auto custom-scrollbar 
                 lg:sticky lg:top-4 ${panelHeightClass || ''}`}
    >
      <h2 className="text-lg font-semibold text-emerald-400 mb-1">4. 執行與設定 (Run & Settings)</h2>
      
      <div className="space-y-3">
        <label htmlFor="ai-model-display" className="block text-sm font-medium text-slate-300">AI 文字模型 (AI Text Model)</label>
        <div id="ai-model-display" className="bg-slate-800 p-3 rounded-md text-sm border border-slate-700">{GEMINI_MODEL_TEXT} (Text Generation)</div>
      
        <fieldset className="space-y-1">
            <legend className="block text-sm font-medium text-slate-300 mb-1">模式 (Mode)</legend>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => setScriptMode(ScriptMode.SINGLE)} variant={scriptMode === ScriptMode.SINGLE ? 'primary' : 'secondary'} fullWidth aria-pressed={scriptMode === ScriptMode.SINGLE}>
                <UserIcon className="w-5 h-5 mr-2"/> 單人主持
              </Button>
              <Button onClick={() => setScriptMode(ScriptMode.MULTI)} variant={scriptMode === ScriptMode.MULTI ? 'primary' : 'secondary'} fullWidth aria-pressed={scriptMode === ScriptMode.MULTI}>
                <UsersIcon className="w-5 h-5 mr-2"/> 多人對話
              </Button>
            </div>
        </fieldset>
      </div>

      <AccordionSection title="語音設定 (Voice Settings)" icon={<Cog8ToothIcon className="w-5 h-5 text-slate-400" />} defaultOpen={true} id="voice-settings-section">
        <div className="mb-4 p-3 bg-slate-800 rounded-md border border-emerald-600/50">
          <div className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2"></span>
            <span className="text-emerald-400 font-semibold text-sm">🚀 Gemini AI 原生 TTS 已啟用</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">✨ 30種高品質語音 | 🎭 智能多人對話 | 🌍 24種語言支援</p>
        </div>

        {(scriptMode === ScriptMode.SINGLE ? [speakers[0]] : speakers).map((speaker, originalIndex) => {
          const speakerArrayIndex = scriptMode === ScriptMode.SINGLE ? speakers.findIndex(s => s.id === speaker.id) : originalIndex;
          if (!speaker) return null; 

          return (
          <div key={speaker.id} className="p-3 border border-slate-700 rounded-md bg-slate-800">
            <div className="flex items-center mb-2">
              <span className={`w-3 h-3 rounded-full ${speaker.dotColor} mr-2`}></span>
              <h4 className="font-semibold text-sm text-slate-300">發言人 {originalIndex + 1} 設定</h4>
            </div>
            <TextInput
              label="名稱 (Name)"
              id={`speaker-name-${speaker.id}`}
              value={speaker.name}
              onChange={(e) => handleSpeakerChange(speakerArrayIndex, 'name', e.target.value)}
              placeholder={`例如：主持人 ${originalIndex + 1}`}
            />
            <div className="flex items-end space-x-2">
                <Select
                    label="🎤 Gemini AI 原生語音 (30種高品質選項)"
                    id={`speaker-voice-style-${speaker.id}`}
                    value={speaker.voice} 
                    onChange={(e) => handleSpeakerChange(speakerArrayIndex, 'voice', e.target.value)}
                    options={AVAILABLE_VOICES.map(v => ({ value: v.id, label: v.name }))}
                    className="flex-grow"
                    helperText="✨ 使用 Gemini AI 原生語音技術，支援多人對話、風格控制和 24 種語言。"
                />
                <Button 
                    onClick={() => handlePreviewVoice(speakerArrayIndex)} 
                    variant="outline" 
                    size="md" 
                    className="mb-3 flex-shrink-0"
                    aria-label={`預覽 ${speaker.name} 的 Gemini AI 語音`}
                    disabled={isSynthesizingAudio}
                >
                    {previewingSpeakerIndex === speakerArrayIndex && isSynthesizingAudio
                      ? <Spinner />
                      : <PlayCircleIcon className="w-5 h-5" />}
                </Button>
            </div>
          </div>
        )})}
      </AccordionSection>
      
      <div className="space-y-3 pt-3">
        <Button onClick={onGenerateScript} disabled={isLoading || isSynthesizingAudio} fullWidth variant="primary" aria-label="Generate podcast script">
          {(isLoading && !isSynthesizingAudio) ? <Spinner /> : <SparklesIcon className="w-5 h-5 mr-2" />} 生成腳本
        </Button>
         <Button onClick={onGenerateSeoMeta} disabled={isLoading || isSynthesizingAudio || dialogLines.length === 0} fullWidth variant="secondary" aria-label="Generate SEO metadata">
           {(isLoading && !isSynthesizingAudio) ? <Spinner /> : <SparklesIcon className="w-5 h-5 mr-2" />} 生成 SEO Meta
        </Button>
      </div>

      <AccordionSection title="產出與發佈 (Output & Publishing)" icon={<DocumentTextIcon className="w-5 h-5 text-slate-400" />} id="output-publishing-section">
        {seoMeta && (
          <div className="bg-slate-800 p-3 rounded-md border border-slate-700">
            <h4 className="font-semibold text-sm text-sky-400 mb-1">SEO Meta:</h4>
            <p className="text-xs text-slate-300"><strong>Title:</strong> {seoMeta.title}</p>
            <p className="text-xs text-slate-300"><strong>Description:</strong> {seoMeta.description}</p>
          </div>
        )}
        <Button onClick={onDownloadScriptText} fullWidth variant="outline" aria-label="下載腳本文字 (TXT)" disabled={dialogLines.length === 0 || isSynthesizingAudio}>
          <DocumentTextIcon className="w-5 h-5 mr-2"/> 下載腳本文字 (TXT)
        </Button>
        <Button 
          onClick={onDownloadTimedTranscriptSrt} 
          fullWidth 
          variant="outline" 
          aria-label="下載時間碼逐字稿 (SRT)" 
          disabled={!canDownloadTimedTranscript || isSynthesizingAudio}
          title={!canDownloadTimedTranscript ? "請先「產生 AI Podcast 語音」以獲取精確時間戳。" : "下載 SRT 格式的時間碼逐字稿"}
        >
          <ClockIcon className="w-5 h-5 mr-2"/> 下載時間碼逐字稿 (SRT)
        </Button>
        <Button 
          onClick={handleGenerateFullPodcastAudio} 
          fullWidth 
          variant="outline" 
          aria-label="產生 AI Podcast 語音" 
          disabled={dialogLines.length === 0 || isSynthesizingAudio}
        >
         {isSynthesizingAudio ? <Spinner/> : <MusicalNoteIcon className="w-5 h-5 mr-2"/>} 
         🎭 產生 AI Podcast 語音 (智能多人對話)
        </Button>
        <TextInput
          label="RSS Feed 發佈網址 (RSS Feed URL - for reference)"
          id="rss-feed-url"
          value={rssFeedUrl}
          onChange={(e) => setRssFeedUrl(e.target.value)}
          placeholder="https://anchor.fm/s/your-id/podcast/rss"
          helperText="此欄位僅供記錄，目前不支援自動上傳。"
        />
      </AccordionSection>
    </div>
  );
};