# @universal-file/client

A universal file transfer client with unified interface for FTP, SFTP, and HTTP protocols.

## Features

- **🌐 Unified Interface**: Single API for FTP, SFTP, and HTTP protocols
- **🔍 Auto Protocol Detection**: Automatically detects protocol from URL
- **🔄 Retry Logic**: Built-in retry mechanisms for failed operations with exponential backoff
- **📝 TypeScript First**: Full TypeScript support with comprehensive types
- **🎯 Smart File Matching**: Advanced file filtering and pattern matching
- **⚡ Error Handling**: Comprehensive error handling and validation
- **🧪 Well Tested**: Comprehensive test suite with 23 test cases

## Installation

```bash
npm install @universal-file/client
```

## Quick Start

```typescript
import { UniversalFileClient } from '@universal-file/client';

const client = new UniversalFileClient();

// Auto-detects protocol from URL
await client.connect({
  host: 'ftp://ftp.example.com',
  username: 'user',
  password: 'pass'
});

// List files (excludes directories by default)
const files = await client.list('/path/to/files');

// List including directories
const allItems = await client.list('/path', { includeDirectories: true });

// Download file with retry logic
const content = await client.download('/path/to/file.txt', {
  retries: 3,
  retryDelay: 1000
});

// Upload file
await client.upload('/local/file.txt', '/remote/file.txt');

// Check if file exists
const exists = await client.exists('/path/to/file.txt');

// Get file information
const fileInfo = await client.stat('/path/to/file.txt');

// Smart file finding with pattern matching
const result = await client.findFile('/path/to/pattern*', 'smart');

// Check for file updates
const updateCheck = await client.checkForUpdates(
  '/path/to/file.txt',
  lastKnownDate,
  'smart'
);

await client.disconnect();
```

## Supported Protocols

- **FTP**: `ftp://example.com` - Standard File Transfer Protocol
- **FTPS**: `ftps://example.com` - FTP over TLS/SSL
- **SFTP**: `sftp://example.com` - SSH File Transfer Protocol  
- **HTTP/HTTPS**: `http://example.com` or `https://example.com` - Web-based file access

## Configuration Options

### ConnectionConfig

```typescript
interface ConnectionConfig {
  host: string;                    // Server URL with protocol (required)
  username?: string;               // Authentication username
  password?: string;               // Authentication password
  port?: number;                   // Custom port (defaults: FTP=21, SFTP=22, HTTP=80/443)
  secure?: boolean;                // Force secure connection
  directoryPath?: string;          // Initial directory to navigate to
  sellerSFTPDirectory?: string;    // Legacy SFTP directory option
  timeout?: number;                // Connection timeout in milliseconds
}
```

### File Operations

#### Core Methods

```typescript
// Connection management
connect(config: ConnectionConfig): Promise<void>
disconnect(): Promise<void>
isConnected(): boolean
getProtocol(): Protocol | null
getConnectionConfig(): ConnectionConfig | null

// File operations
list(path?: string, options?: ListOptions): Promise<FileInfo[]>
download(remotePath: string, options?: DownloadOptions): Promise<Buffer>
upload(localPath: string, remotePath: string): Promise<void>
stat(filePath: string): Promise<FileInfo | null>
exists(filePath: string): Promise<boolean>
lastModified(filePath: string): Promise<Date | null>

// Advanced operations
findFile(targetPath: string, fileNameType?: FileNameType): Promise<{file: FileInfo, actualPath: string} | null>
checkForUpdates(filePath: string, lastKnownDate: Date, fileNameType?: FileNameType): Promise<{hasUpdate: boolean, file?: FileInfo, actualPath?: string}>
```

#### Options Interfaces

```typescript
interface ListOptions {
  pattern?: string;                // File pattern to match
  fileNameType?: FileNameType;     // Matching algorithm: 'exact' | 'prefix' | 'regex' | 'smart'
  includeDirectories?: boolean;    // Include directories in results (default: false)
}

interface DownloadOptions {
  timeout?: number;                // Download timeout
  retries?: number;                // Number of retries (default: 3)
  retryDelay?: number;             // Initial retry delay in ms (default: 1000)
}

interface FileInfo {
  name: string;                    // File name
  size: number;                    // File size in bytes
  date: Date;                      // Last modified date
  type: 'file' | 'directory';     // Item type
  isDirectory: boolean;            // Directory flag
  modifyTime?: number;             // Modification timestamp
}
```

## File Matching Types

The library supports different file matching strategies:

- **`exact`**: Exact filename match
- **`prefix`**: Match files starting with the given name
- **`regex`**: Regular expression matching
- **`smart`**: Intelligent matching with date/timestamp suffix detection

## Protocol-Specific Behavior

### FTP/FTPS
- Full CRUD operations supported
- Automatic secure connection detection for FTPS
- Directory listing and navigation
- Binary and text file transfers

### SFTP
- Full CRUD operations via SSH
- Key-based authentication support
- Secure encrypted transfers
- Unix-style permissions preserved

### HTTP/HTTPS
- **Download only** (read-only operations)
- HEAD requests for file metadata
- Basic authentication support
- Automatic JSON content detection for update checking
- **Note**: `list()` and `upload()` operations will throw errors

## Error Handling

The library provides comprehensive error handling:

```typescript
try {
  await client.connect({ host: 'invalid://protocol.com' });
} catch (error) {
  console.error(error.message); // "Unsupported protocol: invalid"
}

try {
  await client.download('/nonexistent/file.txt');
} catch (error) {
  console.error(error.message); // Descriptive error with context
}
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Run example
node example.js
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT - see LICENSE file for details

## Changelog

### v1.0.0
- Initial release
- Support for FTP, FTPS, SFTP, HTTP, and HTTPS protocols
- Smart file matching and pattern detection
- Comprehensive test suite
- TypeScript support with full type definitions
- Retry logic with exponential backoff
- Error handling and validation