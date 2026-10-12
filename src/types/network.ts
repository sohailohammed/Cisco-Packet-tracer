export type DeviceType = 
  | 'router-2911' 
  | 'router-2901' 
  | 'switch-2960' 
  | 'switch-3560' 
  | 'pc' 
  | 'laptop' 
  | 'server' 
  | 'web-server';

export type CableType = 
  | 'auto' 
  | 'straight-through' 
  | 'crossover' 
  | 'serial' 
  | 'console';

export type ProtocolType = 'ICMP' | 'ARP' | 'DHCP' | 'DNS' | 'HTTP' | 'OSPF';

export interface NetworkInterface {
  id: string; // e.g. "g0/0", "Fa0/1"
  name: string; // e.g. "GigabitEthernet0/0", "FastEthernet0/1"
  shortName: string; // e.g. "g0/0", "f0/1"
  type: 'ethernet' | 'gigabit' | 'fastethernet' | 'serial' | 'console';
  ipAddress: string;
  subnetMask: string;
  macAddress: string;
  isUp: boolean; // physical/admin state
  isDhcp: boolean;
  vlanId?: number; // for switchport access vlan
  isTrunk?: boolean; // switchport mode trunk
  allowedVlans?: number[];
  connectedCableId?: string;
  connectedToDeviceId?: string;
  connectedToInterfaceId?: string;
  // Sub-interfaces for router-on-a-stick (e.g. g0/0.10)
  subInterfaces?: SubInterface[];
}

export interface SubInterface {
  id: string; // e.g. "g0/0.10"
  name: string; // "GigabitEthernet0/0.10"
  vlanId: number;
  ipAddress: string;
  subnetMask: string;
  isUp: boolean;
}

export interface StaticRoute {
  id: string;
  network: string;
  subnetMask: string;
  nextHop: string;
  interfaceName?: string;
}

export interface OspfNetwork {
  network: string;
  wildcardMask: string;
  area: number;
}

export interface OspfConfig {
  enabled: boolean;
  processId: number;
  routerId: string;
  networks: OspfNetwork[];
}

export interface VlanEntry {
  id: number;
  name: string;
  status: 'active' | 'suspended';
}

export interface MacTableEntry {
  vlan: number;
  macAddress: string;
  type: 'DYNAMIC' | 'STATIC';
  port: string;
}

export interface ArpEntry {
  ipAddress: string;
  macAddress: string;
  interfaceName: string;
  type: 'Dynamic' | 'Static';
}

export interface DhcpPool {
  poolName: string;
  network: string;
  subnetMask: string;
  defaultRouter: string;
  dnsServer: string;
  leasedIps: { ip: string; mac: string; timestamp: number }[];
}

export interface DnsRecord {
  domain: string;
  ipAddress: string;
  type: 'A' | 'CNAME';
}

export interface DeviceServices {
  http: {
    enabled: boolean;
    port: number;
    htmlContent: string;
  };
  dns: {
    enabled: boolean;
    records: DnsRecord[];
  };
  dhcp: {
    enabled: boolean;
    pools: DhcpPool[];
  };
}

export interface NetworkDevice {
  id: string;
  name: string; // e.g. "Router0", "PC1"
  hostname: string; // e.g. "Router", "Switch"
  type: DeviceType;
  model: string; // e.g. "Cisco 2911", "2960-24TT"
  x: number;
  y: number;
  power: boolean;
  interfaces: NetworkInterface[];
  defaultGateway?: string;
  dnsServer?: string;
  staticRoutes?: StaticRoute[];
  ospf?: OspfConfig;
  vlans?: VlanEntry[];
  macTable?: MacTableEntry[];
  arpTable?: ArpEntry[];
  services?: DeviceServices;
  runningConfig?: string;
  cliHistory?: string[];
  notes?: string;
}

export interface NetworkCable {
  id: string;
  type: CableType;
  device1Id: string;
  interface1Id: string;
  device2Id: string;
  interface2Id: string;
  status: 'up' | 'down' | 'learning';
  points?: { x: number; y: number }[];
}

export interface SimulationEvent {
  id: string;
  timestamp: number;
  protocol: ProtocolType;
  sourceDeviceId: string;
  destinationDeviceId: string;
  currentDeviceId: string;
  nextDeviceId?: string;
  cableId?: string;
  layerInfo: {
    layer7?: { app: string; description: string };
    layer4?: { protocol: string; srcPort?: number; dstPort?: number; description: string };
    layer3?: { srcIp: string; dstIp: string; ttl: number; protocol: string; description: string };
    layer2?: { srcMac: string; dstMac: string; vlan?: number; description: string };
    layer1?: { inPort: string; outPort?: string; description: string };
  };
  summary: string;
  status: 'pending' | 'success' | 'dropped';
  dropReason?: string;
  hopLatencyMs?: number;
  cumulativeLatencyMs?: number;
  rttMs?: number;
  cableType?: CableType;
}

export interface LabChallenge {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  description: string;
  objectives: {
    id: string;
    description: string;
    hint: string;
    check: (devices: NetworkDevice[], cables: NetworkCable[]) => boolean;
  }[];
  initialDevices: NetworkDevice[];
  initialCables: NetworkCable[];
}

export interface CanvasNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color?: string;
}
