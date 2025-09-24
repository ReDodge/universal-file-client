export interface ConnectionConfig {
  host: string;
  username?: string;
  password?: string;
  port?: number;
  secure?: boolean;
  directoryPath?: string;
  timeout?: number;
}

export interface FileInfo {
  name: string;
  size: number;
  date: Date;
  type: 'file' | 'directory';
  isDirectory: boolean;
  modifyTime?: number;
}

export interface FileNameMatchOptions {
  basename: string;
  filepath: string;
  extname: string;
}

export type FileNameType = 'exact' | 'prefix' | 'regex' | 'smart';

export type Protocol = 'ftp' | 'ftps' | 'sftp' | 'http' | 'https';

export interface ProtocolAdapter {
  connect(config: ConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  list(path: string): Promise<FileInfo[]>;
  download(remotePath: string): Promise<Buffer>;
  upload(localPath: string, remotePath: string): Promise<void>;
  stat(path: string): Promise<FileInfo | null>;
  exists(path: string): Promise<boolean>;
  lastModified(path: string): Promise<Date | null>;
}

export interface DownloadOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface ListOptions {
  pattern?: string;
  fileNameType?: FileNameType;
  includeDirectories?: boolean;
}