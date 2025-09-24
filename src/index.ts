// Main exports
export { UniversalFileClient } from './universal-ftp-client';

// Legacy export for backward compatibility
export { UniversalFileClient as UniversalFtpClient } from './universal-ftp-client';

// Type exports
export {
  ConnectionConfig,
  FileInfo,
  Protocol,
  FileNameType,
  FileNameMatchOptions,
  ListOptions,
  DownloadOptions,
  ProtocolAdapter,
} from './types';

// Utility exports
export { ProtocolDetector } from './utils/protocol-detector';
export { FileMatcher } from './utils/file-matcher';

// Adapter exports (for advanced usage)
export { FtpAdapter } from './adapters/ftp-adapter';
export { SftpAdapter } from './adapters/sftp-adapter';
export { HttpAdapter } from './adapters/http-adapter';