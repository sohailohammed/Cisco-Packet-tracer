import React, { useState, useRef, useEffect } from 'react';
import { NetworkDevice, NetworkCable } from '../../types/network';
import { executePcCommand } from '../../engine/pcCommandPrompt';
import {
  simulatePing,
  simulateDhcp,
  simulateArp,
  simulateDnsQuery,
  simulateHttpRequest
} from '../../engine/networkSimulation';
import { soundManager } from '../../utils/audio';
import {
  Laptop,
  Terminal,
  Globe,
  Settings2,
  FileText,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Search,
  X
} from 'lucide-react';

interface DesktopViewProps {
  device: NetworkDevice;
  allDevices: NetworkDevice[];
  cables: NetworkCable[];
  onUpdateDevice: (dev: NetworkDevice) => void;
  onTriggerSimulation?: (events: any[]) => void;
}

type DesktopApp = 'none' | 'ip-config' | 'command-prompt' | 'web-browser' | 'text-editor';

export const DesktopView: React.FC<DesktopViewProps> = ({
  device,
  allDevices,
  cables,
  onUpdateDevice,
  onTriggerSimulation
}) => {
  const [activeApp, setActiveApp] = useState<DesktopApp>('none');

  // Command prompt state
  const [cliLines, setCliLines] = useState<string[]>([
    'Packet Tracer PC Command Line 1.0\nType "help" or "ipconfig" to get started.\n'
  ]);
  const [cmdInput, setCmdInput] = useState('');
  const promptEndRef = useRef<HTMLDivElement>(null);

  // Web Browser state
  const [browserUrl, setBrowserUrl] = useState('http://www.cisco.lab');
  const [renderedHtml, setRenderedHtml] = useState<string>('');
  const [browserStatus, setBrowserStatus] = useState<string>('Ready');

  // Text editor state
  const [noteContent, setNoteContent] = useState('Network Diagnostics Log:\n- Interfaces checked.\n');

  // IP Config state
  const primaryIntf = device.interfaces.find(i => i.type === 'fastethernet' || i.type === 'gigabit') || device.interfaces[0];
  const [isDhcp, setIsDhcp] = useState(primaryIntf?.isDhcp || false);
  const [ipVal, setIpVal] = useState(primaryIntf?.ipAddress || '');
  const [maskVal, setMaskVal] = useState(primaryIntf?.subnetMask || '255.255.255.0');
  const [gatewayVal, setGatewayVal] = useState(device.defaultGateway || '');
  const [dnsVal, setDnsVal] = useState(device.dnsServer || '');
  const [dhcpStatus, setDhcpStatus] = useState<string>('');

  useEffect(() => {
    promptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [cliLines]);

  const handleSaveIpConfig = () => {
    const updated = JSON.parse(JSON.stringify(device)) as NetworkDevice;
    const intf = updated.interfaces.find(i => i.id === primaryIntf.id);
    if (intf) {
      intf.isDhcp = isDhcp;
      intf.ipAddress = ipVal;
      intf.subnetMask = maskVal;
    }
    updated.defaultGateway = gatewayVal;
    updated.dnsServer = dnsVal;
    onUpdateDevice(updated);
    setDhcpStatus('Configuration saved.');
  };

  const handleTriggerDhcp = () => {
    setDhcpStatus('Requesting DHCP lease (DORA handshake)...');
    const result = simulateDhcp(device.id, allDevices, cables);

    if (result.success && result.assignedIp) {
      setIsDhcp(true);
      setIpVal(result.assignedIp);
      setMaskVal(result.subnetMask || '255.255.255.0');
      setGatewayVal(result.defaultGateway || '');
      setDnsVal(result.dnsServer || '');

      const updated = JSON.parse(JSON.stringify(device)) as NetworkDevice;
      const intf = updated.interfaces.find(i => i.id === primaryIntf.id);
      if (intf) {
        intf.isDhcp = true;
        intf.ipAddress = result.assignedIp;
        intf.subnetMask = result.subnetMask || '255.255.255.0';
      }
      updated.defaultGateway = result.defaultGateway || '';
      updated.dnsServer = result.dnsServer || '';
      onUpdateDevice(updated);

      setDhcpStatus(`DHCP lease successful! Assigned: ${result.assignedIp}`);
      soundManager.playPingSuccess();
      if (onTriggerSimulation) {
        onTriggerSimulation(result.events);
      }
    } else {
      setDhcpStatus('DHCP failed. APIPA is being used (169.254.x.x).');
      soundManager.playPingFail();
      if (onTriggerSimulation && result.events.length > 0) {
        onTriggerSimulation(result.events);
      }
    }
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmdInput.trim()) return;

    const cmd = cmdInput.trim();
    const result = executePcCommand(cmd, device);

    let newOutput = `C:\\> ${cmd}\n`;
    if (result.clear) {
      setCliLines([]);
      setCmdInput('');
      return;
    }
    if (result.output) {
      newOutput += result.output;
    }

    setCliLines(prev => [...prev, newOutput]);
    setCmdInput('');

    if (result.updatedDevice) {
      onUpdateDevice(result.updatedDevice);
    }

    if (result.dhcpRenew) {
      handleTriggerDhcp();
    }

    // ARP simulation command
    if (result.arpTarget) {
      const sim = simulateArp(device.id, result.arpTarget, allDevices, cables);
      setTimeout(() => {
        if (sim.success) {
          soundManager.playPingSuccess();
          setCliLines(prev => [
            ...prev,
            `ARP Request broadcast sent for ${result.arpTarget}.\n` +
            `ARP Reply received: ${sim.resolvedIp} is at ${sim.resolvedMac}\n` +
            `ARP table cache entry updated.\n\n`
          ]);
          if (onTriggerSimulation) {
            onTriggerSimulation(sim.events);
          }
        } else {
          soundManager.playPingFail();
          setCliLines(prev => [
            ...prev,
            `ARP resolution failed: ${sim.errorReason || 'No response to ARP Request'}\n\n`
          ]);
        }
      }, 250);
    }

    // DNS nslookup command
    if (result.dnsTarget) {
      const sim = simulateDnsQuery(device.id, result.dnsTarget, allDevices, cables);
      setTimeout(() => {
        if (sim.success) {
          soundManager.playPingSuccess();
          setCliLines(prev => [
            ...prev,
            `Server:  cisco-dns.local\n` +
            `Address: ${device.dnsServer || '192.168.1.100'}#53\n\n` +
            `Non-authoritative answer:\n` +
            `Name:    ${result.dnsTarget}\n` +
            `Address: ${sim.resolvedIp}\n\n`
          ]);
          if (onTriggerSimulation) {
            onTriggerSimulation(sim.events);
          }
        } else {
          soundManager.playPingFail();
          setCliLines(prev => [
            ...prev,
            `*** Can't find ${result.dnsTarget}: No answer from DNS server\n\n`
          ]);
        }
      }, 250);
    }

    // HTTP curl command
    if (result.httpTarget) {
      const sim = simulateHttpRequest(device.id, result.httpTarget, allDevices, cables);
      setTimeout(() => {
        if (sim.success) {
          soundManager.playPingSuccess();
          setCliLines(prev => [
            ...prev,
            `* Connected to ${result.httpTarget} port 80\n` +
            `> GET / HTTP/1.1\n` +
            `> Host: www.cisco.lab\n` +
            `> User-Agent: Cisco-PT/8.0\n\n` +
            `< HTTP/1.1 200 OK\n` +
            `< Content-Type: text/html\n` +
            `< Content-Length: ${(sim.htmlContent || '').length}\n\n` +
            `${sim.htmlContent || '<html><body><h1>Cisco Packet Tracer Web Server</h1></body></html>'}\n\n`
          ]);
          if (onTriggerSimulation) {
            onTriggerSimulation(sim.events);
          }
        } else {
          soundManager.playPingFail();
          setCliLines(prev => [
            ...prev,
            `curl: (7) Failed to connect to ${result.httpTarget}: Connection refused or unreachable\n\n`
          ]);
        }
      }, 250);
    }

    // ICMP ping command
    if (result.pingTarget) {
      const sim = simulatePing(device.id, result.pingTarget, allDevices, cables);
      setTimeout(() => {
        if (sim.success) {
          soundManager.playPingSuccess();
          const rtt = Math.max(1, Math.round(sim.rttMs || 4));
          const t1 = Math.max(1, Math.round(rtt * 0.9));
          const t2 = Math.max(1, rtt);
          const t3 = Math.max(1, Math.round(rtt * 1.15));
          const t4 = Math.max(1, Math.round(rtt * 0.95));
          setCliLines(prev => [
            ...prev,
            `Reply from ${result.pingTarget}: bytes=32 time=${t1}ms TTL=128\n` +
            `Reply from ${result.pingTarget}: bytes=32 time=${t2}ms TTL=128\n` +
            `Reply from ${result.pingTarget}: bytes=32 time=${t3}ms TTL=128\n` +
            `Reply from ${result.pingTarget}: bytes=32 time=${t4}ms TTL=128\n\n` +
            `Ping statistics for ${result.pingTarget}:\n` +
            `    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),\n` +
            `Approximate round trip times in milli-seconds:\n` +
            `    Minimum = ${t1}ms, Maximum = ${t3}ms, Average = ${rtt}ms\n`
          ]);
          if (onTriggerSimulation) {
            onTriggerSimulation(sim.events);
          }
        } else {
          soundManager.playPingFail();
          setCliLines(prev => [
            ...prev,
            `Request timed out.\n` +
            `Request timed out.\n` +
            `Request timed out.\n` +
            `Request timed out.\n\n` +
            `Ping statistics for ${result.pingTarget}:\n` +
            `    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss) [${sim.errorReason || 'Unreachable'}]\n`
          ]);
        }
      }, 300);
    }
  };

  const handleBrowseUrl = () => {
    setBrowserStatus('Connecting to ' + browserUrl + '...');
    const simHttp = simulateHttpRequest(device.id, browserUrl, allDevices, cables);

    setTimeout(() => {
      if (simHttp.success) {
        setRenderedHtml(simHttp.htmlContent || '<html><body><h1>Welcome to Cisco Packet Tracer Web Server</h1></body></html>');
        setBrowserStatus('HTTP 200 OK (Connected)');
        soundManager.playPingSuccess();
        if (onTriggerSimulation) {
          onTriggerSimulation(simHttp.events);
        }
      } else {
        setRenderedHtml(
          `<div style="font-family:sans-serif; padding:20px; color:#ef4444;"><h2>Host Not Found</h2><p>Could not resolve or connect to server: ${browserUrl}</p><p style="font-size:12px; color:#94a3b8;">${simHttp.errorReason || 'Port 80 closed or route not found'}</p></div>`
        );
        setBrowserStatus('Connection Timed Out');
        soundManager.playPingFail();
        if (onTriggerSimulation && simHttp.events.length > 0) {
          onTriggerSimulation(simHttp.events);
        }
      }
    }, 300);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 overflow-hidden relative">
      {/* Desktop App Icons Canvas */}
      {activeApp === 'none' ? (
        <div className="flex-1 p-6 grid grid-cols-4 sm:grid-cols-6 gap-6 content-start select-none bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40">
          <button
            onClick={() => setActiveApp('ip-config')}
            className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all text-slate-200 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
              <Settings2 className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-center text-slate-300">IP Configuration</span>
          </button>

          <button
            onClick={() => setActiveApp('command-prompt')}
            className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all text-slate-200 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Terminal className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-center text-slate-300">Command Prompt</span>
          </button>

          <button
            onClick={() => {
              setActiveApp('web-browser');
              if (!renderedHtml) handleBrowseUrl();
            }}
            className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all text-slate-200 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
              <Globe className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-center text-slate-300">Web Browser</span>
          </button>

          <button
            onClick={() => setActiveApp('text-editor')}
            className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all text-slate-200 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-center text-slate-300">Text Editor</span>
          </button>
        </div>
      ) : (
        /* Active App Window */
        <div className="flex-1 flex flex-col bg-slate-950">
          {/* App Window Header */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700 text-xs text-slate-200">
            <div className="flex items-center gap-2">
              {activeApp === 'ip-config' && <Settings2 className="w-4 h-4 text-sky-400" />}
              {activeApp === 'command-prompt' && <Terminal className="w-4 h-4 text-emerald-400" />}
              {activeApp === 'web-browser' && <Globe className="w-4 h-4 text-blue-400" />}
              {activeApp === 'text-editor' && <FileText className="w-4 h-4 text-amber-400" />}
              <span className="font-semibold capitalize">{activeApp.replace('-', ' ')}</span>
            </div>
            <button
              onClick={() => setActiveApp('none')}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* App Window Content */}
          <div className="flex-1 overflow-auto">
            {/* 1. IP CONFIG APP */}
            {activeApp === 'ip-config' && (
              <div className="p-6 max-w-lg mx-auto space-y-4 text-xs">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded">
                  <div className="font-semibold text-slate-200 mb-2">Interface: {primaryIntf?.name}</div>
                  <div className="flex items-center gap-6 mb-4">
                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="dhcp-static"
                        checked={isDhcp}
                        onChange={() => {
                          setIsDhcp(true);
                          handleTriggerDhcp();
                        }}
                      />
                      <span>DHCP</span>
                    </label>
                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="dhcp-static"
                        checked={!isDhcp}
                        onChange={() => setIsDhcp(false)}
                      />
                      <span>Static</span>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-slate-400 mb-1">IPv4 Address:</label>
                      <input
                        type="text"
                        disabled={isDhcp}
                        value={ipVal}
                        onChange={e => setIpVal(e.target.value)}
                        placeholder="192.168.1.10"
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-slate-100 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Subnet Mask:</label>
                      <input
                        type="text"
                        disabled={isDhcp}
                        value={maskVal}
                        onChange={e => setMaskVal(e.target.value)}
                        placeholder="255.255.255.0"
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-slate-100 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Default Gateway:</label>
                      <input
                        type="text"
                        disabled={isDhcp}
                        value={gatewayVal}
                        onChange={e => setGatewayVal(e.target.value)}
                        placeholder="192.168.1.1"
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-slate-100 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">DNS Server:</label>
                      <input
                        type="text"
                        disabled={isDhcp}
                        value={dnsVal}
                        onChange={e => setDnsVal(e.target.value)}
                        placeholder="192.168.1.100"
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-slate-100 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {dhcpStatus && (
                    <div className="mt-3 p-2 bg-slate-800 rounded text-sky-400 text-[11px]">
                      {dhcpStatus}
                    </div>
                  )}

                  {!isDhcp && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleSaveIpConfig}
                        className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded transition-colors"
                      >
                        Apply Settings
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. COMMAND PROMPT APP */}
            {activeApp === 'command-prompt' && (
              <div className="h-full flex flex-col bg-black text-slate-200 font-mono text-xs p-3 select-text">
                <div className="flex-1 overflow-y-auto space-y-1">
                  {cliLines.map((line, idx) => (
                    <div key={idx} className="whitespace-pre-wrap break-words">{line}</div>
                  ))}
                  <form onSubmit={handleCommandSubmit} className="flex items-center gap-1.5 pt-1">
                    <span className="text-white">C:\&gt;</span>
                    <input
                      type="text"
                      autoFocus
                      value={cmdInput}
                      onChange={e => setCmdInput(e.target.value)}
                      className="flex-1 bg-transparent text-white outline-none border-none p-0 text-xs font-mono"
                    />
                  </form>
                  <div ref={promptEndRef} />
                </div>
              </div>
            )}

            {/* 3. WEB BROWSER APP */}
            {activeApp === 'web-browser' && (
              <div className="h-full flex flex-col bg-slate-900">
                {/* Browser Nav Bar */}
                <div className="flex items-center gap-2 p-2 bg-slate-800 border-b border-slate-700">
                  <button className="p-1 text-slate-400 hover:text-white rounded">
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1 text-slate-400 hover:text-white rounded">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleBrowseUrl}
                    className="p-1 text-slate-400 hover:text-white rounded"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex-1 flex items-center bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs">
                    <span className="text-slate-500 mr-1.5">URL:</span>
                    <input
                      type="text"
                      value={browserUrl}
                      onChange={e => setBrowserUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleBrowseUrl()}
                      className="flex-1 bg-transparent text-slate-200 outline-none"
                    />
                  </div>
                  <button
                    onClick={handleBrowseUrl}
                    className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs"
                  >
                    Go
                  </button>
                </div>
                {/* Browser Status */}
                <div className="px-3 py-0.5 bg-slate-950 border-b border-slate-800 text-[10px] text-slate-400">
                  {browserStatus}
                </div>
                {/* Rendered Web Content */}
                <div className="flex-1 bg-white p-4 overflow-auto">
                  <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
                </div>
              </div>
            )}

            {/* 4. TEXT EDITOR APP */}
            {activeApp === 'text-editor' && (
              <div className="h-full flex flex-col p-3 bg-slate-950">
                <textarea
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  placeholder="Network engineering notes..."
                  className="flex-1 w-full bg-slate-900 border border-slate-800 rounded p-3 text-slate-200 text-xs font-mono outline-none resize-none"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Windows Taskbar */}
      <div className="h-8 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-3 text-xs select-none">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveApp('none')}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-[11px]"
          >
            <Laptop className="w-3.5 h-3.5 text-sky-400" />
            <span>Desktop</span>
          </button>
          {activeApp !== 'none' && (
            <span className="text-[11px] text-slate-400 px-2 py-0.5 bg-slate-900 rounded border border-slate-800 capitalize">
              {activeApp.replace('-', ' ')}
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-500">
          IP: {primaryIntf?.ipAddress || '0.0.0.0'}
        </div>
      </div>
    </div>
  );
};
