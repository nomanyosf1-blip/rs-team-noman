import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface Sector {
  id: string;
  name: string;
  emoji: string;
}

interface DiscordPreviewProps {
  panelName: string;
  message: string;
  sectors: Sector[];
  logoUrl?: string;
  bannerUrl?: string;
}

export default function DiscordPreview({ panelName, message, sectors, logoUrl, bannerUrl }: DiscordPreviewProps) {
  return (
    <div className="bg-[#313338] rounded-2xl p-6 font-sans text-left max-w-2xl mx-auto shadow-2xl" dir="ltr">
      <div className="flex items-start gap-4">
        {/* Discord Bot Avatar */}
        <div className="w-10 h-10 rounded-full bg-[#5865f2] flex items-center justify-center shrink-0 shadow-lg">
           <svg width="24" height="24" viewBox="0 0 127.14 96.36" fill="white">
             <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.06,72.06,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.71,32.65-1.82,56.6.4,80.21a105.73,105.73,0,0,0,32.06,16.15c2.53-3.45,4.76-7.1,6.69-10.93a71.21,71.21,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a71.69,71.69,0,0,1-10.87,5.19,77,77,0,0,0,6.71,10.94,105.07,105.07,0,0,0,32.07-16.14C129.58,52.84,124.92,28.93,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.07,65.69,84.69,65.69Z"/>
           </svg>
        </div>

        <div className="flex-1">
          {/* Message Header */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-white font-semibold text-[15px] hover:underline cursor-pointer">Tickets v2</span>
            <span className="bg-[#5865F2] text-white text-[9px] px-1 rounded-[3px] font-bold py-0.5 flex items-center gap-0.5">
              <CheckCircle2 size={9} fill="white" className="text-[#5865F2]" />
              APP
            </span>
            <span className="text-[#949BA4] text-[11px] ml-1">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {/* Embed Layout */}
          <div className="relative mt-1 max-w-[500px]">
            {/* Embed Color Border */}
            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#c5a059] rounded-l-[4px]" />
            
            <div className="bg-[#2B2D31] rounded-r-[4px] p-4 flex flex-col gap-3 relative shadow-lg">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  {/* Embed Title */}
                  <h3 className="text-white font-bold text-[18px] mb-2 text-right break-words pr-2" dir="rtl">{panelName || 'لوحة الدعم الأساسية'}</h3>
                  
                  {/* Embed Description */}
                  <div className="text-[#DBDEE1] text-[14px] font-medium text-right leading-[1.6]" dir="rtl">
                    <ul className="space-y-4 list-none p-0 pr-2">
                       {(message || 'يرجى اختيار القسم المناسب لمشكلتك من الأزرار أدناه.').split('\n').filter(l => l.trim()).map((line, i) => (
                         <li key={i} className="flex items-center gap-3 justify-start flex-row-reverse">
                           <span className="w-1.5 h-1.5 bg-white rounded-full shrink-0 shadow-[0_0_5px_rgba(255,255,255,0.5)]" />
                           <span className="break-words flex-1 text-right">{line}</span>
                         </li>
                       ))}
                    </ul>
                  </div>
                </div>

                {/* Thumbnail Image */}
                <div className="w-24 h-24 shrink-0 bg-white/5 rounded-full flex items-center justify-center overflow-hidden border border-white/10 shadow-2xl">
                  <img 
                    src={logoUrl || "https://f.top4top.io/p_3767z53v0.png"} 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                    key={logoUrl}
                  />
                </div>
              </div>

              {/* Large Image (Banner) */}
              <div className="mt-3 rounded-lg overflow-hidden border border-white/10 shadow-2xl w-full">
                <img 
                  src={bannerUrl || "https://g.top4top.io/p_3767w8f71.png"} 
                  alt="Embed Banner" 
                  className="w-full h-auto block min-h-[50px]"
                  referrerPolicy="no-referrer"
                  key={bannerUrl}
                />
              </div>
            </div>
          </div>

          {/* Buttons Section */}
          {sectors.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {sectors.map((sector) => (
                <button
                  key={sector.id}
                  className="bg-[#4f545c] hover:bg-[#5d6269] text-white px-3 py-1.5 rounded-[3px] text-sm font-medium flex items-center gap-2 transition-colors active:scale-95"
                >
                  <span className="text-base">{sector.emoji}</span>
                  <span>{sector.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
