import { NextResponse } from 'next/server';
import { getAnswer } from '@/scripts/services/rag.service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, date, lawId, selectedLawName } = body;

    if (!question) {
      return NextResponse.json({ error: 'Chybí otázka (question)' }, { status: 400 });
    }

    const result = await getAnswer(question, date, lawId, selectedLawName);

    return NextResponse.json({ answer: result.answer });
  } catch (error) {
    console.error('Chyba v API /api/answer:', error);
    return NextResponse.json({ error: 'Interní chyba serveru' }, { status: 500 });
  }
}
