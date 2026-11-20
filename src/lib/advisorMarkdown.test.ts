import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseAdvisorMarkdown, parseInlineMarkdown } from './advisorMarkdown';

describe('Analytics Advisor Markdown Parser', () => {
  it('parses all heading levels (# through ######) cleanly without leaking # symbols', () => {
    const blocks = parseAdvisorMarkdown([
      '# Executive Summary',
      '## Funnel Snapshot',
      '### Key Insights',
      '#### Sensitivity Projection',
      '##### Minor Sub-label ###',
    ].join('\n'));

    assert.equal(blocks.length, 5);
    assert.deepEqual(blocks[0], { type: 'heading', level: 1, text: 'Executive Summary' });
    assert.deepEqual(blocks[1], { type: 'heading', level: 2, text: 'Funnel Snapshot' });
    assert.deepEqual(blocks[2], { type: 'heading', level: 3, text: 'Key Insights' });
    assert.deepEqual(blocks[3], { type: 'heading', level: 4, text: 'Sensitivity Projection' });
    assert.deepEqual(blocks[4], { type: 'heading', level: 5, text: 'Minor Sub-label' });
  });

  it('handles bullets with extra spaces, nested sub-bullets, numbered items, dividers, and blockquotes', () => {
    const blocks = parseAdvisorMarkdown([
      '*   **Engagement is High:** 56% of sessions seal a bouquet.',
      '  - Nested sub-point for mobile users.',
      '1.  **Activate Paywall:** Prompt upgrade at seal time.',
      '---',
      '> Quick takeaway: retention is already strong.',
    ].join('\n'));

    assert.deepEqual(blocks, [
      { type: 'bullet', indent: 0, text: '**Engagement is High:** 56% of sessions seal a bouquet.' },
      { type: 'bullet', indent: 1, text: 'Nested sub-point for mobile users.' },
      { type: 'numbered', indent: 0, index: '1.', text: '**Activate Paywall:** Prompt upgrade at seal time.' },
      { type: 'divider' },
      { type: 'blockquote', text: 'Quick takeaway: retention is already strong.' },
    ]);
  });

  it('parses markdown tables into structured header and body rows', () => {
    const blocks = parseAdvisorMarkdown([
      '| Market | Price | Est. Revenue |',
      '| --- | ---: | ---: |',
      '| PH | ₱49 | ₱294 |',
      '| INTL | $1.99 | $11.94 |',
    ].join('\n'));

    assert.deepEqual(blocks, [
      {
        type: 'table',
        headers: ['Market', 'Price', 'Est. Revenue'],
        rows: [
          ['PH', '₱49', '₱294'],
          ['INTL', '$1.99', '$11.94'],
        ],
      },
    ]);
  });

  it('parses inline bold, italic, bold-italic, and code while preserving snake_case identifiers', () => {
    const segments = parseInlineMarkdown(
      'Track `pass_7d` and recipient_viral with **strong growth**, *subtle note*, and ***top priority***.'
    );
    assert.deepEqual(segments, [
      { type: 'text', text: 'Track ' },
      { type: 'code', text: 'pass_7d' },
      { type: 'text', text: ' and recipient_viral with ' },
      { type: 'bold', text: 'strong growth' },
      { type: 'text', text: ', ' },
      { type: 'italic', text: 'subtle note' },
      { type: 'text', text: ', and ' },
      { type: 'bold_italic', text: 'top priority' },
      { type: 'text', text: '.' },
    ]);
  });
});
