import React, { useState } from 'react';
import { NetworkDevice, DnsRecord } from '../../types/network';
import { Globe, Server, Database, Plus, Trash2 } from 'lucide-react';

interface ServicesViewProps {
  device: NetworkDevice;
  onUpdateDevice: (dev: NetworkDevice) => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({ device, onUpdateDevice }) => {
  const [selectedService, setSelectedService] = useState<'http' | 'dhcp' | 'dns'>('http');

  const services = device.services || {
    http: { enabled: true, port: 80, htmlContent: '' },
    dns: { enabled: true, records: [] },
    dhcp: { enabled: false, pools: [] }
  };

  // HTTP state
  const [httpEnabled, setHttpEnabled] = useState(services.http.enabled);
  const [htmlContent, setHtmlContent] = useState(services.http.htmlContent);

  // DNS state
  const [dnsEnabled, setDnsEnabled] = useState(services.dns.enabled);
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>(services.dns.records);
  const [newDomain, setNewDomain] = useState('');
  const [newIp, setNewIp] = useState('');

  // DHCP state
  const [dhcpEnabled, setDhcpEnabled] = useState(services.dhcp.enabled);
  const pool = services.dhcp.pools[0] || {
    poolName: 'server-pool',
    network: '192.168.1.0',
    subnetMask: '255.255.255.0',
    defaultRouter: '192.168.1.1',
    dnsServer: '192.168.1.100',
    leasedIps: []
  };
  const [poolNet, setPoolNet] = useState(pool.network);
  const [poolMask, setPoolMask] = useState(pool.subnetMask);
  const [poolGateway, setPoolGateway] = useState(pool.defaultRouter);
  const [poolDns, setPoolDns] = useState(pool.dnsServer);

  const saveServices = (newServices: any) => {
    const updated = JSON.parse(JSON.stringify(device)) as NetworkDevice;
    updated.services = newServices;
    onUpdateDevice(updated);
  };

  const handleSaveHttp = () => {
    saveServices({
      ...services,
      http: { ...services.http, enabled: httpEnabled, htmlContent }
    });
  };

  const handleAddDnsRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain || !newIp) return;
    const nextRecords = [...dnsRecords, { domain: newDomain, ipAddress: newIp, type: 'A' as const }];
    setDnsRecords(nextRecords);
    saveServices({
      ...services,
      dns: { ...services.dns, enabled: dnsEnabled, records: nextRecords }
    });
    setNewDomain('');
    setNewIp('');
  };

  const handleDeleteDnsRecord = (idx: number) => {
    const nextRecords = dnsRecords.filter((_, i) => i !== idx);
    setDnsRecords(nextRecords);
    saveServices({
      ...services,
      dns: { ...services.dns, enabled: dnsEnabled, records: nextRecords }
    });
  };

  const handleSaveDhcp = () => {
    const updatedPool = {
      ...pool,
      network: poolNet,
      subnetMask: poolMask,
      defaultRouter: poolGateway,
      dnsServer: poolDns
    };
    saveServices({
      ...services,
      dhcp: { ...services.dhcp, enabled: dhcpEnabled, pools: [updatedPool] }
    });
  };

  return (
    <div className="h-full flex text-xs bg-slate-900 select-none">
      {/* Service selection sidebar */}
      <div className="w-44 bg-slate-950 border-r border-slate-800 p-2 space-y-1">
        <div className="text-[10px] font-semibold text-slate-500 uppercase px-2 py-1">Services</div>
        <button
          onClick={() => setSelectedService('http')}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded transition-colors ${
            selectedService === 'http' ? 'bg-sky-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>HTTP Server</span>
        </button>

        <button
          onClick={() => setSelectedService('dhcp')}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded transition-colors ${
            selectedService === 'dhcp' ? 'bg-sky-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>DHCP Service</span>
        </button>

        <button
          onClick={() => setSelectedService('dns')}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded transition-colors ${
            selectedService === 'dns' ? 'bg-sky-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>DNS Service</span>
        </button>
      </div>

      {/* Main panel */}
      <div className="flex-1 p-5 overflow-y-auto">
        {/* 1. HTTP SERVICE */}
        {selectedService === 'http' && (
          <div className="max-w-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-slate-100">HTTP Web Server Configuration</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={httpEnabled}
                  onChange={e => setHttpEnabled(e.target.checked)}
                />
                <span className={httpEnabled ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                  Service {httpEnabled ? 'ON' : 'OFF'}
                </span>
              </label>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">HTML File (`index.html`):</label>
              <textarea
                value={htmlContent}
                onChange={e => setHtmlContent(e.target.value)}
                rows={12}
                className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-slate-200 font-mono text-xs outline-none"
              />
            </div>

            <button
              onClick={handleSaveHttp}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium"
            >
              Save HTTP Settings
            </button>
          </div>
        )}

        {/* 2. DHCP SERVICE */}
        {selectedService === 'dhcp' && (
          <div className="max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-slate-100">DHCP Service Pool</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dhcpEnabled}
                  onChange={e => setDhcpEnabled(e.target.checked)}
                />
                <span className={dhcpEnabled ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                  Service {dhcpEnabled ? 'ON' : 'OFF'}
                </span>
              </label>
            </div>

            <div className="space-y-3 bg-slate-950 p-4 border border-slate-800 rounded">
              <div>
                <label className="block text-slate-400 mb-1">Network Address:</label>
                <input
                  type="text"
                  value={poolNet}
                  onChange={e => setPoolNet(e.target.value)}
                  placeholder="192.168.1.0"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Subnet Mask:</label>
                <input
                  type="text"
                  value={poolMask}
                  onChange={e => setPoolMask(e.target.value)}
                  placeholder="255.255.255.0"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Default Gateway:</label>
                <input
                  type="text"
                  value={poolGateway}
                  onChange={e => setPoolGateway(e.target.value)}
                  placeholder="192.168.1.1"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">DNS Server:</label>
                <input
                  type="text"
                  value={poolDns}
                  onChange={e => setPoolDns(e.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                />
              </div>
            </div>

            <button
              onClick={handleSaveDhcp}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium"
            >
              Save DHCP Pool Settings
            </button>
          </div>
        )}

        {/* 3. DNS SERVICE */}
        {selectedService === 'dns' && (
          <div className="max-w-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-slate-100">DNS Resource Records</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dnsEnabled}
                  onChange={e => setDnsEnabled(e.target.checked)}
                />
                <span className={dnsEnabled ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                  Service {dnsEnabled ? 'ON' : 'OFF'}
                </span>
              </label>
            </div>

            <form onSubmit={handleAddDnsRecord} className="p-3 bg-slate-950 border border-slate-800 rounded space-y-3">
              <div className="font-semibold text-slate-300">Add DNS Record (A Record)</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">Domain Name:</label>
                  <input
                    type="text"
                    value={newDomain}
                    onChange={e => setNewDomain(e.target.value)}
                    placeholder="www.cisco.lab"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">IPv4 Address:</label>
                  <input
                    type="text"
                    value={newIp}
                    onChange={e => setNewIp(e.target.value)}
                    placeholder="192.168.1.100"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add DNS Record
              </button>
            </form>

            <div className="space-y-1">
              <div className="text-slate-400 font-medium mb-1">Configured DNS Records:</div>
              {dnsRecords.map((rec, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded font-mono">
                  <span className="text-slate-200">
                    <strong className="text-sky-400">{rec.domain}</strong> &rarr; {rec.ipAddress} (Type {rec.type})
                  </span>
                  <button
                    onClick={() => handleDeleteDnsRecord(i)}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
