import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { generateComicScript, generatePanelImage, generateFullStory, generatePlotSuggestions } from './services/geminiService';
import { ComicScript, ComicPanelData, CharacterProfile } from './types';
import Button from './components/Button';
import ComicDisplay from './components/ComicDisplay';
import StoryModal from './components/StoryModal';

type Language = 'en' | 'vi';

const TRANSLATIONS = {
  en: {
    title_suffix: "Comics",
    desc: "Create endless comic adventures instantly using",
    desc_highlight: "Gemini 2.5 Flash",
    label: "Start your story adventure:",
    placeholder: "e.g., A cyberpunk detective named Kaito investigating a neon city...",
    btn_create: "Start Story",
    btn_continue: "Continue Story",
    status_writing: "Writing the story...",
    status_illustrating: "Illustrating the panels...",
    error_generic: "The AI writer got stuck. Please try again.",
    next_plot_label: "What happens next? (Optional)",
    next_plot_placeholder: "e.g., Suddenly a dragon appears! OR They find a secret door...",
    suggestions_label: "Plot Twist Ideas:",
    load_more: "More Ideas"
  },
  vi: {
    title_suffix: "TruyệnTranh",
    desc: "Sáng tạo bộ truyện tranh bất tận ngay lập tức với",
    desc_highlight: "Gemini 2.5 Flash",
    label: "Bắt đầu câu chuyện của bạn:",
    placeholder: "Ví dụ: Thám tử Kaito điều tra vụ án bí ẩn trong thành phố Neon...",
    btn_create: "Bắt Đầu Truyện",
    btn_continue: "Viết Tiếp",
    status_writing: "Đang viết kịch bản...",
    status_illustrating: "Đang vẽ tranh (vui lòng đợi)...",
    error_generic: "AI gặp chút trục trặc khi sáng tác. Vui lòng thử lại.",
    next_plot_label: "Chuyện gì xảy ra tiếp theo? (Tùy chọn)",
    next_plot_placeholder: "Ví dụ: Đột nhiên một con rồng xuất hiện! HOẶC Họ tìm thấy một cánh cửa bí mật...",
    suggestions_label: "Gợi ý Plot Twist:",
    load_more: "Thêm Gợi Ý"
  }
};

const HeroHeader = ({ lang, setLang }: { lang: Language, setLang: (l: Language) => void }) => {
  const t = TRANSLATIONS[lang];
  return (
    <header className="relative text-center py-12 px-4">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button 
          onClick={() => setLang('en')}
          className={`px-3 py-1 rounded-full text-sm font-bold transition-colors ${lang === 'en' ? 'bg-yellow-400 text-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
        >
          EN
        </button>
        <button 
          onClick={() => setLang('vi')}
          className={`px-3 py-1 rounded-full text-sm font-bold transition-colors ${lang === 'vi' ? 'bg-yellow-400 text-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
        >
          VN
        </button>
      </div>

      <h1 className="text-5xl md:text-7xl font-comic text-yellow-400 mb-4 drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)] tracking-wide">
        Banana<span className="text-white">{t.title_suffix}</span> AI
      </h1>
      <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
        {t.desc} <span className="text-yellow-400 font-bold mx-1">{t.desc_highlight}</span>.
      </p>
    </header>
  );
};

function App() {
  const [lang, setLang] = useState<Language>('vi');
  const [topic, setTopic] = useState<string>('');
  
  // 'idle' | 'loading' | 'ready' | 'error'
  const [appState, setAppState] = useState<string>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  const [comicData, setComicData] = useState<ComicScript | null>(null);
  const [allCharacters, setAllCharacters] = useState<CharacterProfile[]>([]);
  const [nextPlotPoint, setNextPlotPoint] = useState<string>('');
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  // Full Story Text State
  const [fullStoryText, setFullStoryText] = useState<string>('');
  const [showStoryModal, setShowStoryModal] = useState(false);

  const t = TRANSLATIONS[lang];
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when panels are added
  useEffect(() => {
    if (comicData?.panels.length && appState === 'ready') {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [comicData?.panels.length, appState]);

  // Helper to generate images for a set of panels and return them populated
  const generateImagesForPanels = async (panels: ComicPanelData[], characters: CharacterProfile[], style: string): Promise<ComicPanelData[]> => {
    const results: ComicPanelData[] = [];
    
    // Execute sequentially to prevent Rate Limit (429) errors
    for (const panel of panels) {
      try {
        const base64 = await generatePanelImage(panel.visual_description, characters, style);
        results.push({ ...panel, image_base64: base64 });
      } catch (err) {
        console.error(`Failed to generate image for panel ${panel.panel_number}`, err);
        // Add panel without image so the story text persists
        results.push(panel); 
      }
    }

    return results;
  };

  const handleStartStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setComicData(null);
    setAllCharacters([]);
    setNextPlotPoint('');
    setFullStoryText('');
    
    setAppState('loading');
    setStatusMessage(t.status_writing);

    try {
      // 1. Generate Script FIRST (This establishes the canon)
      const script = await generateComicScript(topic, lang, [], "", []);
      
      const newChars = script.characters || [];
      setAllCharacters(newChars);

      // 2. Generate Full Story based on the generated panels
      // We do this in the background so images can start drawing
      generateFullStory(topic, lang, script.panels, "")
        .then(text => setFullStoryText(text))
        .catch(e => console.error("Story gen failed", e));
      
      // 3. Update status to drawing
      setStatusMessage(t.status_illustrating);

      // 4. Generate All Images (Sequentially)
      const panelsWithImages = await generateImagesForPanels(script.panels, newChars, script.visual_style);

      // 5. Set final data and show
      setComicData({ ...script, panels: panelsWithImages });
      setAppState('ready');

    } catch (err) {
      console.error(err);
      setAppState('error');
    }
  };

  const handleContinueStory = async () => {
    if (!comicData) return;

    setAppState('loading');
    setStatusMessage(t.status_writing);

    try {
      // 1. Generate Script for NEXT part
      const nextScriptPart = await generateComicScript(
        topic, 
        lang, 
        comicData.panels, 
        nextPlotPoint, 
        allCharacters,
        comicData.visual_style
      );
      
      // 2. Update Full Story (Background)
      // We pass ALL panels (previous + new) + the user action
      const allPanelsCombined = [...comicData.panels, ...nextScriptPart.panels];
      generateFullStory(topic, lang, allPanelsCombined, nextPlotPoint)
        .then(text => setFullStoryText(text))
        .catch(e => console.error("Story update failed", e));

      // Merge characters
      const updatedCharacters = [...allCharacters];
      if (nextScriptPart.characters) {
        nextScriptPart.characters.forEach(newChar => {
          if (!updatedCharacters.find(c => c.name === newChar.name)) {
            updatedCharacters.push(newChar);
          }
        });
      }
      setAllCharacters(updatedCharacters);
      
      // 3. Update status to drawing
      setStatusMessage(t.status_illustrating);

      // 4. Generate Images for NEW panels (Sequentially)
      const newPanelsWithImages = await generateImagesForPanels(
        nextScriptPart.panels, 
        updatedCharacters, 
        nextScriptPart.visual_style
      );

      // 5. Append and show
      setComicData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          // Update style in case it evolved
          visual_style: nextScriptPart.visual_style,
          panels: [...prev.panels, ...newPanelsWithImages],
          // Update suggestions
          suggestedOptions: nextScriptPart.suggestedOptions
        };
      });
      setNextPlotPoint('');
      setAppState('ready');

    } catch (err) {
      console.error(err);
      setAppState('error');
    }
  };

  const handleLoadMoreSuggestions = async () => {
    if (!comicData) return;
    setLoadingSuggestions(true);
    try {
      const moreOptions = await generatePlotSuggestions(topic, lang, comicData.panels);
      setComicData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          suggestedOptions: [...(prev.suggestedOptions || []), ...moreOptions]
        };
      });
    } catch (e) {
      console.error("Failed to load more suggestions", e);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-900">
      <HeroHeader lang={lang} setLang={setLang} />

      <main className="container mx-auto px-4">
        
        {/* Input Section - Only show when no story exists yet */}
        {!comicData && appState !== 'loading' && (
           <div className="max-w-xl mx-auto bg-slate-800/50 p-8 rounded-3xl border border-slate-700 shadow-xl backdrop-blur-md animate-fade-in">
             <form onSubmit={handleStartStory} className="space-y-6">
               <div>
                 <label htmlFor="topic" className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                   {t.label}
                 </label>
                 <textarea
                   id="topic"
                   value={topic}
                   onChange={(e) => setTopic(e.target.value)}
                   placeholder={t.placeholder}
                   className="w-full bg-slate-900 border-2 border-slate-700 focus:border-yellow-400 rounded-xl p-4 text-white placeholder-slate-500 min-h-[120px] resize-none focus:ring-0 transition-colors text-lg"
                 />
               </div>
               
               {appState === 'error' && (
                 <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg text-sm">
                   {t.error_generic}
                 </div>
               )}

               <Button 
                 type="submit" 
                 variant="accent" 
                 className="w-full text-lg py-4"
                 disabled={!topic.trim()}
               >
                 {t.btn_create}
               </Button>
             </form>
           </div>
        )}

        {/* Loading Indicator - Blocks everything */}
        {appState === 'loading' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl text-center max-w-sm mx-4">
               <div className="relative w-20 h-20 mx-auto mb-6">
                 <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                 <div className="absolute inset-0 border-t-4 border-yellow-400 rounded-full animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center text-3xl">🍌</div>
               </div>
               <h3 className="text-xl font-bold text-white mb-2 animate-pulse">{statusMessage}</h3>
            </div>
          </div>
        )}

        {/* Comic Display Area */}
        {comicData && (
          <div className="space-y-12">
             <ComicDisplay 
               script={comicData} 
               isFinished={false} 
               lang={lang}
               fullStoryText={fullStoryText}
               onReset={() => {
                 setAppState('idle');
                 setTopic('');
                 setComicData(null);
                 setAllCharacters([]);
                 setNextPlotPoint('');
                 setFullStoryText('');
               }} 
               onShowStory={() => setShowStoryModal(true)}
             />

             {/* Story Modal */}
             {showStoryModal && (
               <StoryModal 
                 title={comicData.title}
                 storyText={fullStoryText}
                 onClose={() => setShowStoryModal(false)}
                 lang={lang}
               />
             )}

             {/* Continue Button Area */}
             <div className="flex flex-col items-center gap-4 pb-12" ref={bottomRef}>
                {appState === 'ready' && (
                  <div className="w-full max-w-3xl bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                    
                    {/* Carousel Suggestions */}
                    {comicData.suggestedOptions && (
                      <div className="mb-6">
                        <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest flex items-center gap-2 px-1">
                           <span className="text-yellow-400">⚡</span> {t.suggestions_label}
                        </p>
                        <div className="flex overflow-x-auto gap-3 pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                          {comicData.suggestedOptions.map((opt, idx) => (
                            <button
                              key={idx}
                              onClick={() => setNextPlotPoint(opt)}
                              className="flex-none snap-center w-52 p-4 bg-slate-700/50 hover:bg-yellow-400 hover:text-slate-900 text-slate-200 rounded-xl border border-slate-600 hover:border-yellow-400 transition-all text-sm group shadow-sm flex flex-col items-center justify-center text-center h-28"
                            >
                              <span className="font-medium">{opt}</span>
                            </button>
                          ))}
                          {/* Load More Button in Carousel */}
                           <button
                              onClick={handleLoadMoreSuggestions}
                              disabled={loadingSuggestions}
                              className="flex-none snap-center w-24 p-4 bg-slate-800 hover:bg-slate-700 text-yellow-400 rounded-xl border-2 border-dashed border-slate-600 hover:border-yellow-400 transition-all text-center flex flex-col items-center justify-center gap-2 group h-28"
                            >
                              {loadingSuggestions ? (
                                <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <>
                                  <span className="text-2xl font-bold group-hover:scale-110 transition-transform">+</span>
                                  <span className="text-xs font-bold uppercase">{t.load_more}</span>
                                </>
                              )}
                            </button>
                        </div>
                      </div>
                    )}

                    <div className="mb-4">
                      <label htmlFor="nextPlot" className="block text-xs font-bold text-yellow-400 mb-2 uppercase tracking-widest">
                        {t.next_plot_label}
                      </label>
                      <textarea
                        id="nextPlot"
                        value={nextPlotPoint}
                        onChange={(e) => setNextPlotPoint(e.target.value)}
                        placeholder={t.next_plot_placeholder}
                        className="w-full bg-slate-900 border border-slate-600 focus:border-yellow-400 rounded-lg p-3 text-white placeholder-slate-500 min-h-[80px] resize-none focus:ring-0 transition-colors text-sm"
                      />
                    </div>
                    <Button 
                      onClick={handleContinueStory}
                      variant="accent"
                      className="w-full text-lg py-3 shadow-yellow-400/20"
                    >
                      {t.btn_continue}
                    </Button>
                  </div>
                )}
             </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;