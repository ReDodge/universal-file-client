import Client from 'ssh2-sftp-client';
import * as path from 'path';
import { ProtocolAdapter, ConnectionConfig, FileInfo } from '../types';
import { ProtocolDetector } from '../utils/protocol-detector';

export class SftpAdapter implements ProtocolAdapter {
  private client: any;
  private isConnected = false;

  constructor() {
    this.client = new Client();
  }

  async connect(config: ConnectionConfig): Promise<void> {
    try {
      const normalizedHost = ProtocolDetector.normalizeHost(config.host);

      await this.client.connect({
        host: normalizedHost,
        username: config.username,
        password: config.password,
        port: config.port ?? 22,
      });

      this.isConnected = true;
    } catch (error: any) {
      this.isConnected = false;
      throw new Error(`SFTP connection failed: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.end();
      this.isConnected = false;
    }
  }

  async list(path = '.'): Promise<FileInfo[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to SFTP server');
    }

    try {
      const files = await this.client.list(path);
      return files
        .filter((file: any) => file.type === '-') // Only files, not directories
        .map((file: any) => ({
          name: file.name,
          size: file.size,
          date: new Date(file.modifyTime),
          type: file.type === 'd' ? 'directory' : 'file',
          isDirectory: file.type === 'd',
          modifyTime: file.modifyTime,
        }));
    } catch (error: any) {
      throw new Error(`Failed to list SFTP directory: ${error.message}`);
    }
  }

  async download(remotePath: string): Promise<Buffer> {
    if (!this.isConnected) {
      throw new Error('Not connected to SFTP server');
    }

    try {
      const data = await this.client.get(remotePath);
      return data as Buffer;
    } catch (error: any) {
      throw new Error(`Failed to download file from SFTP: ${error.message}`);
    }
  }

  async upload(localPath: string, remotePath: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to SFTP server');
    }

    try {
      await this.client.put(localPath, remotePath);
    } catch (error: any) {
      throw new Error(`Failed to upload file to SFTP: ${error.message}`);
    }
  }

  async stat(filePath: string): Promise<FileInfo | null> {
    if (!this.isConnected) {
      throw new Error('Not connected to SFTP server');
    }

    try {
      const stats = await this.client.stat(filePath);
      if (!stats) return null;

      return {
        name: path.basename(filePath),
        size: stats.size,
        date: new Date(stats.modifyTime || Date.now()),
        type: stats.isDirectory ? 'directory' : 'file',
        isDirectory: !!stats.isDirectory,
        modifyTime: stats.modifyTime || Date.now(),
      };
    } catch (error) {
      return null;
    }
  }

  async exists(filePath: string): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('Not connected to SFTP server');
    }

    try {
      const exists = await this.client.exists(filePath);
      return !!exists;
    } catch (error: any) {
      return false;
    }
  }

  async lastModified(filePath: string): Promise<Date | null> {
    const stat = await this.stat(filePath);
    return stat ? stat.date : null;
  }
}