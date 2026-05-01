'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Sparkles,
  Copy,
  Check,
  Calendar as CalendarIcon,
  BookOpen,
  Loader2,
  ChevronLeft,
  Compass,
} from 'lucide-react';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ScrollArea } from './ui/scroll-area';

interface Law {
  id: number;
  cislo: number;
  rok: number;
  nazev: string;
  zkratka?: string;
}

interface Props {
  selectedLaw: Law | 'all';
  onBack: () => void;
}

export default function LegalAssistantUI({ selectedLaw, onBack }: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [q, setQ] = useState('');
  const [date, setDate] = useState(today);
  const [k, setK] = useState(9);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [activeTab, setActiveTab] = useState('answer');
  const [results, setResults] = useState<any[]>([]);
  const [answer, setAnswer] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const [navHint, setNavHint] = useState<string | null>(null);

  const canSearch = q.trim().length > 0;

  const lawId = selectedLaw === 'all' ? undefined : selectedLaw.id;
  const lawLabel =
    selectedLaw === 'all'
      ? 'Celá databáze'
      : selectedLaw.zkratka || `${selectedLaw.cislo}/${selectedLaw.rok}`;

  async function doSearch() {
    if (!canSearch) return;
    setLoadingSearch(true);
    setNavHint(null);
    setActiveTab('results');
    try {
      const params = new URLSearchParams({
        q,
        date,
        k: String(k),
        ...(lawId && { lawId: String(lawId) }),
      });
      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSearch(false);
    }
  }

  async function doAnswer() {
    if (!canSearch) return;
    setLoadingAnswer(true);
    setAnswer('');
    setNavHint(null);
    setActiveTab('answer');
    try {
      const res = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, date, lawId, selectedLawName: lawLabel }),
      });
      const data = await res.json();

      if (data.answer?.startsWith('[NAVIGACE]')) {
        setNavHint(data.answer.replace('[NAVIGACE]', '').trim());
      } else {
        setAnswer(data.answer);
      }
    } catch (e) {
      console.error(e);
      setAnswer('Omlouvám se, nepodařilo se vygenerovat odpověď.');
    } finally {
      setLoadingAnswer(false);
    }
  }

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <TooltipProvider>
      <div className="min-h-dvh bg-gradient-to-b from-background to-muted/30">
        <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="mr-2 rounded-full hover:bg-muted"
            >
              <ChevronLeft className="size-5" />
            </Button>
            <div className="rounded-xl bg-primary/10 p-2">
              <BookOpen className="size-5 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-semibold leading-tight flex items-center gap-2">
                LexRAG Asistent
                <Badge
                  variant="outline"
                  className="text-[10px] font-normal uppercase tracking-wider"
                >
                  {lawLabel}
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground truncate max-w-[400px]">
                {selectedLaw === 'all' ? 'Expertní daňový a právní rádce' : selectedLaw.nazev}
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl p-4 space-y-6">
          <Card className="shadow-sm border-muted-foreground/20">
            <CardHeader className="space-y-1 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="size-4 text-muted-foreground" />
                Zadej právní dotaz
              </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-4">
              <Textarea
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={`Zadejte dotaz pro ${lawLabel}...`}
                className="min-h-[80px] text-lg resize-y bg-background focus-visible:ring-primary/20"
              />

              <div className="flex flex-wrap gap-4 items-end">
                <div className="grid gap-1.5">
                  <Label htmlFor="date" className="text-xs text-muted-foreground">
                    Platnost k datu
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-40"
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => setDate(today)}>
                          <CalendarIcon className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Dnešní datum</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div className="flex gap-2 ml-auto">
                  <Button
                    variant="secondary"
                    onClick={doSearch}
                    disabled={!canSearch || loadingSearch}
                  >
                    {loadingSearch ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 size-4" />
                    )}
                    Najít ustanovení
                  </Button>
                  <Button
                    onClick={doAnswer}
                    disabled={!canSearch || loadingAnswer}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {loadingAnswer ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 size-4" />
                    )}
                    LexRAG Vysvětlení
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <AnimatePresence>
            {navHint && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-900 shadow-sm"
              >
                <div className="flex gap-3">
                  <Compass className="size-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-sm">Doporučení asistenta</p>
                    <p className="text-sm opacity-90 leading-relaxed">
                      {navHint}. Pokud chcete hledat v jiném předpisu, vraťte se na{' '}
                      <button onClick={onBack} className="font-bold underline hover:text-blue-700">
                        výběr zákonů
                      </button>
                      .
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50">
              <TabsTrigger value="results">Dohledané texty (DB)</TabsTrigger>
              <TabsTrigger value="answer">Vysvětlení (AI)</TabsTrigger>
            </TabsList>

            <TabsContent value="answer" className="focus-visible:ring-0">
              <Card className="shadow-sm min-h-[300px]">
                <CardHeader className="pb-2 border-b flex flex-row items-center justify-between">
                  <CardTitle className="text-base text-primary flex items-center gap-2">
                    <Sparkles className="size-4" /> Odpověď LexRAG
                  </CardTitle>
                  {answer && (
                    <Button variant="ghost" size="sm" onClick={() => copy(answer)}>
                      {copied ? (
                        <Check className="size-4 text-green-500" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="pt-6">
                  {loadingAnswer ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-4">
                      <Loader2 className="size-8 animate-spin text-primary/40" />
                      <p className="italic text-sm">Analyzuji legislativu...</p>
                    </div>
                  ) : answer ? (
                    <div className="rounded-md border bg-card p-5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                      <div className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                        {answer.split(/(\[\d+\])/).map((part, j) =>
                          /\[\d+\]/.test(part) ? (
                            <span
                              key={j}
                              className="text-primary font-bold text-[10px] align-super px-0.5"
                            >
                              {part}
                            </span>
                          ) : (
                            part
                          ),
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/40 italic">
                      <BookOpen className="size-12 mb-2 opacity-20" />
                      <p>Zadejte dotaz a stiskněte "LexRAG Vysvětlení"</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="results" className="focus-visible:ring-0">
              <Card className="shadow-sm">
                <CardHeader className="border-b pb-3 text-base font-semibold">
                  Nalezené fragmenty
                </CardHeader>
                <CardContent className="pt-4">
                  {loadingSearch ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="size-8 animate-spin text-muted-foreground/30" />
                    </div>
                  ) : results.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground/50 italic">
                      Nebyly nalezeny žádné relevantní texty.
                    </div>
                  ) : (
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="space-y-4">
                        {results.map((r, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-4 rounded-xl border bg-card hover:border-primary/30 transition-colors shadow-sm"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-bold text-sm text-primary">
                                  {r.paragraf_cislo}
                                </h4>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                                  {r.paragraf_path}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-[10px] font-bold">
                                {(r.cosine_sim * 100).toFixed(0)}% shoda
                              </Badge>
                            </div>
                            <p className="text-sm leading-relaxed text-foreground/80">
                              {r.text_cisty}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          <footer className="text-center text-[10px] text-muted-foreground/60 py-4 tracking-widest">
            LexRAG v1.2.0 &bull; Odpovědi jsou generovány AI a mohou obsahovat chyby.
          </footer>
        </main>
      </div>
    </TooltipProvider>
  );
}
