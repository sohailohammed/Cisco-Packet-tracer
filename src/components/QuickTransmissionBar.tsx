import React, { useState } from 'react';
import { NetworkDevice, SimulationEvent, ProtocolType } from '../types/network';
import {
  Zap,
  HelpCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Activity,
  FastForward,
  Play,
  Layers,
  Globe,
  Radio,
  FileQuestion,
  Server
} from 'lucide-react';

interface QuickTransmissionBarProps {
  devices: NetworkDevice[];
  onTriggerTransmission: (srcId: string, dstId: string, isInstant?: boolean, protocol?: ProtocolType) => void;
  onOpenGuide: () => void;
  latestEvent: SimulationEvent | null;
  isPlaying: boolean;
  onInstantFinish?: () => void;
}

export const QuickTransmissionBar: React.FC<QuickTransmissionBarProps> = ({
  devices,
  onTriggerTransmission,
  onOpenGuide,
  latestEvent,
  isPlaying,
  onInstantFinish
}) => {
  // Protocol state
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolType>('ICMP');

  // Filter devices that have an IP address configured or are endpoints
  const validDevices = devices.filter(d => 
    d.interfaces.some(i => i.ipAddress) || d.type === 'pc' || d.type === 'laptop' || d.type === 'server' || d.type === 'web-server'
  );

  const pc0Dev = devices.find(d => d.name.toLowerCase().includes('pc0'));
  const pc1Dev = devices.find(d => d.name.toLowerCase().includes('pc1'));
  const serverDev = devices.find(d => d.name.toLowerCase().includes('server') || d.type === 'web-server' || d.type === 'server');

  const [sourceId, setSourceId] = useState<string>(() => {
    return pc0Dev?.id || validDevices[0]?.id || devices[0]?.id || '';
  });

  const [targetId, setTargetId] = useState<string>(() => {
    return (selectedProtocol === 'HTTP' || selectedProtocol === 'DNS' || selectedProtocol === 'DHCP')
      ? (serverDev?.id || pc1Dev?.id || validDevices[1]?.id || '')
      : (pc1Dev?.id || serverDev?.id || validDevices[1]?.id || devices[1]?.id || '');
  });

  // Ensure valid selection if devices change
  const currentSrc = devices.find(d => d.id === sourceId) || pc0Dev || validDevices[0] || devices[0];
  const currentDst = devices.find(d => d.id === targetId) || (selectedProtocol === 'HTTP' || selectedProtocol === 'DNS' ? serverDev : pc1Dev) || validDevices[1] || devices[1];

  const handleTransmit = (instant: boolean = false) => {
    if (!currentSrc) return;
    const dst = (selectedProtocol === 'DHCP' && !currentDst) ? (serverDev || currentSrc) : currentDst;
    if (!dst && selectedProtocol !== 'DHCP') return;
    onTriggerTransmission(currentSrc.id, dst ? dst.id : currentSrc.id, instant, selectedProtocol);
  };

  const handleQuickPc0ToPc1 = (instant: boolean = false) => {
    const s = pc0Dev || currentSrc;
    const d = (selectedProtocol === 'HTTP' || selectedProtocol === 'DNS' || selectedProtocol === 'DHCP')
      ? (serverDev || pc1Dev || currentDst)
      : (pc1Dev || serverDev || currentDst);
    if (s && d) {
      onTriggerTransmission(s.id, d.id, instant, selectedProtocol);
    }
  };

  const getDeviceIp = (d?: NetworkDevice) => {
    if (!d) return '0.0.0.0';
    const intf = d.interfaces.find(i => i.ipAddress);
    return intf?.ipAddress || (d.name.includes('PC0') ? '192.168.1.10' : d.name.includes('PC1') ? '192.168.1.20' : d.name.includes('Server') ? '192.168.1.100' : 'No IP');
  };

  const protocolStyles: Record<ProtocolType, { label: string; bg: string; text: string; border: string; desc: string }> = {
    ICMP: {
      label: 'ICMP (Ping)',
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-400',
      border: 'border-emerald-500/40',
      desc: 'Echo Request & Reply latency test'
    },
    ARP: {
      label: 'ARP (Address Resolution)',
      bg: 'bg-amber-500/20',
      text: 'text-amber-400',
      border: 'border-amber-500/40',
      desc: 'Broadcast "Who has IP?" & learn MAC in cache'
    },
    DHCP: {
      label: 'DHCP (Dynamic IP Lease)',
      bg: 'bg-purple-500/20',
      text: 'text-purple-400',
      border: 'border-purple-500/40',
      desc: 'DORA 4-step IP lease discovery'
    },
    DNS: {
      label: 'DNS (Domain Lookup)',
      bg: 'bg-cyan-500/20',
      text: 'text-cyan-400',
      border: 'border-cyan-500/40',
      desc: 'Resolve domain name www.cisco.lab'
    },
    HTTP: {
      label: 'HTTP (Web Server)',
      bg: 'bg-blue-500/20',
      text: 'text-blue-400',
      border: 'border-blue-500/40',
      desc: 'TCP 3-Way Handshake + HTTP GET & 200 OK'
    },
    OSPF: {
      label: 'OSPF (Dynamic Routing)',
      bg: 'bg-fuchsia-500/20',
      text: 'text-fuchsia-400',
      border: 'border-fuchsia-500/40',
      desc: 'Area 0 Link-State routing updates'
    }
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-xs border-b border-slate-800 px-3 py-1.5 flex items-center justify-between text-xs select-none z-20 transition-all flex-wrap gap-2">
      {/* Left Quick Test Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Protocol Selector Pill Group */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-700/80 rounded-md p-0.5">
          {(['ICMP', 'ARP', 'DHCP', 'DNS', 'HTTP'] as ProtocolType[]).map(proto => {
            const isSelected = selectedProtocol === proto;
            return (
              <button
                key={proto}
                onClick={() => {
                  setSelectedProtocol(proto);
                  // Auto-switch destination to server for HTTP/DNS if available
                  if ((proto === 'HTTP' || proto === 'DNS') && serverDev) {
                    setTargetId(serverDev.id);
                  }
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  isSelected
                    ? `${protocolStyles[proto].bg} ${protocolStyles[proto].text} border ${protocolStyles[proto].border} shadow-xs scale-102`
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
                title={protocolStyles[proto].desc}
              >
                {proto}
              </button>
            );
          })}
        </div>

        {/* 1-Click Fast Button */}
        <button
          onClick={() => handleQuickPc0ToPc1(false)}
          disabled={isPlaying}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold text-xs transition-all shadow-sm cursor-pointer ${
            isPlaying
              ? 'bg-amber-600/70 text-white cursor-wait animate-pulse'
              : selectedProtocol === 'ICMP'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-[1.02]'
                : selectedProtocol === 'ARP'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white hover:scale-[1.02]'
                  : selectedProtocol === 'DHCP'
                    ? 'bg-purple-600 hover:bg-purple-500 text-white hover:scale-[1.02]'
                    : selectedProtocol === 'DNS'
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white hover:scale-[1.02]'
                      : 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-[1.02]'
          }`}
          title={`Transmit ${selectedProtocol}: ${protocolStyles[selectedProtocol].desc}`}
        >
          <Zap className="w-3.5 h-3.5 fill-current text-white" />
          <span>
            {isPlaying
              ? 'Transmitting...'
              : selectedProtocol === 'DHCP'
                ? `⚡ Request DHCP Lease (${currentSrc?.name || 'PC0'})`
                : selectedProtocol === 'DNS'
                  ? `⚡ DNS Query (${currentSrc?.name || 'PC0'} ➔ www.cisco.lab)`
                  : selectedProtocol === 'HTTP'
                    ? `⚡ HTTP GET (${currentSrc?.name || 'PC0'} ➔ Web Server)`
                    : selectedProtocol === 'ARP'
                      ? `⚡ Resolve ARP (${currentSrc?.name || 'PC0'} ➔ ${currentDst?.name || 'PC1'})`
                      : `⚡ Transmit ${currentSrc?.name || 'PC0'} ➔ ${currentDst?.name || 'PC1'}`}
          </span>
        </button>

        {/* Source selector */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-700/80 rounded px-2 py-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono">From:</span>
          <select
            value={currentSrc?.id || ''}
            onChange={e => setSourceId(e.target.value)}
            className="bg-transparent text-slate-100 outline-none font-medium cursor-pointer max-w-[130px] truncate text-xs"
          >
            {devices.map(d => (
              <option key={d.id} value={d.id} className="bg-slate-900 text-slate-100">
                {d.name} ({getDeviceIp(d)})
              </option>
            ))}
          </select>
        </div>

        {selectedProtocol !== 'DHCP' && (
          <>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            {/* Target selector */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-700/80 rounded px-2 py-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono">To:</span>
              <select
                value={currentDst?.id || ''}
                onChange={e => setTargetId(e.target.value)}
                className="bg-transparent text-slate-100 outline-none font-medium cursor-pointer max-w-[130px] truncate text-xs"
              >
                {devices.map(d => (
                  <option key={d.id} value={d.id} className="bg-slate-900 text-slate-100">
                    {d.name} ({getDeviceIp(d)})
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Send Button */}
        <button
          onClick={() => handleTransmit(false)}
          disabled={isPlaying || !currentSrc || (selectedProtocol !== 'DHCP' && (!currentDst || currentSrc.id === currentDst.id))}
          className={`flex items-center gap-1.5 px-3 py-1 rounded font-semibold transition-all shadow-xs cursor-pointer ${
            isPlaying
              ? 'bg-amber-600/60 text-white cursor-wait animate-pulse'
              : !currentSrc || (selectedProtocol !== 'DHCP' && (!currentDst || currentSrc.id === currentDst.id))
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-500 text-white hover:shadow-md'
          }`}
          title={`Send animated ${selectedProtocol} transmission`}
        >
          <Play className="w-3 h-3 fill-current" />
          <span>{isPlaying ? 'Transmitting...' : `Send ${selectedProtocol}`}</span>
        </button>

        {/* Instant Ping/Transmission Button */}
        <button
          onClick={() => handleTransmit(true)}
          disabled={isPlaying || !currentSrc || (selectedProtocol !== 'DHCP' && (!currentDst || currentSrc.id === currentDst.id))}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors font-medium text-xs cursor-pointer"
          title="Skip animation and see immediate latency and OSI result"
        >
          <FastForward className="w-3 h-3 text-amber-400" />
          <span>Instant</span>
        </button>

        {/* Skip wait button when playing */}
        {isPlaying && onInstantFinish && (
          <button
            onClick={onInstantFinish}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold animate-pulse cursor-pointer"
            title="Fast forward directly to final result"
          >
            <FastForward className="w-3 h-3" />
            <span>Finish Now</span>
          </button>
        )}

        {/* Live Feedback info badge */}
        {latestEvent && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[11px] font-mono">
            {latestEvent.status === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : latestEvent.status === 'dropped' ? (
              <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            ) : (
              <Activity className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
            )}
            <span className={`px-1 py-0.2 rounded text-[10px] font-bold ${protocolStyles[latestEvent.protocol]?.bg || 'bg-slate-800'} ${protocolStyles[latestEvent.protocol]?.text || 'text-slate-300'}`}>
              {latestEvent.protocol}
            </span>
            <span className="text-slate-200 truncate max-w-[210px]">
              {latestEvent.rttMs ? `RTT: ${latestEvent.rttMs.toFixed(2)}ms (${latestEvent.status})` : latestEvent.summary}
            </span>
          </div>
        )}
      </div>

      {/* Right Guide Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenGuide}
          className="flex items-center gap-1 px-2.5 py-1 text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors text-[11px] cursor-pointer font-medium"
        >
          <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
          <span>Protocol Guide</span>
        </button>
      </div>
    </div>
  );
};
