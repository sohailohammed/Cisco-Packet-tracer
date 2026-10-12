import React, { useState, useEffect, useRef } from 'react';
import {
  NetworkDevice,
  NetworkCable,
  SimulationEvent,
  CanvasNote,
  CableType,
  LabChallenge,
  DeviceType,
  ProtocolType
} from './types/network';
import { presetLabs } from './data/presetLabs';
import { createDevice } from './data/deviceFactory';
import { simulateTransmission, simulatePing, findPathBetweenDevices } from './engine/networkSimulation';
import { soundManager } from './utils/audio';

import { Toolbar, ActiveTool } from './components/Toolbar';
import { DeviceDrawer } from './components/DeviceDrawer';
import { TopologyCanvas } from './components/TopologyCanvas';
import { DeviceModal } from './components/DeviceModal/DeviceModal';
import { PortSelectionModal } from './components/PortSelectionModal';
import { SimulationPanel } from './components/SimulationPanel';
import { PduInspectorModal } from './components/PduInspectorModal';
import { LabGuideModal } from './components/LabGuideModal';
import { QuickTransmissionBar } from './components/QuickTransmissionBar';
import { TransmissionGuideModal } from './components/TransmissionGuideModal';
import { TransmissionResultCard } from './components/TransmissionResultCard';

export default function App() {
  // Initialize with Lab 1
  const [currentLab, setCurrentLab] = useState<LabChallenge | null>(presetLabs[0]);
  const [devices, setDevices] = useState<NetworkDevice[]>(() => {
    const saved = localStorage.getItem('pt_topology_devices');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          // Ensure PC0 and PC1 have IP addresses configured and comfortable y coordinates
          parsed.forEach(dev => {
            if (dev.name === 'PC0') {
              if (!dev.interfaces[0]?.ipAddress) {
                dev.interfaces[0].ipAddress = '192.168.1.10';
                dev.interfaces[0].subnetMask = '255.255.255.0';
              }
              if (dev.y > 300) dev.y = 270;
            }
            if (dev.name === 'PC1') {
              if (!dev.interfaces[0]?.ipAddress) {
                dev.interfaces[0].ipAddress = '192.168.1.20';
                dev.interfaces[0].subnetMask = '255.255.255.0';
              }
              if (dev.y > 300) dev.y = 270;
            }
            if (dev.name === 'Switch0' && dev.y > 150) {
              dev.y = 130;
            }
          });
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    // Load initial devices from Lab 1
    return presetLabs[0].initialDevices;
  });

  const [cables, setCables] = useState<NetworkCable[]>(() => {
    const saved = localStorage.getItem('pt_topology_cables');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    return presetLabs[0].initialCables;
  });

  const [notes, setNotes] = useState<CanvasNote[]>([
    {
      id: 'note_welcome',
      x: 100,
      y: 60,
      text: 'Lab 1: Basic LAN Switching\nDouble click PC to configure IP or open CLI.'
    }
  ]);

  // UI state
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [selectedCableType, setSelectedCableType] = useState<CableType | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [pduSourceDeviceId, setPduSourceDeviceId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Cable connection pending state
  const [pendingCableConnection, setPendingCableConnection] = useState<{
    device1: NetworkDevice;
    interface1Id: string;
  } | null>(null);

  // Port selector dialog
  const [portModalConfig, setPortModalConfig] = useState<{
    device: NetworkDevice;
    onSelect: (portId: string) => void;
  } | null>(null);

  // Active Device Modal (Inspect / CLI / Config / Desktop)
  const [inspectingDevice, setInspectingDevice] = useState<NetworkDevice | null>(null);

  // Simulation Mode & Events
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(false);
  const [simulationEvents, setSimulationEvents] = useState<SimulationEvent[]>([]);
  const [currentEventIndex, setCurrentEventIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [inspectPduEvent, setInspectPduEvent] = useState<SimulationEvent | null>(null);

  // Transmission Result Popup Card state
  const [transmissionResult, setTransmissionResult] = useState<{
    isOpen: boolean;
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
  } | null>(null);

  const pendingResultRef = useRef<any>(null);

  // Labs Drawer Modal
  const [isLabGuideOpen, setIsLabGuideOpen] = useState<boolean>(false);
  const [isTransmissionGuideOpen, setIsTransmissionGuideOpen] = useState<boolean>(false);

  // Hidden File input for importing JSON
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('pt_topology_devices', JSON.stringify(devices));
    localStorage.setItem('pt_topology_cables', JSON.stringify(cables));
  }, [devices, cables]);

  // Simulation playback timer
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && simulationEvents.length > 0) {
      interval = setInterval(() => {
        setCurrentEventIndex(prev => {
          if (prev >= simulationEvents.length - 1) {
            setIsPlaying(false);
            if (pendingResultRef.current) {
              setTransmissionResult(pendingResultRef.current);
            }
            return prev;
          }
          const nextIdx = prev + 1;
          soundManager.playPacketHop();
          if (nextIdx >= simulationEvents.length - 1) {
            setIsPlaying(false);
            if (pendingResultRef.current) {
              setTransmissionResult(pendingResultRef.current);
            }
          }
          return nextIdx;
        });
      }, 200 / simulationSpeed);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, simulationEvents, simulationSpeed]);

  // Handlers for Device addition
  const handleAddDevice = (type: DeviceType) => {
    const newDev = createDevice(type, 380 + Math.random() * 120, 240 + Math.random() * 100);
    setDevices(prev => [...prev, newDev]);
    setSelectedDeviceId(newDev.id);
    soundManager.playCableConnect();
  };

  // Device movement
  const handleMoveDevice = (deviceId: string, x: number, y: number) => {
    setDevices(prev =>
      prev.map(d => (d.id === deviceId ? { ...d, x, y } : d))
    );
  };

  // Device update (from CLI or Config)
  const handleUpdateDevice = (updated: NetworkDevice) => {
    setDevices(prev => prev.map(d => (d.id === updated.id ? updated : d)));
    if (inspectingDevice?.id === updated.id) {
      setInspectingDevice(updated);
    }
  };

  // Deletions
  const handleDeleteDevice = (deviceId: string) => {
    setDevices(prev => prev.filter(d => d.id !== deviceId));
    setCables(prev => prev.filter(c => c.device1Id !== deviceId && c.device2Id !== deviceId));
    if (selectedDeviceId === deviceId) setSelectedDeviceId(null);
    if (inspectingDevice?.id === deviceId) setInspectingDevice(null);
  };

  const handleDeleteCable = (cableId: string) => {
    setCables(prev => prev.filter(c => c.id !== cableId));
  };

  // Cable Connection Flow
  const handleDeviceClickForCable = (targetDevice: NetworkDevice) => {
    if (!selectedCableType) return;

    if (!pendingCableConnection) {
      // Step 1: Select first device and prompt for port
      if (selectedCableType === 'auto') {
        // Auto pick first available ethernet port
        const port = targetDevice.interfaces.find(i => {
          const occupied = cables.some(
            c => (c.device1Id === targetDevice.id && c.interface1Id === i.id) ||
                 (c.device2Id === targetDevice.id && c.interface2Id === i.id)
          );
          return !occupied && i.type !== 'console';
        });
        if (port) {
          setPendingCableConnection({ device1: targetDevice, interface1Id: port.id });
          soundManager.playCableConnect();
        }
      } else {
        setPortModalConfig({
          device: targetDevice,
          onSelect: (portId) => {
            setPendingCableConnection({ device1: targetDevice, interface1Id: portId });
            setPortModalConfig(null);
          }
        });
      }
    } else {
      // Step 2: Select second device and connect!
      const dev1 = pendingCableConnection.device1;
      const port1 = pendingCableConnection.interface1Id;

      if (dev1.id === targetDevice.id) {
        // Cannot connect device to itself
        return;
      }

      if (selectedCableType === 'auto') {
        const port2 = targetDevice.interfaces.find(i => {
          const occupied = cables.some(
            c => (c.device1Id === targetDevice.id && c.interface1Id === i.id) ||
                 (c.device2Id === targetDevice.id && c.interface2Id === i.id)
          );
          return !occupied && i.type !== 'console';
        });

        if (port2) {
          createCable(dev1.id, port1, targetDevice.id, port2.id, selectedCableType);
          setPendingCableConnection(null);
          setSelectedCableType(null);
        }
      } else {
        setPortModalConfig({
          device: targetDevice,
          onSelect: (port2Id) => {
            createCable(dev1.id, port1, targetDevice.id, port2Id, selectedCableType);
            setPendingCableConnection(null);
            setSelectedCableType(null);
            setPortModalConfig(null);
          }
        });
      }
    }
  };

  const createCable = (
    dev1Id: string,
    port1Id: string,
    dev2Id: string,
    port2Id: string,
    cableType: CableType
  ) => {
    const newCable: NetworkCable = {
      id: `cable_${Date.now()}`,
      type: cableType,
      device1Id: dev1Id,
      interface1Id: port1Id,
      device2Id: dev2Id,
      interface2Id: port2Id,
      status: 'up'
    };
    setCables(prev => [...prev, newCable]);
    soundManager.playCableConnect();
  };

  // Calculate result card data helper
  const buildResultCardData = (
    sim: any,
    srcDevice: NetworkDevice,
    dstDevice: NetworkDevice,
    targetIp: string,
    protocol: ProtocolType = 'ICMP'
  ) => {
    const srcIntf = srcDevice.interfaces.find(i => i.ipAddress) || srcDevice.interfaces[0];
    const rtt = sim.rttMs || (sim.events.length > 0 ? sim.events[sim.events.length - 1]?.cumulativeLatencyMs || 3.8 : 3.8);
    let cableDelay = 0;
    let deviceDelay = 0;
    let cableType = 'Copper Straight-Through (Cat6)';

    sim.events.forEach((e: any) => {
      if (e.cableType === 'serial') {
        cableDelay += 18.5;
        deviceDelay += Math.max(0, (e.hopLatencyMs || 0) - 18.5);
        cableType = 'Serial WAN (T1 / 1.544 Mbps)';
      } else if (e.cableType) {
        cableDelay += 0.8;
        deviceDelay += Math.max(0, (e.hopLatencyMs || 0) - 0.8);
      } else {
        deviceDelay += (e.hopLatencyMs || 0.4);
      }
    });

    return {
      isOpen: true,
      success: sim.success,
      sourceName: srcDevice.name,
      sourceIp: srcIntf?.ipAddress || (srcDevice.name.includes('PC0') ? '192.168.1.10' : '192.168.1.50'),
      targetName: dstDevice.name,
      targetIp: targetIp,
      rttMs: parseFloat(rtt.toFixed(2)),
      totalHops: sim.events.length,
      cableDelayMs: parseFloat(cableDelay.toFixed(1)),
      deviceDelayMs: parseFloat(deviceDelay.toFixed(1)),
      cableType: cableType,
      events: sim.events,
      errorReason: sim.errorReason,
      protocol: sim.protocol || protocol
    };
  };

  // PDU Tool (Simple PDU Ping Envelope)
  const handleDeviceClickForPdu = (device: NetworkDevice) => {
    if (!pduSourceDeviceId) {
      setPduSourceDeviceId(device.id);
      soundManager.playCableConnect();
    } else {
      // Destination clicked!
      if (pduSourceDeviceId === device.id) {
        setPduSourceDeviceId(null);
        return;
      }

      const srcId = pduSourceDeviceId;
      const srcDevice = devices.find(d => d.id === srcId);
      const targetIntf = device.interfaces.find(i => i.ipAddress) || device.interfaces[0];
      const targetIp = targetIntf?.ipAddress || (device.name === 'PC1' ? '192.168.1.20' : '192.168.1.1');

      const sim = simulateTransmission('ICMP', srcId, targetIp, devices, cables);
      setPduSourceDeviceId(null);
      setActiveTool('select');

      if (srcDevice) {
        const cardData = buildResultCardData(sim, srcDevice, device, targetIp, 'ICMP');
        pendingResultRef.current = cardData;
      }

      setSimulationEvents(sim.events);
      setCurrentEventIndex(0);
      setIsSimulationMode(true);
      setIsPlaying(true);

      if (sim.success) {
        soundManager.playPingSuccess();
      } else {
        soundManager.playPingFail();
      }
    }
  };

  // 1-Click Quick Transmission Handler
  const handleQuickTransmission = (
    srcId: string,
    dstId: string,
    isInstant: boolean = false,
    protocol: ProtocolType = 'ICMP'
  ) => {
    const srcDevice = devices.find(d => d.id === srcId);
    let dstDevice = devices.find(d => d.id === dstId);
    if (!srcDevice) return;

    if (!dstDevice && protocol === 'DHCP') {
      dstDevice = devices.find(d => d.name.toLowerCase().includes('server') || d.type === 'web-server' || d.type === 'server') || srcDevice;
    }
    if (!dstDevice) dstDevice = devices.find(d => d.id !== srcDevice.id) || srcDevice;

    let updatedDevices = [...devices];
    let needsDevUpdate = false;

    // Auto-ensure source has IP if not doing DHCP
    const srcIntf = srcDevice.interfaces.find(i => i.isUp && (i.type === 'fastethernet' || i.type === 'gigabit')) || srcDevice.interfaces[0];
    if (srcIntf && !srcIntf.ipAddress && protocol !== 'DHCP') {
      srcIntf.ipAddress = srcDevice.name.includes('PC0') ? '192.168.1.10' : '192.168.1.50';
      srcIntf.subnetMask = '255.255.255.0';
      needsDevUpdate = true;
    }

    // Auto-ensure destination has IP
    const dstIntf = dstDevice.interfaces.find(i => i.isUp && (i.type === 'fastethernet' || i.type === 'gigabit')) || dstDevice.interfaces[0];
    if (dstIntf && !dstIntf.ipAddress && dstDevice.id !== srcDevice.id) {
      dstIntf.ipAddress = dstDevice.name.includes('PC1') ? '192.168.1.20' : dstDevice.name.includes('Server') ? '192.168.1.100' : '192.168.1.60';
      dstIntf.subnetMask = '255.255.255.0';
      needsDevUpdate = true;
    }

    if (needsDevUpdate) {
      setDevices(updatedDevices);
    }

    // Verify cable path exists, or auto-connect through switch
    let activeCables = [...cables];
    const path = findPathBetweenDevices(srcDevice.id, dstDevice.id, updatedDevices, activeCables);
    if ((!path || path.length < 2) && srcDevice.id !== dstDevice.id) {
      const sw = updatedDevices.find(d => d.type.startsWith('switch'));
      if (sw) {
        activeCables = [
          ...activeCables,
          {
            id: `c_auto_${Date.now()}_1`,
            type: 'straight-through',
            device1Id: srcDevice.id,
            interface1Id: srcIntf?.id || 'Fa0',
            device2Id: sw.id,
            interface2Id: 'Fa0/1',
            status: 'up'
          },
          {
            id: `c_auto_${Date.now()}_2`,
            type: 'straight-through',
            device1Id: dstDevice.id,
            interface1Id: dstIntf?.id || 'Fa0',
            device2Id: sw.id,
            interface2Id: 'Fa0/2',
            status: 'up'
          }
        ];
        setCables(activeCables);
      }
    }

    const targetIpOrId = dstIntf?.ipAddress || dstDevice.id;
    const sim = simulateTransmission(protocol, srcDevice.id, targetIpOrId, updatedDevices, activeCables);
    setPduSourceDeviceId(null);
    setActiveTool('select');

    // If DHCP succeeded, apply the leased IP to device state immediately
    if (protocol === 'DHCP' && sim.success && sim.assignedIp) {
      setDevices(prev => prev.map(d => {
        if (d.id === srcDevice.id) {
          const updated = { ...d };
          const intf = updated.interfaces.find(i => i.id === (srcIntf?.id || 'Fa0'));
          if (intf) {
            intf.ipAddress = sim.assignedIp!;
            intf.subnetMask = sim.subnetMask || '255.255.255.0';
            intf.isDhcp = true;
          }
          if (sim.defaultGateway) updated.defaultGateway = sim.defaultGateway;
          if (sim.dnsServer) updated.dnsServer = sim.dnsServer;
          return updated;
        }
        return d;
      }));
    }

    const cardData = buildResultCardData(sim, srcDevice, dstDevice, targetIpOrId, protocol);
    pendingResultRef.current = cardData;

    setSimulationEvents(sim.events);
    setIsSimulationMode(true);

    if (isInstant) {
      setCurrentEventIndex(sim.events.length - 1);
      setIsPlaying(false);
      setTransmissionResult(cardData);
    } else {
      setCurrentEventIndex(0);
      setIsPlaying(true);
    }

    if (sim.success) {
      soundManager.playPingSuccess();
    } else {
      soundManager.playPingFail();
    }
  };

  const handleInstantFinish = () => {
    if (simulationEvents.length > 0) {
      setCurrentEventIndex(simulationEvents.length - 1);
      setIsPlaying(false);
      if (pendingResultRef.current) {
        setTransmissionResult(pendingResultRef.current);
      }
    }
  };

  // Note actions
  const handleAddNote = (x: number, y: number) => {
    const newNote: CanvasNote = {
      id: `note_${Date.now()}`,
      x,
      y,
      text: 'New Network Note'
    };
    setNotes(prev => [...prev, newNote]);
    setActiveTool('select');
  };

  const handleUpdateNote = (id: string, text: string) => {
    setNotes(prev => prev.map(n => (n.id === id ? { ...n, text } : n)));
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  // Export / Import
  const handleSaveTopology = () => {
    const data = {
      devices,
      cables,
      notes,
      version: '1.0'
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `packet-tracer-lab-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadTopology = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.devices && parsed.cables) {
          setDevices(parsed.devices);
          setCables(parsed.cables);
          if (parsed.notes) setNotes(parsed.notes);
          soundManager.playPingSuccess();
        }
      } catch {
        alert('Invalid JSON topology file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearCanvas = () => {
    if (confirm('Clear entire network topology canvas?')) {
      setDevices([]);
      setCables([]);
      setNotes([]);
      setSimulationEvents([]);
      setCurrentEventIndex(-1);
      setIsPlaying(false);
      localStorage.removeItem('pt_topology_devices');
      localStorage.removeItem('pt_topology_cables');
    }
  };

  // Load a preset lab
  const handleSelectLab = (lab: LabChallenge) => {
    setCurrentLab(lab);
    setDevices(lab.initialDevices);
    
    // Wire initial cables if applicable
    if (lab.id === 'lab-1-basic-lan') {
      const sw = lab.initialDevices.find(d => d.name === 'Switch0');
      const pc0 = lab.initialDevices.find(d => d.name === 'PC0');
      const pc1 = lab.initialDevices.find(d => d.name === 'PC1');
      if (sw && pc0 && pc1) {
        setCables([
          {
            id: 'cable_init_1',
            type: 'straight-through',
            device1Id: pc0.id,
            interface1Id: 'Fa0',
            device2Id: sw.id,
            interface2Id: 'Fa0/1',
            status: 'up'
          },
          {
            id: 'cable_init_2',
            type: 'straight-through',
            device1Id: pc1.id,
            interface1Id: 'Fa0',
            device2Id: sw.id,
            interface2Id: 'Fa0/2',
            status: 'up'
          }
        ]);
      }
    } else if (lab.id === 'lab-2-router-default-gateway') {
      const r0 = lab.initialDevices.find(d => d.name === 'Router0');
      const sw0 = lab.initialDevices.find(d => d.name === 'Switch-LAN1');
      const sw1 = lab.initialDevices.find(d => d.name === 'Switch-LAN2');
      const pc0 = lab.initialDevices.find(d => d.name === 'PC0');
      const pc1 = lab.initialDevices.find(d => d.name === 'PC1');
      if (r0 && sw0 && sw1 && pc0 && pc1) {
        setCables([
          { id: 'c_l2_1', type: 'straight-through', device1Id: pc0.id, interface1Id: 'Fa0', device2Id: sw0.id, interface2Id: 'Fa0/1', status: 'up' },
          { id: 'c_l2_2', type: 'straight-through', device1Id: sw0.id, interface1Id: 'Gig0/1', device2Id: r0.id, interface2Id: 'g0/0', status: 'up' },
          { id: 'c_l2_3', type: 'straight-through', device1Id: r0.id, interface1Id: 'g0/1', device2Id: sw1.id, interface2Id: 'Gig0/1', status: 'up' },
          { id: 'c_l2_4', type: 'straight-through', device1Id: sw1.id, interface1Id: 'Fa0/1', device2Id: pc1.id, interface2Id: 'Fa0', status: 'up' }
        ]);
      }
    } else if (lab.id === 'lab-3-inter-vlan') {
      const r0 = lab.initialDevices.find(d => d.name === 'Router0');
      const sw0 = lab.initialDevices.find(d => d.name === 'Switch0');
      const pc0 = lab.initialDevices.find(d => d.name === 'PC0-Sales');
      const pc1 = lab.initialDevices.find(d => d.name === 'PC1-Eng');
      if (r0 && sw0 && pc0 && pc1) {
        setCables([
          { id: 'c_l3_trunk', type: 'straight-through', device1Id: sw0.id, interface1Id: 'Gig0/1', device2Id: r0.id, interface2Id: 'g0/0', status: 'up' },
          { id: 'c_l3_pc0', type: 'straight-through', device1Id: pc0.id, interface1Id: 'Fa0', device2Id: sw0.id, interface2Id: 'Fa0/1', status: 'up' },
          { id: 'c_l3_pc1', type: 'straight-through', device1Id: pc1.id, interface1Id: 'Fa0', device2Id: sw0.id, interface2Id: 'Fa0/2', status: 'up' }
        ]);
      }
    } else if (lab.id === 'lab-4-static-routing') {
      const rHq = lab.initialDevices.find(d => d.name === 'Router-HQ');
      const rBr = lab.initialDevices.find(d => d.name === 'Router-Branch');
      const pcHq = lab.initialDevices.find(d => d.name === 'PC-HQ');
      const srvBr = lab.initialDevices.find(d => d.name === 'Server-Branch');
      if (rHq && rBr && pcHq && srvBr) {
        setCables([
          { id: 'c_l4_1', type: 'straight-through', device1Id: pcHq.id, interface1Id: 'Fa0', device2Id: rHq.id, interface2Id: 'g0/0', status: 'up' },
          { id: 'c_l4_wan', type: 'serial', device1Id: rHq.id, interface1Id: 's0/0/0', device2Id: rBr.id, interface2Id: 's0/0/0', status: 'up' },
          { id: 'c_l4_2', type: 'straight-through', device1Id: rBr.id, interface1Id: 'g0/0', device2Id: srvBr.id, interface2Id: 'Fa0', status: 'up' }
        ]);
      }
    } else if (lab.id === 'lab-5-ospf-routing') {
      const r1 = lab.initialDevices.find(d => d.name === 'Router1');
      const r2 = lab.initialDevices.find(d => d.name === 'Router2');
      const pc1 = lab.initialDevices.find(d => d.name === 'PC1');
      const pc2 = lab.initialDevices.find(d => d.name === 'PC2');
      if (r1 && r2 && pc1 && pc2) {
        setCables([
          { id: 'c_l5_1', type: 'straight-through', device1Id: pc1.id, interface1Id: 'Fa0', device2Id: r1.id, interface2Id: 'g0/0', status: 'up' },
          { id: 'c_l5_wan', type: 'crossover', device1Id: r1.id, interface1Id: 'g0/1', device2Id: r2.id, interface2Id: 'g0/1', status: 'up' },
          { id: 'c_l5_2', type: 'straight-through', device1Id: pc2.id, interface1Id: 'Fa0', device2Id: r2.id, interface2Id: 'g0/0', status: 'up' }
        ]);
      }
    } else if (lab.id === 'lab-6-dhcp-web-dns') {
      const sw0 = lab.initialDevices.find(d => d.name === 'Switch0');
      const srv = lab.initialDevices.find(d => d.name === 'Server-PT');
      const pc0 = lab.initialDevices.find(d => d.name === 'PC0');
      if (sw0 && srv && pc0) {
        setCables([
          { id: 'c_l6_srv', type: 'straight-through', device1Id: srv.id, interface1Id: 'Fa0', device2Id: sw0.id, interface2Id: 'Fa0/1', status: 'up' },
          { id: 'c_l6_pc', type: 'straight-through', device1Id: pc0.id, interface1Id: 'Fa0', device2Id: sw0.id, interface2Id: 'Fa0/2', status: 'up' }
        ]);
      }
    } else {
      setCables(lab.initialCables || []);
    }

    setNotes([
      {
        id: `note_${lab.id}`,
        x: 100,
        y: 60,
        text: `${lab.title}\nCategory: ${lab.category}`
      }
    ]);
    setSimulationEvents([]);
    setCurrentEventIndex(-1);
    setIsPlaying(false);
    soundManager.playPingSuccess();
  };

  const currentSimEvent = currentEventIndex >= 0 ? simulationEvents[currentEventIndex] : null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100 select-none">
      {/* Hidden File Input for topology import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* Top Application Toolbar */}
      <Toolbar
        activeTool={activeTool}
        onChangeTool={(tool) => {
          setActiveTool(tool);
          if (tool !== 'pdu') setPduSourceDeviceId(null);
          setSelectedCableType(null);
          setPendingCableConnection(null);
        }}
        isSimulationMode={isSimulationMode}
        onToggleSimulationMode={() => setIsSimulationMode(!isSimulationMode)}
        onOpenLabGuide={() => setIsLabGuideOpen(true)}
        onSaveTopology={handleSaveTopology}
        onLoadTopology={handleLoadTopology}
        onClearCanvas={handleClearCanvas}
        onZoomIn={() => setZoomLevel(prev => Math.min(2, parseFloat((prev + 0.1).toFixed(2))))}
        onZoomOut={() => setZoomLevel(prev => Math.max(0.5, parseFloat((prev - 0.1).toFixed(2))))}
        onResetZoom={() => setZoomLevel(1)}
        zoomLevel={zoomLevel}
      />

      {/* 1-Click Quick Transmission Bar */}
      <QuickTransmissionBar
        devices={devices}
        onTriggerTransmission={handleQuickTransmission}
        onOpenGuide={() => setIsTransmissionGuideOpen(true)}
        latestEvent={currentSimEvent}
        isPlaying={isPlaying}
        onInstantFinish={handleInstantFinish}
      />

      {/* Interactive Network Topology Workspace */}
      <div className="flex-1 relative flex overflow-hidden">
        <TopologyCanvas
          devices={devices}
          cables={cables}
          notes={notes}
          activeTool={activeTool}
          selectedCableType={selectedCableType}
          selectedDeviceId={selectedDeviceId}
          pduSourceDeviceId={pduSourceDeviceId}
          currentSimulationEvent={currentSimEvent}
          zoomLevel={zoomLevel}
          onZoomChange={setZoomLevel}
          onSelectDevice={setSelectedDeviceId}
          onMoveDevice={handleMoveDevice}
          onOpenDeviceModal={setInspectingDevice}
          onDeleteDevice={handleDeleteDevice}
          onDeleteCable={handleDeleteCable}
          onDeviceClickForCable={handleDeviceClickForCable}
          onDeviceClickForPdu={handleDeviceClickForPdu}
          onAddNote={handleAddNote}
          onUpdateNote={handleUpdateNote}
          onDeleteNote={handleDeleteNote}
          onSelectEventForInspect={setInspectPduEvent}
        />

        {/* Floating Simulation Panel (Docked bottom right) */}
        {isSimulationMode && (
          <SimulationPanel
            events={simulationEvents}
            currentEventIndex={currentEventIndex}
            isPlaying={isPlaying}
            simulationSpeed={simulationSpeed}
            devices={devices}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onStepForward={() => {
              if (currentEventIndex < simulationEvents.length - 1) {
                setCurrentEventIndex(prev => prev + 1);
                soundManager.playPacketHop();
              }
            }}
            onStepBackward={() => {
              if (currentEventIndex > 0) {
                setCurrentEventIndex(prev => prev - 1);
              }
            }}
            onReset={() => {
              setCurrentEventIndex(0);
              setIsPlaying(false);
            }}
            onChangeSpeed={setSimulationSpeed}
            onSelectEvent={setInspectPduEvent}
          />
        )}
      </div>

      {/* Bottom Device & Cable Shelf */}
      <DeviceDrawer
        onAddDevice={handleAddDevice}
        selectedCableType={selectedCableType}
        onSelectCableType={(type) => {
          setSelectedCableType(type);
          setPendingCableConnection(null);
          if (type) {
            setActiveTool('select');
            setPduSourceDeviceId(null);
          }
        }}
      />

      {/* Port Selection Dialog (when wiring cables) */}
      {portModalConfig && (
        <PortSelectionModal
          device={portModalConfig.device}
          cables={cables}
          cableType={selectedCableType || 'straight-through'}
          onSelectPort={portModalConfig.onSelect}
          onClose={() => {
            setPortModalConfig(null);
            setPendingCableConnection(null);
          }}
        />
      )}

      {/* Device Configuration & IOS CLI Modal */}
      {inspectingDevice && (
        <DeviceModal
          device={inspectingDevice}
          allDevices={devices}
          cables={cables}
          onClose={() => setInspectingDevice(null)}
          onUpdateDevice={handleUpdateDevice}
          onTriggerSimulation={(evs) => {
            setSimulationEvents(evs);
            setCurrentEventIndex(0);
            setIsSimulationMode(true);
            setIsPlaying(true);
          }}
        />
      )}

      {/* PDU 7-Layer OSI Model Inspector Modal */}
      {inspectPduEvent && (
        <PduInspectorModal
          event={inspectPduEvent}
          devices={devices}
          onClose={() => setInspectPduEvent(null)}
        />
      )}

      {/* CCNA Guided Labs Drawer Modal */}
      {isLabGuideOpen && (
        <LabGuideModal
          currentLab={currentLab}
          devices={devices}
          cables={cables}
          onSelectLab={handleSelectLab}
          onClose={() => setIsLabGuideOpen(false)}
        />
      )}

      {/* Transmission Guide Walkthrough Modal */}
      {isTransmissionGuideOpen && (
        <TransmissionGuideModal
          onClose={() => setIsTransmissionGuideOpen(false)}
          onQuickTest={() => {
            if (devices.length >= 2) {
              handleQuickTransmission(devices[0].id, devices[1].id, false);
            }
          }}
        />
      )}

      {/* Prominent Transmission Result Popup Card */}
      {transmissionResult && (
        <TransmissionResultCard
          isOpen={transmissionResult.isOpen}
          onClose={() => setTransmissionResult(null)}
          success={transmissionResult.success}
          sourceName={transmissionResult.sourceName}
          sourceIp={transmissionResult.sourceIp}
          targetName={transmissionResult.targetName}
          targetIp={transmissionResult.targetIp}
          rttMs={transmissionResult.rttMs}
          totalHops={transmissionResult.totalHops}
          cableDelayMs={transmissionResult.cableDelayMs}
          deviceDelayMs={transmissionResult.deviceDelayMs}
          cableType={transmissionResult.cableType}
          events={transmissionResult.events}
          errorReason={transmissionResult.errorReason}
          protocol={transmissionResult.protocol}
          onInspectOsi={() => {
            if (transmissionResult.events.length > 0) {
              setInspectPduEvent(transmissionResult.events[0]);
            }
          }}
          onReplay={() => {
            if (transmissionResult.events.length > 0) {
              setSimulationEvents(transmissionResult.events);
              setCurrentEventIndex(0);
              setIsPlaying(true);
            }
          }}
        />
      )}
    </div>
  );
}
