import React, { useState } from 'react';
import { DeviceType, CableType } from '../types/network';
import { DeviceIcon } from './DeviceIcons';
import {
  Router,
  Network,
  Monitor,
  Zap,
  Cable,
  Server,
  Layers,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface DeviceDrawerProps {
  onAddDevice: (type: DeviceType) => void;
  selectedCableType: CableType | null;
  onSelectCableType: (cable: CableType | null) => void;
}

type DrawerCategory = 'routers' | 'switches' | 'end-devices' | 'cables';

export const DeviceDrawer: React.FC<DeviceDrawerProps> = ({
  onAddDevice,
  selectedCableType,
  onSelectCableType
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<DrawerCategory>('routers');

  const routerItems: { type: DeviceType; label: string; model: string }[] = [
    { type: 'router-2911', label: '2911', model: 'Cisco 2911 ISR' },
    { type: 'router-2901', label: '2901', model: 'Cisco 2901 ISR' }
  ];

  const switchItems: { type: DeviceType; label: string; model: string }[] = [
    { type: 'switch-2960', label: '2960-24TT', model: 'Catalyst 2960 Switch' },
    { type: 'switch-3560', label: '3560-24PS', model: 'Catalyst 3560 L3 Switch' }
  ];

  const endDeviceItems: { type: DeviceType; label: string; model: string }[] = [
    { type: 'pc', label: 'PC-PT', model: 'Standard Desktop PC' },
    { type: 'laptop', label: 'Laptop-PT', model: 'Enterprise Laptop' },
    { type: 'server', label: 'Server-PT', model: 'General Server' },
    { type: 'web-server', label: 'Web / DNS Server', model: 'HTTP & DNS Server' }
  ];

  const cableItems: { type: CableType; label: string; description: string; color: string; dash?: boolean }[] = [
    { type: 'auto', label: 'Automatically Choose', description: 'Auto-select cable & ports', color: '#eab308' },
    { type: 'straight-through', label: 'Copper Straight-Through', description: 'PC to Switch, Switch to Router', color: '#38bdf8' },
    { type: 'crossover', label: 'Copper Cross-Over', description: 'PC to PC, Switch to Switch', color: '#f97316', dash: true },
    { type: 'serial', label: 'Serial DCE / DTE', description: 'Router to Router WAN link', color: '#ef4444' },
    { type: 'console', label: 'Console Cable', description: 'PC RS-232 to Router Console', color: '#a855f7' }
  ];

  if (isCollapsed) {
    return (
      <div className="h-7 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-3 select-none shrink-0 z-30 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold text-slate-300">Device Shelf</span>
          <span className="text-[10px] text-slate-500 font-mono">
            {selectedCableType ? `Active Cable: ${selectedCableType}` : 'Collapsed for max canvas workspace'}
          </span>
        </div>
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 py-0.5 px-2 rounded hover:bg-slate-900 transition-colors cursor-pointer font-medium"
        >
          <span>Expand Shelf</span>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="h-24 bg-slate-950 border-t border-slate-800 flex items-stretch select-none shrink-0 z-30 relative">
      {/* Collapse button header top-right */}
      <button
        onClick={() => setIsCollapsed(true)}
        className="absolute top-1.5 right-2 z-20 flex items-center gap-0.5 text-[10px] text-slate-500 hover:text-slate-300 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800 transition-colors cursor-pointer"
        title="Collapse shelf to increase canvas view"
      >
        <span>Hide</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {/* Category Icons Left Shelf */}
      <div className="flex bg-slate-900 border-r border-slate-800 p-1.5 gap-1">
        <button
          onClick={() => setActiveCategory('routers')}
          title="Network Devices: Routers"
          className={`flex flex-col items-center justify-center w-14 rounded transition-all ${
            activeCategory === 'routers'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Router className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium">Routers</span>
        </button>

        <button
          onClick={() => setActiveCategory('switches')}
          title="Network Devices: Switches"
          className={`flex flex-col items-center justify-center w-14 rounded transition-all ${
            activeCategory === 'switches'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Network className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium">Switches</span>
        </button>

        <button
          onClick={() => setActiveCategory('end-devices')}
          title="End Devices"
          className={`flex flex-col items-center justify-center w-14 rounded transition-all ${
            activeCategory === 'end-devices'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Monitor className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium">End Devices</span>
        </button>

        <button
          onClick={() => setActiveCategory('cables')}
          title="Connections & Cables"
          className={`flex flex-col items-center justify-center w-14 rounded transition-all ${
            activeCategory === 'cables'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Zap className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium">Cables</span>
        </button>
      </div>

      {/* Item Palette Area */}
      <div className="flex-1 p-2 flex items-center gap-3 overflow-x-auto bg-slate-950">
        {/* Routers */}
        {activeCategory === 'routers' &&
          routerItems.map(item => (
            <button
              key={item.type}
              onClick={() => onAddDevice(item.type)}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/80 transition-all text-slate-200 group min-w-[90px] h-[72px] cursor-pointer"
            >
              <DeviceIcon type={item.type} size={36} className="group-hover:scale-105 transition-transform" />
              <span className="text-[11px] font-mono mt-1 text-slate-300 group-hover:text-sky-300 font-medium">
                {item.label}
              </span>
            </button>
          ))}

        {/* Switches */}
        {activeCategory === 'switches' &&
          switchItems.map(item => (
            <button
              key={item.type}
              onClick={() => onAddDevice(item.type)}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-teal-500/80 transition-all text-slate-200 group min-w-[96px] h-[72px] cursor-pointer"
            >
              <DeviceIcon type={item.type} size={36} className="group-hover:scale-105 transition-transform" />
              <span className="text-[11px] font-mono mt-1 text-slate-300 group-hover:text-teal-300 font-medium">
                {item.label}
              </span>
            </button>
          ))}

        {/* End Devices */}
        {activeCategory === 'end-devices' &&
          endDeviceItems.map(item => (
            <button
              key={item.type}
              onClick={() => onAddDevice(item.type)}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/80 transition-all text-slate-200 group min-w-[96px] h-[72px] cursor-pointer"
            >
              <DeviceIcon type={item.type} size={36} className="group-hover:scale-105 transition-transform" />
              <span className="text-[11px] font-sans mt-1 text-slate-300 group-hover:text-sky-300 font-medium truncate max-w-[90px]">
                {item.label}
              </span>
            </button>
          ))}

        {/* Cables */}
        {activeCategory === 'cables' &&
          cableItems.map(cable => {
            const isSelected = selectedCableType === cable.type;

            return (
              <button
                key={cable.type}
                onClick={() => onSelectCableType(isSelected ? null : cable.type)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all min-w-[120px] h-[72px] cursor-pointer ${
                  isSelected
                    ? 'bg-sky-950/80 border-sky-400 text-white shadow-md'
                    : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="w-10 h-4 flex items-center justify-center mb-1">
                  {cable.type === 'auto' ? (
                    <Zap className="w-5 h-5 text-amber-400" />
                  ) : (
                    <div
                      className="w-8 h-1 rounded"
                      style={{
                        backgroundColor: cable.color,
                        borderStyle: cable.dash ? 'dashed' : 'solid'
                      }}
                    />
                  )}
                </div>
                <span className="text-[11px] font-medium text-center truncate max-w-[110px]">
                  {cable.label}
                </span>
                <span className="text-[9px] text-slate-500 truncate max-w-[110px]">
                  {isSelected ? 'Active Tool' : 'Click to wire'}
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
};
