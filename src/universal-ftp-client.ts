import { 
  ProtocolAdapter, 
  ConnectionConfig, 
  FileInfo, 
  Protocol,
  FileNameType,
  FileNameMatchOptions,
  ListOptions,
  DownloadOptions
} from './types';
import { FtpAdapter } from './adapters/ftp-adapter';
import { SftpAdapter } from './adapters/sftp-adapter';
import { HttpAdapter } from './adapters/http-adapter';
import { ProtocolDetector } from './utils/protocol-detector';
import { FileMatcher } from './utils/file-matcher';
import * as path from 'path';

export class UniversalFileClient {
  private adapter: ProtocolAdapter | null = null;
  private protocol: Protocol | null = null;
  private connectionConfig: ConnectionConfig | null = null;

  async connect(config: ConnectionConfig): Promise<void> {
    if (!config.host) {
      throw new Error('Host is required for connection');
    }

    const protocol = ProtocolDetector.detect(config.host);
    this.protocol = protocol;
    this.connectionConfig = config;

    // Create appropriate adapter
    switch (protocol) {
      case 'ftp':
      case 'ftps':
        this.adapter = new FtpAdapter();
        break;
      case 'sftp':
        this.adapter = new SftpAdapter();
        break;
      case 'http':
      case 'https':
        this.adapter = new HttpAdapter();
        break;
      default:
        throw new Error(`Unsupported protocol: ${protocol}`);
    }

    await this.adapter.connect(config);
  }

  async disconnect(): Promise<void> {
    if (this.adapter) {
      await this.adapter.disconnect();
      this.adapter = null;
      this.protocol = null;
      this.connectionConfig = null;
    }
  }

  async list(pathArg: string = '.', options: ListOptions = {}): Promise<FileInfo[]> {
    if (!this.adapter) {
      throw new Error('Not connected to any server');
    }

    try {
      const files = await this.adapter.list(pathArg);
    
      if (!options.includeDirectories) {
        return files.filter(file => !file.isDirectory);
      }

      return files;
    } catch (error: any) {
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  }

  async download(remotePath: string, options: DownloadOptions = {}): Promise<Buffer> {
    if (!this.adapter) {
      throw new Error('Not connected to any server');
    }

    const retries = options.retries || 3;
    const retryDelay = options.retryDelay || 1000;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.adapter.download(remotePath);
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        await this.sleep(retryDelay * Math.pow(2, attempt));
      }
    }

    throw new Error('Download failed after all retries');
  }

  async upload(localPath: string, remotePath: string): Promise<void> {
    if (!this.adapter) {
      throw new Error('Not connected to any server');
    }

    if (!localPath || !remotePath) {
      throw new Error('Both local and remote paths are required for upload');
    }

    try {
      return await this.adapter.upload(localPath, remotePath);
    } catch (error: any) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async stat(filePath: string): Promise<FileInfo | null> {
    if (!this.adapter) {
      throw new Error('Not connected to any server');
    }

    if (!filePath) {
      throw new Error('File path is required for stat operation');
    }

    try {
      return await this.adapter.stat(filePath);
    } catch (error: any) {
      throw new Error(`Failed to get file stats: ${error.message}`);
    }
  }

  async exists(filePath: string): Promise<boolean> {
    if (!this.adapter) {
      throw new Error('Not connected to any server');
    }

    if (!filePath) {
      throw new Error('File path is required for exists check');
    }

    try {
      return await this.adapter.exists(filePath);
    } catch (error: any) {
      // Return false for exists check instead of throwing
      return false;
    }
  }

  async lastModified(filePath: string): Promise<Date | null> {
    if (!this.adapter) {
      throw new Error('Not connected to any server');
    }

    return this.adapter.lastModified(filePath);
  }

  async findFile(
    targetPath: string, 
    fileNameType: FileNameType = 'smart'
  ): Promise<{ file: FileInfo; actualPath: string } | null> {
    if (!this.adapter) {
      throw new Error('Not connected to any server');
    }

    const dirPath = path.dirname(targetPath);
    const parsedPath = path.parse(targetPath);
    const { name: basename, ext: extname } = parsedPath;

    try {
      // First try exact path
      const exactFile = await this.stat(targetPath);
      if (exactFile) {
        return { file: exactFile, actualPath: targetPath };
      }

      // List directory and find matching files
      const files = await this.list(dirPath);
      const matchOptions: FileNameMatchOptions = {
        basename,
        filepath: targetPath,
        extname,
      };

      const matchedFile = FileMatcher.findBestMatch(files, matchOptions, fileNameType);
      if (matchedFile) {
        const actualPath = path.join(dirPath, matchedFile.name);
        return { file: matchedFile, actualPath };
      }

      return null;
    } catch (error: any) {
      throw new Error(`Failed to find file: ${error.message}`);
    }
  }

  async checkForUpdates(
    filePath: string,
    lastKnownDate: Date,
    fileNameType: FileNameType = 'smart'
  ): Promise<{ hasUpdate: boolean; file?: FileInfo; actualPath?: string }> {
    const result = await this.findFile(filePath, fileNameType);
    
    if (!result) {
      return { hasUpdate: false };
    }

    const { file, actualPath } = result;
    
    // For HTTP/JSON files, always consider as updated (API exception)
    if (this.protocol === 'http' || this.protocol === 'https') {
      const httpAdapter = this.adapter as HttpAdapter;
      const fileInfo = await httpAdapter.getFileInfo(actualPath);
      
      if (fileInfo.isJson) {
        return { hasUpdate: true, file, actualPath };
      }
      
      // For non-JSON HTTP files, check last modified
      if (!fileInfo.lastModified) {
        return { hasUpdate: false, file, actualPath };
      }
      
      const hasUpdate = fileInfo.lastModified.getTime() > lastKnownDate.getTime();
      return { hasUpdate, file, actualPath };
    }

    // For FTP/SFTP, check modification time
    const hasUpdate = file.date.getTime() > lastKnownDate.getTime();
    return { hasUpdate, file, actualPath };
  }

  getProtocol(): Protocol | null {
    return this.protocol;
  }

  getConnectionConfig(): ConnectionConfig | null {
    return this.connectionConfig;
  }

  isConnected(): boolean {
    return this.adapter !== null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}