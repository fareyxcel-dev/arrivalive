 import { useState, useEffect } from 'react';
 
 // Preload all fonts on app initialization for instant preview
 export const usePreloadedFonts = (fonts: string[]) => {
   const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
   const [isLoading, setIsLoading] = useState(true);
 
   useEffect(() => {
     const loadFont = async (fontName: string) => {
       const fontUrl = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700&display=swap`;
       
       // Create preload link
       const preloadLink = document.createElement('link');
       preloadLink.rel = 'preload';
       preloadLink.as = 'style';
       preloadLink.href = fontUrl;
       document.head.appendChild(preloadLink);
 
       // Create stylesheet link
       const linkId = `font-preload-${fontName.replace(/\s+/g, '-')}`;
       if (!document.getElementById(linkId)) {
         const link = document.createElement('link');
         link.id = linkId;
         link.rel = 'stylesheet';
         link.href = fontUrl;
         document.head.appendChild(link);
       }
       
       try {
         await document.fonts.load(`16px "${fontName}"`);
         setLoadedFonts((prev) => new Set(prev).add(fontName));
       } catch (error) {
         console.warn(`Failed to load font: ${fontName}`);
       }
     };
 
     // Load fonts in batches to avoid overwhelming the browser
     const loadFontsInBatches = async () => {
       const batchSize = 10;
       for (let i = 0; i < fonts.length; i += batchSize) {
         const batch = fonts.slice(i, i + batchSize);
         await Promise.all(batch.map(loadFont));
       }
       setIsLoading(false);
     };
 
     loadFontsInBatches();
   }, [fonts]);
 
   return { loadedFonts, isLoading };
 };
 
 export default usePreloadedFonts;