'use client';

import React, { useState } from 'react';
import {
  Video,
  Maximize2,
  Minimize2,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

export const JAAS_APP_ID = 'vpaas-magic-cookie-5dc850726ccf476a905edde954688ad6';
export const JAAS_DOMAIN = '8x8.vc';

interface JitsiMeetFrameProps {
  roomName: string;
  displayName: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCallStateChange?: (isActive: boolean) => void;
}

export default function JitsiMeetFrame({
  roomName,
  displayName,
  isExpanded,
  onToggleExpand,
}: JitsiMeetFrameProps) {
  const [iframeKey, setIframeKey] = useState(0);

  // Direct 8x8 JaaS Embed URL
  const jaasUrl = `https://${JAAS_DOMAIN}/${JAAS_APP_ID}/${roomName}`;

  const reloadIframe = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md transition-all duration-300 flex flex-col ${
        isExpanded ? 'h-[620px]' : 'h-[500px]'
      }`}
    >
      {/* Top Header Control Bar */}
      <div className="px-3.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300 shrink-0">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Layar Video Resmi (8x8 JaaS) • Terkunci di Halaman
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reloadIframe}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-md transition text-[11px] flex items-center gap-1"
            title="Muat ulang layar video"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={onToggleExpand}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-md transition"
            title={isExpanded ? 'Perkecil Video' : 'Perbesar Video'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Direct 8x8 JaaS Iframe Area */}
      <div className="relative flex-1 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
        <iframe
          key={iframeKey}
          src={jaasUrl}
          allow="camera *; microphone *; display-capture *; autoplay *; clipboard-write *; fullscreen *"
          className="w-full h-full border-0 bg-slate-950"
          title="8x8 JaaS Official Video Conference"
        />
      </div>

      {/* Bottom Status & Info Bar */}
      <div className="px-3.5 py-1.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <span>Penguji: {displayName || 'Penguji Al-Qur’aniyyah'}</span>
        <span className="text-emerald-400 font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Kamera & Audio Terintegrasi
        </span>
      </div>
    </div>
  );
}
