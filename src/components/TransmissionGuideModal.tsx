import React from 'react';
import {
  X,
  Send,
  Mail,
  Terminal,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Zap
} from 'lucide-react';

interface TransmissionGuideModalProps {
  onClose: () => void;
  onQuickTest: () => void;
}

export const TransmissionGuideModal: React.FC<TransmissionGuideModalProps> = ({
  onClose,
  onQuickTest
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                How to Perform Packet Transmissions in Packet Tracer
              </h2>
              <p className="text-[11px] text-slate-400">
                Complete guide to sending ICMP Echo packets, checking RTT latency, and inspecting OSI layers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Quick 1-Click Banner */}
          <div className="p-3.5 rounded-lg bg-sky-950/60 border border-sky-500/50 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sky-300 text-sm flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Fastest Way: Use the 1-Click Quick Transmission Bar!</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                You can transmit packets immediately from the bar at the top of the canvas. Just pick any Source device and Target device, then click <strong>"Send Packet"</strong>.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onQuickTest();
              }}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded text-xs whitespace-nowrap shadow transition-all cursor-pointer"
            >
              Try Transmission Now &rarr;
            </button>
          </div>

          {/* 3 Methods Grid */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-100 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-1.5">
              Three Ways to Transmit Packets
            </h3>

            {/* Method 1 */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-100 text-sm">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs font-mono">1</span>
                <span>Visual PDU Envelope Tool (Simple PDU)</span>
                <span className="text-[10px] text-slate-500 font-normal">· Standard Cisco Packet Tracer method</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 text-xs pl-1 leading-relaxed">
                <li>Click the <strong>"Add PDU"</strong> button (Envelope icon <Mail className="w-3.5 h-3.5 inline text-amber-400 mx-0.5" />) in the top toolbar.</li>
                <li>Click on the <strong>Source device</strong> on the canvas (e.g. <strong>PC0</strong>). The device will highlight with an envelope badge.</li>
                <li>Click on the <strong>Destination device</strong> on the canvas (e.g. <strong>PC1</strong>).</li>
                <li>The simulator will automatically play the animated packet traveling across cables, show the <strong>RTT (Round Trip Time)</strong> in the Simulation Panel, and log every hop!</li>
              </ol>
            </div>

            {/* Method 2 */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-100 text-sm">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-xs font-mono">2</span>
                <span>PC Desktop Command Prompt (ping command)</span>
                <span className="text-[10px] text-slate-500 font-normal">· Windows terminal emulator</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 text-xs pl-1 leading-relaxed">
                <li><strong>Double-click on PC0</strong> on the canvas to open the device window.</li>
                <li>Click the <strong>"Desktop"</strong> tab $\rightarrow$ Click <strong>"Command Prompt"</strong>.</li>
                <li>Type <code className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-emerald-400 font-mono">ping 192.168.1.20</code> and press <strong>Enter</strong>.</li>
                <li>The command prompt will display real RTT measurements (e.g. <code className="text-sky-300">time=4ms</code>) and 0% packet loss statistics!</li>
              </ol>
            </div>

            {/* Method 3 */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-100 text-sm">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center text-xs font-mono">3</span>
                <span>Cisco IOS CLI Terminal (Router / Switch ping)</span>
                <span className="text-[10px] text-slate-500 font-normal">· Cisco IOS EXEC mode</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 text-xs pl-1 leading-relaxed">
                <li><strong>Double-click on any Router or Switch</strong> (e.g. Router0).</li>
                <li>Click the <strong>"CLI"</strong> tab to access the Cisco IOS terminal.</li>
                <li>Type <code className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-emerald-400 font-mono">ping 192.168.1.20</code> and press <strong>Enter</strong>.</li>
                <li>The router sends 5 ICMP echo packets and outputs classic Cisco <code className="text-emerald-400">!!!!!</code> exclamation marks with min/avg/max latency!</li>
              </ol>
            </div>
          </div>

          {/* All Supported Protocols */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2.5">
            <h4 className="font-semibold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Full CCNA Protocol Simulation Suite</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="font-mono font-bold text-emerald-400">ICMP (Ping):</span>
                <p className="text-slate-400 mt-0.5">Sends Echo Request & receives Echo Reply. Measures round-trip time and latency breakdown across cables and hops.</p>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="font-mono font-bold text-amber-400">ARP (Address Resolution):</span>
                <p className="text-slate-400 mt-0.5">Sends Layer 2 broadcast <code className="text-slate-300">FF:FF:FF:FF:FF:FF</code> ("Who has IP?"), receives unicast Reply, and populates the device's ARP cache table.</p>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="font-mono font-bold text-purple-400">DHCP (IP Leasing):</span>
                <p className="text-slate-400 mt-0.5">Executes full 4-step DORA process (Discover, Offer, Request, ACK) to dynamically assign an IP, subnet mask, gateway, and DNS server.</p>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="font-mono font-bold text-cyan-400">DNS (Domain Lookup):</span>
                <p className="text-slate-400 mt-0.5">Queries UDP Port 53 on the DNS server for domain names like <code className="text-slate-300">www.cisco.lab</code> and resolves to the target server IPv4 address.</p>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800 col-span-1 sm:col-span-2">
                <span className="font-mono font-bold text-blue-400">HTTP (Web Browser):</span>
                <p className="text-slate-400 mt-0.5">Completes TCP 3-way handshake (SYN, SYN-ACK, ACK) followed by <code className="text-slate-300">GET / HTTP/1.1</code> and <code className="text-slate-300">200 OK</code> response delivering the web server HTML page.</p>
              </div>
            </div>
          </div>

          {/* Canvas Scrolling & Navigation Tips */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
            <h4 className="font-semibold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <span>Canvas Scrolling & Pan Controls</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
              <div className="flex items-start gap-1.5">
                <span className="text-sky-400 font-bold">&#8226;</span>
                <span><strong>Mouse Wheel / Trackpad:</strong> Scroll in any direction to smoothly pan the canvas!</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-sky-400 font-bold">&#8226;</span>
                <span><strong>Ctrl + Scroll:</strong> Zoom in and out smoothly.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-sky-400 font-bold">&#8226;</span>
                <span><strong>On-screen D-Pad:</strong> Click the arrow buttons in the bottom-left to pan 100px.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-sky-400 font-bold">&#8226;</span>
                <span><strong>Center View:</strong> Click the Center/Reset button to center all devices in view!</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-800/80 border-t border-slate-700 flex justify-between items-center">
          <span className="text-[11px] text-slate-400">Ready to test? Load any preset lab from the CCNA Labs button.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
