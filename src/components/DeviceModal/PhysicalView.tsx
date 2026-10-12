import React from 'react';
import { NetworkDevice, NetworkCable } from '../../types/network';
import { Power, Cpu, Layers } from 'lucide-react';

interface PhysicalViewProps {
  device: NetworkDevice;
  cables: NetworkCable[];
  onTogglePower: () => void;
}

export const PhysicalView: React.FC<PhysicalViewProps> = ({
  device,
  cables,
  onTogglePower
}) => {
  // Find which interfaces have connected cables
  const connectedPorts = new Set<string>();
  cables.forEach(c => {
    if (c.device1Id === device.id) connectedPorts.add(c.interface1Id);
    if (c.device2Id === device.id) connectedPorts.add(c.interface2Id);
  });

  return (
    <div className="h-full flex flex-col bg-slate-950 p-6 select-none overflow-y-auto">
      {/* Top Hardware Controls */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-sky-400" />
            <h3 className="font-semibold text-slate-100 text-sm">{device.model}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Physical Chassis & Port Activity Panel</p>
        </div>

        {/* Power Switch */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                device.power ? 'bg-emerald-400 shadow-md shadow-emerald-400/50' : 'bg-slate-700'
              }`}
            />
            <span className="text-xs font-mono text-slate-300">
              {device.power ? 'SYSTEM READY' : 'STANDBY'}
            </span>
          </div>

          <button
            onClick={onTogglePower}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
              device.power
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                : 'bg-red-800 hover:bg-red-700 text-white shadow-sm'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>Power {device.power ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Realistic Chassis Faceplate */}
      <div className="bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900 border-2 border-slate-700 rounded-lg p-5 shadow-2xl relative">
        {/* Chassis Branding */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-700/80 mb-4">
          <div className="flex items-center gap-2">
            <div className="text-sky-400 font-bold tracking-widest text-sm font-sans flex items-center gap-1">
              <span className="text-base font-extrabold text-sky-300">CISCO</span> SYSTEMS
            </div>
            <span className="text-[11px] text-slate-400 font-mono">| {device.name}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Status LEDs */}
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
              <span>SYS</span>
              <span className={`w-2 h-2 rounded-full ${device.power ? 'bg-emerald-400' : 'bg-slate-700'}`} />
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
              <span>ACT</span>
              <span className={`w-2 h-2 rounded-full ${device.power ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
              <span>PWR</span>
              <span className={`w-2 h-2 rounded-full ${device.power ? 'bg-emerald-400' : 'bg-slate-700'}`} />
            </div>
          </div>
        </div>

        {/* Ports Array */}
        <div className="bg-slate-950/80 border border-slate-800 rounded p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Physical Ports & LED Link Status</span>
            <span className="text-[10px] text-slate-500">Green = Active Link | Off = Disconnected</span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {device.interfaces.map(intf => {
              const isConnected = connectedPorts.has(intf.id);
              const isLinkUp = device.power && intf.isUp && isConnected;

              return (
                <div
                  key={intf.id}
                  className="bg-slate-900 border border-slate-700/80 rounded p-2 flex flex-col items-center justify-between group hover:border-slate-500 transition-colors"
                >
                  {/* LED Activity Light */}
                  <div className="flex items-center gap-1 mb-1.5">
                    <span
                      className={`w-2 h-2 rounded-full transition-colors ${
                        isLinkUp
                          ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse'
                          : 'bg-slate-700'
                      }`}
                      title={isLinkUp ? 'Link Active (Up)' : 'Link Inactive (Down)'}
                    />
                  </div>

                  {/* RJ45 / Serial Port graphic */}
                  <div className="w-8 h-7 bg-slate-950 border border-slate-700 rounded flex flex-col items-center justify-end pb-0.5">
                    <div className="w-5 h-2 bg-slate-800 rounded-xs mb-0.5" />
                    <div className="w-3 h-1.5 bg-amber-600/40 rounded-xs" />
                  </div>

                  {/* Port Label */}
                  <span className="text-[10px] font-mono font-medium text-slate-300 mt-1.5 truncate max-w-full text-center">
                    {intf.shortName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expansion Bays */}
        <div className="mt-4 flex gap-4">
          <div className="flex-1 bg-slate-950/60 border border-dashed border-slate-700 rounded p-3 text-center">
            <span className="text-[11px] font-mono text-slate-500">HWIC-0 / WIC Expansion Bay [Occupied: Gigabit]</span>
          </div>
          <div className="flex-1 bg-slate-950/60 border border-dashed border-slate-700 rounded p-3 text-center">
            <span className="text-[11px] font-mono text-slate-500">HWIC-1 Expansion Bay [Empty]</span>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="mt-6 p-4 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-slate-400 space-y-1">
        <div className="font-semibold text-slate-300">Device Hardware Specifications</div>
        <div>Model Series: {device.model}</div>
        <div>Total Installed Physical Interfaces: {device.interfaces.length}</div>
        <div>System Power State: {device.power ? 'Powered On and Operating' : 'Powered Off (Bootstrap Halted)'}</div>
      </div>
    </div>
  );
};
