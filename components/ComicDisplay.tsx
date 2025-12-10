import React from 'react';
import { ComicScript, ComicPanelData } from '../types';

interface ComicDisplayProps {
  script: ComicScript;
  onReset: () => void;
  onShowStory: () => void;
  fullStoryText?: string;
  isFinished?: boolean;
  lang: 'en' | 'vi';
}

const ComicDisplay: React.FC<ComicDisplayProps> = ({ script, onReset, onShowStory, lang }) => {
  const text = {
    en: {
      new: "Start Over",
      story: "Full Story",
      print: "Download Comic",
      drawing: "Drawing...",
      page: "PAGE"
    },
    vi: {
      new: "Tạo Truyện Mới",
      story: "Cốt Truyện",
      print: "Tải Truyện Tranh",
      drawing: "Đang vẽ...",
      page: "TRANG"
    }
  };

  const t = text[lang];

  // Helper to chunk panels into pages of 2
  const pages: ComicPanelData[][] = [];
  for (let i = 0; i < script.panels.length; i += 2) {
    pages.push(script.panels.slice(i, i + 2));
  }

  const handleDownloadComic = () => {
    // Open a new window for printing
    const printWindow = window.open('', '', 'height=900,width=800');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>${script.title}</title>
          <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Inter:wght@400;700&display=swap" rel="stylesheet">
          <style>
             /* Print CSS */
             body { 
               font-family: 'Inter', sans-serif; 
               padding: 40px; 
               -webkit-print-color-adjust: exact; 
               print-color-adjust: exact; 
               background: white;
             }
             h1 { 
               font-family: 'Bangers', cursive; 
               text-align: center; 
               font-size: 40px; 
               margin-bottom: 30px; 
               color: #000; 
               letter-spacing: 2px; 
               text-transform: uppercase;
             }
             .grid { 
               display: grid; 
               grid-template-columns: 1fr 1fr; 
               gap: 20px; 
             }
             .panel { 
               border: 3px solid #000; 
               position: relative; 
               break-inside: avoid; 
               page-break-inside: avoid; 
               background: #fff; 
               display: flex;
               flex-direction: column;
             }
             .panel-img { 
               width: 100%; 
               height: auto; 
               display: block; 
               aspect-ratio: 1/1; 
               object-fit: cover; 
               border-top: 3px solid #000;
               border-bottom: 3px solid #000;
             }
             /* Remove borders for image if it's first/last element logic is simpler: 
                Caption is usually top, so border-top on image is good if caption exists.
             */
             
             .caption-box { 
               background: #fcd34d; 
               padding: 8px 10px; 
               font-weight: 800; 
               text-transform: uppercase; 
               font-size: 11px; 
               line-height: 1.3;
               color: black;
               min-height: 35px;
               display: flex;
               align-items: center;
             }
             .number { 
               position: absolute; 
               top: 0; 
               left: 0; 
               background: #fbbf24; 
               border-right: 3px solid #000; 
               border-bottom: 3px solid #000; 
               padding: 2px 8px; 
               font-family: 'Bangers', cursive; 
               font-size: 18px; 
               z-index: 10; 
               color: black;
             }
             .dialogue-wrapper {
                position: absolute; 
                bottom: 10px; 
                left: 0; 
                right: 0; 
                display: flex; 
                justify-content: center;
             }
             .dialogue-box { 
                background: #fff; 
                border: 2px solid #000; 
                border-radius: 16px; 
                padding: 6px 12px; 
                font-size: 12px; 
                text-align: center; 
                font-weight: bold;
                color: black;
                max-width: 90%;
                box-shadow: 2px 2px 0 rgba(0,0,0,0.3);
             }
             .footer {
                margin-top: 40px;
                text-align: center;
                font-size: 10px;
                color: #888;
                border-top: 1px solid #eee;
                padding-top: 10px;
             }
             @media print {
               @page { size: A4; margin: 1cm; }
             }
          </style>
        </head>
        <body>
          <h1>${script.title}</h1>
          <div class="grid">
            ${script.panels.map(p => `
              <div class="panel">
                <div class="number">${p.panel_number}</div>
                ${p.narrative_caption ? `<div class="caption-box">${p.narrative_caption}</div>` : ''}
                <img class="panel-img" src="data:image/png;base64,${p.image_base64 || ''}" />
                ${p.dialogue ? `
                  <div class="dialogue-wrapper">
                    <div class="dialogue-box">${p.dialogue}</div>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
          <div class="footer">
            Generated by BananaComics AI
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    
    // Slight delay to ensure images render before print dialog opens
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
  };

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in pb-12">
      {/* Title Header */}
      <div className="text-center mb-10">
        <h2 className="text-4xl md:text-6xl font-comic text-yellow-400 uppercase tracking-widest drop-shadow-[4px_4px_0_rgba(0,0,0,1)] mb-4">
          {script.title}
        </h2>
        <div className="flex justify-center gap-4 flex-wrap">
          <button 
            onClick={onShowStory}
            className="bg-slate-700 text-slate-200 hover:bg-slate-600 hover:text-white px-6 py-2 rounded-full font-bold border border-slate-500 hover:border-white transition-all text-sm uppercase tracking-wide flex items-center gap-2"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
             </svg>
             {t.story}
          </button>
          
          <button 
            onClick={handleDownloadComic}
            className="bg-blue-600 text-white hover:bg-blue-500 px-6 py-2 rounded-full font-bold border border-blue-400 hover:border-white transition-all text-sm uppercase tracking-wide flex items-center gap-2 shadow-lg shadow-blue-900/50"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
             </svg>
             {t.print}
          </button>

          <button 
            onClick={onReset}
            className="bg-slate-800 text-slate-300 hover:text-white px-6 py-2 rounded-full font-bold border border-slate-600 hover:border-yellow-400 transition-all text-sm uppercase tracking-wide"
          >
            {t.new}
          </button>
        </div>
      </div>

      {/* Render each "Page" */}
      <div className="space-y-16">
        {pages.map((pagePanels, pageIdx) => (
          <div key={pageIdx} className="relative">
            {/* Page Container - Mimics a physical paper page */}
            <div className="bg-white p-4 md:p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(50,50,50,0.5)]">
              
              {/* Page Number (optional aesthetic) */}
              <div className="absolute -top-5 left-4 bg-black text-white px-3 py-1 font-comic tracking-widest text-sm z-10 transform -rotate-1">
                {t.page} {pageIdx + 1}
              </div>

              {/* Grid Layout: 2 panels side-by-side or stacked on mobile 
                  items-end ensures images align at the bottom if captions have different heights
              */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-4 items-end">
                {pagePanels.map((panel, pIdx) => (
                  <PanelItem 
                    key={pIdx} 
                    panel={panel} 
                    t={t} 
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface PanelItemProps {
  panel: ComicPanelData;
  t: any;
}

const PanelItem: React.FC<PanelItemProps> = ({ panel, t }) => {
  return (
    <div className="flex flex-col w-full">
      {/* Narrative Caption (Moved outside/above the image container) */}
      {panel.narrative_caption && (
        <div className="mb-2 px-1 relative z-10">
           <div className="inline-block bg-amber-300 border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] max-w-full">
              <p className="text-xs md:text-sm font-bold uppercase tracking-wide leading-tight text-black font-sans text-left">
                {panel.narrative_caption}
              </p>
           </div>
        </div>
      )}

      {/* Image Container */}
      <div className="relative aspect-square border-4 border-black overflow-hidden bg-slate-100 group w-full shadow-sm">
        
        {/* Panel Number Badge */}
        <div className="absolute top-0 left-0 bg-yellow-400 text-black font-comic font-bold px-2 py-1 text-lg border-r-4 border-b-4 border-black z-30">
          {panel.panel_number}
        </div>

        {/* Image Layer */}
        <div className="w-full h-full">
          {panel.image_base64 ? (
            <img 
              src={`data:image/png;base64,${panel.image_base64}`} 
              alt={`Panel ${panel.panel_number}`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-200 animate-pulse gap-2">
              <div className="text-4xl">✏️</div>
              <span className="text-slate-500 font-comic text-xl uppercase tracking-widest">{t.drawing}</span>
            </div>
          )}
        </div>

        {/* Overlay Layer: Dialogue Bubble (Bottom/Floating) - Remains inside */}
        {panel.dialogue && (
          <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center pointer-events-none">
             <div className="relative max-w-[80%] animate-in fade-in slide-in-from-bottom-2 duration-500">
                {/* Bubble Body */}
                <div className="bg-white border-[3px] border-black rounded-[2rem] px-4 py-2 shadow-md relative">
                  <p className="text-black font-sans font-bold text-sm leading-snug text-center">
                    {panel.dialogue}
                  </p>
                  
                  {/* Speech Tail */}
                  <div className="absolute -top-[14px] left-6 w-0 h-0 
                    border-l-[10px] border-l-transparent 
                    border-b-[15px] border-b-black 
                    border-r-[10px] border-r-transparent">
                  </div>
                  <div className="absolute -top-[9px] left-6 w-0 h-0 
                    border-l-[7px] border-l-transparent 
                    border-b-[12px] border-b-white 
                    border-r-[7px] border-r-transparent">
                  </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComicDisplay;