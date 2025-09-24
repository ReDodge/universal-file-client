import { UniversalFileClient } from '../universal-ftp-client';
import { ProtocolDetector } from '../utils/protocol-detector';
import { FileMatcher } from '../utils/file-matcher';

describe('UniversalFileClient', () => {
  let client: UniversalFileClient;

  beforeEach(() => {
    client = new UniversalFileClient();
  });

  afterEach(async () => {
    if (client.isConnected()) {
      await client.disconnect();
    }
  });

  describe('Connection Management', () => {
    it('should initialize with no connection', () => {
      expect(client.isConnected()).toBe(false);
      expect(client.getProtocol()).toBeNull();
      expect(client.getConnectionConfig()).toBeNull();
    });

    it('should throw error when calling methods without connection', async () => {
      await expect(client.list()).rejects.toThrow('Not connected to any server');
      await expect(client.download('/test')).rejects.toThrow('Not connected to any server');
      await expect(client.upload('/local', '/remote')).rejects.toThrow('Not connected to any server');
      await expect(client.stat('/test')).rejects.toThrow('Not connected to any server');
      await expect(client.exists('/test')).rejects.toThrow('Not connected to any server');
    });

    it('should handle unsupported protocol', async () => {
      await expect(
        client.connect({ host: 'unknown://example.com' })
      ).rejects.toThrow('Unsupported protocol');
    });
  });

  describe('Protocol Detection', () => {
    it('should detect FTP protocol', () => {
      expect(ProtocolDetector.detect('ftp://example.com')).toBe('ftp');
      expect(ProtocolDetector.detect('ftp:example.com')).toBe('ftp');
    });

    it('should detect FTPS protocol', () => {
      expect(ProtocolDetector.detect('ftps://example.com')).toBe('ftps');
      expect(ProtocolDetector.detect('ftps:example.com')).toBe('ftps');
    });

    it('should detect SFTP protocol', () => {
      expect(ProtocolDetector.detect('sftp://example.com')).toBe('sftp');
      expect(ProtocolDetector.detect('sftp:example.com')).toBe('sftp');
    });

    it('should detect HTTP protocol', () => {
      expect(ProtocolDetector.detect('http://example.com')).toBe('http');
    });

    it('should detect HTTPS protocol', () => {
      expect(ProtocolDetector.detect('https://example.com')).toBe('https');
    });

    it('should normalize host correctly', () => {
      expect(ProtocolDetector.normalizeHost('ftp://example.com')).toBe('example.com');
      expect(ProtocolDetector.normalizeHost('sftp://example.com:22')).toBe('example.com:22');
      expect(ProtocolDetector.normalizeHost('https://api.example.com/path')).toBe('api.example.com/path');
    });

    it('should validate URLs', () => {
      expect(ProtocolDetector.isValidUrl('https://example.com')).toBe(true);
      expect(ProtocolDetector.isValidUrl('invalid-url')).toBe(false);
    });
  });

  describe('File Matching', () => {
    const mockFiles = [
      {
        name: 'test.txt',
        size: 100,
        date: new Date('2023-01-01'),
        type: 'file' as const,
        isDirectory: false,
        modifyTime: new Date('2023-01-01').getTime(),
      },
      {
        name: 'test_20230101.txt',
        size: 200,
        date: new Date('2023-01-02'),
        type: 'file' as const,
        isDirectory: false,
        modifyTime: new Date('2023-01-02').getTime(),
      },
      {
        name: 'other.csv',
        size: 300,
        date: new Date('2023-01-03'),
        type: 'file' as const,
        isDirectory: false,
        modifyTime: new Date('2023-01-03').getTime(),
      },
    ];

    const matchOptions = {
      basename: 'test',
      filepath: 'test.txt',
      extname: '.txt',
    };

    it('should find exact matches', () => {
      const result = FileMatcher.findBestMatch(mockFiles, matchOptions, 'exact');
      expect(result?.name).toBe('test.txt');
    });

    it('should find prefix matches', () => {
      const result = FileMatcher.findBestMatch(mockFiles, matchOptions, 'prefix');
      expect(result?.name).toBe('test_20230101.txt'); // Newest match
    });

    it('should find smart matches', () => {
      const result = FileMatcher.findBestMatch(mockFiles, matchOptions, 'smart');
      expect(result?.name).toBe('test_20230101.txt'); // Newest match
    });

    it('should handle regex matches', () => {
      const regexOptions = {
        basename: '^test.*',
        filepath: 'test',
        extname: '.txt',
      };
      const result = FileMatcher.findBestMatch(mockFiles, regexOptions, 'regex');
      expect(result?.name).toBe('test_20230101.txt'); // Newest matching
    });

    it('should return null when no matches found', () => {
      const noMatchOptions = {
        basename: 'nonexistent',
        filepath: 'nonexistent.txt',
        extname: '.txt',
      };
      const result = FileMatcher.findBestMatch(mockFiles, noMatchOptions, 'exact');
      expect(result).toBeNull();
    });
  });

  describe('Download with Retry Logic', () => {
    beforeEach(() => {
      client = new UniversalFileClient();
    });

    it('should apply default retry options', async () => {
      // Mock a client that fails twice then succeeds
      const mockAdapter = {
        download: jest.fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce(Buffer.from('success')),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };

      // @ts-ignore - Access private property for testing
      client['adapter'] = mockAdapter;

      const result = await client.download('/test/file.txt');
      expect(result.toString()).toBe('success');
      expect(mockAdapter.download).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const mockAdapter = {
        download: jest.fn().mockRejectedValue(new Error('Persistent error')),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };

      // @ts-ignore - Access private property for testing
      client['adapter'] = mockAdapter;

      await expect(
        client.download('/test/file.txt', { retries: 2 })
      ).rejects.toThrow('Persistent error');
      expect(mockAdapter.download).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('List with Options', () => {
    const mockFiles = [
      {
        name: 'file1.txt',
        size: 100,
        date: new Date(),
        type: 'file' as const,
        isDirectory: false,
      },
      {
        name: 'dir1',
        size: 0,
        date: new Date(),
        type: 'directory' as const,
        isDirectory: true,
      },
    ];

    beforeEach(() => {
      client = new UniversalFileClient();
    });

    it('should filter out directories by default', async () => {
      const mockAdapter = {
        list: jest.fn().mockResolvedValue(mockFiles),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };

      // @ts-ignore - Access private property for testing
      client['adapter'] = mockAdapter;

      const result = await client.list('/test');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('file');
    });

    it('should include directories when requested', async () => {
      const mockAdapter = {
        list: jest.fn().mockResolvedValue(mockFiles),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };

      // @ts-ignore - Access private property for testing
      client['adapter'] = mockAdapter;

      const result = await client.list('/test', { includeDirectories: true });
      expect(result).toHaveLength(2);
    });
  });

  describe('Configuration', () => {
    it('should store connection config after connecting', async () => {
      const config = {
        host: 'http://example.com',
        username: 'test',
        password: 'pass',
      };

      // Mock HTTP adapter for successful connection
      const mockAdapter = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };

      // @ts-ignore - Access private property for testing
      client['adapter'] = mockAdapter;

      await client.connect(config);

      expect(client.getConnectionConfig()).toEqual(config);
      expect(client.getProtocol()).toBe('http');
      expect(client.isConnected()).toBe(true);
    });
  });
});

// Additional integration-style tests for HTTP adapter specifically
describe('HTTP Adapter Integration', () => {
  let client: UniversalFileClient;

  beforeEach(() => {
    client = new UniversalFileClient();
  });

  afterEach(async () => {
    if (client.isConnected()) {
      await client.disconnect();
    }
  });

  it('should handle HTTP connection', async () => {
    await client.connect({
      host: 'https://httpbin.org',
      timeout: 10000,
    });

    expect(client.isConnected()).toBe(true);
    expect(client.getProtocol()).toBe('https');
  });

  it('should throw error for HTTP list operation', async () => {
    await client.connect({ host: 'https://httpbin.org' });
    await expect(client.list()).rejects.toThrow('HTTP adapter does not support directory listing');
  });

  it('should throw error for HTTP upload operation', async () => {
    await client.connect({ host: 'https://httpbin.org' });
    await expect(client.upload('/local', '/remote')).rejects.toThrow('HTTP adapter does not support file upload');
  });
});