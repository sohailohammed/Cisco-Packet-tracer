import React from 'react';
import { SimulationEvent, ProtocolType } from '../types/network';
import {
  CheckCircle2,
  XCircle,
  Activity,
  Zap,
  Cpu,
  Layers,
  ArrowRight,
  Clock,
  RotateCcw,
  X,
  Eye,
  AlertTriangle,
  Globe,
  Radio,
  FileText
} from 'lucide-react';

interface TransmissionResultCardProps {
  isOpen: boolean;
  onClose: () => void;
  success: boolean;
  sourceName: string;
  sourceIp: string;
  targetName: string;
  targetIp: string;
  rttMs: number;
  totalHops: number;
  cableDelayMs: number;
  deviceDelayMs: number;
  cableType: string;
  events: SimulationEvent[];
  errorReason?: string;
  protocol?: ProtocolType;
  onInspectOsi: () => void;
  onReplay: () => void;
}

export const TransmissionResultCard: React.FC<TransmissionResultCardProps> = ({
  isOpen,
  onClose,
  success,
  sourceName,
  sourceIp,
  targetName,
  targetIp,
  rttMs,
  totalHops,
  cableDelayMs,
  deviceDelayMs,
  cableType,
  events,
  errorReason,
  protocol = 'ICMP',
  onInspectOsi,
  onReplay
}) => {
  if (!isOpen) return null;

  const currentProto = protocol || events[0]?.protocol || 'ICMP';

  const protoSummaryMap: Record<ProtocolType, { success: string; failHint: string }> = {
    ICMP: {
      success: 'ICMP Echo Reply Received (0% loss)',
      failHint: 'Ensure both devices have IP configured in same subnet or have valid default gateway to route across routers.'
    },
    ARP: {
      success: 'ARP Resolution Succeeded (Learned MAC & Cached)',
      failHint: 'Ensure devices share an active L2 switch link in the same broadcast domain (VLAN).'
    },
    DHCP: {
      success: 'DHCP Lease Granted (DORA 4-Step Handshake Succeeded)',
      failHint: 'Ensure a DHCP Server or Router with active DHCP pool is connected on the network.'
    },
    DNS: {
      success: 'DNS Query Succeeded (Domain Resolved to IP)',
      failHint: 'Ensure DNS server IP is configured in client IP settings and DNS service is enabled on server.'
    },
    HTTP: {
      success: 'HTTP 200 OK (Web Server Page Retrieved)',
      failHint: 'Ensure Web Server HTTP service is enabled on Port 80 and network route exists.'
    },
    OSPF: {
      success: 'OSPF Adjacency & Route Update Exchanged',
      failHint: 'Check OSPF process ID, area 0 configuration, and matching subnet masks on link.'
    }
  };

  return (
    <div className="fixed top-20 right-6 z-50 w-96 md:w-[420px] bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 select-none">
      {/* Header */}
      <div
        className={`px-4 py-3 flex items-center justify-between border-b ${
          success
            ? 'bg-emerald-950/80 border-emerald-800/80 text-emerald-200'
            : 'bg-red-950/80 border-red-800/80 text-red-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {success ? (
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-red-500/20 border border-red-400 flex items-center justify-center text-red-400">
              <XCircle className="w-4 h-4" />
            </div>
          )}
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
              <span>{success ? `${currentProto} Transmission Succeeded!` : `${currentProto} Failed`}</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-300">
                {currentProto}
              </span>
            </h3>
            <p className="text-[11px] opacity-80 font-mono">
              {success ? protoSummaryMap[currentProto]?.success : errorReason || 'Destination Unreachable'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-3.5 text-xs">
        {/* Source -> Destination Bar */}
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between font-mono">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Source</span>
            <span className="font-bold text-slate-200 text-sm">{sourceName}</span>
            <span className="text-[11px] text-sky-400">{sourceIp}</span>
          </div>

          <div className="flex flex-col items-center px-3">
            <span className="text-[10px] text-amber-400 font-bold mb-0.5">{currentProto}</span>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
            <span className="text-[9px] text-emerald-400 font-bold mt-0.5">{totalHops} Hops</span>
          </div>

          <div className="flex flex-col text-right">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Destination</span>
            <span className="font-bold text-slate-200 text-sm">{targetName}</span>
            <span className="text-[11px] text-sky-400">{targetIp}</span>
          </div>
        </div>

        {/* Latency Metrics Grid */}
        {success ? (
          <div className="grid grid-cols-3 gap-2">
            {/* Primary RTT */}
            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-700/50 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3 h-3" /> Latency
              </span>
              <span className="text-xl font-mono font-extrabold text-emerald-300 mt-1">
                {rttMs.toFixed(2)}
                <span className="text-xs font-normal text-emerald-400 ml-0.5">ms</span>
              </span>
              <span className="text-[9px] text-emerald-500/90 mt-0.5">Round Trip Time</span>
            </div>

            {/* Cable Delay */}
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3" /> Cable Delay
              </span>
              <span className="text-lg font-mono font-bold text-sky-300 mt-1">
                {cableDelayMs.toFixed(1)}
                <span className="text-xs font-normal text-sky-400 ml-0.5">ms</span>
              </span>
              <span className="text-[9px] text-slate-500 mt-0.5 capitalize truncate max-w-[90px]" title={cableType}>
                {cableType}
              </span>
            </div>

            {/* Device Processing Delay */}
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                <Cpu className="w-3 h-3" /> ASIC Delay
              </span>
              <span className="text-lg font-mono font-bold text-purple-300 mt-1">
                {deviceDelayMs.toFixed(1)}
                <span className="text-xs font-normal text-purple-400 ml-0.5">ms</span>
              </span>
              <span className="text-[9px] text-slate-500 mt-0.5">
                {totalHops} Total Hops
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/60 text-slate-300 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-red-400 mb-1">
              <AlertTriangle className="w-4 h-4" /> Diagnostic Hint
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">
              {protoSummaryMap[currentProto]?.failHint}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
          {events.length > 0 && (
            <button
              onClick={() => {
                onInspectOsi();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-all shadow-md cursor-pointer text-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Inspect OSI 7 Layers</span>
            </button>
          )}

          <button
            onClick={onReplay}
            className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-xs font-medium cursor-pointer"
            title="Replay packet hop animation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay</span>
          </button>

          <button
            onClick={onClose}
            className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs font-medium cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
