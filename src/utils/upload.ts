export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const TEXT_EXTENSIONS = new Set(['txt', 'md']);
const EXCEL_EXTENSIONS = new Set(['xls', 'xlsx']);

export type UploadKind = 'text' | 'docx' | 'pdf' | 'excel';

export function getFileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

export function validateUploadFile(file: File): UploadKind {
  if (file.size === 0) {
    throw new Error('Файл пустой.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Файл больше 10 МБ. Уменьшите документ или вставьте текст вручную.');
  }

  const extension = getFileExtension(file.name);
  if (extension === 'doc') {
    throw new Error(
      'Формат .doc не поддерживается. Сохраните документ как .docx или вставьте текст вручную.',
    );
  }
  if (extension === 'docx') return 'docx';
  if (extension === 'pdf') return 'pdf';
  if (EXCEL_EXTENSIONS.has(extension)) return 'excel';
  if (TEXT_EXTENSIONS.has(extension)) return 'text';
  throw new Error('Поддерживаются файлы .docx, .pdf, .xls/.xlsx, .md и .txt.');
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\u200b/g, '');
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  try {
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    });
    const pdf = await loadingTask.promise;

    try {
      const pages: string[] = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        let pageText = '';

        for (const item of content.items) {
          if ('str' in item) {
            pageText += item.str;
            pageText += item.hasEOL ? '\n' : ' ';
          }
        }

        pages.push(pageText.trim());
        page.cleanup();
      }

      const text = normalizeText(pages.join('\n\n'));
      if (!text.trim()) {
        throw new Error(
          'В PDF не найден текстовый слой. Если это скан, распознайте его или вставьте текст вручную.',
        );
      }
      return text;
    } finally {
      await loadingTask.destroy().catch(() => undefined);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('В PDF')) throw error;
    if (error instanceof Error && /password/i.test(error.message)) {
      throw new Error('PDF защищён паролем. Снимите защиту или вставьте текст вручную.');
    }
    throw new Error('Не удалось прочитать PDF. Проверьте, что файл не повреждён.');
  }
}

async function extractSpreadsheetText(file: File): Promise<string> {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sections: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        blankrows: false,
        defval: '',
        raw: false,
      }) as unknown[][];

      const lines: string[] = [];
      for (const row of rows) {
        if (!Array.isArray(row)) continue;
        const cells = row
          .map((cell) => String(cell ?? '').replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        if (cells.length > 0) lines.push(cells.join(' | '), '');
      }

      if (lines.length > 0) {
        sections.push(`# Лист: ${sheetName}`, ...lines);
      }
    }

    const text = normalizeText(sections.join('\n').trim());
    if (!text.trim()) {
      throw new Error(
        'В таблице не найден текст. Проверьте, что файл не пустой и содержит заполненные ячейки.',
      );
    }
    return text;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('В таблице')) throw error;
    throw new Error('Не удалось прочитать Excel-файл. Проверьте, что файл не повреждён.');
  }
}

export async function extractDocumentText(file: File): Promise<string> {
  const kind = validateUploadFile(file);

  if (kind === 'text') {
    return normalizeText(await file.text());
  }
  if (kind === 'pdf') {
    return extractPdfText(file);
  }
  if (kind === 'excel') {
    return extractSpreadsheetText(file);
  }

  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  const text = normalizeText(result.value);

  if (!text.trim()) {
    throw new Error(
      'В документе не найден текст. Проверьте, что это не скан и не пустой файл.',
    );
  }

  return text;
}
