
import React from 'react';
import { APP_TITLE } from '../constants';

export const Header: React.FC = () => {
  return (
    <header className="bg-[#edf7f6] shadow-md p-4 fixed top-0 left-0 right-0 z-40">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <img 
            src="/好事logo.svg" 
            alt="App Logo" 
            className="h-8 w-8 mr-3" // Adjust size (h-8 w-8) as needed
          />
          <h1 className="text-xl font-bold text-slate-900">{APP_TITLE}</h1>
        </div>
        {/* Future: Add other header items like "Get API Key", "Docs" etc. if needed */}
         <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-700">Powered by Gemini</span>
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09l2.846.813-.813 2.846a4.5 4.5 0 00-3.09 3.09zM18.25 12L15.404 12.813a4.5 4.5 0 01-3.09 3.09L9 18.75l2.846.813a4.5 4.5 0 013.09 3.09L15 21.75l.813-2.846a4.5 4.5 0 013.09-3.09L21.75 12l-2.846-.813a4.5 4.5 0 01-3.09-3.09L15 5.25l-.813 2.846a4.5 4.5 0 01-3.09 3.09L9 12.001l2.846.813a4.5 4.5 0 013.09 3.09L15 18.75l.813-2.846a4.5 4.5 0 013.09-3.09L21.75 12l-2.846-.813a4.5 4.5 0 01-3.09-3.09L15 5.25l-.813 2.846a4.5 4.5 0 01-3.09 3.09L9 12l2.846.813a4.5 4.5 0 013.09 3.09L15 18.75l.813-2.846a4.5 4.5 0 013.09-3.09L21.75 12z" />
            </svg>
        </div>
      </div>
    </header>
  );
};
