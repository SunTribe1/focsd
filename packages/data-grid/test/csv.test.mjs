import { describe, expect, test } from 'vitest';
import { normalizeColumns } from '../src/engine/columns.js';
import { toCsv } from '../src/engine/csv.js';

const columns = normalizeColumns([
  { id: 'name', header: 'Name' },
  { id: 'amount', header: 'Amount', type: 'number' },
  { id: 'note', header: 'Note, "quoted"' },
]);

const rows = [
  { name: 'Contoso', amount: 1234.5, note: 'line1\nline2' },
  { name: '=HYPERLINK("x")', amount: -3, note: ' padded ' },
  { name: null, amount: null, note: '' },
];

describe('csv', () => {
  test('escapes per RFC 4180 and neutralizes formula injection', () => {
    const csv = toCsv(rows, columns, { locale: 'en-GB' });
    expect(csv.split('\r\n')).toEqual([
      'Name,Amount,"Note, ""quoted"""',
      'Contoso,"1,234.5","line1\nline2"',
      `"'=HYPERLINK(""x"")",-3," padded "`,
      ',,',
    ]);
  });

  test('raw values skip formatting', () => {
    expect(toCsv(rows.slice(0, 1), columns, { raw: true }).split('\r\n')[1]).toBe('Contoso,1234.5,"line1\nline2"');
  });
});
