import React, { useState } from 'react';
import { SimulationEvent, NetworkDevice, ProtocolType } from '../types/network';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  Cpu,
  ArrowRightLeft
} from 'lucide-react';

interface SimulationPanelProps {
  events: SimulationEvent[];
  currentEventIndex: number;
  isPlaying: boolean;
  simulationSpeed: number; // e.g. 1
  devices: NetworkDevice[];
  onPlayPause: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onReset: () => void;
  onChangeSpeed: (speed: number) => void;
  onSelectEvent: (event: SimulationEvent) => void;
}

export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  events,
  currentEventIndex,
  isPlaying,
  simulationSpeed,
  devices,
  onPlayPause,
  onStepForward,
  onStepBackward,
  onReset,
  onChangeSpeed,
  onSelectEvent
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [protocolFilters, setProtocolFilters] = useState<Record<ProtocolType, boolean>>({
    ICMP: true,
    ARP: true,
    DHCP: true,
    DNS: true,
    HTTP: true,
    OSPF: true
  });

  const toggleFilter = (proto: ProtocolType) => {
    setProtocolFilters(prev => ({ ...prev, [proto]: !prev[proto] }));
  };

  const filteredEvents = events.filter(e => protocolFilters[e.protocol] !== false);

  const getDeviceName = (id: string) => {
    return devices.find(d => d.id === id)?.name || id;
  };

  // Derive RTT and latency breakdown from events
  const rttMs = events.length > 0 ? (events[0]?.rttMs ?? events[events.length - 1]?.cumulativeLatencyMs ?? 0) : null;
  const hasSerialLink = events.some(e => e.cableType === 'serial');
  const totalHops = events.length;

  // Calculate cable vs processing latency across events
  let totalCableLatency = 0;
  let totalDeviceLatency = 0;
  events.forEach(e => {
    if (e.hopLatencyMs) {
      if (e.cableType === 'serial') {
        totalCableLatency += 18.5;
        totalDeviceLatency += Math.max(0, e.hopLatencyMs - 18.5);
      } else if (e.cableType) {
        totalCableLatency += 0.8;
        totalDeviceLatency += Math.max(0, e.hopLatencyMs - 0.8);
      } else {
        totalDeviceLatency += e.hopLatencyMs;
      }
    }
  });

  return (
    <div
      className={`fixed bottom-20 right-4 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-2xl transition-all duration-200 select-none ${
        isCollapsed ? 'w-84 h-10 overflow-hidden' : 'w-96 md:w-[500px] h-96 flex flex-col'
      }`}
    >
      {/* Simulation Header & Title */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/90 border-b border-slate-700 text-xs">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-slate-100">Simulation Panel (Event List)</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-700 text-slate-300 font-mono">
            {events.length} Events
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Prominent RTT & Latency HUD Bar */}
          {rttMs !== null && rttMs > 0 && (
            <div className="px-3 py-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <Activity className={`w-4 h-4 ${hasSerialLink ? 'text-amber-400' : 'text-emerald-400'}`} />
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">RTT:</span>
                  <span
                    className={`font-mono text-sm font-bold px-2 py-0.5 rounded border ${
                      hasSerialLink
                        ? 'bg-amber-950/80 text-amber-300 border-amber-600/60'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60'
                    }`}
                  >
                    {rttMs.toFixed(2)} ms
                  </span>
                </div>
              </div>

              {/* Latency Breakdown Badges */}
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <div className="flex items-center gap-1 text-slate-400" title="Physical Cable Propagation & Serialization Delay">
                  <Zap className="w-3 h-3 text-sky-400" />
                  <span>Cable: <strong className="text-slate-200">{totalCableLatency.toFixed(1)}ms</strong></span>
                </div>
                <span className="text-slate-600">·</span>
                <div className="flex items-center gap-1 text-slate-400" title="Switch ASIC + Router CPU Lookup Delay">
                  <Cpu className="w-3 h-3 text-purple-400" />
                  <span>Device: <strong className="text-slate-200">{totalDeviceLatency.toFixed(1)}ms</strong></span>
                </div>
                <span className="text-slate-600">·</span>
                <div className="flex items-center gap-1 text-slate-400" title="Total Hops (Forward + Return)">
                  <ArrowRightLeft className="w-3 h-3 text-emerald-400" />
                  <span><strong className="text-slate-200">{totalHops}</strong> hops</span>
                </div>
              </div>
            </div>
          )}

          {/* Controls bar */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/70 border-b border-slate-800 text-xs">
            {/* Play / Step Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={onPlayPause}
                className={`p-1.5 rounded transition-all ${
                  isPlaying
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                title={isPlaying ? 'Pause Simulation' : 'Auto Capture / Play'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={onStepForward}
                disabled={isPlaying || currentEventIndex >= events.length - 1}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded transition-colors"
                title="Capture / Forward Step"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onReset}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
                title="Reset Event List"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cable Latency Note / Seminar Hint */}
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="text-slate-500">Medium:</span>
              <span className={`px-1.5 py-0.2 rounded font-mono ${hasSerialLink ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-sky-950 text-sky-300 border border-sky-800'}`}>
                {hasSerialLink ? 'WAN Serial (~18.5ms)' : 'Copper Cat6 (~0.8ms)'}
              </span>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <span>Speed:</span>
              {[0.5, 1, 2].map(speed => (
                <button
                  key={speed}
                  onClick={() => onChangeSpeed(speed)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    simulationSpeed === speed
                      ? 'bg-sky-600 text-white font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 overflow-x-auto">
            <span className="flex items-center gap-1 font-medium text-slate-300">
              <Filter className="w-3 h-3 text-sky-400" /> Filters:
            </span>
            {(['ICMP', 'ARP', 'DHCP', 'DNS', 'HTTP'] as ProtocolType[]).map(proto => (
              <label key={proto} className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={protocolFilters[proto]}
                  onChange={() => toggleFilter(proto)}
                  className="rounded text-sky-500 w-3 h-3"
                />
                <span className="font-mono">{proto}</span>
              </label>
            ))}
          </div>

          {/* Event List Table */}
          <div className="flex-1 overflow-y-auto text-[11px] font-mono">
            {filteredEvents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                <Clock className="w-6 h-6 mb-1 opacity-50" />
                <span>No packet simulation events.</span>
                <span className="text-[10px] text-slate-600 mt-0.5">
                  Send a Ping from PC or use the Envelope tool to inspect packet flow.
                </span>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-950 text-slate-400 text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-1 px-2">Time</th>
                    <th className="py-1 px-1.5">+Δt</th>
                    <th className="py-1 px-2">Device</th>
                    <th className="py-1 px-1">Type</th>
                    <th className="py-1 px-2">Info</th>
                    <th className="py-1 px-1.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredEvents.map((ev, idx) => {
                    const isCurrent = idx === currentEventIndex;
                    const isSerialHop = ev.cableType === 'serial';

                    return (
                      <tr
                        key={ev.id}
                        onClick={() => onSelectEvent(ev)}
                        className={`cursor-pointer transition-colors ${
                          isCurrent
                            ? 'bg-sky-950/80 text-sky-300 font-semibold'
                            : 'hover:bg-slate-800/60 text-slate-300'
                        }`}
                      >
                        <td className="py-1 px-2 text-slate-400 whitespace-nowrap">
                          {ev.cumulativeLatencyMs ? `${ev.cumulativeLatencyMs.toFixed(1)}ms` : `${ev.timestamp.toFixed(3)}s`}
                        </td>
                        <td className="py-1 px-1.5 whitespace-nowrap">
                          {ev.hopLatencyMs ? (
                            <span
                              className={`px-1 py-0.2 rounded text-[9px] ${
                                isSerialHop
                                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                  : 'text-slate-400'
                              }`}
                              title={isSerialHop ? 'WAN Serial Link (+18.5ms latency)' : 'LAN Link'}
                            >
                              +{ev.hopLatencyMs.toFixed(1)}ms
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-1 px-2 font-medium text-slate-200 truncate max-w-[80px]">
                          {getDeviceName(ev.currentDeviceId)}
                        </td>
                        <td className="py-1 px-1">
                          <span
                            className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                              ev.protocol === 'ICMP'
                                ? 'bg-sky-900/60 text-sky-400'
                                : ev.protocol === 'ARP'
                                  ? 'bg-amber-900/60 text-amber-400'
                                  : ev.protocol === 'DHCP'
                                    ? 'bg-purple-900/60 text-purple-400'
                                    : 'bg-emerald-900/60 text-emerald-400'
                            }`}
                          >
                            {ev.protocol}
                          </span>
                        </td>
                        <td className="py-1 px-2 truncate max-w-[170px]" title={ev.summary}>
                          {ev.summary}
                        </td>
                        <td className="py-1 px-1.5 text-right">
                          {ev.status === 'success' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
                          ) : ev.status === 'dropped' ? (
                            <XCircle className="w-3.5 h-3.5 text-red-400 inline" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block animate-pulse" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};
