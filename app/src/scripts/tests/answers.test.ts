import { test, afterAll, describe } from 'vitest';
import { getAnswer } from '../services/rag.service';
import { getLaw } from '../utils/laws';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const csvFile = fs.readFileSync(path.resolve(__dirname, './questions/questions.csv'), 'utf-8');
const records = parse(csvFile, { columns: true, delimiter: ';', skip_empty_lines: true }) as {
  Otazka_ID: string;
  Kategorie: string;
  Otázka: string;
  Ocekavany_zdroj?: string;
}[];

const testResults: object[] = [];
const qaResults: {
  Otazka_ID: string;
  Kategorie: string;
  Otázka: string;
  Odpoved: string | null;
}[] = [];

const resultsDir = path.resolve(__dirname, './results');
fs.mkdirSync(resultsDir, { recursive: true });

describe.sequential('RAG answers', { timeout: 180000 }, () => {
  records.forEach(record => {
    test(`[${record.Otazka_ID}] ${record.Otázka}`, async () => {
      const law = getLaw(record.Otazka_ID);
      const result = await getAnswer(
        record.Otázka,
        undefined,
        law?.id,
        law?.name ?? 'Celá databáze',
      );

      if (result.type !== 'answer') {
        testResults.push({
          id: record.Otazka_ID,
          otazka: record.Otázka,
          typ: result.type,
          context: null,
          odpoved: null,
        });
        qaResults.push({
          Otazka_ID: record.Otazka_ID,
          Kategorie: record.Kategorie,
          Otázka: record.Otázka,
          Odpoved: null,
        });
        return;
      }

      testResults.push({
        id: record.Otazka_ID,
        otazka: record.Otázka,
        typ: result.type,
        context: result.chunks.map(c => c.pageContent).join('\n\n'),
        odpoved: result.answer,
      });
      qaResults.push({
        Otazka_ID: record.Otazka_ID,
        Kategorie: record.Kategorie,
        Otázka: record.Otázka,
        Odpoved: result.answer,
      });
    });
  });
});

afterAll(() => {
  fs.writeFileSync(
    path.resolve(resultsDir, 'quality.json'),
    JSON.stringify(testResults, null, 2),
    'utf-8',
  );

  const csvOutput = stringify(qaResults, {
    header: true,
    delimiter: ';',
    columns: ['Otazka_ID', 'Kategorie', 'Otázka', 'Odpoved'],
  });
  fs.writeFileSync(path.resolve(resultsDir, 'quality_qa.csv'), csvOutput, 'utf-8');
});
