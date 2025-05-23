import React, { useState, useCallback } from 'react';
import { Speaker, SeoMeta, ScriptMode, DialogLine } from '../types'; // Removed VoiceOption
import { AVAILABLE_VOICES, GEMINI_MODEL_TEXT } from '../constants';
import { Button, Select, TextInput } from './shared/FormControls';
import { ChevronDownIcon, ChevronUpIcon, Cog8ToothIcon, DocumentTextIcon, MusicalNoteIcon, UserIcon, UsersIcon, SparklesIcon, PlayCircleIcon, ClockIcon } from './icons/HeroIcons';
import { Spinner } from './shared/Spinner';
import JSZip from 'jszip';


interface RightPanelProps {
  scriptMode: ScriptMode;
  setScriptMode: (mode: ScriptMode) => void;
  speakers: Speaker[];
  updateSpeaker: (index: number, speaker: Speaker) => void;
  onGenerateScript: () => void;
  onGenerateSeoMeta: () => void;
  onDownloadScriptText: () => void; // Changed from onDownloadTranscript
  onDownloadTimedTranscriptSrt: () => void; // New handler for SRT
  seoMeta: SeoMeta | null;
  rssFeedUrl: string;
  setRssFeedUrl: (url: string) => void;
  isLoading: boolean; 
  isSynthesizingAudio: boolean; 
  setIsSynthesizingAudio: (loading: boolean) => void; 
  setError: (message: string | null) => void;
  dialogLines: DialogLine[];
  actualAudioDurations: Record<string, number>; // Added to manage SRT button state
  panelHeightClass?: string; 
  onAudioSegmentSynthesized: (lineId: string, duration: number) => void;
}

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

// Helper function to get audio duration from a Blob
const getAudioBlobDuration = (blob: Blob): Promise<number> => {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(blob);
    audio.src = objectUrl;
    let timeoutId: number; // Declare timeoutId
    
    const cleanup = () => {
      clearTimeout(timeoutId); // Clear timeout
      URL.revokeObjectURL(objectUrl);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('error', onError);
    };

    const onLoadedMetadata = () => {
      cleanup();
      resolve(audio.duration);
    };

    const onError = (e: Event | string) => {
      cleanup();
      console.error("Error loading audio for duration measurement:", e);
      reject(new Error("Could not measure audio duration."));
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('error', onError);
    
    timeoutId = window.setTimeout(() => { // Use window.setTimeout for clarity in browser
        onError("Timeout while waiting for audio metadata.");
    }, 10000); 

    audio.load(); 
  });
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
  const handleSpeakerChange = (index: number, field: keyof Omit<Speaker, 'id'|'color'|'dotColor'>, value: string) => {
    updateSpeaker(index, { ...speakers[index], [field]: value });
  };

  // 🔥 修正的 TTS API 函數 - 使用 Google Cloud TTS API 支援 Chirp 3 HD
  const synthesizeSpeechInternal = useCallback(async (text: string, voiceId: string, languageCode: string = 'cmn-TW'): Promise<string | null> => {
    const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY;

    if (!apiKey) {
      setError("Google Cloud API Key (GOOGLE_CLOUD_TTS_API_KEY) not found. Please configure it in .env.");
      return null;
    }
    
    // 使用 Google Cloud Text-to-Speech API，支援 Chirp 3 HD
    const ttsApiEndpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

    try {
      const response = await fetch(ttsApiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text: text },
          voice: { 
            languageCode: languageCode, 
            name: voiceId 
          },
          audioConfig: { audioEncoding: "MP3" }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Google Cloud TTS API Error:", errorData);
        throw new Error(errorData.error?.message || `Google Cloud TTS API request failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.audioContent) {
        return result.audioContent; 
      } else {
        console.error("Google Cloud TTS API did not return expected audio content structure:", result);
        throw new Error("Google Cloud TTS API did not return audio content in the expected format.");
      }
    } catch (e) {
      console.error("Error synthesizing speech via Google Cloud TTS:", e);
      throw e; 
    }
  }, [setError]);


  const handlePreviewVoice = useCallback(async (speakerIndex: number) => {
    const speaker = speakers[speakerIndex];
    if (!speaker || isSynthesizingAudio) return;

    setIsSynthesizingAudio(true);
    setError(null);

    const voiceOption = AVAILABLE_VOICES.find(v => v.id === speaker.voice);
    const voiceStyleName = voiceOption ? voiceOption.name : "預設風格";
    const speakerName = speaker.name || `發言人 ${speakerIndex + 1}`;
    const textToSpeak = `這是 ${speakerName} 使用 ${voiceStyleName} 風格設定的語音預覽。你好嗎？這是由Google Cloud Text-to-Speech產生。`;
    
    try {
        const audioContentBase64 = await synthesizeSpeechInternal(textToSpeak, speaker.voice);
        if (audioContentBase64) {
            const audioSrc = `data:audio/mp3;base64,${audioContentBase64}`;
            const audio = new Audio(audioSrc);
            audio.play().catch(e => {
                console.error("Error playing audio:", e);
                setError("無法播放預覽語音，瀏覽器可能限制了自動播放。");
            });
        }
    } catch (e) {
        setError(e instanceof Error ? e.message : "An unknown error occurred during voice preview synthesis.");
    } finally {
        setIsSynthesizingAudio(false);
    }
  }, [speakers, synthesizeSpeechInternal, setError, isSynthesizingAudio, setIsSynthesizingAudio]);

  const handleGenerateFullPodcastAudio = useCallback(async () => {
    if (dialogLines.length === 0) {
      setError("請先生成腳本才能產生語音。");
      return;
    }
    if (isSynthesizingAudio) return;

    setIsSynthesizingAudio(true);
    setError(null);
    
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
        const audioContentBase64 = await synthesizeSpeechInternal(line.text, speaker.voice);

        if (audioContentBase64) {
          const byteCharacters = atob(audioContentBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let j = 0; j < byteCharacters.length; j++) {
            byteNumbers[j] = byteCharacters.charCodeAt(j);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'audio/mp3' });
          
          try {
            const duration = await getAudioBlobDuration(blob);
            onAudioSegmentSynthesized(line.id, duration);
          } catch (durationError) {
            console.warn(`Could not get duration for line ${i + 1}: ${line.text}. Using estimated duration for transcript if needed.`, durationError);
            onAudioSegmentSynthesized(line.id, -1); // Indicate failure 
          }

          const safeSpeakerName = speaker.name.replace(/[^\w\s\u4e00-\u9fa5]/gi, '').replace(/\s+/g, '_'); 
          const fileName = `podcast_segment_${String(i + 1).padStart(2, '0')}_${safeSpeakerName}.mp3`;
          audioSegments.push({ name: fileName, data: blob });
        } else {
           setError(`第 ${i + 1} 行語音合成失敗，未收到音訊內容。`);
           hasErrorOccurred = true;
           break;
        }
      } catch (e) {
        console.error(`Error synthesizing audio for line ${i + 1}:`, e);
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
        link.download = 'podcast_audio_segments.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      } catch (e) {
        console.error("Error creating or downloading ZIP file:", e);
        setError(`生成 ZIP 壓縮檔失敗: ${e instanceof Error ? e.message : "未知錯誤"}`);
      }
    }

    setIsSynthesizingAudio(false);

  }, [dialogLines, speakers, synthesizeSpeechInternal, setError, isSynthesizingAudio, setIsSynthesizingAudio, onAudioSegmentSynthesized]);

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
                    label="Google Cloud TTS 語音 (支援 Chirp 3 HD)"
                    id={`speaker-voice-style-${speaker.id}`}
                    value={speaker.voice} 
                    onChange={(e) => handleSpeakerChange(speakerArrayIndex, 'voice', e.target.value)}
                    options={AVAILABLE_VOICES.map(v => ({ value: v.id, label: v.name }))}
                    className="flex-grow"
                    helperText="選擇 Google Cloud TTS 語音，包含最新的 Chirp 3 HD 高品質語音。"
                />
                <Button 
                    onClick={() => handlePreviewVoice(speakerArrayIndex)} 
                    variant="outline" 
                    size="md" 
                    className="mb-3 flex-shrink-0"
                    aria-label={`預覽 ${speaker.name} 的 Google Cloud TTS 語音`}
                    disabled={isSynthesizingAudio}
                >
                    {isSynthesizingAudio && 
                     speakers[speakerArrayIndex] === speaker && <Spinner/>} 
                    {(!isSynthesizingAudio || speakers[speakerArrayIndex] !== speaker) && <PlayCircleIcon className="w-5 h-5"/>}
                </Button>
            </div>
          </div>
        )}))}
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
         產生 AI Podcast 語音
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
