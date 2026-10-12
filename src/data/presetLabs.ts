import { LabChallenge, NetworkDevice, NetworkCable } from '../types/network';
import { createDevice } from './deviceFactory';

export const presetLabs: LabChallenge[] = [
  {
    id: 'lab-1-basic-lan',
    title: 'Lab 1: Basic LAN Switching & IPv4 Addressing',
    difficulty: 'Beginner',
    category: 'Layer 2 Switching',
    description: 'Configure IPv4 addressing on two PCs connected to a Cisco Catalyst 2960 switch and test local network connectivity with ICMP Ping.',
    objectives: [
      {
        id: 'obj-pc0-ip',
        description: 'Configure PC0 FastEthernet0 with IP 192.168.1.10 and Subnet Mask 255.255.255.0',
        hint: 'Open PC0 -> Desktop -> IP Configuration, or use command prompt.',
        check: (devices) => {
          const pc0 = devices.find(d => d.name === 'PC0');
          const intf = pc0?.interfaces.find(i => i.id === 'Fa0');
          return intf?.ipAddress === '192.168.1.10' && intf?.subnetMask === '255.255.255.0';
        }
      },
      {
        id: 'obj-pc1-ip',
        description: 'Configure PC1 FastEthernet0 with IP 192.168.1.20 and Subnet Mask 255.255.255.0',
        hint: 'Open PC1 -> Desktop -> IP Configuration, enter 192.168.1.20.',
        check: (devices) => {
          const pc1 = devices.find(d => d.name === 'PC1');
          const intf = pc1?.interfaces.find(i => i.id === 'Fa0');
          return intf?.ipAddress === '192.168.1.20' && intf?.subnetMask === '255.255.255.0';
        }
      },
      {
        id: 'obj-switch-ports',
        description: 'Ensure cables connect PC0 and PC1 to Switch0 FastEthernet ports',
        hint: 'Use Copper Straight-Through cable between PC0 (Fa0) and Switch0 (Fa0/1), and PC1 to Switch0 (Fa0/2).',
        check: (devices, cables) => {
          return cables.length >= 2;
        }
      }
    ],
    initialDevices: (() => {
      const sw0 = createDevice('switch-2960', 450, 130, 'Switch0');
      sw0.id = 'lab1_sw0';
      const pc0 = createDevice('pc', 260, 270, 'PC0');
      pc0.id = 'lab1_pc0';
      pc0.interfaces[0].ipAddress = '192.168.1.10';
      pc0.interfaces[0].subnetMask = '255.255.255.0';
      const pc1 = createDevice('pc', 640, 270, 'PC1');
      pc1.id = 'lab1_pc1';
      pc1.interfaces[0].ipAddress = '192.168.1.20';
      pc1.interfaces[0].subnetMask = '255.255.255.0';
      return [sw0, pc0, pc1];
    })(),
    initialCables: [
      {
        id: 'cable_lab1_1',
        type: 'straight-through',
        device1Id: 'lab1_pc0',
        interface1Id: 'Fa0',
        device2Id: 'lab1_sw0',
        interface2Id: 'Fa0/1',
        status: 'up'
      },
      {
        id: 'cable_lab1_2',
        type: 'straight-through',
        device1Id: 'lab1_pc1',
        interface1Id: 'Fa0',
        device2Id: 'lab1_sw0',
        interface2Id: 'Fa0/2',
        status: 'up'
      }
    ]
  },
  {
    id: 'lab-2-router-default-gateway',
    title: 'Lab 2: Inter-Subnet Routing & Default Gateways',
    difficulty: 'Beginner',
    category: 'IPv4 Routing',
    description: 'Configure a Cisco 2911 Router to route traffic between two different LAN subnets (192.168.10.0/24 and 192.168.20.0/24).',
    objectives: [
      {
        id: 'obj-router-g00',
        description: 'Configure Router0 GigabitEthernet0/0 with 192.168.10.1 / 255.255.255.0 and activate (no shutdown)',
        hint: 'In Router0 CLI: "conf t" -> "int g0/0" -> "ip add 192.168.10.1 255.255.255.0" -> "no shut"',
        check: (devices) => {
          const r = devices.find(d => d.name === 'Router0');
          const intf = r?.interfaces.find(i => i.id === 'g0/0');
          return intf?.ipAddress === '192.168.10.1' && intf?.isUp === true;
        }
      },
      {
        id: 'obj-router-g01',
        description: 'Configure Router0 GigabitEthernet0/1 with 192.168.20.1 / 255.255.255.0 and activate (no shutdown)',
        hint: 'In Router0 CLI: "int g0/1" -> "ip add 192.168.20.1 255.255.255.0" -> "no shut"',
        check: (devices) => {
          const r = devices.find(d => d.name === 'Router0');
          const intf = r?.interfaces.find(i => i.id === 'g0/1');
          return intf?.ipAddress === '192.168.20.1' && intf?.isUp === true;
        }
      },
      {
        id: 'obj-pc-gateways',
        description: 'Configure Default Gateways: PC0 -> 192.168.10.1 and PC1 -> 192.168.20.1',
        hint: 'Open PC IP Config and fill in Default Gateway field.',
        check: (devices) => {
          const pc0 = devices.find(d => d.name === 'PC0');
          const pc1 = devices.find(d => d.name === 'PC1');
          return pc0?.defaultGateway === '192.168.10.1' && pc1?.defaultGateway === '192.168.20.1';
        }
      }
    ],
    initialDevices: (() => {
      const r0 = createDevice('router-2911', 450, 120, 'Router0');
      const sw0 = createDevice('switch-2960', 250, 260, 'Switch-LAN1');
      const sw1 = createDevice('switch-2960', 650, 260, 'Switch-LAN2');
      const pc0 = createDevice('pc', 250, 420, 'PC0');
      const pc1 = createDevice('pc', 650, 420, 'PC1');

      // Set initial PC IPs
      pc0.interfaces[0].ipAddress = '192.168.10.10';
      pc0.interfaces[0].subnetMask = '255.255.255.0';
      pc1.interfaces[0].ipAddress = '192.168.20.10';
      pc1.interfaces[0].subnetMask = '255.255.255.0';

      return [r0, sw0, sw1, pc0, pc1];
    })(),
    initialCables: []
  },
  {
    id: 'lab-3-inter-vlan',
    title: 'Lab 3: Inter-VLAN Routing (Router-on-a-Stick)',
    difficulty: 'Intermediate',
    category: 'VLANs & 802.1Q',
    description: 'Segment traffic into VLAN 10 (Sales) and VLAN 20 (Engineering) on a Cisco 2960 Switch, and route between them using Router-on-a-Stick sub-interfaces on Router0.',
    objectives: [
      {
        id: 'obj-switch-vlans',
        description: 'Configure VLAN 10 and VLAN 20 on Switch0',
        hint: 'Switch0 CLI: "vlan 10" -> "name Sales", "vlan 20" -> "name Engineering"',
        check: (devices) => {
          const sw = devices.find(d => d.name === 'Switch0');
          const hasVlan10 = sw?.vlans?.some(v => v.id === 10);
          const hasVlan20 = sw?.vlans?.some(v => v.id === 20);
          return !!(hasVlan10 && hasVlan20);
        }
      },
      {
        id: 'obj-router-subinterfaces',
        description: 'Configure Router0 g0/0.10 (192.168.10.1/24) and g0/0.20 (192.168.20.1/24) with 802.1Q encapsulation',
        hint: 'Router0 CLI: "int g0/0.10" -> "encapsulation dot1q 10" -> "ip add 192.168.10.1 255.255.255.0"',
        check: (devices) => {
          const r0 = devices.find(d => d.name === 'Router0');
          const g0 = r0?.interfaces.find(i => i.id === 'g0/0');
          const sub10 = g0?.subInterfaces?.find(s => s.vlanId === 10 && s.ipAddress === '192.168.10.1');
          const sub20 = g0?.subInterfaces?.find(s => s.vlanId === 20 && s.ipAddress === '192.168.20.1');
          return !!(sub10 && sub20);
        }
      },
      {
        id: 'obj-switch-trunk',
        description: 'Set Switch0 uplink port to trunking mode (switchport mode trunk)',
        hint: 'Switch0 CLI: "int Gig0/1" -> "switchport mode trunk"',
        check: (devices) => {
          const sw = devices.find(d => d.name === 'Switch0');
          return sw?.interfaces.some(i => i.isTrunk) || false;
        }
      }
    ],
    initialDevices: (() => {
      const r0 = createDevice('router-2911', 450, 110, 'Router0');
      const sw0 = createDevice('switch-2960', 450, 270, 'Switch0');
      const pc0 = createDevice('pc', 270, 420, 'PC0-Sales');
      const pc1 = createDevice('pc', 630, 420, 'PC1-Eng');

      pc0.interfaces[0].ipAddress = '192.168.10.50';
      pc0.interfaces[0].subnetMask = '255.255.255.0';
      pc0.defaultGateway = '192.168.10.1';

      pc1.interfaces[0].ipAddress = '192.168.20.50';
      pc1.interfaces[0].subnetMask = '255.255.255.0';
      pc1.defaultGateway = '192.168.20.1';

      return [r0, sw0, pc0, pc1];
    })(),
    initialCables: []
  },
  {
    id: 'lab-4-static-routing',
    title: 'Lab 4: IPv4 Static & Default Routing',
    difficulty: 'Intermediate',
    category: 'IP Routing',
    description: 'Connect Router-HQ and Router-Branch across a WAN link. Configure static routes so PC-HQ can reach Server-Branch.',
    objectives: [
      {
        id: 'obj-static-hq',
        description: 'Configure static route on Router-HQ to 192.168.2.0/24 via next-hop 10.0.0.2',
        hint: 'Router-HQ CLI: "ip route 192.168.2.0 255.255.255.0 10.0.0.2"',
        check: (devices) => {
          const rHq = devices.find(d => d.name === 'Router-HQ');
          return rHq?.staticRoutes?.some(r => r.network === '192.168.2.0' && r.nextHop === '10.0.0.2') || false;
        }
      },
      {
        id: 'obj-static-branch',
        description: 'Configure static route on Router-Branch to 192.168.1.0/24 via next-hop 10.0.0.1',
        hint: 'Router-Branch CLI: "ip route 192.168.1.0 255.255.255.0 10.0.0.1"',
        check: (devices) => {
          const rBr = devices.find(d => d.name === 'Router-Branch');
          return rBr?.staticRoutes?.some(r => r.network === '192.168.1.0' && r.nextHop === '10.0.0.1') || false;
        }
      }
    ],
    initialDevices: (() => {
      const rHq = createDevice('router-2911', 280, 180, 'Router-HQ');
      const rBr = createDevice('router-2901', 620, 180, 'Router-Branch');
      const pcHq = createDevice('pc', 150, 360, 'PC-HQ');
      const srvBr = createDevice('server', 750, 360, 'Server-Branch');

      // Pre-configure WAN link interfaces
      rHq.interfaces[0].ipAddress = '192.168.1.1';
      rHq.interfaces[0].subnetMask = '255.255.255.0';
      rHq.interfaces[0].isUp = true;
      rHq.interfaces[1].ipAddress = '10.0.0.1';
      rHq.interfaces[1].subnetMask = '255.255.255.252';
      rHq.interfaces[1].isUp = true;

      rBr.interfaces[0].ipAddress = '192.168.2.1';
      rBr.interfaces[0].subnetMask = '255.255.255.0';
      rBr.interfaces[0].isUp = true;
      rBr.interfaces[1].ipAddress = '10.0.0.2';
      rBr.interfaces[1].subnetMask = '255.255.255.252';
      rBr.interfaces[1].isUp = true;

      pcHq.interfaces[0].ipAddress = '192.168.1.100';
      pcHq.interfaces[0].subnetMask = '255.255.255.0';
      pcHq.defaultGateway = '192.168.1.1';

      srvBr.interfaces[0].ipAddress = '192.168.2.100';
      srvBr.interfaces[0].subnetMask = '255.255.255.0';
      srvBr.defaultGateway = '192.168.2.1';

      return [rHq, rBr, pcHq, srvBr];
    })(),
    initialCables: []
  },
  {
    id: 'lab-5-ospf-routing',
    title: 'Lab 5: Dynamic Routing with Single-Area OSPFv2',
    difficulty: 'Advanced',
    category: 'Dynamic Routing',
    description: 'Configure OSPF Area 0 on two routers to dynamically exchange routing updates and achieve convergence.',
    objectives: [
      {
        id: 'obj-ospf-r1',
        description: 'Enable OSPF process 1 on Router1 with network 10.0.0.0 0.0.0.3 area 0 and 192.168.1.0 0.0.0.255 area 0',
        hint: 'Router1 CLI: "router ospf 1" -> "network 10.0.0.0 0.0.0.3 area 0"',
        check: (devices) => {
          const r1 = devices.find(d => d.name === 'Router1');
          return (r1?.ospf?.enabled && r1.ospf.networks.length >= 1) || false;
        }
      },
      {
        id: 'obj-ospf-r2',
        description: 'Enable OSPF process 1 on Router2 with network 10.0.0.0 0.0.0.3 area 0 and 192.168.2.0 0.0.0.255 area 0',
        hint: 'Router2 CLI: "router ospf 1" -> "network 10.0.0.0 0.0.0.3 area 0"',
        check: (devices) => {
          const r2 = devices.find(d => d.name === 'Router2');
          return (r2?.ospf?.enabled && r2.ospf.networks.length >= 1) || false;
        }
      }
    ],
    initialDevices: (() => {
      const r1 = createDevice('router-2911', 300, 180, 'Router1');
      const r2 = createDevice('router-2911', 600, 180, 'Router2');
      const pc1 = createDevice('pc', 180, 360, 'PC1');
      const pc2 = createDevice('pc', 720, 360, 'PC2');

      r1.interfaces[0].ipAddress = '192.168.1.1';
      r1.interfaces[0].subnetMask = '255.255.255.0';
      r1.interfaces[0].isUp = true;
      r1.interfaces[1].ipAddress = '10.0.0.1';
      r1.interfaces[1].subnetMask = '255.255.255.252';
      r1.interfaces[1].isUp = true;

      r2.interfaces[0].ipAddress = '192.168.2.1';
      r2.interfaces[0].subnetMask = '255.255.255.0';
      r2.interfaces[0].isUp = true;
      r2.interfaces[1].ipAddress = '10.0.0.2';
      r2.interfaces[1].subnetMask = '255.255.255.252';
      r2.interfaces[1].isUp = true;

      pc1.interfaces[0].ipAddress = '192.168.1.50';
      pc1.interfaces[0].subnetMask = '255.255.255.0';
      pc1.defaultGateway = '192.168.1.1';

      pc2.interfaces[0].ipAddress = '192.168.2.50';
      pc2.interfaces[0].subnetMask = '255.255.255.0';
      pc2.defaultGateway = '192.168.2.1';

      return [r1, r2, pc1, pc2];
    })(),
    initialCables: []
  },
  {
    id: 'lab-6-dhcp-web-dns',
    title: 'Lab 6: Enterprise Services (DHCP, DNS & Web Server)',
    difficulty: 'Intermediate',
    category: 'Network Services',
    description: 'Configure a central enterprise server running HTTP, DNS (www.cisco.lab), and DHCP pool for dynamic client PC addressing.',
    objectives: [
      {
        id: 'obj-server-dns',
        description: 'Ensure DNS service is enabled on Server-PT with record www.cisco.lab -> 192.168.1.100',
        hint: 'Open Server-PT -> Services -> DNS, enable DNS service and verify record.',
        check: (devices) => {
          const s = devices.find(d => d.name === 'Server-PT');
          return (s?.services?.dns.enabled && s.services.dns.records.some(r => r.domain.includes('cisco.lab'))) || false;
        }
      },
      {
        id: 'obj-pc-dhcp',
        description: 'Set PC0 to DHCP mode to obtain an automatic IPv4 lease',
        hint: 'Open PC0 -> Desktop -> IP Configuration -> Click DHCP radio button.',
        check: (devices) => {
          const pc0 = devices.find(d => d.name === 'PC0');
          const intf = pc0?.interfaces.find(i => i.id === 'Fa0');
          return (intf?.isDhcp && !!intf?.ipAddress) || false;
        }
      }
    ],
    initialDevices: (() => {
      const sw0 = createDevice('switch-2960', 450, 180, 'Switch0');
      const srv = createDevice('web-server', 650, 360, 'Server-PT');
      const pc0 = createDevice('pc', 250, 360, 'PC0');

      srv.interfaces[0].ipAddress = '192.168.1.100';
      srv.interfaces[0].subnetMask = '255.255.255.0';
      srv.defaultGateway = '192.168.1.1';
      srv.dnsServer = '192.168.1.100';

      if (srv.services) {
        srv.services.dhcp.enabled = true;
      }

      return [sw0, srv, pc0];
    })(),
    initialCables: []
  }
];
