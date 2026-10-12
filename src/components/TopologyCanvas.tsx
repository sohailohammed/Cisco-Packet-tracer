import React, { useState, useRef, useEffect } from 'react';
import {
  NetworkDevice,
  NetworkCable,
  SimulationEvent,
  CanvasNote,
  CableType
} from '../types/network';
import { ActiveTool } from './Toolbar';
import { DeviceIcon } from './DeviceIcons';
import { soundManager } from '../utils/audio';
import { Mail, CheckCircle2, XCircle, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Crosshair, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface TopologyCanvasProps {
  devices: NetworkDevice[];
  cables: NetworkCable[];
  notes: CanvasNote[];
  activeTool: ActiveTool;
  selectedCableType: CableType | null;
  selectedDeviceId: string | null;
  pduSourceDeviceId: string | null;
  currentSimulationEvent: SimulationEvent | null;
  zoomLevel: number;
  onZoomChange?: (newZoom: number) => void;
  onSelectDevice: (deviceId: string | null) => void;
  onMoveDevice: (deviceId: string, x: number, y: number) => void;
  onOpenDeviceModal: (device: NetworkDevice) => void;
  onDeleteDevice: (deviceId: string) => void;
  onDeleteCable: (cableId: string) => void;
  onDeviceClickForCable: (device: NetworkDevice) => void;
  onDeviceClickForPdu: (device: NetworkDevice) => void;
  onAddNote: (x: number, y: number) => void;
  onUpdateNote: (id: string, text: string) => void;
  onDeleteNote: (id: string) => void;
  onSelectEventForInspect: (event: SimulationEvent) => void;
}

export const TopologyCanvas: React.FC<TopologyCanvasProps> = ({
  devices,
  cables,
  notes,
  activeTool,
  selectedCableType,
  selectedDeviceId,
  pduSourceDeviceId,
  currentSimulationEvent,
  zoomLevel,
  onZoomChange,
  onSelectDevice,
  onMoveDevice,
  onOpenDeviceModal,
  onDeleteDevice,
  onDeleteCable,
  onDeviceClickForCable,
  onDeviceClickForPdu,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onSelectEventForInspect
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Dragging state for devices
  const [draggingDeviceId, setDraggingDeviceId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Pan state for the canvas
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse wheel and trackpad smooth scrolling/panning
  const handleWheel = (e: React.WheelEvent) => {
    // If holding Ctrl or Cmd: zoom in/out smoothly
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      const nextZoom = Math.min(2.5, Math.max(0.4, parseFloat((zoomLevel + delta).toFixed(2))));
      onZoomChange?.(nextZoom);
    } else {
      // Natural 2-finger trackpad or wheel scrolling in any direction
      setPan(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  };

  // Auto-center devices on initial mount so PC0 and PC1 are immediately visible
  useEffect(() => {
    const timer = setTimeout(() => {
      handleCenterView();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handlePan = (dx: number, dy: number) => {
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handleCenterView = () => {
    if (devices.length === 0) {
      setPan({ x: 0, y: 0 });
      onZoomChange?.(1);
      return;
    }
    const xs = devices.map(d => d.x);
    const ys = devices.map(d => d.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;
      setPan({
        x: rect.width / 2 - midX * zoomLevel,
        y: rect.height / 2 - midY * zoomLevel
      });
      onZoomChange?.(1);
    }
  };

  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    // If clicking on canvas background or SVG canvas
    const target = e.target as HTMLElement;
    if (
      target === containerRef.current ||
      target.tagName === 'svg' ||
      target.tagName === 'line' ||
      target.tagName === 'defs' ||
      target.classList.contains('canvas-bg')
    ) {
      if (activeTool === 'note') {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const x = (e.clientX - rect.left - pan.x) / zoomLevel;
          const y = (e.clientY - rect.top - pan.y) / zoomLevel;
          onAddNote(x, y);
        }
        return;
      }

      onSelectDevice(null);
      // Initiate canvas panning
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (draggingDeviceId) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const newX = Math.round((e.clientX - rect.left - pan.x) / zoomLevel - dragOffset.x);
      const newY = Math.round((e.clientY - rect.top - pan.y) / zoomLevel - dragOffset.y);
      onMoveDevice(draggingDeviceId, Math.max(40, newX), Math.max(40, newY));
    }
  };

  const handleMouseUp = () => {
    setDraggingDeviceId(null);
    setIsPanning(false);
  };

  // Device interaction handler
  const handleDeviceMouseDown = (e: React.MouseEvent, dev: NetworkDevice) => {
    e.stopPropagation();

    if (activeTool === 'delete') {
      onDeleteDevice(dev.id);
      soundManager.playPingFail();
      return;
    }

    if (activeTool === 'pdu') {
      onDeviceClickForPdu(dev);
      return;
    }

    if (selectedCableType) {
      onDeviceClickForCable(dev);
      return;
    }

    // Default select & start drag
    onSelectDevice(dev.id);
    setDraggingDeviceId(dev.id);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = (e.clientX - rect.left - pan.x) / zoomLevel;
      const mouseY = (e.clientY - rect.top - pan.y) / zoomLevel;
      setDragOffset({
        x: mouseX - dev.x,
        y: mouseY - dev.y
      });
    }
  };

  // Determine flying packet coordinate
  let pduCoords: { x: number; y: number } | null = null;
  if (currentSimulationEvent) {
    const curDev = devices.find(d => d.id === currentSimulationEvent.currentDeviceId);
    const nextDev = currentSimulationEvent.nextDeviceId
      ? devices.find(d => d.id === currentSimulationEvent.nextDeviceId)
      : null;

    if (curDev && nextDev) {
      // Midpoint between current and next hop
      pduCoords = {
        x: (curDev.x + nextDev.x) / 2,
        y: (curDev.y + nextDev.y) / 2
      };
    } else if (curDev) {
      pduCoords = { x: curDev.x, y: curDev.y - 20 };
    }
  }

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDownCanvas}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`flex-1 relative overflow-hidden bg-slate-950 select-none ${
        activeTool === 'delete'
          ? 'cursor-not-allowed'
          : activeTool === 'pdu'
            ? 'cursor-crosshair'
            : selectedCableType
              ? 'cursor-cell'
              : isPanning
                ? 'cursor-grabbing'
                : 'cursor-default'
      }`}
      style={{
        backgroundImage: `radial-gradient(rgba(148, 163, 184, 0.12) 1.5px, transparent 1.5px)`,
        backgroundSize: '24px 24px'
      }}
    >
      {/* Transformable Canvas Layer */}
      <div
        className="absolute inset-0 origin-top-left transition-transform duration-75"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`
        }}
      >
        {/* SVG Cable Lines Layer */}
        <svg className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
            </marker>
          </defs>

          {cables.map(cable => {
            const dev1 = devices.find(d => d.id === cable.device1Id);
            const dev2 = devices.find(d => d.id === cable.device2Id);
            if (!dev1 || !dev2) return null;

            const isSerial = cable.type === 'serial';
            const isConsole = cable.type === 'console';
            const isCrossover = cable.type === 'crossover';

            const strokeColor = isSerial
              ? '#ef4444'
              : isConsole
                ? '#a855f7'
                : isCrossover
                  ? '#f97316'
                  : '#38bdf8';

            const strokeDash = isCrossover ? '6 4' : 'none';

            // Coordinates
            const x1 = dev1.x;
            const y1 = dev1.y;
            const x2 = dev2.x;
            const y2 = dev2.y;

            // Link LED positions (offset 24px from devices)
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const led1X = x1 + Math.cos(angle) * 28;
            const led1Y = y1 + Math.sin(angle) * 28;
            const led2X = x2 - Math.cos(angle) * 28;
            const led2Y = y2 - Math.sin(angle) * 28;

            const intf1 = dev1.interfaces.find(i => i.id === cable.interface1Id);
            const intf2 = dev2.interfaces.find(i => i.id === cable.interface2Id);
            const linkUp = dev1.power && dev2.power && (intf1?.isUp ?? true) && (intf2?.isUp ?? true);

            return (
              <g key={cable.id} className="pointer-events-auto cursor-pointer">
                {/* Invisible wider hit line for easier deletion/selection */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth="14"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeTool === 'delete') {
                      onDeleteCable(cable.id);
                      soundManager.playPingFail();
                    }
                  }}
                />

                {/* Visible Cable Wire */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={strokeColor}
                  strokeWidth="2.5"
                  strokeDasharray={strokeDash}
                  className="transition-all hover:stroke-amber-400"
                />

                {/* Link LED 1 */}
                <circle
                  cx={led1X}
                  cy={led1Y}
                  r="4"
                  fill={linkUp ? '#4ade80' : '#ef4444'}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                  className={linkUp ? 'animate-pulse' : ''}
                />
                {/* Interface Port Label 1 */}
                <text
                  x={led1X}
                  y={led1Y - 6}
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                  className="select-none pointer-events-none"
                >
                  {intf1?.shortName || cable.interface1Id}
                </text>

                {/* Link LED 2 */}
                <circle
                  cx={led2X}
                  cy={led2Y}
                  r="4"
                  fill={linkUp ? '#4ade80' : '#ef4444'}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                  className={linkUp ? 'animate-pulse' : ''}
                />
                {/* Interface Port Label 2 */}
                <text
                  x={led2X}
                  y={led2Y - 6}
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                  className="select-none pointer-events-none"
                >
                  {intf2?.shortName || cable.interface2Id}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Flying Simulation PDU Packet */}
        {currentSimulationEvent && pduCoords && (() => {
          const proto = currentSimulationEvent.protocol;
          const protoColor = 
            proto === 'ICMP' ? 'bg-emerald-500 border-emerald-300 text-emerald-300 shadow-emerald-500/50' :
            proto === 'ARP' ? 'bg-amber-500 border-amber-300 text-amber-300 shadow-amber-500/50' :
            proto === 'DHCP' ? 'bg-purple-600 border-purple-300 text-purple-300 shadow-purple-600/50' :
            proto === 'DNS' ? 'bg-cyan-500 border-cyan-300 text-cyan-300 shadow-cyan-500/50' :
            proto === 'HTTP' ? 'bg-blue-600 border-blue-300 text-blue-300 shadow-blue-600/50' :
            'bg-fuchsia-600 border-fuchsia-300 text-fuchsia-300 shadow-fuchsia-600/50';

          return (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelectEventForInspect(currentSimulationEvent);
              }}
              className="absolute z-20 cursor-pointer -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group transition-all duration-300"
              style={{ left: pduCoords.x, top: pduCoords.y }}
            >
              <div className={`w-7 h-5 rounded border shadow-lg flex items-center justify-center text-slate-950 animate-bounce ${protoColor}`}>
                <Mail className="w-3.5 h-3.5 fill-current" />
              </div>
              <div className="mt-1 px-1.5 py-0.2 rounded bg-slate-950/95 border border-slate-700 text-[9px] font-mono font-bold text-slate-200 shadow-md">
                {proto}
              </div>
            </div>
          );
        })()}

        {/* Notes Layer */}
        {notes.map(note => (
          <div
            key={note.id}
            className="absolute z-10 bg-amber-200 text-slate-900 border border-amber-400 rounded shadow-md p-2 w-48 text-xs font-mono"
            style={{ left: note.x, top: note.y }}
          >
            <div className="flex justify-between items-center mb-1 text-[10px] text-amber-800 border-b border-amber-300 pb-0.5">
              <span>Note</span>
              <button
                onClick={() => onDeleteNote(note.id)}
                className="hover:text-red-700 font-bold"
              >
                &times;
              </button>
            </div>
            <textarea
              value={note.text}
              onChange={(e) => onUpdateNote(note.id, e.target.value)}
              className="w-full bg-transparent resize-none outline-none text-slate-900 text-xs font-mono"
              rows={2}
            />
          </div>
        ))}

        {/* Network Devices Layer */}
        {devices.map(dev => {
          const isSelected = selectedDeviceId === dev.id;
          const isPduSource = pduSourceDeviceId === dev.id;
          const primaryIntf = dev.interfaces.find(i => i.ipAddress) || dev.interfaces[0];

          return (
            <div
              key={dev.id}
              onMouseDown={(e) => handleDeviceMouseDown(e, dev)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onOpenDeviceModal(dev);
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group transition-shadow ${
                isSelected
                  ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-950 rounded-xl'
                  : isPduSource
                    ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 rounded-xl animate-pulse'
                    : 'hover:brightness-110'
              }`}
              style={{ left: dev.x, top: dev.y }}
            >
              {/* Device Graphic Container */}
              <div className="relative p-1">
                <DeviceIcon type={dev.type} size={48} />
                
                {/* Power LED badge */}
                <span
                  className={`absolute top-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-950 ${
                    dev.power ? 'bg-emerald-400' : 'bg-red-500'
                  }`}
                  title={dev.power ? 'Device ON' : 'Device OFF'}
                />

                {/* Envelope badge if PDU source */}
                {isPduSource && (
                  <div className="absolute -top-3 -right-3 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-slate-950">
                    <Mail className="w-3 h-3 fill-current" />
                  </div>
                )}
              </div>

              {/* Hostname & Model Label */}
              <div className="mt-1 text-center select-none pointer-events-none">
                <div className="text-xs font-semibold text-slate-200 tracking-wide">
                  {dev.name}
                </div>
                {primaryIntf?.ipAddress && (
                  <div className="text-[10px] font-mono text-sky-400 leading-none mt-0.5">
                    {primaryIntf.ipAddress}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Toolbar Guidance Callout */}
      {selectedCableType && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-sky-950/90 border border-sky-400 text-sky-200 px-4 py-2 rounded-lg text-xs shadow-xl flex items-center gap-2">
          <span>Click on source device, then click destination device to connect cable.</span>
        </div>
      )}

      {activeTool === 'pdu' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-950/90 border border-amber-400 text-amber-200 px-4 py-2 rounded-lg text-xs shadow-xl flex items-center gap-2">
          <Mail className="w-4 h-4 text-amber-400" />
          <span>
            {pduSourceDeviceId
              ? 'Click Destination Device to send ICMP Echo Request ping!'
              : 'Click Source Device to attach Simple PDU ping envelope.'}
          </span>
        </div>
      )}

      {/* Floating Canvas Navigation & Scroll Controls (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2 pointer-events-auto">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-1.5 shadow-xl flex flex-col items-center gap-1 select-none text-xs">
          {/* Pan Directional D-Pad */}
          <div className="grid grid-cols-3 gap-1 w-20">
            <div />
            <button
              onClick={() => handlePan(0, 100)}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              title="Pan Up"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <div />

            <button
              onClick={() => handlePan(100, 0)}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              title="Pan Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCenterView}
              className="p-1 rounded bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center transition-colors"
              title="Center & Fit View"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handlePan(-100, 0)}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              title="Pan Right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <div />
            <button
              onClick={() => handlePan(0, -100)}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              title="Pan Down"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <div />
          </div>

          <div className="h-px bg-slate-800 w-full my-0.5" />

          {/* Quick Zoom buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onZoomChange?.(Math.max(0.4, parseFloat((zoomLevel - 0.1).toFixed(2))))}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 px-1">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => onZoomChange?.(Math.min(2.5, parseFloat((zoomLevel + 0.1).toFixed(2))))}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="px-2 py-1 rounded bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400 font-mono flex items-center gap-1.5 shadow-md">
          <Move className="w-3 h-3 text-sky-400" />
          <span>Scroll trackpad / wheel to pan</span>
        </div>
      </div>
    </div>
  );
};
