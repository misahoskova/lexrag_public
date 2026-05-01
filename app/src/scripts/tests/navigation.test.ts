import { test, expect, afterAll } from 'vitest';
import { getAnswer } from '../services/rag.service';
import { LAWS } from '../utils/laws';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const navFile = fs.readFileSync(path.resolve(__dirname, './questions/navigace.csv'), 'utf-8');
const navRecords = parse(navFile, { columns: true, delimiter: ';' }) as {
  Otazka_ID: string;
  Otázka: string;
  Zakon_prefix: string;
  Ocekavana_navigace: string;
}[];

const testResults: object[] = [];

navRecords.forEach(record => {
  test(`[${record.Otazka_ID}] Navigace: ${record.Otázka}`, async () => {
    const law = LAWS[record.Zakon_prefix];
    const result = await getAnswer(record.Otázka, undefined, law?.id, law?.name ?? 'Celá databáze');

    const ocekavameNavigaci = record.Ocekavana_navigace === 'true';

    testResults.push({
      id: record.Otazka_ID,
      otazka: record.Otázka,
      zakon: record.Zakon_prefix,
      ocekavana_navigace: ocekavameNavigaci,
      skutecny_typ: result.type,
      spravne: ocekavameNavigaci === (result.type === 'navigation'),
    });

    if (ocekavameNavigaci) {
      expect(result.type, `Očekávána navigace, ale přišlo: ${result.type}`).toBe('navigation');
    } else {
      expect(result.type, `Navigace přišla neočekávaně`).not.toBe('navigation');
    }
  }, 120000);
});

afterAll(() => {
  fs.mkdirSync(path.resolve(__dirname, './results'), { recursive: true });
  fs.writeFileSync(
    path.resolve(__dirname, './results/navigation.json'),
    JSON.stringify(testResults, null, 2),
    'utf-8',
  );
});
