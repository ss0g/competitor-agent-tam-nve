import * as diffLib from 'diff';
import { prisma } from '@/lib/prisma';

type Snapshot = NonNullable<Awaited<ReturnType<typeof prisma.snapshot.findFirst>>>;

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
  static compare(oldSnapshot: Snapshot, newSnapshot: Snapshot): ContentDiff {
    // Compare text content
    const textDiff = diffLib.diffLines(oldSnapshot.text, newSnapshot.text);
    const textChanges = {
      added: [] as string[],
      removed: [] as string[],
      unchanged: [] as string[],
    };

    let addedLines = 0;
    let removedLines = 0;
    let unchangedLines = 0;

    textDiff.forEach((part) => {
      const lines = part.value.split('\n').filter(line => line.trim());
      if (part.added) {
        textChanges.added.push(...lines);
        addedLines += lines.length;
      } else if (part.removed) {
        textChanges.removed.push(...lines);
        removedLines += lines.length;
      } else {
        textChanges.unchanged.push(...lines);
        unchangedLines += lines.length;
      }
    });

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