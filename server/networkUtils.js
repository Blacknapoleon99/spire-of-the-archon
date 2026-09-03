import os from 'os';

/**
 * Discovers the local LAN IPv4 addresses of this machine.
 * Useful for self-hosted games so friends on the same Wi-Fi/LAN can easily connect.
 */
export function getLocalIPAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Filter out internal/loopback and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          name,
          address: iface.address,
        });
      }
    }
  }

  return addresses;
}

export function getPrimaryLANIP() {
  const addrs = getLocalIPAddresses();
  if (addrs.length > 0) {
    // Return the first valid IPv4 address
    return addrs[0].address;
  }
  return '127.0.0.1';
}

export function printHostBanner(port = 3000) {
  const lanIP = getPrimaryLANIP();
  const border = '═'.repeat(60);
  console.log(`\n${border}`);
  console.log('   🔮 THE SPIRE OF THE ARCHON - CO-OP HOST SERVER 🔮   ');
  console.log(`${border}`);
  console.log(`  Local Access:      http://localhost:${port}`);
  console.log(`  LAN / Friends:     http://${lanIP}:${port}`);
  console.log(`${border}`);
  console.log('  Share the LAN URL or Room Code with other players on');
  console.log('  your local network or VPN (Tailscale, Hamachi, etc.)!');
  console.log(`${border}\n`);
}
