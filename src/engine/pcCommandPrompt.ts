import { NetworkDevice } from '../types/network';

export interface CommandPromptResult {
  output: string;
  clear?: boolean;
  pingTarget?: string;
  tracertTarget?: string;
  arpTarget?: string;
  dnsTarget?: string;
  httpTarget?: string;
  dhcpRenew?: boolean;
  updatedDevice?: NetworkDevice;
}

export function executePcCommand(
  rawCmd: string,
  device: NetworkDevice
): CommandPromptResult {
  const trimmed = rawCmd.trim();
  if (!trimmed) return { output: '' };

  const tokens = trimmed.split(/\s+/);
  const cmd = tokens[0].toLowerCase();
  const arg = tokens[1]?.toLowerCase();

  const primaryIntf = device.interfaces.find(i => i.type === 'fastethernet' || i.type === 'gigabit') || device.interfaces[0];

  if (cmd === 'cls') {
    return { output: '', clear: true };
  }

  if (cmd === 'help' || cmd === '?') {
    return {
      output: `Microsoft Windows [Version 10.0.19045.2965]\nPacket Tracer Command Prompt Help:\n` +
              `  ipconfig            Displays IP configuration\n` +
              `  ipconfig /all       Displays full configuration details\n` +
              `  ipconfig /renew     Renews DHCP address lease (DORA)\n` +
              `  ping <target>       Pings target IP or host (ICMP)\n` +
              `  arp -a              Displays ARP table cache\n` +
              `  arp <target>        Resolves MAC address via ARP broadcast\n` +
              `  nslookup <domain>   Resolves domain name via DNS server\n` +
              `  curl <url>          Fetches HTTP web page via TCP/Port 80\n` +
              `  tracert <target>    Traces route to target\n` +
              `  cls                 Clears screen\n`
    };
  }

  // ipconfig
  if (cmd === 'ipconfig') {
    if (arg === '/all') {
      return {
        output: `\nWindows IP Configuration\n\n` +
                `   Host Name . . . . . . . . . . . . : ${device.name}\n` +
                `   Primary Dns Suffix  . . . . . . . : \n` +
                `   Node Type . . . . . . . . . . . . : Broadcast\n` +
                `   IP Routing Enabled. . . . . . . . : No\n\n` +
                `Ethernet adapter FastEthernet0:\n\n` +
                `   Connection-specific DNS Suffix  . :\n` +
                `   Description . . . . . . . . . . . : FastEthernet\n` +
                `   Physical Address. . . . . . . . . : ${primaryIntf?.macAddress || '00:00:00:00:00:00'}\n` +
                `   DHCP Enabled. . . . . . . . . . . : ${primaryIntf?.isDhcp ? 'Yes' : 'No'}\n` +
                `   IPv4 Address. . . . . . . . . . . : ${primaryIntf?.ipAddress || '0.0.0.0'}\n` +
                `   Subnet Mask . . . . . . . . . . . : ${primaryIntf?.subnetMask || '0.0.0.0'}\n` +
                `   Default Gateway . . . . . . . . . : ${device.defaultGateway || '0.0.0.0'}\n` +
                `   DNS Servers . . . . . . . . . . . : ${device.dnsServer || '0.0.0.0'}\n`
      };
    }

    if (arg === '/renew') {
      return {
        output: `Requesting IP address from DHCP server (DORA handshake)...\n`,
        dhcpRenew: true
      };
    }

    if (arg === '/release') {
      const devCopy = JSON.parse(JSON.stringify(device)) as NetworkDevice;
      const intf = devCopy.interfaces.find(i => i.id === primaryIntf.id);
      if (intf) {
        intf.ipAddress = '';
        intf.subnetMask = '';
        intf.isDhcp = false;
      }
      devCopy.defaultGateway = '';
      devCopy.dnsServer = '';
      return {
        output: `IP configuration released.\n`,
        updatedDevice: devCopy
      };
    }

    return {
      output: `\nWindows IP Configuration\n\n` +
              `FastEthernet0 Connection:\n\n` +
              `   IPv4 Address. . . . . . . . . . . : ${primaryIntf?.ipAddress || '0.0.0.0'}\n` +
              `   Subnet Mask . . . . . . . . . . . : ${primaryIntf?.subnetMask || '0.0.0.0'}\n` +
              `   Default Gateway . . . . . . . . . : ${device.defaultGateway || '0.0.0.0'}\n`
    };
  }

  // ping (ICMP)
  if (cmd === 'ping') {
    const target = tokens[1];
    if (!target) {
      return { output: `Usage: ping [-t] [-n count] <target_name_or_ip>\n` };
    }
    return {
      output: `Pinging ${target} with 32 bytes of data:\n`,
      pingTarget: target
    };
  }

  // tracert
  if (cmd === 'tracert' || cmd === 'traceroute') {
    const target = tokens[1];
    if (!target) {
      return { output: `Usage: tracert <target_ip>\n` };
    }
    return {
      output: `Tracing route to ${target} over a maximum of 30 hops:\n`,
      tracertTarget: target
    };
  }

  // arp
  if (cmd === 'arp') {
    if (arg === '-a' || !arg) {
      let entries = '';
      if (device.arpTable && device.arpTable.length > 0) {
        entries = device.arpTable.map(e => 
          `  ${e.ipAddress.padEnd(20)}  ${e.macAddress.padEnd(20)}  ${e.type.toLowerCase()}`
        ).join('\n');
      } else {
        entries = `  ${device.defaultGateway || '192.168.1.1'}          00-01-96-88-11-22     dynamic\n` +
                  `  255.255.255.255       ff-ff-ff-ff-ff-ff     static`;
      }
      return {
        output: `\nInterface: ${primaryIntf?.ipAddress || '192.168.1.10'} --- 0x2\n` +
                `  Internet Address      Physical Address      Type\n` +
                entries + '\n'
      };
    } else {
      const target = tokens[1];
      return {
        output: `Sending ARP broadcast request for ${target}...\n`,
        arpTarget: target
      };
    }
  }

  // nslookup (DNS)
  if (cmd === 'nslookup') {
    const domain = tokens[1] || 'www.cisco.lab';
    return {
      output: `Querying DNS server ${device.dnsServer || '192.168.1.100'} for ${domain}...\n`,
      dnsTarget: domain
    };
  }

  // curl (HTTP)
  if (cmd === 'curl') {
    const url = tokens[1] || 'http://www.cisco.lab';
    return {
      output: `Sending HTTP GET request to ${url} on Port 80...\n`,
      httpTarget: url
    };
  }

  return {
    output: `'${tokens[0]}' is not recognized as an internal or external command, operable program or batch file.\n`
  };
}
