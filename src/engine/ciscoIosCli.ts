import { NetworkDevice, NetworkInterface, SubInterface } from '../types/network';
import { isValidIp, isValidSubnetMask, wildcardToMask } from '../utils/ipUtils';

export type CliMode = 
  | 'user-exec' 
  | 'priv-exec' 
  | 'global-config' 
  | 'interface-config' 
  | 'subinterface-config' 
  | 'router-config' 
  | 'dhcp-config' 
  | 'vlan-config' 
  | 'line-config';

export interface CliSessionState {
  mode: CliMode;
  currentInterfaceId?: string;
  currentSubInterfaceId?: string;
  currentRouterType?: 'ospf' | 'rip';
  currentDhcpPoolName?: string;
  currentVlanId?: number;
}

export interface CliResult {
  output: string;
  updatedDevice?: NetworkDevice;
  newSessionState?: CliSessionState;
  pingTarget?: string; // If user issued a ping command
}

export function getPrompt(device: NetworkDevice, session: CliSessionState): string {
  const host = device.hostname || device.name;
  switch (session.mode) {
    case 'user-exec':
      return `${host}>`;
    case 'priv-exec':
      return `${host}#`;
    case 'global-config':
      return `${host}(config)#`;
    case 'interface-config':
      return `${host}(config-if)#`;
    case 'subinterface-config':
      return `${host}(config-subif)#`;
    case 'router-config':
      return `${host}(config-router)#`;
    case 'dhcp-config':
      return `${host}(dhcp-config)#`;
    case 'vlan-config':
      return `${host}(config-vlan)#`;
    case 'line-config':
      return `${host}(config-line)#`;
    default:
      return `${host}>`;
  }
}

// Find interface by various abbreviations: g0/0, gig0/0, gigabitethernet0/0, fa0/1, etc.
function normalizeInterfaceId(device: NetworkDevice, input: string): NetworkInterface | undefined {
  const clean = input.toLowerCase().replace(/\s+/g, '');
  return device.interfaces.find(intf => {
    const id = intf.id.toLowerCase().replace(/\s+/g, '');
    const name = intf.name.toLowerCase().replace(/\s+/g, '');
    const short = intf.shortName.toLowerCase().replace(/\s+/g, '');
    return id === clean || name === clean || short === clean;
  });
}

export function executeIosCommand(
  rawCmd: string,
  device: NetworkDevice,
  session: CliSessionState
): CliResult {
  const trimmed = rawCmd.trim();
  const currentSession = { ...session };
  let currentDevice = JSON.parse(JSON.stringify(device)) as NetworkDevice;

  if (!trimmed) {
    return { output: '', newSessionState: currentSession };
  }

  // Handle help "?"
  if (trimmed === '?') {
    return { output: getHelpText(currentSession.mode, device.type), newSessionState: currentSession };
  }

  const tokens = trimmed.split(/\s+/);
  const cmd = tokens[0].toLowerCase();
  const arg1 = tokens[1]?.toLowerCase();
  const arg2 = tokens[2]?.toLowerCase();

  // Navigation commands applicable across multiple modes
  if (cmd === 'exit') {
    if (currentSession.mode === 'user-exec') {
      return { output: '\n[Connection to device closed]\n', newSessionState: currentSession };
    }
    if (currentSession.mode === 'priv-exec') {
      currentSession.mode = 'user-exec';
      return { output: '', newSessionState: currentSession };
    }
    if (currentSession.mode === 'global-config') {
      currentSession.mode = 'priv-exec';
      return { output: '', newSessionState: currentSession };
    }
    // Sub-modes go back to global config
    currentSession.mode = 'global-config';
    currentSession.currentInterfaceId = undefined;
    currentSession.currentSubInterfaceId = undefined;
    currentSession.currentRouterType = undefined;
    currentSession.currentDhcpPoolName = undefined;
    currentSession.currentVlanId = undefined;
    return { output: '', newSessionState: currentSession };
  }

  if (cmd === 'end') {
    currentSession.mode = 'priv-exec';
    currentSession.currentInterfaceId = undefined;
    currentSession.currentSubInterfaceId = undefined;
    currentSession.currentRouterType = undefined;
    currentSession.currentDhcpPoolName = undefined;
    currentSession.currentVlanId = undefined;
    return { output: '', newSessionState: currentSession };
  }

  // USER EXEC MODE
  if (currentSession.mode === 'user-exec') {
    if (cmd === 'enable' || cmd === 'en') {
      currentSession.mode = 'priv-exec';
      return { output: '', newSessionState: currentSession };
    }
    if (cmd === 'ping') {
      if (!tokens[1]) return { output: '% Incomplete command.\n', newSessionState: currentSession };
      return { output: '', pingTarget: tokens[1], newSessionState: currentSession };
    }
    if (cmd === 'show' || cmd === 'sh') {
      return handleShowCommands(tokens.slice(1), currentDevice);
    }
    return { output: `% Invalid input detected at '^' marker.\n       ${trimmed}\n       ^`, newSessionState: currentSession };
  }

  // PRIVILEGED EXEC MODE
  if (currentSession.mode === 'priv-exec') {
    if (cmd === 'disable') {
      currentSession.mode = 'user-exec';
      return { output: '', newSessionState: currentSession };
    }
    if (cmd === 'configure' || cmd === 'conf') {
      if (arg1 === 'terminal' || arg1 === 't') {
        currentSession.mode = 'global-config';
        return {
          output: 'Enter configuration commands, one per line.  End with CNTL/Z.',
          newSessionState: currentSession
        };
      }
      return { output: '% Incomplete command.\n', newSessionState: currentSession };
    }
    if (cmd === 'show' || cmd === 'sh') {
      return handleShowCommands(tokens.slice(1), currentDevice);
    }
    if (cmd === 'ping') {
      if (!tokens[1]) return { output: '% Incomplete command.\n', newSessionState: currentSession };
      return { output: '', pingTarget: tokens[1], newSessionState: currentSession };
    }
    if (cmd === 'write' || cmd === 'wr' || (cmd === 'copy' && arg1 === 'running-config')) {
      return {
        output: 'Building configuration...\n[OK]',
        newSessionState: currentSession
      };
    }
    if (cmd === 'reload') {
      return {
        output: 'Proceed with reload? [confirm]\n\nSystem Bootstrap, Version 15.1(4)M4, RELEASE SOFTWARE (fc1)\nSystem restarted...\n' +
                'Press RETURN to get started!\n',
        newSessionState: { mode: 'user-exec' }
      };
    }
    return { output: `% Invalid input detected at '^' marker.\n       ${trimmed}\n       ^`, newSessionState: currentSession };
  }

  // GLOBAL CONFIGURATION MODE
  if (currentSession.mode === 'global-config') {
    // hostname <name>
    if (cmd === 'hostname' || cmd === 'host') {
      if (!tokens[1]) return { output: '% Incomplete command.\n', newSessionState: currentSession };
      currentDevice.hostname = tokens[1];
      return { output: '', updatedDevice: currentDevice, newSessionState: currentSession };
    }

    // interface <intf>
    if (cmd === 'interface' || cmd === 'int') {
      if (!tokens[1]) return { output: '% Incomplete command.\n', newSessionState: currentSession };
      const intfStr = tokens.slice(1).join('');

      // Check subinterface e.g. g0/0.10
      if (intfStr.includes('.')) {
        const [parentStr, subId] = intfStr.split('.');
        const parentIntf = normalizeInterfaceId(currentDevice, parentStr);
        if (!parentIntf) {
          return { output: `% Interface ${parentStr} does not exist.\n`, newSessionState: currentSession };
        }
        currentSession.mode = 'subinterface-config';
        currentSession.currentInterfaceId = parentIntf.id;
        currentSession.currentSubInterfaceId = `${parentIntf.id}.${subId}`;

        if (!parentIntf.subInterfaces) {
          parentIntf.subInterfaces = [];
        }
        let sub = parentIntf.subInterfaces.find(s => s.id === currentSession.currentSubInterfaceId);
        if (!sub) {
          sub = {
            id: currentSession.currentSubInterfaceId,
            name: `${parentIntf.name}.${subId}`,
            vlanId: parseInt(subId, 10) || 1,
            ipAddress: '',
            subnetMask: '',
            isUp: true
          };
          parentIntf.subInterfaces.push(sub);
        }
        return { output: '', updatedDevice: currentDevice, newSessionState: currentSession };
      }

      const targetIntf = normalizeInterfaceId(currentDevice, intfStr);
      if (!targetIntf) {
        return { output: `% Invalid interface type or number: ${intfStr}\n`, newSessionState: currentSession };
      }
      currentSession.mode = 'interface-config';
      currentSession.currentInterfaceId = targetIntf.id;
      return { output: '', newSessionState: currentSession };
    }

    // ip route <dest> <mask> <next-hop>
    if (cmd === 'ip' && arg1 === 'route') {
      const dest = tokens[2];
      const mask = tokens[3];
      const nextHop = tokens[4];
      if (!dest || !mask || !nextHop) {
        return { output: '% Incomplete command: ip route <network> <netmask> <next-hop>\n', newSessionState: currentSession };
      }
      if (!isValidIp(dest) || !isValidIp(mask)) {
        return { output: '% Invalid IP address or mask format.\n', newSessionState: currentSession };
      }
      if (!currentDevice.staticRoutes) currentDevice.staticRoutes = [];
      // Remove existing duplicate route
      currentDevice.staticRoutes = currentDevice.staticRoutes.filter(r => !(r.network === dest && r.subnetMask === mask));
      currentDevice.staticRoutes.push({
        id: `route_${Date.now()}`,
        network: dest,
        subnetMask: mask,
        nextHop
      });
      return { output: '', updatedDevice: currentDevice, newSessionState: currentSession };
    }

    // router ospf <id>
    if (cmd === 'router' && arg1 === 'ospf') {
      const procId = parseInt(tokens[2], 10) || 1;
      currentSession.mode = 'router-config';
      currentSession.currentRouterType = 'ospf';
      if (!currentDevice.ospf) {
        currentDevice.ospf = { enabled: true, processId: procId, routerId: '1.1.1.1', networks: [] };
      } else {
        currentDevice.ospf.enabled = true;
        currentDevice.ospf.processId = procId;
      }
      return { output: '', updatedDevice: currentDevice, newSessionState: currentSession };
    }

    // router rip
    if (cmd === 'router' && arg1 === 'rip') {
      currentSession.mode = 'router-config';
      currentSession.currentRouterType = 'rip';
      return { output: '', newSessionState: currentSession };
    }

    // ip dhcp pool <name>
    if (cmd === 'ip' && arg1 === 'dhcp' && arg2 === 'pool') {
      const poolName = tokens[3];
      if (!poolName) return { output: '% Incomplete command.\n', newSessionState: currentSession };
      currentSession.mode = 'dhcp-config';
      currentSession.currentDhcpPoolName = poolName;
      if (!currentDevice.services) {
        currentDevice.services = {
          http: { enabled: false, port: 80, htmlContent: '' },
          dns: { enabled: false, records: [] },
          dhcp: { enabled: true, pools: [] }
        };
      }
      if (!currentDevice.services.dhcp.pools.find(p => p.poolName === poolName)) {
        currentDevice.services.dhcp.pools.push({
          poolName,
          network: '',
          subnetMask: '',
          defaultRouter: '',
          dnsServer: '',
          leasedIps: []
        });
      }
      return { output: '', updatedDevice: currentDevice, newSessionState: currentSession };
    }

    // vlan <id>
    if (cmd === 'vlan') {
      const vlanId = parseInt(tokens[1], 10);
      if (isNaN(vlanId) || vlanId < 1 || vlanId > 4094) {
        return { output: '% Invalid VLAN ID. Range 1 - 4094.\n', newSessionState: currentSession };
      }
      currentSession.mode = 'vlan-config';
      currentSession.currentVlanId = vlanId;
      if (!currentDevice.vlans) currentDevice.vlans = [];
      if (!currentDevice.vlans.find(v => v.id === vlanId)) {
        currentDevice.vlans.push({
          id: vlanId,
          name: `VLAN${vlanId.toString().padStart(4, '0')}`,
          status: 'active'
        });
      }
      return { output: '', updatedDevice: currentDevice, newSessionState: currentSession };
    }

    // line console 0
    if (cmd === 'line') {
      currentSession.mode = 'line-config';
      return { output: '', newSessionState: currentSession };
    }

    // show command from config mode with "do"
    if (cmd === 'do') {
      const doTokens = tokens.slice(1);
      if (doTokens[0]?.toLowerCase() === 'show' || doTokens[0]?.toLowerCase() === 'sh') {
        return handleShowCommands(doTokens.slice(1), currentDevice);
      }
      return { output: '% Command not supported with do.\n', newSessionState: currentSession };
    }

    return { output: `% Invalid input detected at '^' marker.\n       ${trimmed}\n       ^`, newSessionState: currentSession };
  }

  // INTERFACE CONFIGURATION MODE
  if (currentSession.mode === 'interface-config') {
    const intf = currentDevice.interfaces.find(i => i.id === currentSession.currentInterfaceId);
    if (!intf) {
      currentSession.mode = 'global-config';
      return { output: '% Interface not found, returning to config.\n', newSessionState: currentSession };
    }

    // ip address <ip> <mask>
    if ((cmd === 'ip' && (arg1 === 'address' || arg1 === 'add')) || (cmd === 'ip' && arg1 === 'addr')) {
      const ip = tokens[2];
      const mask = tokens[3];
      if (!ip || !mask) return { output: '% Incomplete command: ip address <IP> <NETMASK>\n', newSessionState: currentSession };
      if (!isValidIp(ip) || !isValidSubnetMask(mask)) {
        return { output: '% Bad IP address or subnet mask.\n', newSessionState: currentSession };
      }
      intf.ipAddress = ip;
      intf.subnetMask = mask;
      return { output: '', updatedDevice: currentDevice, newSessionState: currentSession };
    }

    // no shutdown / shutdown
    if (cmd === 'no' && (arg1 === 'shutdown' || arg1 === 'shut')) {
      intf.isUp = true;
      return {
        output: `%LINK-5-CHANGED: Interface ${intf.name}, changed state to up\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${intf.name}, changed state to up\n`,
        updatedDevice: currentDevice,
        newSessionState: currentSession
      };
    }
    if (cmd === 'shutdown' || cmd === 'shut') {
      intf.isUp = false;
      return {
        output: `%LINK-5-CHANGED: Interface ${intf.name}, changed state to administratively down\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${intf.name}, changed state to down\n`,
        updatedDevice: currentDevice,
        newSessionState: currentSession
      };
    }

    // switchport mode access / trunk
    if (cmd === 'switchport' || cmd === 'sw') {
      if (arg1 === 'mode' || arg1 === 'mo') {
        const mode = tokens[2]?.toLowerCase();
        if (mode === 'access' || mode === 'acc') {
          intf.isTrunk = false;
          return { output: '', updatedDevice: currentDevice, newSessionState: currentSession };
        }
        if (mode === 'trunk' || mode === 'tru') {
          intf.isTrunk = true;
          return {
            output: `%LINEPROTO-5-UPDOWN: Line protocol on Interface ${intf.name}, changed state to up (trunking mode)\n`,
            updatedDevice: currentDevice,
            newSessionState: currentSession
          };
        }
      }
      if (arg1 === 'access' || arg1 === 'acc') {
        if (tokens[2]?.toLowerCase() === 'vlan') {
          const vlanNum = parseInt(tokens[3], 10);
          if (isNaN(vlanNum)) return { output: '% Incomplete command.\n', newSessionState: currentSession };
          intf.vlanId = vlanNum;
          // Ensure VLAN exists in switch vlan table
          if (currentDevice.vlans && !currentDevice.vlans.find(v => v.id === vlanNum)) {
            currentDevice.vlans.push({
              id: vlanNum,
              name: `VLAN${vlanNum.toString().padStart(4, '0')}`,
              status: 'active'
            });
          }
          return { output: '', updatedDevice: currentDevice, newSessionState: currentSession };
        }
      }
    }

    // description <text>
    if (cmd === 'description' || cmd === 'desc') {
      return { output: '', newSessionState: currentSession };
    }

    // "do show ..."
    if (cmd === 'do') {
      const doTokens = tokens.slice(1);
      if (doTokens[0]?.toLowerCase() === 'show' || doTokens[0]?.toLowerCase() === 'sh') {
        return handleShowCommands(doTokens.slice(1), currentDevice);
      }
    }

    return { output: `% Invalid input detected at '^' marker.\n       ${trimmed}\n       ^`, newSessionState: currentSession };
  }

  // SUBINTERFACE CONFIGURATION MODE (Router on a stick e.g. g0/0.10)
  if (currentSession.mode === 'subinterface-config') {
    const parent = currentDevice.interfaces.find(i => i.id === currentSession.currentInterfaceId);
    const sub = parent?.subInterfaces?.find(s => s.id === currentSession.currentSubInterfaceId);
    if (!parent || !sub) {
      currentSession.mode = 'global-config';
      return { output: '% Sub-interface not found.\n', newSessionState: currentSession };
    }

    // encapsulation dot1q <vlan>
    if (cmd === 'encapsulation' || cmd === 'encap') {
      if (arg1 === 'dot1q') {
        const vlan = parseInt(tokens[2], 10);
        if (isNaN(vlan)) return { output: '% Incomplete command: encapsulation dot1Q <vlan-id>\n', newSessionState: currentSession };
        sub.vlanId = vlan;
        return { output: '', updatedDevice: currentDevice, newSessionState: currentSession };
      }
    }

    // ip address <ip> <mask>
    if (cmd === 'ip' && (arg1 === 'address' || arg1 === 'add' || arg1 === 'addr')) {
      const ip = tokens[2];
      const mask = tokens[3];
      if (!ip || !mask) return { output: '% Incomplete command.\n', newSessionState: currentSession };
      if (!isValidIp(ip) || !isValidSubnetMask(mask)) {
        return { output: '% Bad IP address or subnet mask.\n', newSessionState: currentSession };
      }
      sub.ipAddress = ip;
      sub.subnetMask = mask;
      return { output: '', updatedDevice: currentDevice, newSessionState: currentSession };
    }

    // "do show ..."
    if (cmd === 'do') {
      const doTokens = tokens.slice(1);
      if (doTokens[0]?.toLowerCase() === 'show' || doTokens[0]?.toLowerCase() === 'sh') {
        return handleShowCommands(doTokens.slice(1), currentDevice);
      }
    }

    return { output: `% Invalid input detected at '^' marker.\n       ${trimmed}\n       ^`, newSessionState: currentSession };
  }

  // ROUTER CONFIGURATION MODE (OSPF / RIP)
  if (currentSession.mode === 'router-config') {
    if (currentSession.currentRouterType === 'ospf') {
      // network <ip> <wildcard> area <area>
      if (cmd === 'network' || cmd === 'net') {
        const net = tokens[1];
        const wildcard = tokens[2];
        const areaWord = tokens[3]?.toLowerCase();
        const area = parseInt(tokens[4], 10);
        if (!net || !wildcard || areaWord !== 'area' || isNaN(area)) {
          return { output: '% Incomplete command: network <ip-address> <wildcard-mask> area <area-id>\n', newSessionState: currentSession };
        }
        if (!currentDevice.ospf) {
          currentDevice.ospf = { enabled: true, processId: 1, routerId: '1.1.1.1', networks: [] };
        }
        currentDevice.ospf.networks.push({ network: net, wildcardMask: wildcard, area });
        return { output: '', updatedDevice: currentDevice, newSessionState: currentSession };
      }
      if (cmd === 'router-id') {
        if (!isValidIp(tokens[1])) return { output: '% Invalid router-id format.\n', newSessionState: currentSession };
        if (currentDevice.ospf) currentDevice.ospf.routerId = tokens[1];
        return { output: '', updatedDevice: currentDevice, newSessionState: currentSession };
      }
    }
    return { output: `% Command recognized in router config.\n`, newSessionState: currentSession };
  }

  // DHCP CONFIGURATION MODE
  if (currentSession.mode === 'dhcp-config') {
    const pool = currentDevice.services?.dhcp.pools.find(p => p.poolName === currentSession.currentDhcpPoolName);
    if (pool) {
      if (cmd === 'network' || cmd === 'net') {
        const net = tokens[1];
        const mask = tokens[2];
        if (isValidIp(net) && isValidSubnetMask(mask)) {
          pool.network = net;
          pool.subnetMask = mask;
          return { output: '', updatedDevice: currentDevice, newSessionState: currentSession };
        }
      }
      if (cmd === 'default-router') {
        if (isValidIp(tokens[1])) {
          pool.defaultRouter = tokens[1];
          return { output: '', updatedDevice: currentDevice, newSessionState: currentSession };
        }
      }
      if (cmd === 'dns-server') {
        if (isValidIp(tokens[1])) {
          pool.dnsServer = tokens[1];
          return { output: '', updatedDevice: currentDevice, newSessionState: currentSession };
        }
      }
    }
    return { output: '', newSessionState: currentSession };
  }

  // VLAN CONFIGURATION MODE
  if (currentSession.mode === 'vlan-config') {
    const vlan = currentDevice.vlans?.find(v => v.id === currentSession.currentVlanId);
    if (vlan && cmd === 'name') {
      vlan.name = tokens[1] || `VLAN${vlan.id}`;
      return { output: '', updatedDevice: currentDevice, newSessionState: currentSession };
    }
    return { output: '', newSessionState: currentSession };
  }

  return { output: `% Invalid input detected at '^' marker.\n       ${trimmed}\n       ^`, newSessionState: currentSession };
}

function handleShowCommands(tokens: string[], device: NetworkDevice): CliResult {
  const sub1 = tokens[0]?.toLowerCase();
  const sub2 = tokens[1]?.toLowerCase();
  const sub3 = tokens[2]?.toLowerCase();

  // show ip interface brief
  if (sub1 === 'ip' && (sub2 === 'interface' || sub2 === 'int') && (sub3 === 'brief' || sub3 === 'br')) {
    let output = 'Interface                  IP-Address      OK? Method Status                Protocol\n';
    device.interfaces.forEach(intf => {
      const namePadded = intf.name.padEnd(26, ' ');
      const ipPadded = (intf.ipAddress || 'unassigned').padEnd(16, ' ');
      const statusPadded = (intf.isUp ? 'up' : 'administratively down').padEnd(22, ' ');
      const proto = intf.isUp ? 'up' : 'down';
      output += `${namePadded}${ipPadded}YES manual ${statusPadded}${proto}\n`;

      if (intf.subInterfaces) {
        intf.subInterfaces.forEach(sub => {
          const sNamePadded = sub.name.padEnd(26, ' ');
          const sIpPadded = (sub.ipAddress || 'unassigned').padEnd(16, ' ');
          const sStatus = (intf.isUp ? 'up' : 'down').padEnd(22, ' ');
          output += `${sNamePadded}${sIpPadded}YES manual ${sStatus}${intf.isUp ? 'up' : 'down'}\n`;
        });
      }
    });
    return { output };
  }

  // show running-config
  if (sub1 === 'running-config' || sub1 === 'run') {
    let output = `Building configuration...\n\nCurrent configuration : 1380 bytes\n!\nversion 15.1\nservice timestamps debug datetime msec\nservice timestamps log datetime msec\nno service password-encryption\n!\nhostname ${device.hostname || device.name}\n!\n`;
    
    // Interfaces
    device.interfaces.forEach(intf => {
      output += `!\ninterface ${intf.name}\n`;
      if (intf.isTrunk) {
        output += ` switchport mode trunk\n`;
      } else if (intf.vlanId && intf.vlanId !== 1) {
        output += ` switchport access vlan ${intf.vlanId}\n switchport mode access\n`;
      }
      if (intf.ipAddress) {
        output += ` ip address ${intf.ipAddress} ${intf.subnetMask}\n`;
      } else if (intf.type !== 'console' && !intf.isTrunk) {
        output += ` no ip address\n`;
      }
      output += intf.isUp ? ` no shutdown\n` : ` shutdown\n`;

      if (intf.subInterfaces) {
        intf.subInterfaces.forEach(sub => {
          output += `!\ninterface ${sub.name}\n`;
          output += ` encapsulation dot1Q ${sub.vlanId}\n`;
          if (sub.ipAddress) {
            output += ` ip address ${sub.ipAddress} ${sub.subnetMask}\n`;
          }
        });
      }
    });

    // Static routes
    if (device.staticRoutes && device.staticRoutes.length > 0) {
      output += `!\n`;
      device.staticRoutes.forEach(r => {
        output += `ip route ${r.network} ${r.subnetMask} ${r.nextHop}\n`;
      });
    }

    // OSPF
    if (device.ospf && device.ospf.enabled) {
      output += `!\nrouter ospf ${device.ospf.processId}\n`;
      if (device.ospf.routerId) output += ` router-id ${device.ospf.routerId}\n`;
      device.ospf.networks.forEach(n => {
        output += ` network ${n.network} ${n.wildcardMask} area ${n.area}\n`;
      });
    }

    output += `!\nline con 0\nline vty 0 4\n login\n!\nend\n`;
    return { output };
  }

  // show ip route
  if (sub1 === 'ip' && (sub2 === 'route' || sub2 === 'ro')) {
    let output = 'Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP\n' +
                 '       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area\n\n' +
                 'Gateway of last resort is not set\n\n';

    // Connected interfaces
    device.interfaces.forEach(intf => {
      if (intf.isUp && intf.ipAddress && intf.subnetMask) {
        output += `C    ${intf.ipAddress}/24 is directly connected, ${intf.shortName}\n`;
      }
      if (intf.subInterfaces) {
        intf.subInterfaces.forEach(sub => {
          if (sub.ipAddress) {
            output += `C    ${sub.ipAddress}/24 is directly connected, ${sub.id}\n`;
          }
        });
      }
    });

    // Static routes
    if (device.staticRoutes) {
      device.staticRoutes.forEach(r => {
        output += `S    ${r.network}/24 [1/0] via ${r.nextHop}\n`;
      });
    }

    // OSPF routes
    if (device.ospf && device.ospf.enabled) {
      device.ospf.networks.forEach(n => {
        output += `O    ${n.network}/24 [110/2] via 10.0.0.2, area ${n.area}\n`;
      });
    }

    return { output };
  }

  // show vlan brief
  if (sub1 === 'vlan' && (sub2 === 'brief' || sub2 === 'br' || !sub2)) {
    let output = 'VLAN Name                             Status    Ports\n' +
                 '---- -------------------------------- --------- -------------------------------\n';
    const vlans = device.vlans || [{ id: 1, name: 'default', status: 'active' }];
    vlans.forEach(v => {
      const assignedPorts = device.interfaces
        .filter(i => (i.vlanId || 1) === v.id && !i.isTrunk && i.type !== 'console')
        .map(i => i.shortName)
        .join(', ');
      output += `${v.id.toString().padEnd(4, ' ')} ${v.name.padEnd(32, ' ')} ${v.status.padEnd(9, ' ')} ${assignedPorts.slice(0, 31)}\n`;
    });
    return { output };
  }

  // show mac address-table
  if (sub1 === 'mac' || (sub1 === 'mac-address-table')) {
    let output = '          Mac Address Table\n-------------------------------------------\nVlan    Mac Address       Type        Ports\n----    -----------       --------    -----\n';
    if (device.macTable && device.macTable.length > 0) {
      device.macTable.forEach(entry => {
        output += `${entry.vlan.toString().padEnd(7, ' ')} ${entry.macAddress.padEnd(17, ' ')} ${entry.type.padEnd(11, ' ')} ${entry.port}\n`;
      });
    } else {
      output += '   1    0014.a890.3b12    DYNAMIC     Fa0/1\n   1    0014.a890.3b88    DYNAMIC     Fa0/2\n';
    }
    return { output };
  }

  // show arp
  if (sub1 === 'arp') {
    let output = 'Protocol  Address          Age (min)  Hardware Addr   Type   Interface\n';
    output += 'Internet  192.168.1.1             -   0001.9688.1122  ARPA   GigabitEthernet0/0\n';
    return { output };
  }

  return { output: `% Incomplete or unrecognized show command: show ${tokens.join(' ')}\n` };
}

function getHelpText(mode: CliMode, deviceType: string): string {
  switch (mode) {
    case 'user-exec':
      return 'Exec commands:\n  enable      Turn on privileged commands\n  exit        Exit from the EXEC\n  ping        Send echo messages\n  show        Show running system information\n';
    case 'priv-exec':
      return 'Exec commands:\n  configure   Enter configuration mode\n  disable     Turn off privileged commands\n  exit        Exit from the EXEC\n  ping        Send echo messages\n  reload      Halt and perform a cold restart\n  show        Show running system information\n  write       Write running configuration to memory\n';
    case 'global-config':
      return 'Configure commands:\n  do          To run exec commands in config mode\n  exit        Exit from configure mode\n  hostname    Set system\'s network name\n  interface   Select an interface to configure\n  ip          Global IP configuration subcommands\n  router      Enable a routing process (ospf, rip)\n  vlan        Vlan configuration\n';
    case 'interface-config':
      return 'Interface commands:\n  description Interface specific description\n  exit        Exit from interface configuration mode\n  ip          Interface Internet Protocol config\n  no          Negate a command or set its defaults (no shutdown)\n  shutdown    Shutdown the selected interface\n  switchport  Set switching characteristics of the interface\n';
    default:
      return 'Available commands: exit, end, show, ip\n';
  }
}
