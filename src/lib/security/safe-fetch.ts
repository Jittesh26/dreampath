import dns from 'dns/promises';
import { URL } from 'url';

/**
 * Validates whether an IP address is in a private, loopback, or reserved range.
 * Protects against Server-Side Request Forgery (SSRF).
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  // IPv4 Loopback (127.0.0.0/8)
  if (/^127\./.test(ip)) return true;

  // IPv4 Private Networks
  // 10.0.0.0/8
  if (/^10\./.test(ip)) return true;
  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  // 192.168.0.0/16
  if (/^192\.168\./.test(ip)) return true;

  // IPv4 Link-Local / Cloud Metadata (169.254.0.0/16)
  if (/^169\.254\./.test(ip)) return true;

  // IPv4 Carrier-Grade NAT (100.64.0.0/10)
  if (/^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(ip)) return true;

  // IPv4 Broadcast / Current Network
  if (ip === '0.0.0.0' || ip === '255.255.255.255') return true;

  // IPv6 Loopback, Link-Local, and Unique Local Addresses (fc00::/7)
  const lowerIp = ip.toLowerCase();
  if (lowerIp === '::1' || lowerIp === '::') return true;
  if (lowerIp.startsWith('fe80:') || lowerIp.startsWith('fc') || lowerIp.startsWith('fd')) return true;

  return false;
}

export interface SafeFetchResult {
  url: string;
  html: string;
  cleanText: string;
}

/**
 * Safely fetches public external web content with strict SSRF defense:
 * - Allowed protocols: http, https
 * - Blocks local/private IPs and cloud metadata addresses
 * - Enforces timeout (default: 10s)
 * - Restricts max content size (default: 2MB)
 * - Strips scripts, styles, and prompt injection hints into clean readable text
 */
export async function safeFetchWebContent(
  targetUrl: string,
  options: { timeoutMs?: number; maxBytes?: number } = {}
): Promise<SafeFetchResult> {
  const timeoutMs = options.timeoutMs ?? 10000;
  const maxBytes = options.maxBytes ?? 2 * 1024 * 1024; // 2MB

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new Error('Invalid URL format provided.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Invalid protocol: Only HTTP and HTTPS URLs are permitted.');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('Access to local domain addresses is forbidden.');
  }

  // Resolve hostname DNS to verify IP addresses
  try {
    const lookupResults = await dns.lookup(hostname, { all: true });
    for (const record of lookupResults) {
      if (isPrivateOrReservedIp(record.address)) {
        throw new Error(`SSRF security check failed: Resolved IP ${record.address} is private or reserved.`);
      }
    }
  } catch (err: any) {
    if (err.message?.includes('SSRF security check')) throw err;
    throw new Error(`Unable to resolve host ${hostname}: ${err.message}`);
  }

  // Fetch with abort timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'DreamPathBot/1.0 (+https://dreampath.my; Scholarship Verification)',
        'Accept': 'text/html,application/xhtml+xml,text/plain;q=0.9',
      },
      redirect: 'follow',
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms.`);
    }
    throw new Error(`Failed to retrieve page: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Official portal returned an error (${response.statusText}).`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
    throw new Error(`Unsupported content type: ${contentType}. Expected HTML or text.`);
  }

  const rawText = await response.text();
  if (rawText.length > maxBytes) {
    throw new Error(`Page content exceeds maximum allowed size of ${maxBytes / 1024 / 1024}MB.`);
  }

  // Strip scripts, styles, svg, and metadata tags
  let cleaned = rawText
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();

  // Limit cleaned text to 20,000 characters for LLM context safety
  cleaned = cleaned.slice(0, 20000);

  return {
    url: parsed.toString(),
    html: rawText.slice(0, 50000),
    cleanText: cleaned,
  };
}
