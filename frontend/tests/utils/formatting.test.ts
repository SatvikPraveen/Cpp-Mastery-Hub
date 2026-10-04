import {
  formatDuration,
  formatErrorMessage,
  formatExecutionTime,
  formatFileSize,
  formatMemorySize,
  formatPercentage,
  pluralize,
  truncate,
} from '../../src/utils/formatting';

describe('formatting utilities', () => {
  it('formats durations at each magnitude', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(61_000)).toBe('1m 1s');
    expect(formatDuration(3_661_000)).toBe('1h 1m 1s');
    expect(formatDuration(90_000_000)).toBe('1d 1h 0m');
  });

  it('formats execution times', () => {
    expect(formatExecutionTime(12)).toBe('12ms');
    expect(formatExecutionTime(1500)).toBe('1.50s');
    expect(formatExecutionTime(61_000)).toBe('1m 1.00s');
  });

  it('formats byte sizes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatMemorySize(512)).toBe('512 B');
    expect(formatMemorySize(1024 * 1024)).toBe('1.00 MB');
  });

  it('formats percentages from ratios', () => {
    expect(formatPercentage(0.256)).toBe('25.6%');
    expect(formatPercentage(1, 0)).toBe('100%');
  });

  it('truncates with an ellipsis that fits the limit', () => {
    expect(truncate('short', 10)).toBe('short');
    const out = truncate('a long sentence here', 10);
    expect(out).toBe('a long ...');
    expect(out).toHaveLength(10);
  });

  it('pluralizes regular and irregular nouns', () => {
    expect(pluralize(1, 'lesson')).toBe('lesson');
    expect(pluralize(2, 'lesson')).toBe('lessons');
    expect(pluralize(0, 'child', 'children')).toBe('children');
  });

  it('extracts readable messages from unknown errors', () => {
    expect(formatErrorMessage('boom')).toBe('boom');
    expect(formatErrorMessage(new Error('bad'))).toBe('bad');
    expect(formatErrorMessage({ error: 'inner' })).toBe('inner');
    expect(formatErrorMessage(42)).toBe('An unexpected error occurred');
  });
});
