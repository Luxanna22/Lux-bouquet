export type InlineSegment =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'bold_italic'; text: string }
  | { type: 'code'; text: string };

export type AdvisorBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'bullet'; indent: number; text: string }
  | { type: 'numbered'; indent: number; index: string; text: string }
  | { type: 'blockquote'; text: string }
  | { type: 'divider' }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'paragraph'; text: string };

function isTableSeparatorRow(line: string): boolean {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells = inner.split('|').map((c) => c.trim());
  return cells.length >= 2 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

function parseTableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

/**
 * Parses inline markdown (`code`, ***bold italic***, **bold**, *italic*) safely
 * while preserving snake_case identifiers like `pass_7d` or `recipient_viral`.
 */
export function parseInlineMarkdown(raw: string): InlineSegment[] {
  const input = String(raw || '');
  if (!input) return [];

  const segments: InlineSegment[] = [];
  // Matches: `code`, ***bold italic***, **bold**, *italic* (non-space edges)
  const tokenRegex = /(`[^`]+`|\*\*\*[^*\n]+\*\*\*|\*\*[^*\n]+\*\*|\*(?!\s)[^*\n]+?(?<!\s)\*)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: input.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      segments.push({ type: 'code', text: token.slice(1, -1) });
    } else if (token.startsWith('***') && token.endsWith('***') && token.length > 6) {
      segments.push({ type: 'bold_italic', text: token.slice(3, -3) });
    } else if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      segments.push({ type: 'bold', text: token.slice(2, -2) });
    } else if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      segments.push({ type: 'italic', text: token.slice(1, -1) });
    } else {
      segments.push({ type: 'text', text: token });
    }
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < input.length) {
    segments.push({ type: 'text', text: input.slice(lastIndex) });
  }

  return segments;
}

/**
 * Parses Gemini advisor markdown into clean, structured display blocks so raw symbols
 * like `#`, `####`, `---`, `>`, `*   `, and markdown tables never leak into the UI.
 */
export function parseAdvisorMarkdown(raw: string): AdvisorBlock[] {
  const lines = String(raw || '')
    .replace(/\r\n/g, '\n')
    .split('\n');
  const blocks: AdvisorBlock[] = [];

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Fenced code block markers (strip ``` fences, keep inner content as paragraphs)
    if (trimmed.startsWith('```')) {
      i += 1;
      continue;
    }

    // Horizontal rule: ---, ***, ___
    if (/^([-*_])\1{2,}$/.test(trimmed)) {
      blocks.push({ type: 'divider' });
      i += 1;
      continue;
    }

    // Markdown headings: # through ######
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*?)(?:\s+#+)?$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i += 1;
      continue;
    }

    // Markdown table: header row + |---|---| separator + body rows
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      isTableSeparatorRow(lines[i + 1])
    ) {
      const headers = parseTableCells(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes('|') && !isTableSeparatorRow(lines[i])) {
        const cells = parseTableCells(lines[i]);
        if (cells.length > 0) rows.push(cells);
        i += 1;
      }
      if (headers.length >= 2) {
        blocks.push({ type: 'table', headers, rows });
        continue;
      }
    }

    // Blockquote: > text
    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      const quoteLines = [quoteMatch[1].trim()];
      i += 1;
      while (i < lines.length) {
        const nextMatch = lines[i].trim().match(/^>\s?(.*)$/);
        if (!nextMatch) break;
        if (nextMatch[1].trim()) quoteLines.push(nextMatch[1].trim());
        i += 1;
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join(' ') });
      continue;
    }

    // Unordered list bullet: *, -, •, · (preserving sub-bullet indentation)
    const leadingSpaces = rawLine.match(/^(\s*)/)?.[1]?.length || 0;
    const bulletMatch = trimmed.match(/^[*\-•·]\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({
        type: 'bullet',
        indent: leadingSpaces >= 2 ? 1 : 0,
        text: bulletMatch[1].trim(),
      });
      i += 1;
      continue;
    }

    // Ordered list item: 1. or 1)
    const numberedMatch = trimmed.match(/^(\d+[.)])\s+(.*)$/);
    if (numberedMatch) {
      blocks.push({
        type: 'numbered',
        indent: leadingSpaces >= 2 ? 1 : 0,
        index: numberedMatch[1].replace(/\)$/, '.'),
        text: numberedMatch[2].trim(),
      });
      i += 1;
      continue;
    }

    // Standard paragraph
    blocks.push({ type: 'paragraph', text: trimmed });
    i += 1;
  }

  return blocks;
}
