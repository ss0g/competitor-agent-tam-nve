import * as diffLib from 'diff';
import { prisma } from '@/lib/prisma';

interface SnapshotData {
  id: string;
  text: string;
  title: string;
  description: string;
  statusCode: number;
  contentLength: number;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
  competitorId: string;
}

export interface ContentDiff {
  text: {
    added: string[];
    removed: string[];
    unchanged: string[];
  };
  metadata: {
    title: boolean;
    description: boolean;
    statusCode: boolean;
    contentLength: boolean;
  };
  stats: {
    addedLines: number;
    removedLines: number;
    unchangedLines: number;
    changePercentage: number;
  };
}

export class SnapshotDiff {
  static compare(oldSnapshot: SnapshotData, newSnapshot: SnapshotData): ContentDiff {
    // Split text into lines for comparison
    const oldLines = oldSnapshot.text.split('\n').filter(line => line.trim() !== '');
    const newLines = newSnapshot.text.split('\n').filter(line => line.trim() !== '');
    
    // Find added, removed, and unchanged lines
    const textChanges = {
      added: [] as string[],
      removed: [] as string[],
      unchanged: [] as string[],
    };

    // Create sets for efficient lookup
    const oldLinesSet = new Set(oldLines);
    const newLinesSet = new Set(newLines);

    // Find unchanged lines (present in both)
    oldLines.forEach(line => {
      if (newLinesSet.has(line)) {
        textChanges.unchanged.push(line);
      }
    });

    // Find removed lines (in old but not in new)
    oldLines.forEach(line => {
      if (!newLinesSet.has(line)) {
        textChanges.removed.push(line);
      }
    });

    // Find added lines (in new but not in old)
    newLines.forEach(line => {
      if (!oldLinesSet.has(line)) {
        textChanges.added.push(line);
      }
    });

    const addedLines = textChanges.added.length;
    const removedLines = textChanges.removed.length;
    const unchangedLines = textChanges.unchanged.length;

    // Compare metadata
    const metadataChanges = {
      title: oldSnapshot.title !== newSnapshot.title,
      description: oldSnapshot.description !== newSnapshot.description,
      statusCode: oldSnapshot.statusCode !== newSnapshot.statusCode,
      contentLength: oldSnapshot.contentLength !== newSnapshot.contentLength,
    };

    // Calculate change statistics
    const totalLines = addedLines + removedLines + unchangedLines;
    const changePercentage = totalLines > 0
      ? ((addedLines + removedLines) / totalLines) * 100
      : 0;

    return {
      text: textChanges,
      metadata: metadataChanges,
      stats: {
        addedLines,
        removedLines,
        unchangedLines,
        changePercentage,
      },
    };
  }

  static getSignificantChanges(diff: ContentDiff): string[] {
    const changes: string[] = [];

    // Check for significant content changes
    if (diff.stats.changePercentage > 10) {
      changes.push(`Content changed by ${diff.stats.changePercentage.toFixed(1)}%`);
    }

    // Check metadata changes
    if (diff.metadata.title) {
      changes.push('Page title changed');
    }
    if (diff.metadata.description) {
      changes.push('Meta description changed');
    }
    if (diff.metadata.statusCode) {
      changes.push('HTTP status code changed');
    }
    if (diff.metadata.contentLength) {
      changes.push('Content length changed significantly');
    }

    return changes;
  }

  static formatTextDiff(diff: ContentDiff): string {
    let formattedDiff = '';

    // Add removed lines with - prefix
    if (diff.text.removed.length > 0) {
      formattedDiff += '--- Removed Content ---\n';
      formattedDiff += diff.text.removed
        .map(line => `- ${line}`)
        .join('\n');
      formattedDiff += '\n\n';
    }

    // Add new lines with + prefix
    if (diff.text.added.length > 0) {
      formattedDiff += '+++ Added Content +++\n';
      formattedDiff += diff.text.added
        .map(line => `+ ${line}`)
        .join('\n');
    }

    return formattedDiff;
  }
} 