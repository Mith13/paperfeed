import Paper from '../models/Paper';

export type TimeRange = 'this month' | 'this year' | 'all time';

export const TIME_RANGES: TimeRange[] = ['this month', 'this year', 'all time'];

/**
 * Filters preprints according to the chosen time range.
 * - 'this month': papers published in the current calendar month and year
 * - 'this year': papers published in the current year
 * - 'all time': all papers regardless of publication date
 */
export function filterPapersByTimeRange(
  papers: Paper[],
  timeRange: TimeRange,
  now: Date = new Date()
): Paper[] {
  if (timeRange === 'all time') {
    return papers;
  }

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  return papers.filter((paper) => {
    const pubDate = paper.publicationDate;
    if (isNaN(pubDate.getTime())) return true;

    if (timeRange === 'this month') {
      return (
        pubDate.getFullYear() === currentYear &&
        pubDate.getMonth() === currentMonth
      );
    }

    if (timeRange === 'this year') {
      return pubDate.getFullYear() === currentYear;
    }

    return true;
  });
}
