/**
 * Extract date from question text
 * Supports various date formats like:
 * - "by November 30, 2025"
 * - "by Dec 31, 2025"
 * - "by 2025-11-30"
 * - "by 11/30/2025"
 * - "on November 30, 2025"
 * - "before November 30, 2025"
 * - "until November 30, 2025"
 */

export interface ExtractedDate {
  date: Date | null;
  unixTimestamp: number | null;
  matchedText: string | null;
}

/**
 * Extract date from question text
 * Returns the date if found, null otherwise
 */
export function extractDateFromQuestion(question: string): ExtractedDate {
  if (!question || typeof question !== 'string') {
    return { date: null, unixTimestamp: null, matchedText: null };
  }

  const lowerQuestion = question.toLowerCase();
  
  // Common date patterns
  const patterns = [
    // Full month name: "November 30, 2025" or "Nov 30, 2025"
    /\b(?:by|on|before|until|by the end of)\s+(?:the\s+)?(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2}),?\s+(\d{4})\b/i,
    
    // ISO format: "2025-11-30" or "2025/11/30"
    /\b(?:by|on|before|until)\s+(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/i,
    
    // US format: "11/30/2025" or "11-30-2025"
    /\b(?:by|on|before|until)\s+(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/i,
    
    // Day Month Year: "30 November 2025" or "30 Nov 2025"
    /\b(?:by|on|before|until)\s+(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{4})\b/i,
  ];

  const monthMap: Record<string, number> = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11,
  };

  for (const pattern of patterns) {
    const match = question.match(pattern);
    if (match) {
      try {
        let year: number, month: number, day: number;
        let matchedText = match[0];

        // Pattern 1: Full month name (e.g., "November 30, 2025")
        if (match[1] && monthMap[match[1].toLowerCase()] !== undefined) {
          month = monthMap[match[1].toLowerCase()];
          day = parseInt(match[2], 10);
          year = parseInt(match[3], 10);
        }
        // Pattern 2: ISO format (e.g., "2025-11-30")
        else if (match[1] && match[1].length === 4) {
          year = parseInt(match[1], 10);
          month = parseInt(match[2], 10) - 1; // JavaScript months are 0-indexed
          day = parseInt(match[3], 10);
        }
        // Pattern 3: US format (e.g., "11/30/2025")
        else if (match[3] && match[3].length === 4) {
          month = parseInt(match[1], 10) - 1;
          day = parseInt(match[2], 10);
          year = parseInt(match[3], 10);
        }
        // Pattern 4: Day Month Year (e.g., "30 November 2025")
        else {
          day = parseInt(match[1], 10);
          month = monthMap[match[2].toLowerCase()];
          year = parseInt(match[3], 10);
        }

        // Validate date
        if (year < 2000 || year > 2100) {
          continue; // Invalid year, try next pattern
        }
        if (month < 0 || month > 11) {
          continue; // Invalid month
        }
        if (day < 1 || day > 31) {
          continue; // Invalid day
        }

        // Create date at end of day (23:59:59) to ensure the full day is included
        const date = new Date(year, month, day, 23, 59, 59);
        
        // Validate the date is valid (handles cases like Feb 30)
        if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
          continue; // Invalid date, try next pattern
        }

        // Ensure date is in the future
        const now = new Date();
        if (date <= now) {
          console.warn(`Extracted date ${date.toISOString()} is in the past, ignoring`);
          continue;
        }

        const unixTimestamp = Math.floor(date.getTime() / 1000);
        return { date, unixTimestamp, matchedText };
      } catch (error) {
        console.warn('Error parsing date from question:', error);
        continue;
      }
    }
  }

  return { date: null, unixTimestamp: null, matchedText: null };
}

/**
 * Calculate deadline from question or use default duration
 */
export function calculateDeadline(question: string, defaultDurationDays: number = 7): number {
  const extracted = extractDateFromQuestion(question);
  
  if (extracted.unixTimestamp) {
    console.log(`[dateExtractor] Extracted date from question: ${extracted.matchedText} -> ${extracted.date?.toISOString()}`);
    return extracted.unixTimestamp;
  }
  
  // Fallback to default duration
  const defaultDeadline = Math.floor(Date.now() / 1000) + (defaultDurationDays * 24 * 60 * 60);
  console.log(`[dateExtractor] No date found in question, using default: ${defaultDurationDays} days from now`);
  return defaultDeadline;
}

