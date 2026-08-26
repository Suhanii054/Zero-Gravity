'use client';

import { motion } from 'framer-motion';

const nodes = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  left: `${8 + ((index * 23) % 88)}%`,
  top: `${9 + ((index * 31) % 78)}%`,
  delay: index * 0.18,
}));

export default function AnimatedEnergyBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 energy-grid-bg opacity-90" />
      <div className="absolute inset-0 adani-ambient" />
      <motion.div
        className="absolute inset-x-0 top-1/4 h-px bg-gradient-to-r from-transparent via-accent-blue/50 to-transparent"
        animate={{ x: ['-30%', '30%'], opacity: [0.2, 0.8, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-y-0 left-1/3 w-px bg-gradient-to-b from-transparent via-accent-magenta/40 to-transparent"
        animate={{ y: ['-18%', '18%'], opacity: [0.2, 0.7, 0.2] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {nodes.map((node) => (
        <motion.span
          key={node.id}
          className="absolute h-1.5 w-1.5 rounded-full bg-accent-blue shadow-[0_0_20px_rgba(71,100,183,0.88)]"
          style={{ left: node.left, top: node.top }}
          animate={{ scale: [0.8, 1.8, 0.8], opacity: [0.25, 0.95, 0.25] }}
          transition={{ duration: 2.8, delay: node.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <div className="absolute inset-0 scanline" />
    </div>
  );
}
