'use client';

import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Box } from 'lucide-react';
import GlassPanel from '@/components/GlassPanel';
import { EnergyGridState, ModelKey } from '@/types/energy';
import { getModelOption } from '@/utils/mock-energy';

const EnergyGridScene = dynamic(() => import('./EnergyGridScene'), { ssr: false });

const nodes = [
  { id: 'a', x: 24, y: 78, size: 11, color: '#AA337B' },
  { id: 'b', x: 64, y: 70, size: 4, color: '#0A78A7' },
  { id: 'c', x: 123, y: 52, size: 10, color: '#0A78A7' },
  { id: 'd', x: 209, y: 54, size: 8, color: '#2B8EB8' },
  { id: 'e', x: 93, y: 146, size: 8, color: '#D071B8' },
  { id: 'f', x: 121, y: 152, size: 10, color: '#0A78A7' },
  { id: 'g', x: 189, y: 103, size: 9, color: '#2B8EB8' },
  { id: 'h', x: 31, y: 211, size: 10, color: '#AA337B' },
  { id: 'i', x: 188, y: 130, size: 7, color: '#D071B8' },
  { id: 'j', x: 101, y: 118, size: 3, color: '#AA337B' },
  { id: 'k', x: 76, y: 190, size: 4, color: '#0A78A7' },
];

const edges = [
  ['a', 'b'],
  ['b', 'c'],
  ['c', 'd'],
  ['c', 'f'],
  ['f', 'g'],
  ['g', 'd'],
  ['e', 'f'],
  ['e', 'h'],
  ['h', 'k'],
  ['k', 'f'],
  ['j', 'c'],
  ['j', 'e'],
  ['i', 'g'],
];

const nodeById = new Map(nodes.map((node) => [node.id, node]));

export default function EnergyGridPanel({ intensity, model, gridState }: { intensity: number; model: ModelKey; gridState?: EnergyGridState | null }) {
  const modelAccent = getModelOption(model).accent;
  const liveIntensity = gridState?.intensity ?? intensity;
  const animationSpeed = gridState?.animation_speed ?? 1;

  return (
    <GlassPanel>
      <div className="mb-4 flex items-center gap-2 font-display text-sm font-black uppercase text-text-primary">
        <Box className="h-4 w-4 text-accent-blue" />
        3D Energy Grid
      </div>
      <div className="relative h-[305px] overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-br from-cyan-50 via-blue-50 to-pink-50">
        <div className="absolute inset-0">
          <EnergyGridScene intensity={liveIntensity} speed={animationSpeed} model={model} />
        </div>
        <svg className="absolute inset-0 h-full w-full opacity-65 mix-blend-multiply" viewBox="0 0 260 260" role="img" aria-label="Energy grid network">
          <defs>
            <linearGradient id="gridSurface" x1="0" x2="1" y1="0" y2="1">
              <stop stopColor="#E5FBFF" />
              <stop offset="0.52" stopColor="#EAF1FF" />
              <stop offset="1" stopColor="#FBE5F3" />
            </linearGradient>
            <radialGradient id="nodeGlow">
              <stop stopColor="#FFFFFF" stopOpacity="0.8" />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="260" height="260" fill="url(#gridSurface)" />
          <circle cx="200" cy="42" r="62" fill="url(#nodeGlow)" />
          <circle cx="58" cy="222" r="76" fill="url(#nodeGlow)" />
          <g fill="none" strokeLinecap="round">
            {edges.map(([from, to], index) => {
              const start = nodeById.get(from)!;
              const end = nodeById.get(to)!;
              return (
                <motion.line
                  key={`${from}-${to}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={index % 3 === 0 ? modelAccent : '#0A78A7'}
                  strokeWidth={1 + liveIntensity * 1.3}
                  opacity={0.32 + liveIntensity * 0.32}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.7 / animationSpeed, delay: index * 0.04 }}
                />
              );
            })}
          </g>
          <g>
            {nodes.map((node, index) => (
              <motion.circle
                key={node.id}
                cx={node.x}
                cy={node.y}
                r={node.size}
                fill={index % 4 === 0 ? modelAccent : node.color}
                stroke="#FFFFFF"
                strokeWidth="1.5"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1 + liveIntensity * 0.18, 1], opacity: 1 }}
                transition={{ duration: 1.8 / animationSpeed, delay: index * 0.06, repeat: Infinity, repeatDelay: 1.8 / animationSpeed }}
                style={{ transformOrigin: `${node.x}px ${node.y}px` }}
              />
            ))}
          </g>
          <g opacity="0.22">
            <circle cx="226" cy="108" r="1.4" fill="#0A78A7" />
            <circle cx="233" cy="154" r="1.2" fill="#AA337B" />
            <circle cx="205" cy="188" r="1.1" fill="#7B55AD" />
          </g>
        </svg>
      </div>
    </GlassPanel>
  );
}
