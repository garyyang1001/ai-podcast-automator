
import React from 'react';
import { WebContentSource } from '../types';
import { TextArea, TextInput, Button } from './shared/FormControls';
import { ArrowDownOnSquareIcon } from './icons/HeroIcons'; 
import { Spinner } from './shared/Spinner';

interface LeftPanelProps {
  webContentSource: WebContentSource;
  setWebContentSource: (source: WebContentSource) => void;
  styleInstructions: string;
  setStyleInstructions: (value: string) => void;
  brandProfile: string;
  setBrandProfile: (value: string) => void;
  onFetchWebContent: (url: string) => Promise<void>;
  isFetchingWebContent: boolean;
  panelHeightClass?: string;
  estimatedAudioLengthMinutes: number | null;
  targetAudioLengthMinutes: string;
  setTargetAudioLengthMinutes: (value: string) => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  webContentSource,
  setWebContentSource,
  styleInstructions,
  setStyleInstructions,
  brandProfile,
  setBrandProfile,
  onFetchWebContent,
  isFetchingWebContent,
  panelHeightClass,
  estimatedAudioLengthMinutes,
  targetAudioLengthMinutes,
  setTargetAudioLengthMinutes,
}) => {
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWebContentSource({ ...webContentSource, url: e.target.value });
  };

  const handleTextContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setWebContentSource({ ...webContentSource, text: e.target.value });
  };

  const handleFetchClick = () => {
    if (webContentSource.url) {
      onFetchWebContent(webContentSource.url);
    }
  };

  return (
    <div 
      className={`lg:w-1/3 bg-slate-900 p-6 rounded-lg shadow-xl space-y-6 overflow-y-auto custom-scrollbar 
                 lg:sticky lg:top-4 ${panelHeightClass || ''}`}
    >
      <div>
        <h2 className="text-lg font-semibold text-sky-400 mb-2">1. 內容來源 (Content Source)</h2>
        <div className="mb-3"> {/* Grouping div for URL input, button, and helper text, with bottom margin */}
          <div className="flex items-end space-x-2"> {/* Use items-end to align bottom of input and button */}
            <TextInput
              label="網頁URL (Web Page URL)"
              id="web-url"
              value={webContentSource.url}
              onChange={handleUrlChange}
              placeholder="https://example.com/article"
              helperText={undefined} // Changed from null to undefined
              className="flex-grow"
            />
            <Button 
              onClick={handleFetchClick} 
              disabled={!webContentSource.url || isFetchingWebContent}
              variant="secondary"
              size="md"
              className="flex-shrink-0" // Removed mb-3 as parent div handles spacing
              aria-label="Fetch content from URL"
            >
              {isFetchingWebContent ? <Spinner/> : <ArrowDownOnSquareIcon className="w-5 h-5 mr-1" />}
              抓取內容
            </Button>
          </div>
          <p className="mt-1 text-xs text-slate-400">輸入網址後點擊「抓取內容」。</p> {/* Helper text for URL input */}
        </div>
        <TextArea
          label="網頁內容 / 主要文本 (Web Page Content / Main Text)"
          id="web-content"
          value={webContentSource.text}
          onChange={handleTextContentChange}
          rows={10}
          placeholder="點擊「抓取內容」以自動填入，或手動貼上網頁主要文字內容。"
          aria-live="polite"
        />
         <p className="mt-1 text-xs text-slate-400">
            系統將根據此內容生成 Podcast 腳本。
            {estimatedAudioLengthMinutes !== null && (
              <span className="block mt-1">預估語音長度：約 {estimatedAudioLengthMinutes} 分鐘。</span>
            )}
         </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-sky-400 mb-2">2. 風格與品牌 (Style & Brand)</h2>
        <TextArea
          label="風格指示 (Style Instructions)"
          id="style-instructions"
          value={styleInstructions}
          onChange={(e) => setStyleInstructions(e.target.value)}
          rows={4}
          placeholder="例如：活潑生動、專業嚴謹、故事性強..."
        />
        <TextArea
          label="品牌特色 (Brand Profile)"
          id="brand-profile"
          value={brandProfile}
          onChange={(e) => setBrandProfile(e.target.value)}
          rows={3}
          placeholder="例如：年輕族群、科技愛好者、關注環保..."
        />
        {/* TextInput for target length will use its label for spacing above, 
            and parent space-y-6 for spacing below if it's the last item. 
            If more fine-grained spacing is needed, wrap it like the URL input. */}
        <div className="mb-3"> 
          <TextInput
            label="目標腳本長度 (分鐘) (Target Script Length - Minutes)"
            id="target-script-length"
            type="number"
            value={targetAudioLengthMinutes}
            onChange={(e) => setTargetAudioLengthMinutes(e.target.value)}
            placeholder="例如：5 (選填)"
            helperText="AI 將嘗試生成此長度的腳本，留空則由 AI 自行決定。"
          />
        </div>
      </div>
    </div>
  );
};
