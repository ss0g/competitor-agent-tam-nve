import { SnapshotDiff, ContentDiff } from '@/lib/diff';

// Mock the prisma import
jest.mock('@/lib/prisma', () => ({
  prisma: {},
}));

describe('SnapshotDiff', () => {
  const createMockSnapshot = (overrides: any = {}) => ({
    id: 'test-id',
    url: 'https://example.com',
    title: 'Test Title',
    description: 'Test Description',
    html: '<html><body>Test</body></html>',
    text: 'Test content',
    statusCode: 200,
    contentLength: 1000,
    createdAt: new Date(),
    competitorId: 'competitor-1',
    ...overrides,
  });

  describe('compare', () => {
    it('should detect text additions', () => {
      const oldSnapshot = createMockSnapshot({
        text: 'Line 1\nLine 2',
      });

      const newSnapshot = createMockSnapshot({
        text: 'Line 1\nLine 2\nLine 3\nLine 4',
      });

      const diff = SnapshotDiff.compare(oldSnapshot, newSnapshot);

      expect(diff.text.added).toContain('Line 3');
      expect(diff.text.added).toContain('Line 4');
      expect(diff.text.removed).toHaveLength(0);
      expect(diff.stats.addedLines).toBe(2);
      expect(diff.stats.removedLines).toBe(0);
    });

    it('should detect text removals', () => {
      const oldSnapshot = createMockSnapshot({
        text: 'Line 1\nLine 2\nLine 3\nLine 4',
      });

      const newSnapshot = createMockSnapshot({
        text: 'Line 1\nLine 2',
      });

      const diff = SnapshotDiff.compare(oldSnapshot, newSnapshot);

      expect(diff.text.removed).toContain('Line 3');
      expect(diff.text.removed).toContain('Line 4');
      expect(diff.text.added).toHaveLength(0);
      expect(diff.stats.addedLines).toBe(0);
      expect(diff.stats.removedLines).toBe(2);
    });

    it('should detect text modifications', () => {
      const oldSnapshot = createMockSnapshot({
        text: 'Line 1\nOld Line 2\nLine 3',
      });

      const newSnapshot = createMockSnapshot({
        text: 'Line 1\nNew Line 2\nLine 3',
      });

      const diff = SnapshotDiff.compare(oldSnapshot, newSnapshot);

      expect(diff.text.removed).toContain('Old Line 2');
      expect(diff.text.added).toContain('New Line 2');
      expect(diff.text.unchanged).toContain('Line 1');
      expect(diff.text.unchanged).toContain('Line 3');
    });

    it('should handle identical content', () => {
      const snapshot = createMockSnapshot({
        text: 'Line 1\nLine 2\nLine 3',
      });

      const diff = SnapshotDiff.compare(snapshot, snapshot);

      expect(diff.text.added).toHaveLength(0);
      expect(diff.text.removed).toHaveLength(0);
      expect(diff.text.unchanged).toContain('Line 1');
      expect(diff.text.unchanged).toContain('Line 2');
      expect(diff.text.unchanged).toContain('Line 3');
      expect(diff.stats.changePercentage).toBe(0);
    });

    it('should detect metadata changes', () => {
      const oldSnapshot = createMockSnapshot({
        title: 'Old Title',
        description: 'Old Description',
        statusCode: 200,
        contentLength: 1000,
      });

      const newSnapshot = createMockSnapshot({
        title: 'New Title',
        description: 'Old Description',
        statusCode: 404,
        contentLength: 1000,
      });

      const diff = SnapshotDiff.compare(oldSnapshot, newSnapshot);

      expect(diff.metadata.title).toBe(true);
      expect(diff.metadata.description).toBe(false);
      expect(diff.metadata.statusCode).toBe(true);
      expect(diff.metadata.contentLength).toBe(false);
    });

    it('should calculate change percentage correctly', () => {
      const oldSnapshot = createMockSnapshot({
        text: 'Line 1\nLine 2\nLine 3\nLine 4',
      });

      const newSnapshot = createMockSnapshot({
        text: 'Line 1\nLine 2\nNew Line 3\nNew Line 4',
      });

      const diff = SnapshotDiff.compare(oldSnapshot, newSnapshot);

      // 2 removed + 2 added = 4 changes out of 6 total lines = 66.67%
      expect(diff.stats.changePercentage).toBeCloseTo(66.67, 1);
    });

    it('should handle empty content', () => {
      const oldSnapshot = createMockSnapshot({
        text: '',
      });

      const newSnapshot = createMockSnapshot({
        text: 'New content',
      });

      const diff = SnapshotDiff.compare(oldSnapshot, newSnapshot);

      expect(diff.text.added).toContain('New content');
      expect(diff.text.removed).toHaveLength(0);
      expect(diff.stats.changePercentage).toBe(100);
    });

    it('should filter out empty lines', () => {
      const oldSnapshot = createMockSnapshot({
        text: 'Line 1\n\n\nLine 2',
      });

      const newSnapshot = createMockSnapshot({
        text: 'Line 1\n\nLine 3',
      });

      const diff = SnapshotDiff.compare(oldSnapshot, newSnapshot);

      expect(diff.text.removed).toContain('Line 2');
      expect(diff.text.added).toContain('Line 3');
      expect(diff.text.unchanged).toContain('Line 1');
      // Empty lines should be filtered out
      expect(diff.text.unchanged.some(line => line.trim() === '')).toBe(false);
    });
  });

  describe('getSignificantChanges', () => {
    it('should identify significant content changes', () => {
      const diff: ContentDiff = {
        text: {
          added: ['New line'],
          removed: ['Old line'],
          unchanged: ['Unchanged'],
        },
        metadata: {
          title: false,
          description: false,
          statusCode: false,
          contentLength: false,
        },
        stats: {
          addedLines: 1,
          removedLines: 1,
          unchangedLines: 1,
          changePercentage: 66.7, // Above 10% threshold
        },
      };

      const changes = SnapshotDiff.getSignificantChanges(diff);

      expect(changes).toContain('Content changed by 66.7%');
    });

    it('should identify metadata changes', () => {
      const diff: ContentDiff = {
        text: {
          added: [],
          removed: [],
          unchanged: ['Content'],
        },
        metadata: {
          title: true,
          description: true,
          statusCode: true,
          contentLength: true,
        },
        stats: {
          addedLines: 0,
          removedLines: 0,
          unchangedLines: 1,
          changePercentage: 0,
        },
      };

      const changes = SnapshotDiff.getSignificantChanges(diff);

      expect(changes).toContain('Page title changed');
      expect(changes).toContain('Meta description changed');
      expect(changes).toContain('HTTP status code changed');
      expect(changes).toContain('Content length changed significantly');
    });

    it('should return empty array for no significant changes', () => {
      const diff: ContentDiff = {
        text: {
          added: [],
          removed: [],
          unchanged: ['Content'],
        },
        metadata: {
          title: false,
          description: false,
          statusCode: false,
          contentLength: false,
        },
        stats: {
          addedLines: 0,
          removedLines: 0,
          unchangedLines: 1,
          changePercentage: 5, // Below 10% threshold
        },
      };

      const changes = SnapshotDiff.getSignificantChanges(diff);

      expect(changes).toHaveLength(0);
    });

    it('should handle mixed significant changes', () => {
      const diff: ContentDiff = {
        text: {
          added: ['New content'],
          removed: [],
          unchanged: ['Old content'],
        },
        metadata: {
          title: true,
          description: false,
          statusCode: false,
          contentLength: true,
        },
        stats: {
          addedLines: 1,
          removedLines: 0,
          unchangedLines: 1,
          changePercentage: 50,
        },
      };

      const changes = SnapshotDiff.getSignificantChanges(diff);

      expect(changes).toContain('Content changed by 50.0%');
      expect(changes).toContain('Page title changed');
      expect(changes).toContain('Content length changed significantly');
      expect(changes).not.toContain('Meta description changed');
      expect(changes).not.toContain('HTTP status code changed');
    });
  });

  describe('formatTextDiff', () => {
    it('should format removed content with minus prefix', () => {
      const diff: ContentDiff = {
        text: {
          added: [],
          removed: ['Removed line 1', 'Removed line 2'],
          unchanged: [],
        },
        metadata: {
          title: false,
          description: false,
          statusCode: false,
          contentLength: false,
        },
        stats: {
          addedLines: 0,
          removedLines: 2,
          unchangedLines: 0,
          changePercentage: 100,
        },
      };

      const formatted = SnapshotDiff.formatTextDiff(diff);

      expect(formatted).toContain('--- Removed Content ---');
      expect(formatted).toContain('- Removed line 1');
      expect(formatted).toContain('- Removed line 2');
    });

    it('should format added content with plus prefix', () => {
      const diff: ContentDiff = {
        text: {
          added: ['Added line 1', 'Added line 2'],
          removed: [],
          unchanged: [],
        },
        metadata: {
          title: false,
          description: false,
          statusCode: false,
          contentLength: false,
        },
        stats: {
          addedLines: 2,
          removedLines: 0,
          unchangedLines: 0,
          changePercentage: 100,
        },
      };

      const formatted = SnapshotDiff.formatTextDiff(diff);

      expect(formatted).toContain('+++ Added Content +++');
      expect(formatted).toContain('+ Added line 1');
      expect(formatted).toContain('+ Added line 2');
    });

    it('should format both added and removed content', () => {
      const diff: ContentDiff = {
        text: {
          added: ['Added line'],
          removed: ['Removed line'],
          unchanged: [],
        },
        metadata: {
          title: false,
          description: false,
          statusCode: false,
          contentLength: false,
        },
        stats: {
          addedLines: 1,
          removedLines: 1,
          unchangedLines: 0,
          changePercentage: 100,
        },
      };

      const formatted = SnapshotDiff.formatTextDiff(diff);

      expect(formatted).toContain('--- Removed Content ---');
      expect(formatted).toContain('- Removed line');
      expect(formatted).toContain('+++ Added Content +++');
      expect(formatted).toContain('+ Added line');
    });

    it('should return empty string for no changes', () => {
      const diff: ContentDiff = {
        text: {
          added: [],
          removed: [],
          unchanged: ['Unchanged content'],
        },
        metadata: {
          title: false,
          description: false,
          statusCode: false,
          contentLength: false,
        },
        stats: {
          addedLines: 0,
          removedLines: 0,
          unchangedLines: 1,
          changePercentage: 0,
        },
      };

      const formatted = SnapshotDiff.formatTextDiff(diff);

      expect(formatted).toBe('');
    });

    it('should handle special characters in diff content', () => {
      const diff: ContentDiff = {
        text: {
          added: ['Added: àáâãäå ñ 中文 🚀'],
          removed: ['Removed: special chars'],
          unchanged: [],
        },
        metadata: {
          title: false,
          description: false,
          statusCode: false,
          contentLength: false,
        },
        stats: {
          addedLines: 1,
          removedLines: 1,
          unchangedLines: 0,
          changePercentage: 100,
        },
      };

      const formatted = SnapshotDiff.formatTextDiff(diff);

      expect(formatted).toContain('+ Added: àáâãäå ñ 中文 🚀');
      expect(formatted).toContain('- Removed: special chars');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined values gracefully', () => {
      const oldSnapshot = createMockSnapshot({
        title: null,
        description: undefined,
      });

      const newSnapshot = createMockSnapshot({
        title: 'New Title',
        description: 'New Description',
      });

      const diff = SnapshotDiff.compare(oldSnapshot, newSnapshot);

      expect(diff.metadata.title).toBe(true);
      expect(diff.metadata.description).toBe(true);
    });

    it('should handle very large content differences', () => {
      const oldContent = Array(1000).fill('Old line').join('\n');
      const newContent = Array(1000).fill('New line').join('\n');

      const oldSnapshot = createMockSnapshot({ text: oldContent });
      const newSnapshot = createMockSnapshot({ text: newContent });

      const diff = SnapshotDiff.compare(oldSnapshot, newSnapshot);

      expect(diff.stats.addedLines).toBe(1000);
      expect(diff.stats.removedLines).toBe(1000);
      expect(diff.stats.changePercentage).toBe(100);
    });

    it('should handle content with only whitespace differences', () => {
      const oldSnapshot = createMockSnapshot({
        text: 'Line 1\nLine 2\nLine 3',
      });

      const newSnapshot = createMockSnapshot({
        text: 'Line 1\n  Line 2  \nLine 3',
      });

      const diff = SnapshotDiff.compare(oldSnapshot, newSnapshot);

      expect(diff.text.removed).toContain('Line 2');
      expect(diff.text.added).toContain('  Line 2  ');
    });
  });
}); 