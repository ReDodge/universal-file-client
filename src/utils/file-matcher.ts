import * as path from 'path';
import { FileInfo, FileNameType, FileNameMatchOptions } from '../types';

export class FileMatcher {
  static doesFileNameMatch(
    fileInfo: FileInfo,
    options: FileNameMatchOptions,
    fileNameType: FileNameType = 'smart'
  ): boolean {
    const fileName = fileInfo.name;
    const { basename, filepath, extname } = options;

    switch (fileNameType) {
      case 'exact':
        return fileName === path.basename(filepath);

      case 'prefix':
        return fileName.startsWith(basename);

      case 'regex':
        try {
          const regex = new RegExp(basename);
          return regex.test(fileName);
        } catch {
          return false;
        }

      case 'smart':
      default:
        return this.smartMatch(fileName, basename, extname);
    }
  }

  private static smartMatch(fileName: string, basename: string, extname: string): boolean {
    // Remove extension from filename for comparison
    const fileBasename = path.parse(fileName).name;
    const fileExt = path.parse(fileName).ext;

    // Exact match first
    if (fileName === basename + extname) return true;

    // Extension must match if specified
    if (extname && fileExt.toLowerCase() !== extname.toLowerCase()) return false;

    // Normalize names for fuzzy matching
    const normalizedFile = this.normalizeString(fileBasename);
    const normalizedTarget = this.normalizeString(basename);

    // Case insensitive exact match
    if (normalizedFile === normalizedTarget) return true;

    // Prefix match with date/timestamp patterns
    if (normalizedFile.startsWith(normalizedTarget)) {
      const suffix = normalizedFile.substring(normalizedTarget.length);
      // Check if suffix is a date/timestamp pattern
      return this.isDateTimeSuffix(suffix);
    }

    return false;
  }

  private static normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[_\s-]+/g, '') // Remove spaces, underscores, dashes
      .trim();
  }

  private static isDateTimeSuffix(suffix: string): boolean {
    // Common date/time patterns in filenames
    const patterns = [
      /^_?\d{4}-?\d{2}-?\d{2}/, // YYYY-MM-DD or YYYYMMDD
      /^_?\d{2}-?\d{2}-?\d{4}/, // DD-MM-YYYY or DDMMYYYY
      /^_?\d{8}/, // YYYYMMDD
      /^_?\d{6}/, // YYMMDD
      /^_?\d{4}/, // YYYY
      /^_?\d{1,2}$/, // Simple number suffix
      /^_?v?\d+(\.\d+)*/, // Version numbers
      /^_?\d{2}:\d{2}/, // Time format
    ];

    return patterns.some(pattern => pattern.test(suffix));
  }

  static findBestMatch(
    files: FileInfo[],
    options: FileNameMatchOptions,
    fileNameType: FileNameType = 'smart'
  ): FileInfo | null {
    const matches = files.filter(file => 
      this.doesFileNameMatch(file, options, fileNameType)
    );

    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0];

    // Sort by modification date, newest first
    return matches.sort((a, b) => {
      const aTime = a.modifyTime || a.date.getTime();
      const bTime = b.modifyTime || b.date.getTime();
      return bTime - aTime;
    })[0];
  }
}