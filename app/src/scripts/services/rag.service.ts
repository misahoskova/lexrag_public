import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { retrieveTopK } from './search.service';
import { formatContextForLLM } from './formatter.service';
import { Document } from '@langchain/core/documents';

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-3-flash-preview',
});

const queryRewritePrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Jsi expert na české daňové právo. Tvým úkolem je vzít laický dotaz uživatele a přeformulovat ho do přesné právní terminologie, aby se podle něj dalo co nejlépe vyhledávat ve vektorové databázi textů zákonů.

    AKTUÁLNÍ KONTEXT: Prohledáváme zákon: {selectedLawName}.

    Pravidla:
    1. Používej přesné právní pojmy (např. místo "paragon" použij "daňový doklad", místo "zaměstnanec" zkus "závislá činnost", místo "DPH" použij "daň z přidané hodnoty" atd.).
    2. Pokud uživatel zmiňuje konkrétní zboží (např. rohlíky, knihy, kadeřník, pes), přidej k tomu obecnější kategorii (potraviny, tiskoviny, služby, živá zvířata).
    4. Pokud se uživatel ptá na věc, která zjevně NESPADÁ pod aktuálně vybraný zákon {selectedLawName} (např. v daních z příjmů se ptá na DPH u kadeřníka), začni svou odpověď slovem "[NAVIGACE]" a stručně napiš, ve kterém zákoně by se měl dotaz spíše nacházet.
    5. NIKDY neodpovídej na samotný dotaz.
    6. Vrať POUZE přepsaný dotaz, (nebo navigační hlášku s [NAVIGACE]) žádný text okolo.`,
  ],
  ['human', '{question}'],
]);

const queryRewriterChain = queryRewritePrompt.pipe(llm).pipe(new StringOutputParser());

const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Jsi „Lex“, zkušený daňový expert a poradce.

Tvé chování:
1. Odpovídej sebevědomě, přímo a stručně.
2. NIKDY nepoužívej fráze jako „Ve vámi poskytnutém textu“, „Dle kontextu“ nebo „Zde se píše“. Mluv přímo k věci (např. „Uplatní se sazba...“).
3. Logicky odvozuj: Pokud zákon stanoví pro specifické případy (např. sociální bydlení) sníženou sazbu, vyvoď z toho, že pro ostatní případy platí sazba základní.
4. Syntetizuj informace: Spojuj související pravidla (např. práce + materiál) do ucelených vět.
5. **METODIKA VÝKLADU (DŮLEŽITÉ):** Při čtení zákonů hledej prioritně "negativní vymezení" a výjimky (slova jako "nevzniká", "neplatí", "se nepoužije"). Pokud jeden odstavec stanoví obecnou povinnost ("vzniká penále"), ale jiný odstavec říká, že v tomto případě "nevzniká", má tato výjimka absolutní přednost.
6. **OPATRNOST U SANKCÍ:** Pokud zákon zmiňuje sankci (penále, pokutu), rozlišuj, zda vzniká automaticky, nebo jen při zásahu státu (doměření z moci úřední). Pokud si nejsi jistý, zda výjimka nebyla v kontextu vynechána, formuluj odpověď opatrně: "Penále zpravidla vzniká při doměření daně správcem daně."
7. KONTROLA ČASU: Pokud se uživatel ptá na konkrétní roky (např. 2020 a 2025), VŽDY spočítej rozdíl v letech a explicitně ho porovnej s lhůtami, které najdeš v kontextu.
8. V průběhu odpovědi používej citace jen jako [ZDROJ_ID] (např. [1]).
9. Na konci vždy přidej sekci „Zdroje:“ a vypiš použité zdroje ve formátu:
   [1] <ZDROJ>
   [3] <ZDROJ>
10. U použitých zdrojů nepiš jejich text.

Struktura odpovědi:
- Přímá odpověď na otázku.
- Logické souvislosti (pokud A, tak B; jinak C), ale neutíkej od otázky k nesouvisejícím detailům.
- Sekce „Zdroje:“ na konci.

Kontext:
{context}`,
  ],
  ['human', '{question}'],
]);

export type GetAnswerResult =
  | { type: 'navigation'; answer: string }
  | { type: 'no_results'; answer: string }
  | { type: 'answer'; answer: string; chunks: Document[]; rewrittenQuery: string };

export async function getAnswer(
  question: string,
  date?: string,
  lawId?: number,
  selectedLawName: string = 'Celá databáze',
): Promise<GetAnswerResult> {
  const legalQuestion = await queryRewriterChain.invoke({ question, selectedLawName });

  console.log(`\n[PŮVODNÍ DOTAZ]: ${question}`);
  console.log(`[PRÁVNÍ DOTAZ]:  ${legalQuestion}`);

  if (legalQuestion.startsWith('[NAVIGACE]')) {
    return { type: 'navigation', answer: legalQuestion };
  }

  const docs = await retrieveTopK(legalQuestion, 12, date, lawId);

  if (docs.length === 0) {
    const displayDate = date || new Date().toLocaleDateString('cs-CZ');
    return {
      type: 'no_results',
      answer: `⚠️ K zadanému datu ${displayDate} nemám k dispozici žádné relevantní znění zákona.\n\nZákon k tomuto datu buď ještě/už neplatil, případně se mi nepodařilo najít paragrafy odpovídající vašemu dotazu. Zkuste prosím upravit datum nebo přeformulovat otázku.`,
    };
  }

  const contextText = formatContextForLLM(docs);
  const chain = RunnableSequence.from([
    {
      context: () => contextText,
      question: () => question,
    },
    prompt,
    llm,
    new StringOutputParser(),
  ]);

  const response = await chain.invoke({ question });

  return { type: 'answer', answer: response, chunks: docs, rewrittenQuery: legalQuestion };
}
