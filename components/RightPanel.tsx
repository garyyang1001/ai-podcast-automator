import React, { useState, useCallback } from 'react';
import { Speaker, SeoMeta, ScriptMode, DialogLine } from '../types';
import { 
  AVAILABLE_VOICES, 
  GEMINI_MODEL_TEXT,
  EMOTION_OPTIONS,
  PACE_OPTIONS,
  TONE_OPTIONS,
  STYLE_OPTIONS
} from '../constants';
import { Button, Select, TextInput } from './shared/FormControls';
import { ChevronDownIcon, ChevronUpIcon, Cog8ToothIcon, DocumentTextIcon, MusicalNoteIcon, UserIcon, UsersIcon, SparklesIcon, PlayCircleIcon, ClockIcon } from './icons/HeroIcons';
import { Spinner } from './shared/Spinner';
import { GoogleGenAI } from '@google/genai';

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

// 🆕 建立語音指示函數
const buildVoiceInstruction = (speaker: Speaker): string => {
  const instructions: string[] = [];
  
  // 情緒映射
  const emotionMap: Record<string, string> = {
    'excited': 'sound excited and energetic',
    'calm': 'sound calm and peaceful',
    'professional': 'sound professional and authoritative',
    'friendly': 'sound friendly and warm',
    'enthusiastic': 'sound enthusiastic and passionate'
  };
  
  // 語速映射
  const paceMap: Record<string, string> = {
    'very-slow': 'speak very slowly and clearly',
    'slow': 'speak slowly',
    'fast': 'speak at a fast pace while remaining clear',
    'very-fast': 'speak as fast as possible while remaining intelligible'
  };
  
  // 音調映射
  const toneMap: Record<string, string> = {
    'low': 'use a lower pitch',
    'high': 'use a higher pitch'
  };
  
  // 風格映射
  const styleMap: Record<string, string> = {
    'whisper': 'speak in a gentle whisper',
    'strong': 'speak with strong emphasis',
    'gentle': 'speak gently and softly'
  };
  
  // 組合指示
  if (speaker.emotion && speaker.emotion !== 'neutral') {
    instructions.push(emotionMap[speaker.emotion]);
  }
  if (speaker.pace && speaker.pace !== 'normal') {
    instructions.push(paceMap[speaker.pace]);
  }
  if (speaker.tone && speaker.tone !== 'normal') {
    instructions.push(toneMap[speaker.tone]);
  }
  if (speaker.style && speaker.style !== 'normal') {
    instructions.push(styleMap[speaker.style]);
  }
  
  return instructions.length > 0 ? `Make ${speaker.name} ${instructions.join(', ')}.` : '';
};

// 修正：添加 PCM 到 WAV 轉換函數
const convertPCMToWAV = (pcmData: Uint8Array, sampleRate: number = 24000, channels: number = 1, bitDepth: number = 16): Uint8Array => {
  const dataLength = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');                        // ChunkID
  view.setUint32(4, 36 + dataLength, true);     // ChunkSize
  writeString(8, 'WAVE');                       // Format
  writeString(12, 'fmt ');                      // Subchunk1ID
  view.setUint32(16, 16, true);                 // Subchunk1Size
  view.setUint16(20, 1, true);                  // AudioFormat (PCM)
  view.setUint16(22, channels, true);           // NumChannels
  view.setUint32(24, sampleRate, true);         // SampleRate
  view.setUint32(28, sampleRate * channels * bitDepth / 8, true); // ByteRate
  view.setUint16(32, channels * bitDepth / 8, true);              // BlockAlign
  view.setUint16(34, bitDepth, true);           // BitsPerSample
  writeString(36, 'data');                      // Subchunk2ID
  view.setUint32(40, dataLength, true);         // Subchunk2Size
  
  // PCM data
  const uint8Array = new Uint8Array(buffer);
  uint8Array.set(pcmData, 44);
  
  return uint8Array;
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

  // 🔄 修改後的語音合成函數 - 支援語音指示
  const synthesizeWithGeminiTTS = useCallback(async (text: string, speaker: Speaker): Promise<SynthesizedAudio | null> => {
    const geminiApiKey = getEnvVar('API_KEY');

    if (!geminiApiKey) {
      setError("Gemini API Key (API_KEY) 未找到。請在 .env 檔案中設定 VITE_API_KEY。");
      return null;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      
      // 🆕 建立語音指示
      const voiceInstruction = buildVoiceInstruction(speaker);
      const enhancedText = voiceInstruction ? `${voiceInstruction}\n\n"${text}"` : text;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: enhancedText }] }],
        config: {
          responseModalities: ['Audio'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: speaker.voice },
            },
          },
        },
      });

      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (inlineData?.data) {
        return { 
          data: inlineData.data, 
          mimeType: inlineData.mimeType || 'audio/L16;codec=pcm;rate=24000'
        };
      } else {
        console.error("Gemini TTS API 沒有返回預期的音頻內容:", response);
        throw new Error("Gemini TTS API 沒有返回音頻內容。");
      }
    } catch (e) {
      console.error("Gemini TTS 語音合成錯誤:", e);
      throw e;
    }
  }, [setError]);

  // 🔄 修改後的多人對話合成函數 - 支援語音指示
  const synthesizeMultiSpeakerWithGemini = useCallback(async (dialogLines: DialogLine[], speakers: Speaker[]): Promise<SynthesizedAudio | null> => {
    const geminiApiKey = getEnvVar('API_KEY');

    if (!geminiApiKey) {
      setError("Gemini API Key (API_KEY) 未找到。");
      return null;
    }

    const script = dialogLines.map(line => {
      const speaker = speakers.find(s => s.id === line.speakerId);
      return `${speaker?.name || 'Speaker'}: ${line.text}`;
    }).join('\n');

    const activeSpeakers = scriptMode === ScriptMode.SINGLE ? [speakers[0]] : speakers.slice(0, 2);
    
    // 🆕 建立每個發言人的語音指示
    const speakerInstructions = activeSpeakers
      .map(speaker => buildVoiceInstruction(speaker))
      .filter(instruction => instruction.length > 0);
    
    // 🆕 組合完整的提示詞
    let enhancedPrompt = '';
    if (speakerInstructions.length > 0) {
      enhancedPrompt = `${speakerInstructions.join(' ')}\n\n`;
    }
    enhancedPrompt += `TTS the following conversation between ${activeSpeakers.map(s => s.name).join(' and ')}:\n${script}`;

    const speakerConfigs = activeSpeakers.map(speaker => ({
      speaker: speaker.name,
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: speaker.voice }
      }
    }));

    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: enhancedPrompt }] }],
        config: {
          responseModalities: ['Audio'],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: speakerConfigs
            }
          }
        }
      });

      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (inlineData?.data) {
        return { 
          data: inlineData.data, 
          mimeType: inlineData.mimeType || 'audio/L16;codec=pcm;rate=24000'
        };
      } else {
        throw new Error("Gemini TTS 沒有返回音頻內容。");
      }
    } catch (e) {
      console.error("Gemini 多人對話 TTS 錯誤:", e);
      throw e;
    }
  }, [setError, scriptMode]);

  const synthesizeSpeechInternal = useCallback(async (text: string, speaker: Speaker): Promise<SynthesizedAudio | null> => {
    return await synthesizeWithGeminiTTS(text, speaker);
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
    
    // 🆕 根據語音設定調整預覽文字
    let previewText = `這是 ${speakerName} 使用 ${voiceStyleName} 的語音預覽。`;
    
    // 根據情緒調整預覽內容
    switch (speaker.emotion) {
      case 'excited':
        previewText += "我感到非常興奮！這個語音效果真是太棒了！";
        break;
      case 'calm':
        previewText += "讓我們以平靜的心情來體驗這個美好的語音效果。";
        break;
      case 'professional':
        previewText += "根據專業分析，這是一個高品質的語音合成技術。";
        break;
      case 'friendly':
        previewText += "很高興與您分享這個友善溫暖的語音體驗。";
        break;
      case 'enthusiastic':
        previewText += "讓我們一起熱情地探索這個驚人的語音技術！";
        break;
      default:
        previewText += "您好，這是由 Gemini AI 原生語音技術產生的高品質語音。";
    }
    
    try {
        const synthesized = await synthesizeSpeechInternal(previewText, speaker);
        if (synthesized) {
            const byteCharacters = atob(synthesized.data);
            const pcmData = new Uint8Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              pcmData[i] = byteCharacters.charCodeAt(i);
            }
            
            const wavData = convertPCMToWAV(pcmData);
            const blob = new Blob([wavData], { type: 'audio/wav' });
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
          const pcmData = new Uint8Array(byteCharacters.length);
          for (let j = 0; j < byteCharacters.length; j++) {
            pcmData[j] = byteCharacters.charCodeAt(j);
          }
          
          const wavData = convertPCMToWAV(pcmData);
          const blob = new Blob([wavData], { type: 'audio/wav' });

          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `gemini_podcast_full_conversation.wav`;
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
            const synthesized = await synthesizeSpeechInternal(line.text, speaker);

            if (synthesized) {
              const byteCharacters = atob(synthesized.data);
              const pcmData = new Uint8Array(byteCharacters.length);
              for (let j = 0; j < byteCharacters.length; j++) {
                pcmData[j] = byteCharacters.charCodeAt(j);
              }
              
              const wavData = convertPCMToWAV(pcmData);
              const blob = new Blob([wavData], { type: 'audio/wav' });
              
              const lineDuration = line.text.length * 0.1;
              onAudioSegmentSynthesized(line.id, lineDuration);

              const safeSpeakerName = speaker.name.replace(/[^\w\s\u4e00-\u9fa5]/gi, '').replace(/\s+/g, '_'); 
              const fileName = `podcast_segment_${String(i + 1).padStart(2, '0')}_${safeSpeakerName}.wav`;
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
          <p className="text-xs text-slate-400 mt-1">✨ 30種高品質語音 | 🎭 智能多人對話 | 🌍 24種語言支援 | 🎛️ 精細語音控制</p>
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

              {/* 🆕 新增語音品質控制 */}
              <div className="mt-3 space-y-2">
                <h5 className="text-xs font-medium text-slate-400">🎭 語音風格設定 (Voice Style Controls)</h5>
                
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    label="情緒"
                    id={`speaker-emotion-${speaker.id}`}
                    value={speaker.emotion || 'neutral'}
                    onChange={(e) => handleSpeakerChange(speakerArrayIndex, 'emotion', e.target.value)}
                    options={EMOTION_OPTIONS}
                  />
                  <Select
                    label="語速"
                    id={`speaker-pace-${speaker.id}`}
                    value={speaker.pace || 'normal'}
                    onChange={(e) => handleSpeakerChange(speakerArrayIndex, 'pace', e.target.value)}
                    options={PACE_OPTIONS}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    label="音調"
                    id={`speaker-tone-${speaker.id}`}
                    value={speaker.tone || 'normal'}
                    onChange={(e) => handleSpeakerChange(speakerArrayIndex, 'tone', e.target.value)}
                    options={TONE_OPTIONS}
                  />
                  <Select
                    label="風格"
                    id={`speaker-style-${speaker.id}`}
                    value={speaker.style || 'normal'}
                    onChange={(e) => handleSpeakerChange(speakerArrayIndex, 'style', e.target.value)}
                    options={STYLE_OPTIONS}
                  />
                </div>
                
                {/* 🎯 語音設定預覽提示 */}
                {(speaker.emotion !== 'neutral' || speaker.pace !== 'normal' || speaker.tone !== 'normal' || speaker.style !== 'normal') && (
                  <div className="mt-2 p-2 bg-blue-900/30 border border-blue-600/50 rounded-md">
                    <p className="text-xs text-blue-300">
                      🎨 <strong>語音效果預覽：</strong>
                      {speaker.emotion && speaker.emotion !== 'neutral' && ` ${EMOTION_OPTIONS.find(e => e.value === speaker.emotion)?.label}`}
                      {speaker.pace && speaker.pace !== 'normal' && ` ${PACE_OPTIONS.find(p => p.value === speaker.pace)?.label}`}
                      {speaker.tone && speaker.tone !== 'normal' && ` ${TONE_OPTIONS.find(t => t.value === speaker.tone)?.label}`}
                      {speaker.style && speaker.style !== 'normal' && ` ${STYLE_OPTIONS.find(s => s.value === speaker.style)?.label}`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
         🎭 產生 AI Podcast 語音 (智能多人對話 + 精細風格控制)
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