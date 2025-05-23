
import React from 'react';
import { DialogLine, Speaker, ScriptMode } from '../types';
import { Button } from './shared/FormControls';
import { PlusCircleIcon, TrashIcon, UserCircleIcon, SparklesIcon } from './icons/HeroIcons';
import { v4 as uuidv4 } from 'uuid';
import { Spinner } from './shared/Spinner';

interface MiddlePanelProps {
  dialogLines: DialogLine[];
  setDialogLines: (lines: DialogLine[]) => void;
  speakers: Speaker[];
  scriptMode: ScriptMode;
  onGenerateScript: () => void;
  isLoading: boolean;
}

export const MiddlePanel: React.FC<MiddlePanelProps> = ({
  dialogLines,
  setDialogLines,
  speakers,
  scriptMode,
  onGenerateScript,
  isLoading,
}) => {
  const handleDialogChange = (index: number, field: 'speakerId' | 'text', value: string) => {
    const newLines = [...dialogLines];
    newLines[index] = { ...newLines[index], [field]: value };
    setDialogLines(newLines);
  };

  const addDialogLine = () => {
    const defaultSpeakerId = scriptMode === ScriptMode.SINGLE ? speakers[0].id : (speakers.length > 0 ? speakers[0].id : '');
    setDialogLines([...dialogLines, { id: uuidv4(), speakerId: defaultSpeakerId, text: '' }]);
  };

  const removeDialogLine = (index: number) => {
    const newLines = dialogLines.filter((_, i) => i !== index);
    setDialogLines(newLines);
  };

  const getSpeakerById = (id: string): Speaker | undefined => speakers.find(s => s.id === id);

  return (
    <div className="lg:w-1/3 bg-slate-900 p-6 rounded-lg shadow-xl flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 gap-2">
        <h2 className="text-lg font-semibold text-amber-400 whitespace-nowrap">3. 腳本編輯器</h2>
        <div className="flex gap-2">
          <Button onClick={onGenerateScript} variant="primary" size="sm" disabled={isLoading} aria-label="Generate script">
            {isLoading ? <Spinner /> : <SparklesIcon className="w-5 h-5 mr-1" />}
            生成腳本
          </Button>
          <Button onClick={addDialogLine} variant="secondary" size="sm" aria-label="Add new dialog line">
            <PlusCircleIcon className="w-5 h-5 mr-1" />
            新增對話
          </Button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {dialogLines.length === 0 && (
          <div className="text-center text-slate-500 py-10 flex flex-col items-center justify-center h-full">
            <UserCircleIcon className="w-16 h-16 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold">腳本尚未生成</p>
            <p className="text-sm">請先在左側填寫內容來源與風格，</p>
            <p className="text-sm">然後點擊上方的 "生成腳本" 按鈕開始。</p>
          </div>
        )}
        {dialogLines.map((line, index) => {
          const currentSpeaker = getSpeakerById(line.speakerId);
          return (
            <div key={line.id} className="p-3 bg-slate-850 rounded-md shadow">
              <div className="flex items-center mb-2">
                {scriptMode === ScriptMode.MULTI && speakers.length > 0 && (
                  <div className="mr-3 flex-shrink-0">
                     <select
                        value={line.speakerId}
                        onChange={(e) => handleDialogChange(index, 'speakerId', e.target.value)}
                        className="bg-slate-700 text-white border border-slate-600 rounded-md p-2 text-sm focus:ring-sky-500 focus:border-sky-500 appearance-none"
                        aria-label={`Speaker for line ${index + 1}`}
                        style={{minWidth: '100px'}}
                      >
                        {speakers.map(speaker => (
                          <option key={speaker.id} value={speaker.id}>
                            {speaker.name}
                          </option>
                        ))}
                      </select>
                  </div>
                )}
                {currentSpeaker && (
                   <span className={`w-3 h-3 rounded-full ${currentSpeaker.dotColor} mr-2 flex-shrink-0`}></span>
                )}
                <span className={`font-medium text-sm ${currentSpeaker?.color || 'text-slate-300'}`}>
                  {currentSpeaker?.name || (scriptMode === ScriptMode.SINGLE && speakers.length > 0 ? speakers[0].name : 'Unknown Speaker')}
                </span>
                <button
                  onClick={() => removeDialogLine(index)}
                  className="ml-auto text-slate-500 hover:text-red-400 transition-colors p-1 rounded-full hover:bg-slate-700"
                  aria-label={`Remove line ${index + 1}`}
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
              <textarea
                value={line.text}
                onChange={(e) => handleDialogChange(index, 'text', e.target.value)}
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-sm text-slate-200 focus:ring-sky-500 focus:border-sky-500 resize-y"
                placeholder="對話內容..."
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
