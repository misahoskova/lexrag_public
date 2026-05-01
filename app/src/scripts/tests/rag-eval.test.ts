import { test } from 'vitest';
import { FaithfulnessMetric, AnswerRelevancyMetric } from 'deepeval/metrics';
import { LLMTestCase } from 'deepeval/test_case';
import { assertTestCase } from 'deepeval';
import { getAnswer } from '../src/services/rag.service';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const LAWS: Record<string, { id: number; name: string }> = {
  DPH: { id: 1, name: 'Zákon o dani z přidané hodnoty' },
  DR: { id: 2, name: 'Zákon daňový řád' },
  DNV: { id: 3, name: 'Zákon České národní rady o dani z nemovitých věcí' },
  U: { id: 4, name: 'Zákon o účetnictví' },
  DP: { id: 5, name: 'Zákon České národní rady o daních z příjmů' },
  SP: {
    id: 6,
    name: 'Zákon České národní rady o pojistném na sociální zabezpečení a příspěvku na státní politiku zaměstnanosti',
  },
};

function getLaw(otazkaId: string): { id: number; name: string } | undefined {
  const prefix = otazkaId.replace(/-\d+$/, '');
  return LAWS[prefix];
}

const csvFile = fs.readFileSync(path.resolve(__dirname, 'questions.csv'), 'utf-8');
const records = parse(csvFile, {
  columns: true,
  delimiter: ';',
});

records.forEach((record: { Otazka_ID: string; Kategorie: string; Otázka: string }) => {
  test(`[${record.Otazka_ID}] ${record.Otázka}`, async () => {
    const law = getLaw(record.Otazka_ID);
    const result = await getAnswer(record.Otázka, undefined, law?.id, law?.name ?? 'Celá databáze');

    if (result.type !== 'answer') {
      console.warn(`[SKIP] ${result.type}: "${record.Otázka}"`);
      return;
    }

    const faithfulnessMetric = new FaithfulnessMetric({ threshold: 0.7 });
    const relevancyMetric = new AnswerRelevancyMetric({ threshold: 0.7 });

    const testCase = new LLMTestCase({
      input: record.Otázka,
      actualOutput: result.answer,
      retrievalContext: result.chunks.map(c => c.pageContent),
    });

    await assertTestCase(testCase, [faithfulnessMetric, relevancyMetric]);
  }, 60000);
});
