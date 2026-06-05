import { describe, it, expect } from 'vitest';
import { isAllowedFile, buildMarkdownEmbed, type Attachment } from './attachments.api';

function fileOf(name: string, type: string): File {
  return new File(['x'], name, { type });
}

describe('isAllowedFile', () => {
  it.each([
    ['a.png', 'image/png'],
    ['a.jpg', 'image/jpeg'],
    ['a.webp', 'image/webp'],
    ['doc.pdf', 'application/pdf'],
    ['notes.md', 'text/markdown'],
    ['notes.md', 'text/plain'],
    ['notes.md', 'application/octet-stream'],
  ])('accepts %s (%s)', (name, type) => {
    expect(isAllowedFile(fileOf(name, type))).toBe(true);
  });

  it.each([
    ['archive.zip', 'application/zip'],
    ['app.exe', 'application/octet-stream'],
    ['data.json', 'application/json'],
    ['sheet.csv', 'text/csv'],
  ])('rejects %s (%s)', (name, type) => {
    expect(isAllowedFile(fileOf(name, type))).toBe(false);
  });
});

describe('buildMarkdownEmbed', () => {
  const base = (over: Partial<Attachment>): Attachment => ({
    _id: 'a1',
    originalName: 'file',
    url: '/uploads/x.png',
    mimeType: 'image/png',
    sizeBytes: 1,
    ...over,
  });

  it('embeds images as an image markdown with absolute url', () => {
    const md = buildMarkdownEmbed(base({ originalName: 'pic.png', url: '/uploads/x.png', mimeType: 'image/png' }));
    expect(md).toMatch(/^!\[pic\.png\]\(https?:\/\/[^)]+\/uploads\/x\.png\)$/);
  });

  it('embeds non-images as a plain link', () => {
    const md = buildMarkdownEmbed(base({ originalName: 'doc.pdf', url: '/uploads/y.pdf', mimeType: 'application/pdf' }));
    expect(md).toMatch(/^\[doc\.pdf\]\(https?:\/\/[^)]+\/uploads\/y\.pdf\)$/);
  });

  it('keeps already-absolute urls intact', () => {
    const md = buildMarkdownEmbed(base({ url: 'https://cdn.example.com/z.png' }));
    expect(md).toContain('(https://cdn.example.com/z.png)');
  });
});
