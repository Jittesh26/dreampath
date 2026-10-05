import { describe, it, expect } from 'vitest';
import { isPrivateOrReservedIp } from '../safe-fetch';

describe('SSRF Security Protection (safe-fetch.ts)', () => {
  it('blocks loopback IP addresses', () => {
    expect(isPrivateOrReservedIp('127.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('127.255.255.255')).toBe(true);
    expect(isPrivateOrReservedIp('::1')).toBe(true);
  });

  it('blocks private IPv4 networks (RFC 1918)', () => {
    // 10.0.0.0/8
    expect(isPrivateOrReservedIp('10.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('10.254.1.5')).toBe(true);

    // 172.16.0.0/12
    expect(isPrivateOrReservedIp('172.16.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('172.31.255.255')).toBe(true);
    expect(isPrivateOrReservedIp('172.32.0.1')).toBe(false); // Public

    // 192.168.0.0/16
    expect(isPrivateOrReservedIp('192.168.1.1')).toBe(true);
    expect(isPrivateOrReservedIp('192.168.100.254')).toBe(true);
  });

  it('blocks AWS/Cloud metadata Link-Local addresses (169.254.169.254)', () => {
    expect(isPrivateOrReservedIp('169.254.169.254')).toBe(true);
    expect(isPrivateOrReservedIp('169.254.1.1')).toBe(true);
  });

  it('allows public Internet IP addresses', () => {
    expect(isPrivateOrReservedIp('8.8.8.8')).toBe(false);
    expect(isPrivateOrReservedIp('1.1.1.1')).toBe(false);
    expect(isPrivateOrReservedIp('104.26.10.228')).toBe(false);
    expect(isPrivateOrReservedIp('52.77.146.31')).toBe(false);
  });
});
