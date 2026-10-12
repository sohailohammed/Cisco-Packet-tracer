import React from 'react';
import { NetworkDevice, NetworkCable } from '../types/network';
import { X, Network, CheckCircle2, AlertCircle } from 'lucide-react';

interface PortSelectionModalProps {
  device: NetworkDevice;
  cables: NetworkCable[];
  onSelectPort: (portId: string) => void;
  onClose: () => void;
  cableType: string;
}

export const PortSelectionModal: React.FC<PortSelectionModalProps> = ({
  device,
  cables,
  onSelectPort,
  onClose,
  cableType
}) => {
  // Determine which ports are already occupied by cables
  const occupiedPortIds = new Set<string>();
  cables.forEach(c => {
    if (c.device1Id === device.id) occupiedPortIds.add(c.interface1Id);
    if (c.device2Id === device.id) occupiedPortIds.add(c.interface2Id);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Select Port: <span className="text-sky-400">{device.name}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cable type notice */}
        <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span>Connecting with: <strong className="text-slate-200 capitalize">{cableType.replace('-', ' ')}</strong></span>
          <span className="text-slate-500">{device.model}</span>
        </div>

        {/* Ports list */}
        <div className="p-3 max-h-80 overflow-y-auto space-y-1">
          {device.interfaces.map(intf => {
            const isOccupied = occupiedPortIds.has(intf.id);
            const isConsole = intf.type === 'console';
            const isEthernet = intf.type === 'ethernet' || intf.type === 'fastethernet' || intf.type === 'gigabit';
            const isSerial = intf.type === 'serial';

            let isCompatible = true;
            if (cableType === 'console' && !isConsole) isCompatible = false;
            if ((cableType === 'straight-through' || cableType === 'crossover') && !isEthernet) isCompatible = false;
            if (cableType === 'serial' && !isSerial) isCompatible = false;

            const disabled = isOccupied || !isCompatible;

            return (
              <button
                key={intf.id}
                disabled={disabled}
                onClick={() => onSelectPort(intf.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-left text-sm transition-all ${
                  disabled
                    ? 'opacity-40 bg-slate-950/40 border border-transparent cursor-not-allowed text-slate-500'
                    : 'bg-slate-800/80 hover:bg-sky-950 hover:border-sky-500 border border-slate-700/60 text-slate-200 hover:text-white cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isOccupied ? 'bg-amber-500' : isCompatible ? 'bg-emerald-400' : 'bg-slate-600'
                    }`}
                  />
                  <div>
                    <div className="font-mono font-medium text-xs text-slate-100">{intf.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {isConsole ? 'Console (Management)' : intf.ipAddress ? `IP: ${intf.ipAddress}` : 'Unconfigured'}
                    </div>
                  </div>
                </div>

                <div className="text-xs">
                  {isOccupied ? (
                    <span className="flex items-center gap-1 text-amber-400 text-[11px]">
                      <AlertCircle className="w-3 h-3" /> Connected
                    </span>
                  ) : !isCompatible ? (
                    <span className="text-slate-500 text-[11px]">Incompatible</span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                      <CheckCircle2 className="w-3 h-3" /> Available
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-800/80 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
