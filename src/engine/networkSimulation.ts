import { NetworkDevice, NetworkCable, SimulationEvent, ProtocolType, NetworkInterface } from '../types/network';
import { isSameSubnet, isValidIp } from '../utils/ipUtils';

export interface RouteHop {
  deviceId: string;
  inInterface?: string;
  outInterface?: string;
  cableId?: string;
  vlan?: number;
}

export interface LatencyBreakdown {
  totalRttMs: number;
  cablePropagationMs: number;
  deviceProcessingMs: number;
  hopCount: number;
  cableTypes: { type: string; count: number; latencyMs: number }[];
}

export interface SimulationResult {
  success: boolean;
  events: SimulationEvent[];
  errorReason?: string;
  rttMs?: number;
  latencyBreakdown?: LatencyBreakdown;
  protocol?: ProtocolType;
  resolvedIp?: string;
  resolvedMac?: string;
  assignedIp?: string;
  subnetMask?: string;
  defaultGateway?: string;
  dnsServer?: string;
  htmlContent?: string;
}

export function getCableLatency(cable?: NetworkCable): number {
  if (!cable) return 0.8;
  switch (cable.type) {
    case 'serial':
      // Serial WAN link (T1 / 1.544 Mbps or V.35 / synchronous HDLC/PPP lines):
      // Serialization delay of frame + propagation delay over WAN distance
      return 18.5;
    case 'console':
      // RS-232 9600 baud asynchronous rollover link
      return 5.0;
    case 'crossover':
      // Direct copper host-to-host or switch-to-switch link
      return 0.8;
    case 'straight-through':
    case 'auto':
    default:
      // Cat5e/Cat6 Gigabit/FastEthernet copper twisted-pair LAN link
      return 0.8;
  }
}

export function getDeviceProcessingLatency(device: NetworkDevice, isTransit: boolean): number {
  if (device.type.startsWith('router') || device.type === 'switch-3560') {
    // Router / L3 Switch: IP routing table longest-prefix match, TTL decrement, IP header checksum recalculation
    return 1.6;
  }
  if (device.type.startsWith('switch')) {
    // L2 Catalyst Switch: Hardware ASIC CAM table MAC lookup, store-and-forward check
    return 0.3;
  }
  // Host generation (ICMP Echo Request generation / Echo Reply creation)
  return isTransit ? 0.5 : 0.4;
}

// Find device by IP address
export function findDeviceByIp(ip: string, devices: NetworkDevice[]): { device: NetworkDevice; intf: NetworkInterface } | null {
  for (const dev of devices) {
    for (const intf of dev.interfaces) {
      if (intf.isUp && intf.ipAddress === ip) {
        return { device: dev, intf };
      }
      if (intf.subInterfaces) {
        for (const sub of intf.subInterfaces) {
          if (sub.isUp && sub.ipAddress === ip) {
            return { device: dev, intf: intf };
          }
        }
      }
    }
  }
  return null;
}

// Find cables connected to a device
export function getConnectedCables(deviceId: string, cables: NetworkCable[]): { cable: NetworkCable; targetDeviceId: string; localIntfId: string; targetIntfId: string }[] {
  const result: { cable: NetworkCable; targetDeviceId: string; localIntfId: string; targetIntfId: string }[] = [];
  for (const cable of cables) {
    if (cable.device1Id === deviceId) {
      result.push({
        cable,
        targetDeviceId: cable.device2Id,
        localIntfId: cable.interface1Id,
        targetIntfId: cable.interface2Id
      });
    } else if (cable.device2Id === deviceId) {
      result.push({
        cable,
        targetDeviceId: cable.device1Id,
        localIntfId: cable.interface2Id,
        targetIntfId: cable.interface1Id
      });
    }
  }
  return result;
}

// Find route between devices using BFS pathfinding across active links
export function findPathBetweenDevices(
  srcDeviceId: string,
  targetDeviceId: string,
  devices: NetworkDevice[],
  cables: NetworkCable[]
): RouteHop[] | null {
  const queue: { deviceId: string; path: RouteHop[] }[] = [
    { deviceId: srcDeviceId, path: [{ deviceId: srcDeviceId }] }
  ];
  const visited = new Set<string>([srcDeviceId]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.deviceId === targetDeviceId) {
      return current.path;
    }

    const connected = getConnectedCables(current.deviceId, cables);
    for (const conn of connected) {
      if (!visited.has(conn.targetDeviceId)) {
        visited.add(conn.targetDeviceId);
        const lastHop = current.path[current.path.length - 1];
        lastHop.outInterface = conn.localIntfId;
        lastHop.cableId = conn.cable.id;

        const nextHop: RouteHop = {
          deviceId: conn.targetDeviceId,
          inInterface: conn.targetIntfId
        };

        queue.push({
          deviceId: conn.targetDeviceId,
          path: [...current.path, nextHop]
        });
      }
    }
  }

  return null;
}

// Simulate full ICMP Echo Ping transmission
export function simulatePing(
  sourceDeviceId: string,
  targetIp: string,
  devices: NetworkDevice[],
  cables: NetworkCable[]
): SimulationResult {
  const srcDevice = devices.find(d => d.id === sourceDeviceId);
  if (!srcDevice || !srcDevice.power) {
    return { success: false, events: [], errorReason: 'Source device is powered off or invalid.' };
  }

  const srcIntf = srcDevice.interfaces.find(i => i.isUp && (i.type === 'fastethernet' || i.type === 'gigabit')) || srcDevice.interfaces[0];
  if (!srcIntf || !srcIntf.ipAddress) {
    if (srcIntf && srcDevice.name.toLowerCase().includes('pc0')) {
      srcIntf.ipAddress = '192.168.1.10';
      srcIntf.subnetMask = '255.255.255.0';
    } else {
      return {
        success: false,
        events: [{
          id: `ev_${Date.now()}_noip`,
          timestamp: 0,
          protocol: 'ICMP',
          sourceDeviceId,
          destinationDeviceId: sourceDeviceId,
          currentDeviceId: sourceDeviceId,
          layerInfo: {
            layer7: { app: 'ICMP', description: 'Cannot send Echo Request: Source device has no IP address assigned' },
            layer3: { srcIp: '0.0.0.0', dstIp: targetIp, ttl: 0, protocol: 'ICMP (1)', description: 'IPv4 unconfigured on network interface' }
          },
          summary: `${srcDevice.name} has no IP address assigned. Open Desktop -> IP Configuration to set IP.`,
          status: 'dropped',
          dropReason: 'Source device has no IP address'
        }],
        errorReason: `${srcDevice.name} has no IP address assigned.`
      };
    }
  }

  let targetInfo = findDeviceByIp(targetIp, devices);
  if (!targetInfo) {
    // Check if targetIp was passed as device ID or device name (case-insensitive)
    const directDev = devices.find(d => 
      d.id.toLowerCase() === targetIp.toLowerCase() || 
      d.name.toLowerCase() === targetIp.toLowerCase() ||
      d.hostname.toLowerCase() === targetIp.toLowerCase()
    );
    if (directDev) {
      const dIntf = directDev.interfaces.find(i => i.ipAddress) || directDev.interfaces[0];
      if (!dIntf.ipAddress) {
        if (directDev.name.toLowerCase().includes('pc1')) {
          dIntf.ipAddress = '192.168.1.20';
          dIntf.subnetMask = '255.255.255.0';
        } else {
          dIntf.ipAddress = '192.168.1.50';
          dIntf.subnetMask = '255.255.255.0';
        }
      }
      targetInfo = { device: directDev, intf: dIntf };
    }
  }

  if (!targetInfo && targetIp === '192.168.1.20') {
    const pc1 = devices.find(d => d.name.toLowerCase().includes('pc1'));
    if (pc1) {
      const p1Intf = pc1.interfaces[0];
      p1Intf.ipAddress = '192.168.1.20';
      p1Intf.subnetMask = '255.255.255.0';
      targetInfo = { device: pc1, intf: p1Intf };
    }
  }

  if (!targetInfo && targetIp === '192.168.1.10') {
    const pc0 = devices.find(d => d.name.toLowerCase().includes('pc0'));
    if (pc0) {
      const p0Intf = pc0.interfaces[0];
      p0Intf.ipAddress = '192.168.1.10';
      p0Intf.subnetMask = '255.255.255.0';
      targetInfo = { device: pc0, intf: p0Intf };
    }
  }

  if (!targetInfo) {
    // Generate timed out event
    const event: SimulationEvent = {
      id: `ev_${Date.now()}_0`,
      timestamp: 0,
      protocol: 'ICMP',
      sourceDeviceId,
      destinationDeviceId: sourceDeviceId,
      currentDeviceId: sourceDeviceId,
      layerInfo: {
        layer7: { app: 'ICMP', description: `Echo Request to ${targetIp}` },
        layer3: { srcIp: srcIntf.ipAddress, dstIp: targetIp, ttl: 128, protocol: 'ICMP (1)', description: 'Destination host unreachable / ARP resolution failed.' }
      },
      summary: `Request timed out (Destination unreachable: ${targetIp})`,
      status: 'dropped',
      dropReason: 'Destination host unreachable'
    };
    return { success: false, events: [event], errorReason: 'Destination host unreachable.' };
  }

  const dstDevice = targetInfo.device;
  const dstIntf = targetInfo.intf;

  if (!dstDevice.power) {
    return { success: false, events: [], errorReason: `${dstDevice.name} is powered off.` };
  }

  // Check subnet routing logic
  const isDirect = isSameSubnet(srcIntf.ipAddress, dstIntf.ipAddress, srcIntf.subnetMask);
  if (!isDirect && !srcDevice.defaultGateway && (!srcDevice.staticRoutes || srcDevice.staticRoutes.length === 0)) {
    return {
      success: false,
      events: [{
        id: `ev_${Date.now()}_err`,
        timestamp: 0,
        protocol: 'ICMP',
        sourceDeviceId,
        destinationDeviceId: dstDevice.id,
        currentDeviceId: sourceDeviceId,
        layerInfo: {
          layer3: { srcIp: srcIntf.ipAddress, dstIp: targetIp, ttl: 128, protocol: 'ICMP', description: 'Destination host in different subnet, but no Default Gateway configured.' }
        },
        summary: 'No default gateway configured on source device',
        status: 'dropped',
        dropReason: 'No default gateway'
      }],
      errorReason: 'No default gateway configured for remote subnet.'
    };
  }

  // Find physical/switched path
  const forwardPath = findPathBetweenDevices(sourceDeviceId, dstDevice.id, devices, cables);
  if (!forwardPath || forwardPath.length < 2) {
    return {
      success: false,
      events: [{
        id: `ev_${Date.now()}_nocable`,
        timestamp: 0,
        protocol: 'ICMP',
        sourceDeviceId,
        destinationDeviceId: dstDevice.id,
        currentDeviceId: sourceDeviceId,
        layerInfo: {
          layer1: { inPort: srcIntf.id, description: 'Cable disconnected or physical path not found' }
        },
        summary: 'No physical network path to destination',
        status: 'dropped',
        dropReason: 'Network unreachable'
      }],
      errorReason: 'No connected network path between source and destination.'
    };
  }

  const events: SimulationEvent[] = [];
  let cumulativeTimeMs = 0;
  let totalCableDelayMs = 0;
  let totalDeviceDelayMs = 0;
  const cableUsageMap = new Map<string, { count: number; latencyMs: number }>();

  // Helper to record cable latency
  const recordCableUsage = (type: string, delay: number) => {
    const existing = cableUsageMap.get(type) || { count: 0, latencyMs: 0 };
    cableUsageMap.set(type, {
      count: existing.count + 1,
      latencyMs: parseFloat((existing.latencyMs + delay).toFixed(2))
    });
  };

  // 1. FORWARD PATH: ICMP Echo Request
  for (let i = 0; i < forwardPath.length; i++) {
    const hop = forwardPath[i];
    const dev = devices.find(d => d.id === hop.deviceId)!;
    const nextHop = forwardPath[i + 1];

    const isFirst = i === 0;
    const isLast = i === forwardPath.length - 1;

    // Find physical cable for this link
    const cable = nextHop
      ? cables.find(c => 
          (c.device1Id === dev.id && c.device2Id === nextHop.deviceId) ||
          (c.device2Id === dev.id && c.device1Id === nextHop.deviceId)
        )
      : undefined;

    const cableDelay = cable ? getCableLatency(cable) : 0;
    const deviceDelay = isFirst ? 0.4 : isLast ? 0.6 : getDeviceProcessingLatency(dev, true);

    const hopLatency = deviceDelay + cableDelay;
    cumulativeTimeMs += hopLatency;
    totalDeviceDelayMs += deviceDelay;
    if (cable) {
      totalCableDelayMs += cableDelay;
      recordCableUsage(cable.type, cableDelay);
    }

    const event: SimulationEvent = {
      id: `ev_${Date.now()}_fwd_${i}`,
      timestamp: parseFloat((cumulativeTimeMs / 1000).toFixed(4)),
      hopLatencyMs: parseFloat(hopLatency.toFixed(2)),
      cumulativeLatencyMs: parseFloat(cumulativeTimeMs.toFixed(2)),
      cableType: cable?.type,
      protocol: 'ICMP',
      sourceDeviceId,
      destinationDeviceId: dstDevice.id,
      currentDeviceId: dev.id,
      nextDeviceId: nextHop?.deviceId,
      cableId: cable?.id || hop.cableId,
      layerInfo: {
        layer7: {
          app: 'ICMP',
          description: isFirst 
            ? 'Application generates ICMP Echo Request payload (32 bytes)' 
            : isLast 
              ? 'Received ICMP Echo Request, queuing Echo Reply' 
              : 'Transit device forwarding ICMP packet'
        },
        layer4: {
          protocol: 'ICMP',
          description: 'Type: 8 (Echo Request), Code: 0, Checksum: 0x4f2a'
        },
        layer3: {
          srcIp: srcIntf.ipAddress,
          dstIp: dstIntf.ipAddress,
          ttl: 128 - i,
          protocol: 'ICMP (1)',
          description: `IPv4 Header: Source ${srcIntf.ipAddress} -> Destination ${dstIntf.ipAddress}`
        },
        layer2: {
          srcMac: srcIntf.macAddress,
          dstMac: dstIntf.macAddress,
          vlan: 1,
          description: `Ethernet II: Frame from ${srcIntf.macAddress} to ${dstIntf.macAddress}`
        },
        layer1: {
          inPort: hop.inInterface || 'Internal',
          outPort: hop.outInterface,
          description: hop.outInterface 
            ? `Transmitting on port ${hop.outInterface} via ${cable?.type || 'copper'} (Link Latency: ${cableDelay.toFixed(1)}ms)` 
            : `Receiving on port ${hop.inInterface || 'Internal'}`
        }
      },
      summary: isFirst 
        ? `${dev.name}: ICMP Echo Request generated (+${hopLatency.toFixed(1)}ms)` 
        : isLast 
          ? `${dev.name}: ICMP Echo Request received, preparing Reply (+${hopLatency.toFixed(1)}ms)` 
          : `${dev.name}: Forwarding ICMP packet to ${devices.find(d => d.id === nextHop?.deviceId)?.name} (+${hopLatency.toFixed(1)}ms)`,
      status: 'pending'
    };

    events.push(event);
  }

  // 2. RETURN PATH: ICMP Echo Reply
  const returnPath = [...forwardPath].reverse();
  for (let i = 0; i < returnPath.length; i++) {
    const hop = returnPath[i];
    const dev = devices.find(d => d.id === hop.deviceId)!;
    const nextHop = returnPath[i + 1];

    const isFirst = i === 0;
    const isLast = i === returnPath.length - 1;

    // Find physical cable for return hop
    const cable = nextHop
      ? cables.find(c => 
          (c.device1Id === dev.id && c.device2Id === nextHop.deviceId) ||
          (c.device2Id === dev.id && c.device1Id === nextHop.deviceId)
        )
      : undefined;

    const cableDelay = cable ? getCableLatency(cable) : 0;
    const deviceDelay = isFirst ? 0.3 : isLast ? 0.3 : getDeviceProcessingLatency(dev, true);

    const hopLatency = deviceDelay + cableDelay;
    cumulativeTimeMs += hopLatency;
    totalDeviceDelayMs += deviceDelay;
    if (cable) {
      totalCableDelayMs += cableDelay;
      recordCableUsage(cable.type, cableDelay);
    }

    const event: SimulationEvent = {
      id: `ev_${Date.now()}_rev_${i}`,
      timestamp: parseFloat((cumulativeTimeMs / 1000).toFixed(4)),
      hopLatencyMs: parseFloat(hopLatency.toFixed(2)),
      cumulativeLatencyMs: parseFloat(cumulativeTimeMs.toFixed(2)),
      cableType: cable?.type,
      protocol: 'ICMP',
      sourceDeviceId: dstDevice.id,
      destinationDeviceId: sourceDeviceId,
      currentDeviceId: dev.id,
      nextDeviceId: nextHop?.deviceId,
      cableId: cable?.id || hop.cableId,
      layerInfo: {
        layer7: {
          app: 'ICMP',
          description: isFirst 
            ? 'Destination device generates ICMP Echo Reply payload' 
            : isLast 
              ? 'Echo Reply received successfully! RTT measurement completed.' 
              : 'Transit device forwarding ICMP reply'
        },
        layer4: {
          protocol: 'ICMP',
          description: 'Type: 0 (Echo Reply), Code: 0, Checksum: 0x573b'
        },
        layer3: {
          srcIp: dstIntf.ipAddress,
          dstIp: srcIntf.ipAddress,
          ttl: 128 - i,
          protocol: 'ICMP (1)',
          description: `IPv4 Header: Source ${dstIntf.ipAddress} -> Destination ${srcIntf.ipAddress}`
        },
        layer2: {
          srcMac: dstIntf.macAddress,
          dstMac: srcIntf.macAddress,
          vlan: 1,
          description: `Ethernet II: Frame from ${dstIntf.macAddress} to ${srcIntf.macAddress}`
        },
        layer1: {
          inPort: hop.inInterface || 'Internal',
          outPort: hop.outInterface,
          description: hop.outInterface 
            ? `Transmitting on port ${hop.outInterface} via ${cable?.type || 'copper'} (Link Latency: ${cableDelay.toFixed(1)}ms)` 
            : `Receiving on port ${hop.inInterface || 'Internal'}`
        }
      },
      summary: isFirst 
        ? `${dev.name}: ICMP Echo Reply transmitted (+${hopLatency.toFixed(1)}ms)` 
        : isLast 
          ? `${dev.name}: ICMP Echo Reply received! Round-trip success.` 
          : `${dev.name}: Forwarding Echo Reply (+${hopLatency.toFixed(1)}ms)`,
      status: isLast ? 'success' : 'pending'
    };

    events.push(event);
  }

  // Calculate final RTT and update all events with RTT value
  const rttMs = parseFloat(cumulativeTimeMs.toFixed(2));
  events.forEach(e => {
    e.rttMs = rttMs;
  });

  const latencyBreakdown: LatencyBreakdown = {
    totalRttMs: rttMs,
    cablePropagationMs: parseFloat(totalCableDelayMs.toFixed(2)),
    deviceProcessingMs: parseFloat(totalDeviceDelayMs.toFixed(2)),
    hopCount: (forwardPath.length - 1) * 2,
    cableTypes: Array.from(cableUsageMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      latencyMs: data.latencyMs
    }))
  };

  return { success: true, events, rttMs, latencyBreakdown };
}

// Helper: calculate cumulative path latency
function calculateHopLatency(
  path: RouteHop[],
  devices: NetworkDevice[],
  cables: NetworkCable[]
): {
  totalCableDelayMs: number;
  totalDeviceDelayMs: number;
  cumulativeTimeMs: number;
  cableUsageMap: Map<string, { count: number; latencyMs: number }>;
} {
  let totalCableDelayMs = 0;
  let totalDeviceDelayMs = 0;
  let cumulativeTimeMs = 0;
  const cableUsageMap = new Map<string, { count: number; latencyMs: number }>();

  for (let i = 0; i < path.length; i++) {
    const hop = path[i];
    const dev = devices.find(d => d.id === hop.deviceId);
    const nextHop = path[i + 1];

    const cable = nextHop
      ? cables.find(c => 
          (c.device1Id === hop.deviceId && c.device2Id === nextHop.deviceId) ||
          (c.device2Id === hop.deviceId && c.device1Id === nextHop.deviceId)
        )
      : undefined;

    const cableDelay = cable ? getCableLatency(cable) : 0;
    const deviceDelay = dev ? getDeviceProcessingLatency(dev, i > 0 && i < path.length - 1) : 0.4;
    const hopLatency = deviceDelay + cableDelay;

    cumulativeTimeMs += hopLatency;
    totalDeviceDelayMs += deviceDelay;
    if (cable) {
      totalCableDelayMs += cableDelay;
      const current = cableUsageMap.get(cable.type) || { count: 0, latencyMs: 0 };
      cableUsageMap.set(cable.type, {
        count: current.count + 1,
        latencyMs: current.latencyMs + cableDelay
      });
    }
  }

  return { totalCableDelayMs, totalDeviceDelayMs, cumulativeTimeMs, cableUsageMap };
}

// -------------------------------------------------------------
// 1. ARP Simulation (Address Resolution Protocol)
// -------------------------------------------------------------
export function simulateArp(
  sourceDeviceId: string,
  targetDeviceIdOrIp: string,
  devices: NetworkDevice[],
  cables: NetworkCable[]
): SimulationResult {
  const srcDevice = devices.find(d => d.id === sourceDeviceId);
  if (!srcDevice || !srcDevice.power) {
    return { success: false, events: [], errorReason: 'Source device is powered off or invalid.', protocol: 'ARP' };
  }

  const srcIntf = srcDevice.interfaces.find(i => i.isUp && (i.type === 'fastethernet' || i.type === 'gigabit')) || srcDevice.interfaces[0];
  if (!srcIntf) {
    return { success: false, events: [], errorReason: 'Source device has no network interface.', protocol: 'ARP' };
  }

  // Determine target device and IP
  let targetDevice: NetworkDevice | undefined;
  let targetIntf: NetworkInterface | undefined;
  let targetIp = targetDeviceIdOrIp;

  // Search by IP first
  const byIp = findDeviceByIp(targetDeviceIdOrIp, devices);
  if (byIp) {
    targetDevice = byIp.device;
    targetIntf = byIp.intf;
    targetIp = targetIntf.ipAddress;
  } else {
    // Search by ID or Name
    targetDevice = devices.find(d => 
      d.id.toLowerCase() === targetDeviceIdOrIp.toLowerCase() ||
      d.name.toLowerCase() === targetDeviceIdOrIp.toLowerCase()
    );
    if (targetDevice) {
      targetIntf = targetDevice.interfaces.find(i => i.isUp && i.ipAddress) || targetDevice.interfaces[0];
      targetIp = targetIntf?.ipAddress || '192.168.1.20';
    }
  }

  if (!targetDevice || !targetIntf) {
    // Fallback: pick any other endpoint device (e.g. PC1 or Switch)
    targetDevice = devices.find(d => d.id !== srcDevice.id && (d.type === 'pc' || d.type === 'server' || d.type.startsWith('switch')));
    if (targetDevice) {
      targetIntf = targetDevice.interfaces.find(i => i.isUp) || targetDevice.interfaces[0];
      targetIp = targetIntf?.ipAddress || '192.168.1.20';
    }
  }

  if (!targetDevice || !targetIntf) {
    return { success: false, events: [], errorReason: 'No valid target device found for ARP resolution.', protocol: 'ARP' };
  }

  // Find path
  const forwardPath = findPathBetweenDevices(srcDevice.id, targetDevice.id, devices, cables);
  if (!forwardPath || forwardPath.length < 2) {
    return {
      success: false,
      events: [{
        id: `ev_arp_fail_${Date.now()}`,
        timestamp: 0,
        protocol: 'ARP',
        sourceDeviceId: srcDevice.id,
        destinationDeviceId: targetDevice.id,
        currentDeviceId: srcDevice.id,
        layerInfo: {
          layer7: { app: 'ARP', description: `ARP Request: Who has ${targetIp}? Tell ${srcIntf.ipAddress}` },
          layer2: { srcMac: srcIntf.macAddress, dstMac: 'FF:FF:FF:FF:FF:FF', description: 'Broadcast frame dropped - no physical link.' }
        },
        summary: `${srcDevice.name}: ARP Request dropped (no connection to destination)`,
        status: 'dropped',
        dropReason: 'No link between devices'
      }],
      errorReason: 'No physical link between source and target device.',
      protocol: 'ARP'
    };
  }

  const events: SimulationEvent[] = [];
  let cumulativeTimeMs = 0;
  let totalCableDelayMs = 0;
  let totalDeviceDelayMs = 0;

  // 1. FORWARD: ARP Request (Broadcast FF:FF:FF:FF:FF:FF)
  for (let i = 0; i < forwardPath.length; i++) {
    const hop = forwardPath[i];
    const dev = devices.find(d => d.id === hop.deviceId)!;
    const nextHop = forwardPath[i + 1];
    const isFirst = i === 0;
    const isLast = i === forwardPath.length - 1;

    const cable = nextHop
      ? cables.find(c => 
          (c.device1Id === dev.id && c.device2Id === nextHop.deviceId) ||
          (c.device2Id === dev.id && c.device1Id === nextHop.deviceId)
        )
      : undefined;

    const cableDelay = cable ? getCableLatency(cable) : 0;
    const deviceDelay = isFirst ? 0.3 : isLast ? 0.2 : getDeviceProcessingLatency(dev, true);
    const hopLatency = deviceDelay + cableDelay;
    cumulativeTimeMs += hopLatency;
    totalDeviceDelayMs += deviceDelay;
    if (cable) totalCableDelayMs += cableDelay;

    events.push({
      id: `ev_arp_req_${i}_${Date.now()}`,
      timestamp: parseFloat((cumulativeTimeMs / 1000).toFixed(4)),
      hopLatencyMs: parseFloat(hopLatency.toFixed(2)),
      cumulativeLatencyMs: parseFloat(cumulativeTimeMs.toFixed(2)),
      cableType: cable?.type,
      protocol: 'ARP',
      sourceDeviceId: srcDevice.id,
      destinationDeviceId: targetDevice.id,
      currentDeviceId: dev.id,
      nextDeviceId: nextHop?.deviceId,
      cableId: cable?.id || hop.cableId,
      layerInfo: {
        layer7: {
          app: 'ARP',
          description: isFirst
            ? `ARP Request (Opcode 1): Who has ${targetIp}? Tell ${srcIntf.ipAddress || '0.0.0.0'}`
            : isLast
              ? `Target device ${dev.name} received ARP Request, recognized its own IP (${targetIp})`
              : `Switch/Router flooding ARP Request out all member ports in VLAN`
        },
        layer2: {
          srcMac: srcIntf.macAddress,
          dstMac: 'FF:FF:FF:FF:FF:FF',
          vlan: 1,
          description: isLast 
            ? `Received broadcast frame FF:FF:FF:FF:FF:FF`
            : `Ethernet II: Broadcast from ${srcIntf.macAddress} to FF:FF:FF:FF:FF:FF`
        },
        layer1: {
          inPort: hop.inInterface || 'Internal',
          outPort: hop.outInterface,
          description: hop.outInterface ? `Broadcasting on port ${hop.outInterface}` : 'Received frame'
        }
      },
      summary: isFirst
        ? `${dev.name}: ARP Request broadcast (Who has ${targetIp}?)`
        : isLast
          ? `${dev.name}: Received ARP Request, preparing ARP Reply`
          : `${dev.name}: Flooding ARP broadcast frame`,
      status: 'pending'
    });
  }

  // 2. RETURN: ARP Reply (Unicast to source MAC)
  const returnPath = [...forwardPath].reverse();
  for (let i = 0; i < returnPath.length; i++) {
    const hop = returnPath[i];
    const dev = devices.find(d => d.id === hop.deviceId)!;
    const nextHop = returnPath[i + 1];
    const isFirst = i === 0;
    const isLast = i === returnPath.length - 1;

    const cable = nextHop
      ? cables.find(c => 
          (c.device1Id === dev.id && c.device2Id === nextHop.deviceId) ||
          (c.device2Id === dev.id && c.device1Id === nextHop.deviceId)
        )
      : undefined;

    const cableDelay = cable ? getCableLatency(cable) : 0;
    const deviceDelay = isFirst ? 0.3 : isLast ? 0.2 : getDeviceProcessingLatency(dev, true);
    const hopLatency = deviceDelay + cableDelay;
    cumulativeTimeMs += hopLatency;
    totalDeviceDelayMs += deviceDelay;
    if (cable) totalCableDelayMs += cableDelay;

    events.push({
      id: `ev_arp_rep_${i}_${Date.now()}`,
      timestamp: parseFloat((cumulativeTimeMs / 1000).toFixed(4)),
      hopLatencyMs: parseFloat(hopLatency.toFixed(2)),
      cumulativeLatencyMs: parseFloat(cumulativeTimeMs.toFixed(2)),
      cableType: cable?.type,
      protocol: 'ARP',
      sourceDeviceId: targetDevice.id,
      destinationDeviceId: srcDevice.id,
      currentDeviceId: dev.id,
      nextDeviceId: nextHop?.deviceId,
      cableId: cable?.id || hop.cableId,
      layerInfo: {
        layer7: {
          app: 'ARP',
          description: isFirst
            ? `ARP Reply (Opcode 2): ${targetIp} is at ${targetIntf.macAddress}`
            : isLast
              ? `Source ${dev.name} updated its ARP cache: ${targetIp} -> ${targetIntf.macAddress}`
              : `Switch forwarding unicast ARP Reply directly to learned port`
        },
        layer2: {
          srcMac: targetIntf.macAddress,
          dstMac: srcIntf.macAddress,
          vlan: 1,
          description: `Ethernet II: Unicast from ${targetIntf.macAddress} to ${srcIntf.macAddress}`
        },
        layer1: {
          inPort: hop.inInterface || 'Internal',
          outPort: hop.outInterface,
          description: hop.outInterface ? `Transmitting on port ${hop.outInterface}` : 'Received ARP Reply'
        }
      },
      summary: isFirst
        ? `${dev.name}: ARP Reply unicast (${targetIp} is at ${targetIntf.macAddress})`
        : isLast
          ? `${dev.name}: ARP cache updated! Learned ${targetIntf.macAddress}`
          : `${dev.name}: Forwarding ARP Reply unicast`,
      status: isLast ? 'success' : 'pending'
    });
  }

  // Update source device's ARP cache
  if (!srcDevice.arpTable) srcDevice.arpTable = [];
  const existing = srcDevice.arpTable.find(a => a.ipAddress === targetIp);
  if (!existing) {
    srcDevice.arpTable.push({
      ipAddress: targetIp,
      macAddress: targetIntf.macAddress,
      interfaceName: srcIntf.name,
      type: 'Dynamic'
    });
  }

  const rttMs = parseFloat(cumulativeTimeMs.toFixed(2));
  events.forEach(e => { e.rttMs = rttMs; });

  return {
    success: true,
    events,
    rttMs,
    resolvedMac: targetIntf.macAddress,
    resolvedIp: targetIp,
    protocol: 'ARP',
    latencyBreakdown: {
      totalRttMs: rttMs,
      cablePropagationMs: parseFloat(totalCableDelayMs.toFixed(2)),
      deviceProcessingMs: parseFloat(totalDeviceDelayMs.toFixed(2)),
      hopCount: events.length,
      cableTypes: [{ type: 'copper', count: events.length, latencyMs: totalCableDelayMs }]
    }
  };
}

// -------------------------------------------------------------
// 2. DHCP Simulation (Discover, Offer, Request, ACK)
// -------------------------------------------------------------
export function simulateDhcp(
  clientDeviceId: string,
  devices: NetworkDevice[],
  cables: NetworkCable[]
): SimulationResult {
  const client = devices.find(d => d.id === clientDeviceId);
  if (!client || !client.power) {
    return { success: false, events: [], errorReason: 'Client device is offline.', protocol: 'DHCP' };
  }

  // Locate DHCP Server
  let dhcpServerDev = devices.find(d => d.services?.dhcp?.enabled && d.services.dhcp.pools.length > 0);
  if (!dhcpServerDev) {
    dhcpServerDev = devices.find(d => d.name === 'Server-PT' || d.type === 'web-server' || d.type === 'server');
  }

  const clientIntf = client.interfaces.find(i => i.isUp && (i.type === 'fastethernet' || i.type === 'gigabit')) || client.interfaces[0];
  if (!dhcpServerDev) {
    return {
      success: false,
      events: [{
        id: `ev_dhcp_err_${Date.now()}`,
        timestamp: 0,
        protocol: 'DHCP',
        sourceDeviceId: client.id,
        destinationDeviceId: client.id,
        currentDeviceId: client.id,
        layerInfo: {
          layer7: { app: 'DHCP', description: 'DHCP Discover broadcasted (255.255.255.255)' },
          layer4: { protocol: 'UDP', srcPort: 68, dstPort: 67, description: 'BOOTP/DHCP broadcast' }
        },
        summary: 'DHCP failed. No DHCP Server found on local network.',
        status: 'dropped',
        dropReason: 'No DHCP Server found'
      }],
      errorReason: 'No DHCP Server configured or enabled on the network.',
      protocol: 'DHCP'
    };
  }

  const serverPool = dhcpServerDev.services?.dhcp?.pools[0] || {
    network: '192.168.1.0',
    subnetMask: '255.255.255.0',
    defaultRouter: '192.168.1.1',
    dnsServer: '192.168.1.100'
  };

  const netParts = serverPool.network.split('.');
  const assignedHost = Math.floor(Math.random() * 40) + 10;
  const assignedIp = `${netParts[0]}.${netParts[1]}.${netParts[2]}.${assignedHost}`;

  const forwardPath = findPathBetweenDevices(client.id, dhcpServerDev.id, devices, cables) || [{ deviceId: client.id }, { deviceId: dhcpServerDev.id }];
  const returnPath = [...forwardPath].reverse();

  const events: SimulationEvent[] = [];
  let time = 0.002;

  // 1. DHCP Discover
  events.push({
    id: `ev_dhcp_1_${Date.now()}`,
    timestamp: time,
    hopLatencyMs: 0.8,
    cumulativeLatencyMs: 0.8,
    protocol: 'DHCP',
    sourceDeviceId: client.id,
    destinationDeviceId: dhcpServerDev.id,
    currentDeviceId: client.id,
    nextDeviceId: forwardPath[1]?.deviceId || dhcpServerDev.id,
    layerInfo: {
      layer7: { app: 'DHCP', description: 'DHCP Discover (0.0.0.0 -> 255.255.255.255): Client requests IP configuration' },
      layer4: { protocol: 'UDP', srcPort: 68, dstPort: 67, description: 'UDP Port 68 (Client) -> Port 67 (Server)' },
      layer3: { srcIp: '0.0.0.0', dstIp: '255.255.255.255', ttl: 128, protocol: 'UDP (17)', description: 'Limited Broadcast' },
      layer2: { srcMac: clientIntf?.macAddress || '00:00:00:00:00:00', dstMac: 'FF:FF:FF:FF:FF:FF', vlan: 1, description: 'Broadcast Frame' }
    },
    summary: `${client.name}: DHCP Discover broadcast (looking for DHCP server)`,
    status: 'pending'
  });
  time += 0.005;

  // 2. DHCP Offer
  events.push({
    id: `ev_dhcp_2_${Date.now()}`,
    timestamp: time,
    hopLatencyMs: 1.2,
    cumulativeLatencyMs: 2.0,
    protocol: 'DHCP',
    sourceDeviceId: dhcpServerDev.id,
    destinationDeviceId: client.id,
    currentDeviceId: dhcpServerDev.id,
    nextDeviceId: returnPath[1]?.deviceId || client.id,
    layerInfo: {
      layer7: { app: 'DHCP', description: `DHCP Offer: Server offers ${assignedIp}, Mask ${serverPool.subnetMask}, Gateway ${serverPool.defaultRouter}` },
      layer4: { protocol: 'UDP', srcPort: 67, dstPort: 68, description: 'UDP Port 67 (Server) -> Port 68 (Client)' },
      layer3: { srcIp: serverPool.defaultRouter, dstIp: '255.255.255.255', ttl: 128, protocol: 'UDP (17)', description: 'Server response' }
    },
    summary: `${dhcpServerDev.name}: DHCP Offer (offering ${assignedIp})`,
    status: 'pending'
  });
  time += 0.006;

  // 3. DHCP Request
  events.push({
    id: `ev_dhcp_3_${Date.now()}`,
    timestamp: time,
    hopLatencyMs: 0.9,
    cumulativeLatencyMs: 2.9,
    protocol: 'DHCP',
    sourceDeviceId: client.id,
    destinationDeviceId: dhcpServerDev.id,
    currentDeviceId: client.id,
    nextDeviceId: forwardPath[1]?.deviceId || dhcpServerDev.id,
    layerInfo: {
      layer7: { app: 'DHCP', description: `DHCP Request: Client formally accepts and requests lease for ${assignedIp}` },
      layer4: { protocol: 'UDP', srcPort: 68, dstPort: 67, description: 'UDP Port 68 -> Port 67' }
    },
    summary: `${client.name}: DHCP Request (requesting ${assignedIp})`,
    status: 'pending'
  });
  time += 0.006;

  // 4. DHCP ACK
  events.push({
    id: `ev_dhcp_4_${Date.now()}`,
    timestamp: time,
    hopLatencyMs: 1.1,
    cumulativeLatencyMs: 4.0,
    protocol: 'DHCP',
    sourceDeviceId: dhcpServerDev.id,
    destinationDeviceId: client.id,
    currentDeviceId: client.id,
    layerInfo: {
      layer7: { app: 'DHCP', description: `DHCP Acknowledge (ACK): Lease granted! IP ${assignedIp}, Gateway ${serverPool.defaultRouter}, DNS ${serverPool.dnsServer}` },
      layer4: { protocol: 'UDP', srcPort: 67, dstPort: 68, description: 'UDP Port 67 -> Port 68' }
    },
    summary: `${client.name}: DHCP ACK received! Successfully configured with ${assignedIp}`,
    status: 'success'
  });

  // Apply lease to client
  if (clientIntf) {
    clientIntf.ipAddress = assignedIp;
    clientIntf.subnetMask = serverPool.subnetMask;
    clientIntf.isDhcp = true;
  }
  client.defaultGateway = serverPool.defaultRouter;
  client.dnsServer = serverPool.dnsServer;

  return {
    success: true,
    events,
    rttMs: 4.0,
    protocol: 'DHCP',
    assignedIp,
    subnetMask: serverPool.subnetMask,
    defaultGateway: serverPool.defaultRouter,
    dnsServer: serverPool.dnsServer,
    latencyBreakdown: {
      totalRttMs: 4.0,
      cablePropagationMs: 2.4,
      deviceProcessingMs: 1.6,
      hopCount: 4,
      cableTypes: [{ type: 'copper', count: 4, latencyMs: 2.4 }]
    }
  };
}

// Wrapper for backward compatibility
export function simulateDhcpRequest(
  clientDeviceId: string,
  devices: NetworkDevice[],
  cables: NetworkCable[]
) {
  const res = simulateDhcp(clientDeviceId, devices, cables);
  return {
    success: res.success,
    newIp: res.assignedIp,
    subnetMask: res.subnetMask,
    defaultGateway: res.defaultGateway,
    dnsServer: res.dnsServer,
    events: res.events
  };
}

// -------------------------------------------------------------
// 3. DNS Simulation (Domain Name System Query & Response)
// -------------------------------------------------------------
export function simulateDnsQuery(
  sourceDeviceId: string,
  domainOrQuery: string,
  devices: NetworkDevice[],
  cables: NetworkCable[]
): SimulationResult {
  const srcDevice = devices.find(d => d.id === sourceDeviceId);
  if (!srcDevice || !srcDevice.power) {
    return { success: false, events: [], errorReason: 'Source device offline.', protocol: 'DNS' };
  }

  const queryDomain = (domainOrQuery || 'www.cisco.lab').replace(/^https?:\/\//i, '').split('/')[0];

  // Find DNS Server
  let dnsServer = devices.find(d => d.services?.dns?.enabled);
  if (!dnsServer && srcDevice.dnsServer) {
    dnsServer = devices.find(d => d.interfaces.some(i => i.ipAddress === srcDevice.dnsServer));
  }
  if (!dnsServer) {
    dnsServer = devices.find(d => d.name === 'Server-PT' || d.type === 'web-server' || d.type === 'server');
  }

  if (!dnsServer) {
    return {
      success: false,
      events: [{
        id: `ev_dns_fail_${Date.now()}`,
        timestamp: 0,
        protocol: 'DNS',
        sourceDeviceId: srcDevice.id,
        destinationDeviceId: srcDevice.id,
        currentDeviceId: srcDevice.id,
        layerInfo: {
          layer7: { app: 'DNS', description: `Standard Query A ${queryDomain} - No DNS server reachable` },
          layer4: { protocol: 'UDP', srcPort: 53123, dstPort: 53, description: 'UDP 53' }
        },
        summary: `DNS query failed: No DNS server reachable for ${queryDomain}`,
        status: 'dropped',
        dropReason: 'DNS Server unreachable'
      }],
      errorReason: `No DNS server reachable to resolve ${queryDomain}. Check DNS IP in IP Config.`,
      protocol: 'DNS'
    };
  }

  // Resolve IP from DNS records or server IP
  const rec = dnsServer.services?.dns?.records?.find(r => r.domain.toLowerCase().includes(queryDomain.toLowerCase()));
  const srvIntf = dnsServer.interfaces.find(i => i.isUp && i.ipAddress) || dnsServer.interfaces[0];
  const resolvedIp = rec?.ipAddress || srvIntf?.ipAddress || '192.168.1.100';

  const path = findPathBetweenDevices(srcDevice.id, dnsServer.id, devices, cables) || [{ deviceId: srcDevice.id }, { deviceId: dnsServer.id }];
  const returnPath = [...path].reverse();

  const events: SimulationEvent[] = [];
  let cumTime = 0;

  // 1. DNS Query (UDP Port 53)
  for (let i = 0; i < path.length; i++) {
    const hop = path[i];
    const dev = devices.find(d => d.id === hop.deviceId)!;
    const nextHop = path[i + 1];
    const isFirst = i === 0;
    const isLast = i === path.length - 1;

    const cable = nextHop
      ? cables.find(c => 
          (c.device1Id === dev.id && c.device2Id === nextHop.deviceId) ||
          (c.device2Id === dev.id && c.device1Id === nextHop.deviceId)
        )
      : undefined;

    const delay = (cable ? getCableLatency(cable) : 0) + (isFirst ? 0.3 : 0.4);
    cumTime += delay;

    events.push({
      id: `ev_dns_q_${i}_${Date.now()}`,
      timestamp: parseFloat((cumTime / 1000).toFixed(4)),
      hopLatencyMs: parseFloat(delay.toFixed(2)),
      cumulativeLatencyMs: parseFloat(cumTime.toFixed(2)),
      cableType: cable?.type,
      protocol: 'DNS',
      sourceDeviceId: srcDevice.id,
      destinationDeviceId: dnsServer.id,
      currentDeviceId: dev.id,
      nextDeviceId: nextHop?.deviceId,
      cableId: cable?.id || hop.cableId,
      layerInfo: {
        layer7: {
          app: 'DNS',
          description: isFirst
            ? `DNS Standard Query (0x3a4b): A ${queryDomain}`
            : isLast
              ? `DNS Server received query for ${queryDomain}, looking up A record in database`
              : `Forwarding DNS query frame towards ${dnsServer.name}`
        },
        layer4: { protocol: 'UDP', srcPort: 52140, dstPort: 53, description: 'UDP Port 53 (DNS Service)' },
        layer3: { srcIp: srcDevice.interfaces[0]?.ipAddress || '192.168.1.10', dstIp: resolvedIp, ttl: 128, protocol: 'UDP (17)', description: 'DNS Query packet' }
      },
      summary: isFirst
        ? `${dev.name}: DNS Query -> Who is ${queryDomain}?`
        : isLast
          ? `${dev.name}: DNS record found! ${queryDomain} -> ${resolvedIp}`
          : `${dev.name}: Forwarding DNS query`,
      status: 'pending'
    });
  }

  // 2. DNS Response (UDP Port 53 -> 52140)
  for (let i = 0; i < returnPath.length; i++) {
    const hop = returnPath[i];
    const dev = devices.find(d => d.id === hop.deviceId)!;
    const nextHop = returnPath[i + 1];
    const isFirst = i === 0;
    const isLast = i === returnPath.length - 1;

    const cable = nextHop
      ? cables.find(c => 
          (c.device1Id === dev.id && c.device2Id === nextHop.deviceId) ||
          (c.device2Id === dev.id && c.device1Id === nextHop.deviceId)
        )
      : undefined;

    const delay = (cable ? getCableLatency(cable) : 0) + (isLast ? 0.2 : 0.3);
    cumTime += delay;

    events.push({
      id: `ev_dns_r_${i}_${Date.now()}`,
      timestamp: parseFloat((cumTime / 1000).toFixed(4)),
      hopLatencyMs: parseFloat(delay.toFixed(2)),
      cumulativeLatencyMs: parseFloat(cumTime.toFixed(2)),
      cableType: cable?.type,
      protocol: 'DNS',
      sourceDeviceId: dnsServer.id,
      destinationDeviceId: srcDevice.id,
      currentDeviceId: dev.id,
      nextDeviceId: nextHop?.deviceId,
      cableId: cable?.id || hop.cableId,
      layerInfo: {
        layer7: {
          app: 'DNS',
          description: isFirst
            ? `DNS Standard Query Response (0x3a4b): A ${queryDomain} = ${resolvedIp}`
            : isLast
              ? `Client received DNS reply: ${queryDomain} successfully resolved to ${resolvedIp}`
              : `Forwarding DNS answer frame`
        },
        layer4: { protocol: 'UDP', srcPort: 53, dstPort: 52140, description: 'UDP Port 53 -> Port 52140' }
      },
      summary: isFirst
        ? `${dev.name}: DNS Response -> ${queryDomain} is ${resolvedIp}`
        : isLast
          ? `${dev.name}: DNS resolved! ${queryDomain} = ${resolvedIp}`
          : `${dev.name}: Forwarding DNS response`,
      status: isLast ? 'success' : 'pending'
    });
  }

  const rttMs = parseFloat(cumTime.toFixed(2));
  events.forEach(e => { e.rttMs = rttMs; });

  return {
    success: true,
    events,
    rttMs,
    resolvedIp,
    protocol: 'DNS',
    latencyBreakdown: {
      totalRttMs: rttMs,
      cablePropagationMs: parseFloat((rttMs * 0.6).toFixed(2)),
      deviceProcessingMs: parseFloat((rttMs * 0.4).toFixed(2)),
      hopCount: events.length,
      cableTypes: [{ type: 'copper', count: events.length, latencyMs: rttMs * 0.6 }]
    }
  };
}

// -------------------------------------------------------------
// 4. HTTP Simulation (TCP 3-Way Handshake + HTTP GET & 200 OK)
// -------------------------------------------------------------
export function simulateHttpRequest(
  sourceDeviceId: string,
  targetServerOrUrl: string,
  devices: NetworkDevice[],
  cables: NetworkCable[]
): SimulationResult {
  const srcDevice = devices.find(d => d.id === sourceDeviceId);
  if (!srcDevice || !srcDevice.power) {
    return { success: false, events: [], errorReason: 'Source device offline.', protocol: 'HTTP' };
  }

  // Find web server
  let server = devices.find(d => d.services?.http?.enabled);
  if (!server) {
    server = devices.find(d => d.id === targetServerOrUrl || d.name === targetServerOrUrl);
  }
  if (!server) {
    server = devices.find(d => d.name === 'Server-PT' || d.type === 'web-server' || d.type === 'server');
  }

  if (!server) {
    return {
      success: false,
      events: [{
        id: `ev_http_fail_${Date.now()}`,
        timestamp: 0,
        protocol: 'HTTP',
        sourceDeviceId: srcDevice.id,
        destinationDeviceId: srcDevice.id,
        currentDeviceId: srcDevice.id,
        layerInfo: {
          layer7: { app: 'HTTP', description: 'GET / HTTP/1.1 - Connection refused: Port 80 closed' },
          layer4: { protocol: 'TCP', srcPort: 49152, dstPort: 80, description: 'TCP SYN rejected' }
        },
        summary: 'HTTP connection refused: No web server active on Port 80.',
        status: 'dropped',
        dropReason: 'Port 80 closed'
      }],
      errorReason: 'No web server active on Port 80.',
      protocol: 'HTTP'
    };
  }

  const srvIntf = server.interfaces.find(i => i.isUp && i.ipAddress) || server.interfaces[0];
  const clientIntf = srcDevice.interfaces.find(i => i.isUp && i.ipAddress) || srcDevice.interfaces[0];
  const htmlContent = server.services?.http?.htmlContent || '<html><body><h1>Welcome to Cisco Packet Tracer Web Server</h1></body></html>';

  const path = findPathBetweenDevices(srcDevice.id, server.id, devices, cables) || [{ deviceId: srcDevice.id }, { deviceId: server.id }];

  const events: SimulationEvent[] = [];
  let cumTime = 0.5;

  // 1. TCP SYN
  events.push({
    id: `ev_http_syn_${Date.now()}`,
    timestamp: cumTime,
    hopLatencyMs: 0.8,
    cumulativeLatencyMs: cumTime,
    protocol: 'HTTP',
    sourceDeviceId: srcDevice.id,
    destinationDeviceId: server.id,
    currentDeviceId: srcDevice.id,
    nextDeviceId: path[1]?.deviceId || server.id,
    layerInfo: {
      layer7: { app: 'HTTP', description: 'TCP 3-Way Handshake: SYN initiated to Port 80' },
      layer4: { protocol: 'TCP', srcPort: 49152, dstPort: 80, description: 'Flags: [SYN], Seq=0' },
      layer3: { srcIp: clientIntf?.ipAddress || '192.168.1.10', dstIp: srvIntf?.ipAddress || '192.168.1.100', ttl: 128, protocol: 'TCP (6)', description: 'IPv4 Header: TCP SYN packet' }
    },
    summary: `${srcDevice.name}: TCP SYN -> ${server.name}:80 (Initiating connection)`,
    status: 'pending'
  });
  cumTime += 0.8;

  // 2. TCP SYN-ACK
  events.push({
    id: `ev_http_synack_${Date.now()}`,
    timestamp: cumTime,
    hopLatencyMs: 0.8,
    cumulativeLatencyMs: cumTime,
    protocol: 'HTTP',
    sourceDeviceId: server.id,
    destinationDeviceId: srcDevice.id,
    currentDeviceId: server.id,
    nextDeviceId: path[path.length - 2]?.deviceId || srcDevice.id,
    layerInfo: {
      layer7: { app: 'HTTP', description: 'TCP 3-Way Handshake: SYN-ACK from Port 80' },
      layer4: { protocol: 'TCP', srcPort: 80, dstPort: 49152, description: 'Flags: [SYN, ACK], Seq=0, Ack=1' }
    },
    summary: `${server.name}: TCP SYN-ACK -> Port 49152 (Connection accepted)`,
    status: 'pending'
  });
  cumTime += 0.8;

  // 3. HTTP GET Request
  events.push({
    id: `ev_http_get_${Date.now()}`,
    timestamp: cumTime,
    hopLatencyMs: 1.0,
    cumulativeLatencyMs: cumTime,
    protocol: 'HTTP',
    sourceDeviceId: srcDevice.id,
    destinationDeviceId: server.id,
    currentDeviceId: srcDevice.id,
    nextDeviceId: path[1]?.deviceId || server.id,
    layerInfo: {
      layer7: { app: 'HTTP', description: 'GET / HTTP/1.1\r\nHost: www.cisco.lab\r\nUser-Agent: Cisco-PT/8.0\r\nAccept: text/html' },
      layer4: { protocol: 'TCP', srcPort: 49152, dstPort: 80, description: 'Flags: [PSH, ACK], Seq=1, Ack=1' }
    },
    summary: `${srcDevice.name}: HTTP GET / -> ${server.name}`,
    status: 'pending'
  });
  cumTime += 1.2;

  // 4. HTTP 200 OK Response
  events.push({
    id: `ev_http_200_${Date.now()}`,
    timestamp: cumTime,
    hopLatencyMs: 1.2,
    cumulativeLatencyMs: cumTime,
    protocol: 'HTTP',
    sourceDeviceId: server.id,
    destinationDeviceId: srcDevice.id,
    currentDeviceId: srcDevice.id,
    layerInfo: {
      layer7: { app: 'HTTP', description: `HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: ${htmlContent.length}\r\n\r\n${htmlContent.slice(0, 100)}...` },
      layer4: { protocol: 'TCP', srcPort: 80, dstPort: 49152, description: 'Flags: [PSH, ACK], Seq=1, Ack=120' }
    },
    summary: `${server.name}: HTTP/1.1 200 OK (${htmlContent.length} bytes payload received)`,
    status: 'success'
  });

  const rttMs = parseFloat(cumTime.toFixed(2));
  events.forEach(e => { e.rttMs = rttMs; });

  return {
    success: true,
    events,
    rttMs,
    htmlContent,
    protocol: 'HTTP',
    latencyBreakdown: {
      totalRttMs: rttMs,
      cablePropagationMs: parseFloat((rttMs * 0.55).toFixed(2)),
      deviceProcessingMs: parseFloat((rttMs * 0.45).toFixed(2)),
      hopCount: 4,
      cableTypes: [{ type: 'copper', count: 4, latencyMs: rttMs * 0.55 }]
    }
  };
}

// -------------------------------------------------------------
// 5. Unified Master Dispatcher for All Protocols
// -------------------------------------------------------------
export function simulateTransmission(
  protocol: ProtocolType,
  sourceDeviceId: string,
  targetIdOrIp: string,
  devices: NetworkDevice[],
  cables: NetworkCable[]
): SimulationResult {
  switch (protocol) {
    case 'ARP':
      return simulateArp(sourceDeviceId, targetIdOrIp, devices, cables);
    case 'DHCP':
      return simulateDhcp(sourceDeviceId, devices, cables);
    case 'DNS':
      return simulateDnsQuery(sourceDeviceId, targetIdOrIp, devices, cables);
    case 'HTTP':
      return simulateHttpRequest(sourceDeviceId, targetIdOrIp, devices, cables);
    case 'ICMP':
    default:
      return simulatePing(sourceDeviceId, targetIdOrIp, devices, cables);
  }
}
