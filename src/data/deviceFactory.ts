import { DeviceType, NetworkDevice, NetworkInterface } from '../types/network';
import { generateMacAddress } from '../utils/ipUtils';

let deviceCounter = 1;

export function createDevice(type: DeviceType, x: number, y: number, customName?: string): NetworkDevice {
  const id = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const count = deviceCounter++;

  switch (type) {
    case 'router-2911': {
      const name = customName || `Router${count}`;
      const interfaces: NetworkInterface[] = [
        {
          id: 'g0/0',
          name: 'GigabitEthernet0/0',
          shortName: 'Gig0/0',
          type: 'gigabit',
          ipAddress: '',
          subnetMask: '',
          macAddress: generateMacAddress(),
          isUp: false,
          isDhcp: false,
        },
        {
          id: 'g0/1',
          name: 'GigabitEthernet0/1',
          shortName: 'Gig0/1',
          type: 'gigabit',
          ipAddress: '',
          subnetMask: '',
          macAddress: generateMacAddress(),
          isUp: false,
          isDhcp: false,
        },
        {
          id: 'g0/2',
          name: 'GigabitEthernet0/2',
          shortName: 'Gig0/2',
          type: 'gigabit',
          ipAddress: '',
          subnetMask: '',
          macAddress: generateMacAddress(),
          isUp: false,
          isDhcp: false,
        },
        {
          id: 's0/0/0',
          name: 'Serial0/0/0',
          shortName: 'Se0/0/0',
          type: 'serial',
          ipAddress: '',
          subnetMask: '',
          macAddress: generateMacAddress(),
          isUp: false,
          isDhcp: false,
        },
        {
          id: 's0/0/1',
          name: 'Serial0/0/1',
          shortName: 'Se0/0/1',
          type: 'serial',
          ipAddress: '',
          subnetMask: '',
          macAddress: generateMacAddress(),
          isUp: false,
          isDhcp: false,
        },
        {
          id: 'console',
          name: 'Console',
          shortName: 'Con0',
          type: 'console',
          ipAddress: '',
          subnetMask: '',
          macAddress: 'N/A',
          isUp: true,
          isDhcp: false,
        }
      ];

      return {
        id,
        name,
        hostname: name,
        type,
        model: 'Cisco 2911 Integrated Services Router',
        x,
        y,
        power: true,
        interfaces,
        staticRoutes: [],
        ospf: {
          enabled: false,
          processId: 1,
          routerId: '1.1.1.1',
          networks: []
        },
        arpTable: [],
        cliHistory: [],
      };
    }

    case 'router-2901': {
      const name = customName || `Router${count}`;
      const interfaces: NetworkInterface[] = [
        {
          id: 'g0/0',
          name: 'GigabitEthernet0/0',
          shortName: 'Gig0/0',
          type: 'gigabit',
          ipAddress: '',
          subnetMask: '',
          macAddress: generateMacAddress(),
          isUp: false,
          isDhcp: false,
        },
        {
          id: 'g0/1',
          name: 'GigabitEthernet0/1',
          shortName: 'Gig0/1',
          type: 'gigabit',
          ipAddress: '',
          subnetMask: '',
          macAddress: generateMacAddress(),
          isUp: false,
          isDhcp: false,
        },
        {
          id: 's0/0/0',
          name: 'Serial0/0/0',
          shortName: 'Se0/0/0',
          type: 'serial',
          ipAddress: '',
          subnetMask: '',
          macAddress: generateMacAddress(),
          isUp: false,
          isDhcp: false,
        },
        {
          id: 's0/0/1',
          name: 'Serial0/0/1',
          shortName: 'Se0/0/1',
          type: 'serial',
          ipAddress: '',
          subnetMask: '',
          macAddress: generateMacAddress(),
          isUp: false,
          isDhcp: false,
        },
        {
          id: 'console',
          name: 'Console',
          shortName: 'Con0',
          type: 'console',
          ipAddress: '',
          subnetMask: '',
          macAddress: 'N/A',
          isUp: true,
          isDhcp: false,
        }
      ];

      return {
        id,
        name,
        hostname: name,
        type,
        model: 'Cisco 2901 Integrated Services Router',
        x,
        y,
        power: true,
        interfaces,
        staticRoutes: [],
        ospf: {
          enabled: false,
          processId: 1,
          routerId: '1.1.1.1',
          networks: []
        },
        arpTable: [],
        cliHistory: [],
      };
    }

    case 'switch-2960': {
      const name = customName || `Switch${count}`;
      const interfaces: NetworkInterface[] = [];
      // 24 FastEthernet ports
      for (let i = 1; i <= 24; i++) {
        interfaces.push({
          id: `Fa0/${i}`,
          name: `FastEthernet0/${i}`,
          shortName: `Fa0/${i}`,
          type: 'fastethernet',
          ipAddress: '',
          subnetMask: '',
          macAddress: generateMacAddress(),
          isUp: true,
          isDhcp: false,
          vlanId: 1,
          isTrunk: false
        });
      }
      // 2 Gigabit Uplink ports
      interfaces.push(
        {
          id: 'Gig0/1',
          name: 'GigabitEthernet0/1',
          shortName: 'Gig0/1',
          type: 'gigabit',
          ipAddress: '',
          subnetMask: '',
          macAddress: generateMacAddress(),
          isUp: true,
          isDhcp: false,
          vlanId: 1,
          isTrunk: false
        },
        {
          id: 'Gig0/2',
          name: 'GigabitEthernet0/2',
          shortName: 'Gig0/2',
          type: 'gigabit',
          ipAddress: '',
          subnetMask: '',
          macAddress: generateMacAddress(),
          isUp: true,
          isDhcp: false,
          vlanId: 1,
          isTrunk: false
        },
        {
          id: 'console',
          name: 'Console',
          shortName: 'Con0',
          type: 'console',
          ipAddress: '',
          subnetMask: '',
          macAddress: 'N/A',
          isUp: true,
          isDhcp: false,
        }
      );

      return {
        id,
        name,
        hostname: name,
        type,
        model: 'Cisco Catalyst 2960-24TT Switch',
        x,
        y,
        power: true,
        interfaces,
        vlans: [
          { id: 1, name: 'default', status: 'active' },
          { id: 1002, name: 'fddi-default', status: 'active' },
          { id: 1003, name: 'token-ring-default', status: 'active' },
          { id: 1004, name: 'fddinet-default', status: 'active' },
          { id: 1005, name: 'trnet-default', status: 'active' }
        ],
        macTable: [],
        cliHistory: [],
      };
    }

    case 'switch-3560': {
      const name = customName || `Switch-L3-${count}`;
      const interfaces: NetworkInterface[] = [];
      for (let i = 1; i <= 24; i++) {
        interfaces.push({
          id: `Gig0/${i}`,
          name: `GigabitEthernet0/${i}`,
          shortName: `Gig0/${i}`,
          type: 'gigabit',
          ipAddress: '',
          subnetMask: '',
          macAddress: generateMacAddress(),
          isUp: true,
          isDhcp: false,
          vlanId: 1,
          isTrunk: false
        });
      }
      interfaces.push({
        id: 'console',
        name: 'Console',
        shortName: 'Con0',
        type: 'console',
        ipAddress: '',
        subnetMask: '',
        macAddress: 'N/A',
        isUp: true,
        isDhcp: false,
      });

      return {
        id,
        name,
        hostname: name,
        type,
        model: 'Cisco Catalyst 3560-24PS Multilayer Switch',
        x,
        y,
        power: true,
        interfaces,
        staticRoutes: [],
        vlans: [
          { id: 1, name: 'default', status: 'active' }
        ],
        macTable: [],
        cliHistory: [],
      };
    }

    case 'pc': {
      const name = customName || `PC${count}`;
      return {
        id,
        name,
        hostname: name,
        type,
        model: 'Standard Desktop PC',
        x,
        y,
        power: true,
        defaultGateway: '',
        dnsServer: '',
        interfaces: [
          {
            id: 'Fa0',
            name: 'FastEthernet0',
            shortName: 'Fa0',
            type: 'fastethernet',
            ipAddress: '',
            subnetMask: '',
            macAddress: generateMacAddress(),
            isUp: true,
            isDhcp: false,
          },
          {
            id: 'rs232',
            name: 'RS-232',
            shortName: 'RS232',
            type: 'console',
            ipAddress: '',
            subnetMask: '',
            macAddress: 'N/A',
            isUp: true,
            isDhcp: false,
          }
        ],
        arpTable: [],
      };
    }

    case 'laptop': {
      const name = customName || `Laptop${count}`;
      return {
        id,
        name,
        hostname: name,
        type,
        model: 'Enterprise Laptop',
        x,
        y,
        power: true,
        defaultGateway: '',
        dnsServer: '',
        interfaces: [
          {
            id: 'Fa0',
            name: 'FastEthernet0',
            shortName: 'Fa0',
            type: 'fastethernet',
            ipAddress: '',
            subnetMask: '',
            macAddress: generateMacAddress(),
            isUp: true,
            isDhcp: false,
          },
          {
            id: 'rs232',
            name: 'RS-232',
            shortName: 'RS232',
            type: 'console',
            ipAddress: '',
            subnetMask: '',
            macAddress: 'N/A',
            isUp: true,
            isDhcp: false,
          }
        ],
        arpTable: [],
      };
    }

    case 'server':
    case 'web-server': {
      const name = customName || (type === 'web-server' ? `Server-PT` : `Server${count}`);
      return {
        id,
        name,
        hostname: name,
        type,
        model: 'Enterprise Server-PT',
        x,
        y,
        power: true,
        defaultGateway: '',
        dnsServer: '',
        interfaces: [
          {
            id: 'Fa0',
            name: 'FastEthernet0',
            shortName: 'Fa0',
            type: 'fastethernet',
            ipAddress: '',
            subnetMask: '',
            macAddress: generateMacAddress(),
            isUp: true,
            isDhcp: false,
          },
          {
            id: 'Gig0',
            name: 'GigabitEthernet0',
            shortName: 'Gig0',
            type: 'gigabit',
            ipAddress: '',
            subnetMask: '',
            macAddress: generateMacAddress(),
            isUp: true,
            isDhcp: false,
          }
        ],
        services: {
          http: {
            enabled: true,
            port: 80,
            htmlContent: `<!DOCTYPE html>
<html>
<head>
  <title>Cisco Packet Tracer Web Server</title>
  <style>
    body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; }
    h1 { color: #38bdf8; border-bottom: 2px solid #38bdf8; padding-bottom: 8px; }
    .card { background: #1e293b; padding: 15px; border-radius: 6px; margin-top: 15px; }
    code { color: #4ade80; }
  </style>
</head>
<body>
  <h1>Welcome to Cisco Packet Tracer!</h1>
  <p>Packet Tracer is a comprehensive network technology learning tool.</p>
  <div class="card">
    <h3>Quick Links:</h3>
    <ul>
      <li><a href="#" style="color:#60a5fa">CCNA Exploration</a></li>
      <li><a href="#" style="color:#60a5fa">Network Topology Diagnostics</a></li>
      <li><a href="#" style="color:#60a5fa">IPv4 / IPv6 Subnetting Guide</a></li>
    </ul>
    <p>HTTP 200 OK - Connection Successful!</p>
  </div>
</body>
</html>`
          },
          dns: {
            enabled: true,
            records: [
              { domain: 'www.cisco.lab', ipAddress: '192.168.1.100', type: 'A' },
              { domain: 'cisco.lab', ipAddress: '192.168.1.100', type: 'A' },
              { domain: 'server.local', ipAddress: '192.168.1.100', type: 'A' }
            ]
          },
          dhcp: {
            enabled: false,
            pools: [
              {
                poolName: 'Pool-1',
                network: '192.168.1.0',
                subnetMask: '255.255.255.0',
                defaultRouter: '192.168.1.1',
                dnsServer: '192.168.1.100',
                leasedIps: []
              }
            ]
          }
        },
        arpTable: [],
      };
    }
  }
}
