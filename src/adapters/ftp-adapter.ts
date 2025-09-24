import { Client as FtpClient } from 'basic-ftp';
import * as path from 'path';
import { ProtocolAdapter, ConnectionConfig, FileInfo } from '../types';
import { ProtocolDetector } from '../utils/protocol-detector';

export class FtpAdapter implements ProtocolAdapter {
  private client: FtpClient;
  private isConnected = false;

  constructor() {
    this.client = new FtpClient();
  }

  async connect(config: ConnectionConfig): Promise<void> {
    try {
      const normalizedHost = ProtocolDetector.normalizeHost(config.host);
      const isSecure = config.secure || config.host.includes('ftps');

      const connectionConfig: any = {
        host: normalizedHost,
        user: config.username,
        password: config.password,
        port: config.port,
      };

      if (isSecure) {
        connectionConfig.secure = true;
        connectionConfig.secureOptions = {
          rejectUnauthorized: false, // Accept self-signed certificates
        };
      }

      await this.client.access(connectionConfig);
      this.isConnected = true;

      // Navigate to directory if specified
      if (config.directoryPath && config.directoryPath.trim() !== '') {
        await this.client.cd(config.directoryPath);
      }
    } catch (error: any) {
      this.isConnected = false;
      throw new Error(`FTP connection failed: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      this.client.close();
      this.isConnected = false;
    }
  }

  async list(path = '.'): Promise<FileInfo[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to FTP server');
    }

    try {
      const files = await this.client.list(path);
      return files
        .filter(file => !file.isDirectory)
        .map(file => ({
          name: file.name,
          size: file.size,
          date: new Date(file.date),
          type: file.isDirectory ? 'directory' : 'file' as 'file' | 'directory',
          isDirectory: file.isDirectory,
          modifyTime: new Date(file.date).getTime(),
        }));
    } catch (error: any) {
      throw new Error(`Failed to list FTP directory: ${error.message}`);
    }
  }

  async download(remotePath: string): Promise<Buffer> {
    if (!this.isConnected) {
      throw new Error('Not connected to FTP server');
    }

    try {
      const chunks: Buffer[] = [];
      await this.client.downloadTo(
        {
          write: (chunk: Buffer) => chunks.push(chunk),
          end: () => {
            // Stream ended
          },
        } as any,
        remotePath
      );
      return Buffer.concat(chunks);
    } catch (error: any) {
      throw new Error(`Failed to download file from FTP: ${error.message}`);
    }
  }

  async upload(localPath: string, remotePath: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to FTP server');
    }

    try {
      await this.client.uploadFrom(localPath, remotePath);
    } catch (error: any) {
      throw new Error(`Failed to upload file to FTP: ${error.message}`);
    }
  }

  async stat(filePath: string): Promise<FileInfo | null> {
    if (!this.isConnected) {
      throw new Error('Not connected to FTP server');
    }

    try {
      const parentDir = path.dirname(filePath);
      const fileName = path.basename(filePath);
      const files = await this.client.list(parentDir);
      
      const file = files.find(f => f.name === fileName);
      if (!file) return null;

      return {
        name: file.name,
        size: file.size,
        date: new Date(file.date),
        type: file.isDirectory ? 'directory' : 'file' as 'file' | 'directory',
        isDirectory: file.isDirectory,
        modifyTime: new Date(file.date).getTime(),
      };
    } catch (error) {
      return null;
    }
  }

  async exists(filePath: string): Promise<boolean> {
    const stat = await this.stat(filePath);
    return stat !== null;
  }

  async lastModified(filePath: string): Promise<Date | null> {
    if (!this.isConnected) {
      throw new Error('Not connected to FTP server');
    }

    try {
      const lastMod = await this.client.lastMod(filePath);
      return lastMod;
    } catch (error) {
      return null;
    }
  }
}