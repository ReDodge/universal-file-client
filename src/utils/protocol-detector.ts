import { Protocol } from '../types';

export class ProtocolDetector {
  static detect(host: string, transferMode?: string): Protocol {
    // Check transferMode first if provided
    if (transferMode) {
      if (transferMode.startsWith('sftp')) return 'sftp';
      if (transferMode.startsWith('ftps')) return 'ftps';
      if (transferMode.startsWith('ftp')) return 'ftp';
      if (transferMode.startsWith('https')) return 'https';
      if (transferMode.startsWith('http')) return 'http';
    }

    // Parse host URL
    if (host.startsWith('sftp://') || host.startsWith('sftp:')) return 'sftp';
    if (host.startsWith('ftps://') || host.startsWith('ftps:')) return 'ftps';
    if (host.startsWith('ftp://') || host.startsWith('ftp:')) return 'ftp';
    if (host.startsWith('https://')) return 'https';
    if (host.startsWith('http://')) return 'http';

    // Check for unknown protocols
    if (host.includes('://')) {
      const protocol = host.split('://')[0];
      if (!['ftp', 'ftps', 'sftp', 'http', 'https'].includes(protocol)) {
        throw new Error(`Unsupported protocol: ${protocol}`);
      }
    }

    // Default fallback based on common patterns
    if (host.includes('sftp')) return 'sftp';
    if (host.includes('https')) return 'https';
    if (host.includes('http')) return 'http';
    
    // Default to FTP for legacy compatibility
    return 'ftp';
  }

  static normalizeHost(host: string): string {
    // Remove protocol prefix for internal use
    return host
      .replace(/^(sftp|ftps|ftp|https|http):\/\//, '')
      .replace(/^(sftp|ftps|ftp|https|http):/, '');
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}