import { test, expect, afterAll, describe } from 'vitest';
import { getAnswer } from '../services/rag.service';
import { getLaw } from '../utils/laws';
import { parseParagrafy } from '../utils/parseParagraphs';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const csvFile = fs.readFileSync(path.resolve(__dirname, './questions/questions.csv'), 'utf-8');
const records = parse(csvFile, { columns: true, delimiter: ';', skip_empty_lines: true }) as {
  Otazka_ID: string;
  Kategorie: string;
  Otázka: string;
  Ocekavany_zdroj?: string;
}[];

const testResults: object[] = [];

const resultsDir = path.resolve(__dirname, './results');
fs.mkdirSync(resultsDir, { recursive: true });
const logStream = fs.createWriteStream(path.resolve(resultsDir, 'quality.txt'), { flags: 'w' });

function log(message: string) {
  console.log(message);
  logStream.write(message + '\n');
}

function warn(message: string) {
  console.warn(message);
  logStream.write('[WARN] ' + message + '\n');
}

describe.sequential('RAG quality', { timeout: 180000 }, () => {
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
        warn(`[SKIP] [${record.Otazka_ID}] ${result.type}: "${record.Otázka}"`);
        testResults.push({
          id: record.Otazka_ID,
          otazka: record.Otázka,
          typ: result.type,
          recall: null,
          context: null,
          odpoved: null,
        });
        return;
      }

      let recall: boolean | null = null;
      if (record.Ocekavany_zdroj) {
        const paragrafy = parseParagrafy(record.Ocekavany_zdroj);

        const nalezeneParagrafy = result.chunks
          .map(c => c.pageContent?.match(/§\s*\d+[a-z]*/g) ?? [])
          .flat()
          .filter((v, i, a) => a.indexOf(v) === i);

        log(`[${record.Otazka_ID}] [RECALL DEBUG] Hledám: ${paragrafy.join(', ')}`);
        log(
          `[${record.Otazka_ID}] [RECALL DEBUG] Paragrafy v kontextu: ${nalezeneParagrafy.join(', ')}`,
        );

        recall = paragrafy.some(par =>
          result.chunks.some(
            c =>
              c.metadata.label?.includes(par) ||
              c.metadata.marker?.includes(par) ||
              c.pageContent?.includes(par),
          ),
        );

        testResults.push({
          id: record.Otazka_ID,
          otazka: record.Otázka,
          typ: result.type,
          recall,
          context: result.chunks.map(c => c.pageContent).join('\n\n'),
          odpoved: result.answer,
        });

        expect(
          recall,
          `Recall@12: žádný z [${paragrafy.join(', ')}] nenalezen v top 12 chuncích`,
        ).toBe(true);

        return;
      }

      testResults.push({
        id: record.Otazka_ID,
        otazka: record.Otázka,
        typ: result.type,
        recall,
        context: result.chunks.map(c => c.pageContent).join('\n\n'),
        odpoved: result.answer,
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
  logStream.end();
});
