import React, { useState } from 'react';
import { SimulationEvent, NetworkDevice } from '../types/network';
import { X, Layers, ArrowRight, Eye, ShieldCheck } from 'lucide-react';

interface PduInspectorModalProps {
  event: SimulationEvent;
  devices: NetworkDevice[];
  onClose: () => void;
}

export const PduInspectorModal: React.FC<PduInspectorModalProps> = ({ event, devices, onClose }) => {
  const [activeTab, setActiveTab] = useState<'osi-model' | 'pdu-format'>('osi-model');
  const [selectedLayer, setSelectedLayer] = useState<number>(3);

  const currentDev = devices.find(d => d.id === event.currentDeviceId);
  const srcDev = devices.find(d => d.id === event.sourceDeviceId);
  const dstDev = devices.find(d => d.id === event.destinationDeviceId);

  const layerInfo = event.layerInfo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-2xl h-[560px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700 select-none">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-semibold text-slate-100">
              PDU Information at Device: <span className="text-sky-400">{currentDev?.name || 'Device'}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-slate-950 border-b border-slate-800 px-3 pt-2 gap-2 text-xs select-none">
          <button
            onClick={() => setActiveTab('osi-model')}
            className={`px-3 py-1.5 rounded-t font-medium border-t-2 transition-all ${
              activeTab === 'osi-model'
                ? 'bg-slate-900 text-sky-400 border-sky-400 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
            }`}
          >
            OSI Model
          </button>
          <button
            onClick={() => setActiveTab('pdu-format')}
            className={`px-3 py-1.5 rounded-t font-medium border-t-2 transition-all ${
              activeTab === 'pdu-format'
                ? 'bg-slate-900 text-sky-400 border-sky-400 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
            }`}
          >
            Inbound / Outbound PDU Details
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-4 overflow-y-auto bg-slate-900 text-xs">
          {activeTab === 'osi-model' ? (
            <div className="flex gap-4 h-full">
              {/* Left: 7 Layers Diagram */}
              <div className="w-48 flex flex-col gap-1.5 select-none">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  In Layers (OSI Stack)
                </div>

                {[
                  { num: 7, name: 'Application', info: layerInfo.layer7 },
                  { num: 6, name: 'Presentation', info: null },
                  { num: 5, name: 'Session', info: null },
                  { num: 4, name: 'Transport', info: layerInfo.layer4 },
                  { num: 3, name: 'Network', info: layerInfo.layer3 },
                  { num: 2, name: 'Data Link', info: layerInfo.layer2 },
                  { num: 1, name: 'Physical', info: layerInfo.layer1 }
                ].map(layer => {
                  const hasData = !!layer.info;
                  const isSelected = selectedLayer === layer.num;

                  return (
                    <button
                      key={layer.num}
                      onClick={() => hasData && setSelectedLayer(layer.num)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded border transition-all text-left ${
                        isSelected
                          ? 'bg-sky-600 text-white border-sky-400 shadow-sm font-semibold'
                          : hasData
                            ? 'bg-slate-800/90 hover:bg-slate-800 text-slate-200 border-slate-700 cursor-pointer'
                            : 'bg-slate-950/40 text-slate-600 border-transparent cursor-default'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] opacity-75">L{layer.num}</span>
                        <span>{layer.name}</span>
                      </div>
                      {hasData && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </button>
                  );
                })}
              </div>

              {/* Right: Layer Description Details */}
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-800">
                    <span className="font-semibold text-slate-100 text-sm">
                      Layer {selectedLayer} Information
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-950 text-sky-400 border border-sky-800 font-mono">
                      {event.protocol}
                    </span>
                  </div>

                  <div className="space-y-3 font-mono text-slate-300">
                    {selectedLayer === 7 && layerInfo.layer7 && (
                      <div>
                        <div className="text-sky-400 font-semibold mb-1">Application Layer (L7):</div>
                        <p className="text-slate-300 leading-relaxed">{layerInfo.layer7.description}</p>
                        <div className="mt-2 text-[11px] text-slate-400">Application: {layerInfo.layer7.app}</div>
                      </div>
                    )}

                    {selectedLayer === 4 && layerInfo.layer4 && (
                      <div>
                        <div className="text-sky-400 font-semibold mb-1">Transport Layer (L4):</div>
                        <p className="text-slate-300 leading-relaxed">{layerInfo.layer4.description}</p>
                        {layerInfo.layer4.srcPort && (
                          <div className="mt-2 text-[11px] text-slate-400">
                            Source Port: {layerInfo.layer4.srcPort} &rarr; Dest Port: {layerInfo.layer4.dstPort}
                          </div>
                        )}
                      </div>
                    )}

                    {selectedLayer === 3 && layerInfo.layer3 && (
                      <div className="space-y-2">
                        <div className="text-sky-400 font-semibold">Network Layer (L3):</div>
                        <div className="grid grid-cols-2 gap-2 p-2 bg-slate-900 rounded border border-slate-800 text-[11px]">
                          <div>Source IP: <span className="text-white font-bold">{layerInfo.layer3.srcIp}</span></div>
                          <div>Destination IP: <span className="text-white font-bold">{layerInfo.layer3.dstIp}</span></div>
                          <div>TTL: <span className="text-emerald-400">{layerInfo.layer3.ttl}</span></div>
                          <div>Protocol: <span className="text-emerald-400">{layerInfo.layer3.protocol}</span></div>
                        </div>
                        <p className="text-slate-400 text-xs">{layerInfo.layer3.description}</p>
                      </div>
                    )}

                    {selectedLayer === 2 && layerInfo.layer2 && (
                      <div className="space-y-2">
                        <div className="text-sky-400 font-semibold">Data Link Layer (L2):</div>
                        <div className="grid grid-cols-2 gap-2 p-2 bg-slate-900 rounded border border-slate-800 text-[11px]">
                          <div>Src MAC: <span className="text-white">{layerInfo.layer2.srcMac}</span></div>
                          <div>Dst MAC: <span className="text-white">{layerInfo.layer2.dstMac}</span></div>
                          <div>VLAN: <span className="text-sky-400">{layerInfo.layer2.vlan || 1}</span></div>
                          <div>Type: <span className="text-emerald-400">0x0800 (IPv4)</span></div>
                        </div>
                        <p className="text-slate-400 text-xs">{layerInfo.layer2.description}</p>
                      </div>
                    )}

                    {selectedLayer === 1 && layerInfo.layer1 && (
                      <div className="space-y-2">
                        <div className="text-sky-400 font-semibold">Physical Layer (L1):</div>
                        <div className="p-2 bg-slate-900 rounded border border-slate-800 text-[11px] space-y-1">
                          <div>Inbound Port: <span className="text-white font-bold">{layerInfo.layer1.inPort}</span></div>
                          {layerInfo.layer1.outPort && (
                            <div>Outbound Port: <span className="text-white font-bold">{layerInfo.layer1.outPort}</span></div>
                          )}
                          {event.cableType && (
                            <div>
                              Physical Medium: <span className="text-amber-400 capitalize">{event.cableType.replace('-', ' ')}</span>
                            </div>
                          )}
                          {event.hopLatencyMs && (
                            <div className="flex items-center gap-3 pt-1 border-t border-slate-800">
                              <span>Link & Hop Delay: <strong className="text-emerald-400">+{event.hopLatencyMs.toFixed(1)}ms</strong></span>
                              {event.cumulativeLatencyMs && (
                                <span>Timeline: <strong className="text-sky-400">{event.cumulativeLatencyMs.toFixed(1)}ms</strong></span>
                              )}
                              {event.rttMs && (
                                <span>Total RTT: <strong className="text-amber-300">{event.rttMs.toFixed(1)}ms</strong></span>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-slate-400 text-xs">{layerInfo.layer1.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Packet Action: <strong className="text-emerald-400">{event.summary}</strong></span>
                  <span className="text-slate-500 font-mono">Time: {event.timestamp.toFixed(3)}s</span>
                </div>
              </div>
            </div>
          ) : (
            /* PDU format header view */
            <div className="space-y-4 font-mono">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                <div className="text-sky-400 font-semibold mb-2">ETHERNET II FRAME</div>
                <div className="grid grid-cols-3 gap-2 text-[11px] p-2 bg-slate-900 rounded border border-slate-800 text-slate-300">
                  <div>PREAMBLE: 7 bytes</div>
                  <div>SFD: 1 byte</div>
                  <div>DEST MAC: {layerInfo.layer2?.dstMac || 'FF:FF:FF:FF:FF:FF'}</div>
                  <div>SRC MAC: {layerInfo.layer2?.srcMac || '00:00:00:00:00:00'}</div>
                  <div>TYPE: 0x0800 (IPv4)</div>
                  <div>FCS: 0x82b4a1</div>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                <div className="text-emerald-400 font-semibold mb-2">IPv4 PACKET HEADER</div>
                <div className="grid grid-cols-4 gap-2 text-[11px] p-2 bg-slate-900 rounded border border-slate-800 text-slate-300">
                  <div>VER: 4</div>
                  <div>IHL: 20 bytes</div>
                  <div>TOS: 0x00</div>
                  <div>TOTAL LEN: 60</div>
                  <div>TTL: {layerInfo.layer3?.ttl || 128}</div>
                  <div>PROTO: {layerInfo.layer3?.protocol || 'ICMP (1)'}</div>
                  <div className="col-span-2">CHECKSUM: 0x6e2c [OK]</div>
                  <div className="col-span-2">SRC: {layerInfo.layer3?.srcIp || '0.0.0.0'}</div>
                  <div className="col-span-2">DST: {layerInfo.layer3?.dstIp || '0.0.0.0'}</div>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                <div className="text-amber-400 font-semibold mb-2">{event.protocol} DATA PAYLOAD</div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800 text-[11px] text-slate-400 break-all">
                  61 62 63 64 65 66 67 68 69 6a 6b 6c 6d 6e 6f 70 71 72 73 74 75 76 77 61 62 63 64 65 66 67 68 69
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
