import React, { useState } from 'react';
import { NetworkDevice, NetworkCable } from '../../types/network';
import { PhysicalView } from './PhysicalView';
import { ConfigView } from './ConfigView';
import { CliView } from './CliView';
import { DesktopView } from './DesktopView';
import { ServicesView } from './ServicesView';
import { X, Cpu, Settings2, Terminal, Monitor, Server, Maximize2, Minimize2 } from 'lucide-react';

interface DeviceModalProps {
  device: NetworkDevice;
  allDevices: NetworkDevice[];
  cables: NetworkCable[];
  onClose: () => void;
  onUpdateDevice: (dev: NetworkDevice) => void;
  onTriggerSimulation?: (events: any[]) => void;
}

export const DeviceModal: React.FC<DeviceModalProps> = ({
  device,
  allDevices,
  cables,
  onClose,
  onUpdateDevice,
  onTriggerSimulation
}) => {
  const isRouter = device.type.startsWith('router') || device.type === 'switch-3560';
  const isSwitch = device.type.startsWith('switch');
  const isHost = device.type === 'pc' || device.type === 'laptop';
  const isServer = device.type === 'server' || device.type === 'web-server';

  // Default active tab based on device type
  const [activeTab, setActiveTab] = useState<'physical' | 'config' | 'cli' | 'desktop' | 'services'>(
    isRouter || isSwitch ? 'cli' : isHost ? 'desktop' : 'services'
  );
  const [isMaximized, setIsMaximized] = useState(false);

  const handleTogglePower = () => {
    onUpdateDevice({ ...device, power: !device.power });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className={`bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isMaximized
            ? 'w-[98vw] h-[95vh]'
            : 'w-full max-w-4xl h-[700px] max-h-[90vh]'
        }`}
      >
        {/* Window Title Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <h2 className="text-xs font-semibold text-slate-100 flex items-center gap-2">
              <span>{device.name}</span>
              <span className="text-slate-400 font-normal font-mono">({device.model})</span>
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-red-600 transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Cisco Packet Tracer Navigation Tabs */}
        <div className="flex items-center bg-slate-950 border-b border-slate-800 px-3 pt-2 gap-1 text-xs select-none">
          <button
            onClick={() => setActiveTab('physical')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t font-medium border-t-2 transition-all ${
              activeTab === 'physical'
                ? 'bg-slate-900 text-sky-400 border-sky-400 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Physical</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t font-medium border-t-2 transition-all ${
              activeTab === 'config'
                ? 'bg-slate-900 text-sky-400 border-sky-400 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Config</span>
          </button>

          {(isRouter || isSwitch) && (
            <button
              onClick={() => setActiveTab('cli')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t font-medium border-t-2 transition-all ${
                activeTab === 'cli'
                  ? 'bg-slate-900 text-sky-400 border-sky-400 border-x border-slate-800'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>CLI</span>
            </button>
          )}

          {isHost && (
            <button
              onClick={() => setActiveTab('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t font-medium border-t-2 transition-all ${
                activeTab === 'desktop'
                  ? 'bg-slate-900 text-sky-400 border-sky-400 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
          )}

          {isServer && (
            <button
              onClick={() => setActiveTab('services')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t font-medium border-t-2 transition-all ${
                activeTab === 'services'
                  ? 'bg-slate-900 text-sky-400 border-sky-400 border-x border-slate-800'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Services</span>
            </button>
          )}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'physical' && (
            <PhysicalView
              device={device}
              cables={cables}
              onTogglePower={handleTogglePower}
            />
          )}

          {activeTab === 'config' && (
            <ConfigView
              device={device}
              onUpdateDevice={onUpdateDevice}
            />
          )}

          {activeTab === 'cli' && (isRouter || isSwitch) && (
            <CliView
              device={device}
              allDevices={allDevices}
              cables={cables}
              onUpdateDevice={onUpdateDevice}
              onTriggerSimulation={onTriggerSimulation}
            />
          )}

          {activeTab === 'desktop' && isHost && (
            <DesktopView
              device={device}
              allDevices={allDevices}
              cables={cables}
              onUpdateDevice={onUpdateDevice}
              onTriggerSimulation={onTriggerSimulation}
            />
          )}

          {activeTab === 'services' && isServer && (
            <ServicesView
              device={device}
              onUpdateDevice={onUpdateDevice}
            />
          )}
        </div>
      </div>
    </div>
  );
};
