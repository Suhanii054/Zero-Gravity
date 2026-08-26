'use client';

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Box,
  FileText,
  Gauge,
  GitBranch,
  Home,
  LineChart,
  Menu,
  Settings,
  Sparkles,
  Wand2,
} from 'lucide-react';
import AdaniWordmark from '@/components/AdaniWordmark';

const items = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'forecast', label: 'Forecast', icon: LineChart },
  { id: 'lag-map', label: 'Lag Influence Map', icon: GitBranch },
  { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
  { id: 'interpretability', label: 'Interpretability', icon: Sparkles },
  { id: 'grid', label: '3D Grid', icon: Box },
  { id: 'metrics', label: 'Metrics', icon: Gauge },
  { id: 'what-if', label: 'What-if Simulation', icon: Wand2 },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function DashboardSidebar({
  collapsed,
  active,
  onToggle,
  onSelect,
}: {
  collapsed: boolean;
  active: string;
  onToggle: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <motion.aside
      className="fixed left-0 top-0 z-30 hidden h-screen overflow-hidden border-r border-slate-200/80 bg-white/80 px-3 py-5 shadow-card backdrop-blur-2xl lg:flex lg:flex-col"
      animate={{ width: collapsed ? 84 : 260 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
    >
      <div className="mb-7 flex items-center justify-between gap-3">
        {!collapsed && <AdaniWordmark className="text-[2.1rem]" />}
        <button
          type="button"
          onClick={onToggle}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-text-secondary transition hover:border-accent-blue/40 hover:text-accent-blue"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`group flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left transition ${
                isActive
                  ? 'bg-adani-spectrum text-white shadow-adani-glow'
                  : 'text-text-secondary hover:bg-slate-100 hover:text-text-primary'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate text-sm font-bold">{item.label}</span>}
            </button>
          );
        })}
      </nav>
      {!collapsed && (
        <div className="mt-4 rounded-lg border border-accent-blue/20 bg-gradient-to-br from-cyan-50 to-pink-50 p-3 text-xs leading-5 text-text-secondary">
          Live dataset and LightGBM endpoints are routed through FastAPI.
        </div>
      )}
    </motion.aside>
  );
}
