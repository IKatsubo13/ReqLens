import { describe, expect, it } from 'vitest';
import {
  MAX_UPLOAD_BYTES,
  extractDocumentText,
  getFileExtension,
  validateUploadFile,
} from './upload';

describe('upload', () => {
  it('читает .txt и .md как текст', async () => {
    const text = await extractDocumentText(
      new File(['Система должна работать быстро.'], 'requirements.txt', {
        type: 'text/plain',
      }),
    );

    expect(text).toBe('Система должна работать быстро.');
  });

  it('отклоняет старый формат .doc', () => {
    const file = new File(['legacy'], 'requirements.doc', { type: 'application/msword' });

    expect(() => validateUploadFile(file)).toThrow(/\.doc/);
  });

  it('отклоняет неподдерживаемый формат', () => {
    const file = new File(['pdf'], 'requirements.pdf', { type: 'application/pdf' });

    expect(validateUploadFile(file)).toBe('pdf');
    expect(validateUploadFile(new File(['xls'], 'requirements.xls'))).toBe('excel');
    expect(validateUploadFile(new File(['xlsx'], 'requirements.xlsx'))).toBe('excel');
    expect(() =>
      validateUploadFile(new File(['png'], 'requirements.png', { type: 'image/png' })),
    ).toThrow(/\.docx/);
  });

  it('читает .xlsx как таблицу требований', async () => {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ['ID', 'Требование'],
      ['US-1', 'Пользователь должен быстро войти'],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Требования');
    const data = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    const text = await extractDocumentText(
      new File([data], 'requirements.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );

    expect(text).toContain('# Лист: Требования');
    expect(text).toContain('US-1 | Пользователь должен быстро войти');
  });

  it('отклоняет файлы больше лимита и пустые файлы', () => {
    const huge = { name: 'huge.docx', size: MAX_UPLOAD_BYTES + 1 } as File;
    const empty = new File([], 'empty.txt', { type: 'text/plain' });

    expect(() => validateUploadFile(huge)).toThrow(/10 МБ/);
    expect(() => validateUploadFile(empty)).toThrow(/пустой/);
  });

  it('нормализует расширение файла', () => {
    expect(getFileExtension('ТЗ.DOCX')).toBe('docx');
    expect(getFileExtension('requirements')).toBe('');
  });
});
