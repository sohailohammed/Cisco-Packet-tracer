export function isValidIp(ip: string): boolean {
  if (!ip) return false;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every(part => {
    if (!/^\d+$/.test(part)) return false;
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

export function isValidSubnetMask(mask: string): boolean {
  if (!isValidIp(mask)) return false;
  const long = ipToLong(mask);
  // Valid subnet mask has consecutive 1s followed by consecutive 0s
  const inverted = (~long) >>> 0;
  return ((inverted + 1) & inverted) === 0;
}

export function ipToLong(ip: string): number {
  const parts = ip.split('.').map(p => parseInt(p, 10));
  return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
}

export function longToIp(long: number): string {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255
  ].join('.');
}

export function getNetworkAddress(ip: string, mask: string): string {
  if (!isValidIp(ip) || !isValidIp(mask)) return '';
  const ipL = ipToLong(ip);
  const maskL = ipToLong(mask);
  return longToIp((ipL & maskL) >>> 0);
}

export function isSameSubnet(ip1: string, ip2: string, mask: string): boolean {
  if (!isValidIp(ip1) || !isValidIp(ip2) || !isValidIp(mask)) return false;
  return getNetworkAddress(ip1, mask) === getNetworkAddress(ip2, mask);
}

export function maskToCidr(mask: string): number {
  if (!isValidIp(mask)) return 24;
  const long = ipToLong(mask);
  let bits = 0;
  for (let i = 31; i >= 0; i--) {
    if ((long & (1 << i)) !== 0) {
      bits++;
    } else {
      break;
    }
  }
  return bits;
}

export function cidrToMask(cidr: number): string {
  if (cidr < 0 || cidr > 32) return '255.255.255.0';
  const mask = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
  return longToIp(mask);
}

export function wildcardToMask(wildcard: string): string {
  if (!isValidIp(wildcard)) return '255.255.255.0';
  const parts = wildcard.split('.').map(p => 255 - parseInt(p, 10));
  return parts.join('.');
}

export function generateMacAddress(): string {
  const hex = '0123456789ABCDEF';
  let mac = '00';
  for (let i = 1; i < 6; i++) {
    mac += ':' + hex[Math.floor(Math.random() * 16)] + hex[Math.floor(Math.random() * 16)];
  }
  return mac;
}
