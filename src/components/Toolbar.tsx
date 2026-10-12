import React from 'react';
import {
  MousePointer,
  Mail,
  Trash2,
  FileText,
  Volume2,
  VolumeX,
  GraduationCap,
  Download,
  Upload,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Play,
  Clock,
  Activity,
  Layers
} from 'lucide-react';
import { soundManager } from '../utils/audio';

export type ActiveTool = 'select' | 'pdu' | 'delete' | 'note';

interface ToolbarProps {
  activeTool: ActiveTool;
  onChangeTool: (tool: ActiveTool) => void;
  isSimulationMode: boolean;
  onToggleSimulationMode: () => void;
  onOpenLabGuide: () => void;
  onSaveTopology: () => void;
  onLoadTopology: () => void;
  onClearCanvas: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  zoomLevel: number;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onChangeTool,
  isSimulationMode,
  onToggleSimulationMode,
  onOpenLabGuide,
  onSaveTopology,
  onLoadTopology,
  onClearCanvas,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  zoomLevel
}) => {
  const [soundOn, setSoundOn] = React.useState(soundManager.isEnabled());

  const toggleSound = () => {
    const next = !soundOn;
    soundManager.setEnabled(next);
    setSoundOn(next);
  };

  return (
    <div className="h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 select-none shrink-0 z-30">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-bold tracking-tight text-slate-100 text-sm">
          <div className="w-6 h-6 rounded bg-sky-500 flex items-center justify-center text-slate-950 font-extrabold text-xs">
            PT
          </div>
          <span className="text-sky-400 font-extrabold">Cisco</span>
          <span>Packet Tracer</span>
        </div>

        {/* Realtime / Simulation Mode Toggle */}
        <div className="ml-4 flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => isSimulationMode && onToggleSimulationMode()}
            className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-all ${
              !isSimulationMode
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Realtime</span>
          </button>
          <button
            onClick={() => !isSimulationMode && onToggleSimulationMode()}
            className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-all ${
              isSimulationMode
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Simulation</span>
          </button>
        </div>
      </div>

      {/* Main Tools Palette */}
      <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
        <button
          onClick={() => onChangeTool('select')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            activeTool === 'select'
              ? 'bg-sky-600 text-white font-medium'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
          title="Select / Move Tool"
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Select</span>
        </button>

        <button
          onClick={() => onChangeTool('pdu')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            activeTool === 'pdu'
              ? 'bg-amber-600 text-white font-medium'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
          title="Add Simple PDU (Ping Envelope) - Click Source then Destination"
        >
          <Mail className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Add PDU</span>
        </button>

        <button
          onClick={() => onChangeTool('delete')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            activeTool === 'delete'
              ? 'bg-red-600 text-white font-medium'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
          title="Delete Device or Cable"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Delete</span>
        </button>

        <button
          onClick={() => onChangeTool('note')}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            activeTool === 'note'
              ? 'bg-sky-600 text-white font-medium'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
          title="Place Canvas Note"
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Place Note</span>
        </button>
      </div>

      {/* Right Actions: Labs, Sound, Canvas Controls */}
      <div className="flex items-center gap-2">
        {/* Guided Labs Button */}
        <button
          onClick={onOpenLabGuide}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <GraduationCap className="w-4 h-4" />
          <span>CCNA Labs</span>
        </button>

        {/* Audio Toggle */}
        <button
          onClick={toggleSound}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          title={soundOn ? 'Sound FX Enabled' : 'Sound FX Muted'}
        >
          {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Zoom controls */}
        <div className="hidden md:flex items-center gap-0.5 bg-slate-950 px-1 py-0.5 rounded border border-slate-800 text-slate-400">
          <button onClick={onZoomOut} className="p-1 hover:text-white" title="Zoom Out">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button onClick={onResetZoom} className="px-1 text-[10px] font-mono hover:text-white" title="Reset Zoom">
            {Math.round(zoomLevel * 100)}%
          </button>
          <button onClick={onZoomIn} className="p-1 hover:text-white" title="Zoom In">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* File Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onSaveTopology}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Export Topology JSON"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onLoadTopology}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Import Topology JSON"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={onClearCanvas}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
            title="Clear Workspace"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
