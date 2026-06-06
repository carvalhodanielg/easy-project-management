import { BadRequestException } from '@nestjs/common';
import { attachmentFileFilter } from './attachment-file-filter';

type MulterFile = Pick<Express.Multer.File, 'originalname' | 'mimetype'>;

function run(file: MulterFile): { err: unknown; accepted: boolean } {
  let err: unknown = null;
  let accepted = false;
  attachmentFileFilter({} as never, file as Express.Multer.File, (e, acc) => {
    err = e;
    accepted = acc ?? false;
  });
  return { err, accepted };
}

describe('attachmentFileFilter', () => {
  it.each([
    { originalname: 'a.png', mimetype: 'image/png' },
    { originalname: 'a.jpg', mimetype: 'image/jpeg' },
    { originalname: 'a.gif', mimetype: 'image/gif' },
    { originalname: 'a.webp', mimetype: 'image/webp' },
    { originalname: 'doc.pdf', mimetype: 'application/pdf' },
    { originalname: 'notes.md', mimetype: 'text/markdown' },
    // Markdown files frequently arrive with a generic mimetype
    { originalname: 'notes.md', mimetype: 'text/plain' },
    { originalname: 'notes.md', mimetype: 'application/octet-stream' },
  ])('accepts $originalname ($mimetype)', (file) => {
    const { err, accepted } = run(file);
    expect(err).toBeNull();
    expect(accepted).toBe(true);
  });

  it.each([
    { originalname: 'archive.zip', mimetype: 'application/zip' },
    { originalname: 'app.exe', mimetype: 'application/octet-stream' },
    { originalname: 'data.json', mimetype: 'application/json' },
    { originalname: 'sheet.csv', mimetype: 'text/csv' },
  ])('rejects $originalname ($mimetype)', (file) => {
    const { err, accepted } = run(file);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(accepted).toBe(false);
  });
});
