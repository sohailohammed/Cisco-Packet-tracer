import React, { useState } from 'react';
import { NetworkDevice, NetworkInterface, StaticRoute, VlanEntry } from '../../types/network';
import { isValidIp, isValidSubnetMask } from '../../utils/ipUtils';
import { Network, Plus, Trash2, Shield, Radio } from 'lucide-react';

interface ConfigViewProps {
  device: NetworkDevice;
  onUpdateDevice: (dev: NetworkDevice) => void;
}

export const ConfigView: React.FC<ConfigViewProps> = ({ device, onUpdateDevice }) => {
  const [selectedSubMenu, setSelectedSubMenu] = useState<'global' | 'interface' | 'routing' | 'vlans'>('global');
  const [selectedIntfId, setSelectedIntfId] = useState<string>(device.interfaces[0]?.id || '');

  // Global settings state
  const [hostname, setHostname] = useState(device.hostname || device.name);
  const [displayName, setDisplayName] = useState(device.name);
  const [defaultGateway, setDefaultGateway] = useState(device.defaultGateway || '');
  const [dnsServer, setDnsServer] = useState(device.dnsServer || '');

  // Static route add form
  const [newRouteNet, setNewRouteNet] = useState('');
  const [newRouteMask, setNewRouteMask] = useState('255.255.255.0');
  const [newRouteNextHop, setNewRouteNextHop] = useState('');

  // VLAN add form
  const [newVlanId, setNewVlanId] = useState('');
  const [newVlanName, setNewVlanName] = useState('');

  const selectedIntf = device.interfaces.find(i => i.id === selectedIntfId);

  const handleSaveGlobal = () => {
    const updated = { ...device, hostname, name: displayName, defaultGateway, dnsServer };
    onUpdateDevice(updated);
  };

  const handleUpdateInterface = (key: keyof NetworkInterface, val: any) => {
    if (!selectedIntf) return;
    const updated = JSON.parse(JSON.stringify(device)) as NetworkDevice;
    const intf = updated.interfaces.find(i => i.id === selectedIntf.id);
    if (intf) {
      (intf as any)[key] = val;
    }
    onUpdateDevice(updated);
  };

  const handleAddStaticRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidIp(newRouteNet) || !isValidSubnetMask(newRouteMask) || !newRouteNextHop) return;

    const updated = JSON.parse(JSON.stringify(device)) as NetworkDevice;
    if (!updated.staticRoutes) updated.staticRoutes = [];
    updated.staticRoutes.push({
      id: `route_${Date.now()}`,
      network: newRouteNet,
      subnetMask: newRouteMask,
      nextHop: newRouteNextHop
    });
    onUpdateDevice(updated);
    setNewRouteNet('');
    setNewRouteNextHop('');
  };

  const handleDeleteStaticRoute = (id: string) => {
    const updated = JSON.parse(JSON.stringify(device)) as NetworkDevice;
    if (updated.staticRoutes) {
      updated.staticRoutes = updated.staticRoutes.filter(r => r.id !== id);
    }
    onUpdateDevice(updated);
  };

  const handleAddVlan = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(newVlanId, 10);
    if (isNaN(id) || id < 1 || id > 4094) return;

    const updated = JSON.parse(JSON.stringify(device)) as NetworkDevice;
    if (!updated.vlans) updated.vlans = [];
    if (!updated.vlans.some(v => v.id === id)) {
      updated.vlans.push({
        id,
        name: newVlanName || `VLAN${id}`,
        status: 'active'
      });
      onUpdateDevice(updated);
    }
    setNewVlanId('');
    setNewVlanName('');
  };

  const isRouter = device.type.startsWith('router') || device.type === 'switch-3560';
  const isSwitch = device.type.startsWith('switch');

  return (
    <div className="h-full flex text-xs bg-slate-900 select-none">
      {/* Left sub-navigation tree */}
      <div className="w-48 bg-slate-950 border-r border-slate-800 p-2 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-semibold text-slate-500 uppercase px-2 py-1">General</div>
        <button
          onClick={() => setSelectedSubMenu('global')}
          className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
            selectedSubMenu === 'global' ? 'bg-sky-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          Global Settings
        </button>

        {isRouter && (
          <button
            onClick={() => setSelectedSubMenu('routing')}
            className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
              selectedSubMenu === 'routing' ? 'bg-sky-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Static Routing
          </button>
        )}

        {isSwitch && (
          <button
            onClick={() => setSelectedSubMenu('vlans')}
            className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
              selectedSubMenu === 'vlans' ? 'bg-sky-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            VLAN Database
          </button>
        )}

        <div className="text-[10px] font-semibold text-slate-500 uppercase px-2 pt-3 pb-1">Interfaces</div>
        <div className="space-y-0.5">
          {device.interfaces.map(intf => (
            <button
              key={intf.id}
              onClick={() => {
                setSelectedSubMenu('interface');
                setSelectedIntfId(intf.id);
              }}
              className={`w-full text-left px-2 py-1 rounded truncate font-mono text-[11px] transition-colors ${
                selectedSubMenu === 'interface' && selectedIntfId === intf.id
                  ? 'bg-sky-600 text-white font-medium'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${intf.isUp ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span>{intf.shortName}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Content Panel */}
      <div className="flex-1 p-5 overflow-y-auto bg-slate-900">
        {/* 1. GLOBAL SETTINGS */}
        {selectedSubMenu === 'global' && (
          <div className="max-w-md space-y-4">
            <h3 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">Global Settings</h3>
            <div>
              <label className="block text-slate-400 mb-1">Display Name:</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Hostname (IOS CLI prompt):</label>
              <input
                type="text"
                value={hostname}
                onChange={e => setHostname(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
              />
            </div>
            {device.type === 'pc' || device.type === 'laptop' || device.type === 'server' ? (
              <>
                <div>
                  <label className="block text-slate-400 mb-1">Default Gateway (IPv4):</label>
                  <input
                    type="text"
                    value={defaultGateway}
                    onChange={e => setDefaultGateway(e.target.value)}
                    placeholder="192.168.1.1"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">DNS Server:</label>
                  <input
                    type="text"
                    value={dnsServer}
                    onChange={e => setDnsServer(e.target.value)}
                    placeholder="192.168.1.100"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>
              </>
            ) : null}

            <button
              onClick={handleSaveGlobal}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium"
            >
              Save Global Configuration
            </button>
          </div>
        )}

        {/* 2. INTERFACE SETTINGS */}
        {selectedSubMenu === 'interface' && selectedIntf && (
          <div className="max-w-md space-y-4">
            <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100 font-mono">{selectedIntf.name}</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-slate-400">Port Status:</span>
                <input
                  type="checkbox"
                  checked={selectedIntf.isUp}
                  onChange={e => handleUpdateInterface('isUp', e.target.checked)}
                  className="rounded text-emerald-500"
                />
                <span className={selectedIntf.isUp ? 'text-emerald-400 font-medium' : 'text-red-400'}>
                  {selectedIntf.isUp ? 'On (no shutdown)' : 'Off (shutdown)'}
                </span>
              </label>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">MAC Address:</label>
              <input
                type="text"
                readOnly
                value={selectedIntf.macAddress}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-400 font-mono"
              />
            </div>

            {selectedIntf.type !== 'console' && (
              <>
                {/* For switches: VLAN & Trunk settings */}
                {isSwitch && (
                  <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-3">
                    <div className="font-semibold text-slate-300">Switchport Mode</div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="swmode"
                          checked={!selectedIntf.isTrunk}
                          onChange={() => handleUpdateInterface('isTrunk', false)}
                        />
                        <span>Access Mode</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="swmode"
                          checked={!!selectedIntf.isTrunk}
                          onChange={() => handleUpdateInterface('isTrunk', true)}
                        />
                        <span>Trunk Mode</span>
                      </label>
                    </div>

                    {!selectedIntf.isTrunk && (
                      <div>
                        <label className="block text-slate-400 mb-1">Access VLAN:</label>
                        <select
                          value={selectedIntf.vlanId || 1}
                          onChange={e => handleUpdateInterface('vlanId', parseInt(e.target.value, 10))}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                        >
                          {(device.vlans || [{ id: 1, name: 'default' }]).map(v => (
                            <option key={v.id} value={v.id}>
                              VLAN {v.id} - {v.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* IP Configuration */}
                {(!isSwitch || device.type === 'switch-3560') && (
                  <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-3">
                    <div className="font-semibold text-slate-300">IPv4 Configuration</div>
                    <div>
                      <label className="block text-slate-400 mb-1">IP Address:</label>
                      <input
                        type="text"
                        value={selectedIntf.ipAddress}
                        onChange={e => handleUpdateInterface('ipAddress', e.target.value)}
                        placeholder="192.168.1.1"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Subnet Mask:</label>
                      <input
                        type="text"
                        value={selectedIntf.subnetMask}
                        onChange={e => handleUpdateInterface('subnetMask', e.target.value)}
                        placeholder="255.255.255.0"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 3. STATIC ROUTING */}
        {selectedSubMenu === 'routing' && isRouter && (
          <div className="max-w-lg space-y-4">
            <h3 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">Static Routing Table</h3>
            
            <form onSubmit={handleAddStaticRoute} className="p-3 bg-slate-950 border border-slate-800 rounded space-y-3">
              <div className="font-semibold text-slate-300 text-xs">Add Static Route (ip route)</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Network:</label>
                  <input
                    type="text"
                    placeholder="192.168.2.0"
                    value={newRouteNet}
                    onChange={e => setNewRouteNet(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Mask:</label>
                  <input
                    type="text"
                    placeholder="255.255.255.0"
                    value={newRouteMask}
                    onChange={e => setNewRouteMask(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Next Hop:</label>
                  <input
                    type="text"
                    placeholder="10.0.0.2"
                    value={newRouteNextHop}
                    onChange={e => setNewRouteNextHop(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Route
              </button>
            </form>

            <div className="space-y-1">
              <div className="text-slate-400 font-medium mb-1">Configured Static Routes:</div>
              {(!device.staticRoutes || device.staticRoutes.length === 0) ? (
                <div className="p-3 text-slate-500 italic bg-slate-950 rounded">No static routes configured.</div>
              ) : (
                device.staticRoutes.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded font-mono">
                    <span className="text-slate-300">
                      {r.network} / {r.subnetMask} via <strong className="text-sky-400">{r.nextHop}</strong>
                    </span>
                    <button
                      onClick={() => handleDeleteStaticRoute(r.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 4. VLAN DATABASE */}
        {selectedSubMenu === 'vlans' && isSwitch && (
          <div className="max-w-md space-y-4">
            <h3 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">VLAN Database</h3>

            <form onSubmit={handleAddVlan} className="p-3 bg-slate-950 border border-slate-800 rounded space-y-3">
              <div className="font-semibold text-slate-300 text-xs">Create New VLAN</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">VLAN Number:</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={newVlanId}
                    onChange={e => setNewVlanId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">VLAN Name:</label>
                  <input
                    type="text"
                    placeholder="Sales"
                    value={newVlanName}
                    onChange={e => setNewVlanName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add VLAN
              </button>
            </form>

            <div className="space-y-1">
              <div className="text-slate-400 font-medium mb-1">Active VLANs:</div>
              {(device.vlans || []).map(v => (
                <div key={v.id} className="flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded">
                  <div className="font-mono text-slate-200">
                    VLAN {v.id}: <span className="text-sky-400">{v.name}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 uppercase">{v.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
