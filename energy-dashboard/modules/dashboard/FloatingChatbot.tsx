'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import dynamic from 'next/dynamic';

const AiAssistantPanel = dynamic(() => import('@/modules/dashboard/AiAssistantPanel'), {
  ssr: false,
  loading: () => (
    <div className="glass-panel flex h-72 w-[340px] flex-col items-center justify-center gap-4 rounded-xl">

      {/* Energy pulse rings */}
      <div className="relative flex items-center justify-center">
        <span className="absolute h-16 w-16 animate-ping rounded-full bg-accent-magenta/40"></span>
        <span className="absolute h-12 w-12 animate-ping rounded-full bg-accent-blue/40 delay-200"></span>
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent-magenta to-accent-blue shadow-lg">
          ⚡
        </span>
      </div>

      {/* Text */}
      <p className="text-sm text-text-secondary animate-pulse">
          Charging AI Assistant...
      </p>
    </div>
  ),
});

export default function FloatingChatbot() {
  const [open, setOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<1 | 2 | 3>(2);
  const [initialRange, setInitialRange] = useState<{ start_time: string; end_time: string } | null>(null);

  useEffect(() => {
    const handleRangeSelected = (event: Event) => {
      const detail = (event as CustomEvent<{ start_time: string; end_time: string }>).detail;
      if (detail?.start_time && detail?.end_time) {
        setInitialRange({ start_time: detail.start_time, end_time: detail.end_time });
      }
      setInitialMode(3);
      setOpen(true);
    };

    window.addEventListener('rangeSelected', handleRangeSelected);
    return () => window.removeEventListener('rangeSelected', handleRangeSelected);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            className="mb-4 w-[min(480px,calc(100vw-3rem))] max-h-[80vh] overflow-hidden rounded-xl"
            initial={{ opacity: 0, y: 22, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.94 }}
          >
            {/* Scrollable container */}
            <div className="h-full max-h-[80vh] overflow-y-auto">
              <AiAssistantPanel compact initialMode={initialMode} initialRange={initialRange} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-16 w-16 items-center justify-center rounded-full border border-white/60 bg-white/55 text-accent-magenta shadow-adani-glow backdrop-blur-xl"
        animate={{
          boxShadow: [
            '0 0 0 0 rgba(170,51,123,0.28)',
            '0 0 0 18px rgba(170,51,123,0)',
            '0 0 0 0 rgba(170,51,123,0)',
          ],
        }}
        transition={{ duration: 2.2, repeat: Infinity }}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
      >
        {open ? <X className="h-7 w-7" /> : <MessageCircle className="h-7 w-7" />}
      </motion.button>
    </div>
  );
}
