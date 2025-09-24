import axios, { AxiosRequestConfig } from 'axios';
import * as path from 'path';
import { ProtocolAdapter, ConnectionConfig, FileInfo } from '../types';

export class HttpAdapter implements ProtocolAdapter {
  private config: ConnectionConfig | null = null;
  private isConnected = false;

  async connect(config: ConnectionConfig): Promise<void> {
    this.config = config;
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.config = null;
    this.isConnected = false;
  }

  async list(_path = '.'): Promise<FileInfo[]> {
    throw new Error('HTTP adapter does not support directory listing');
  }

  async download(remotePath: string): Promise<Buffer> {
    if (!this.isConnected || !this.config) {
      throw new Error('Not connected to HTTP server');
    }

    try {
      const fileUrl = remotePath.startsWith('http') ? remotePath : `${this.config.host}${remotePath}`;
      
      if (!this.isValidUrl(fileUrl)) {
        throw new Error(`Invalid URL: ${fileUrl}`);
      }

      const axiosConfig: AxiosRequestConfig = {
        responseType: 'arraybuffer',
        timeout: this.config.timeout || 30000,
      };

      if (this.config.username && this.config.password) {
        axiosConfig.auth = {
          username: this.config.username,
          password: this.config.password,
        };
      }

      const response = await axios.get(fileUrl, axiosConfig);

      if (response.status !== 200) {
        throw new Error(`HTTP request failed with status: ${response.status}`);
      }

      return Buffer.from(response.data);
    } catch (error: any) {
      throw new Error(`Failed to download file from HTTP: ${error.message}`);
    }
  }

  async upload(_localPath: string, _remotePath: string): Promise<void> {
    throw new Error('HTTP adapter does not support file upload');
  }

  async stat(filePath: string): Promise<FileInfo | null> {
    if (!this.isConnected || !this.config) {
      throw new Error('Not connected to HTTP server');
    }

    try {
      const fileUrl = filePath.startsWith('http') ? filePath : `${this.config.host}${filePath}`;
      
      if (!this.isValidUrl(fileUrl)) {
        return null;
      }

      const axiosConfig: AxiosRequestConfig = {
        method: 'HEAD',
        timeout: this.config.timeout || 30000,
      };

      if (this.config.username && this.config.password) {
        axiosConfig.auth = {
          username: this.config.username,
          password: this.config.password,
        };
      }

      const response = await axios(fileUrl, axiosConfig);

      if (response.status !== 200) {
        return null;
      }

      const contentLength = response.headers['content-length'];
      const lastModified = response.headers['last-modified'];
      // const contentType = response.headers['content-type'] || '';

      return {
        name: path.basename(filePath),
        size: contentLength ? parseInt(contentLength, 10) : 0,
        date: lastModified ? new Date(lastModified) : new Date(),
        type: 'file',
        isDirectory: false,
        modifyTime: lastModified ? new Date(lastModified).getTime() : Date.now(),
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
    const stat = await this.stat(filePath);
    return stat ? stat.date : null;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  async getFileInfo(filePath: string): Promise<{ isJson: boolean; lastModified: Date | null }> {
    if (!this.isConnected || !this.config) {
      throw new Error('Not connected to HTTP server');
    }

    try {
      const fileUrl = filePath.startsWith('http') ? filePath : `${this.config.host}${filePath}`;
      
      const axiosConfig: AxiosRequestConfig = {
        method: 'HEAD',
        timeout: this.config.timeout || 30000,
      };

      if (this.config.username && this.config.password) {
        axiosConfig.auth = {
          username: this.config.username,
          password: this.config.password,
        };
      }

      const response = await axios(fileUrl, axiosConfig);
      
      const contentType = response.headers['content-type'] ?? '';
      const isJson = contentType.includes('application/json') || contentType.includes('text/json');
      const lastModified = response.headers['last-modified'] 
        ? new Date(response.headers['last-modified']) 
        : null;

      return { isJson, lastModified };
    } catch (error) {
      return { isJson: false, lastModified: null };
    }
  }
}