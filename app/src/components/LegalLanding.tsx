'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Book, BookOpen, Loader2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';

interface Law {
  id: number;
  cislo: number;
  rok: number;
  nazev: string;
  zkratka?: string;
}

interface Props {
  onSelect: (law: Law | 'all') => void;
}

export default function LegalLanding({ onSelect }: Props) {
  const [laws, setLaws] = useState<Law[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLaws() {
      try {
        const res = await fetch('/api/laws');
        if (res.ok) {
          const data = await res.json();
          setLaws(data.laws || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchLaws();
  }, []);

  return (
    <div className="min-h-dvh flex flex-col items-center py-16 px-6 bg-background">
      <div className="max-w-5xl w-full space-y-12">
        <header className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
            <BookOpen className="size-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">LexRAG Průvodce</h1>
          <p className="text-muted-foreground">Vyberte oblast, kterou chcete analyzovat</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="md:col-span-3"
            onClick={() => onSelect('all')}
          >
            <Card className="cursor-pointer border-2 border-muted hover:border-blue-500 transition-all bg-blue-50/30 group">
              <CardContent className="p-8 flex items-center gap-6">
                <div className="p-4 bg-blue-500/10 rounded-2xl group-hover:bg-blue-500/20 transition-colors">
                  <Globe className="size-8 text-blue-600" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold">Univerzální vyhledávání</h2>
                  <p className="text-sm text-muted-foreground">
                    Prohledat celou českou legislativu a všechny nahrané předpisy najednou.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {loading ? (
            <div className="col-span-3 flex justify-center py-12">
              <Loader2 className="animate-spin opacity-20" />
            </div>
          ) : (
            laws.map(law => (
              <motion.div key={law.id} whileHover={{ y: -4 }} onClick={() => onSelect(law)}>
                <Card className="h-full cursor-pointer hover:shadow-md hover:border-muted-foreground/30 transition-all">
                  <CardContent className="p-5 flex flex-col h-full space-y-3">
                    <div className="size-8 bg-muted rounded-lg flex items-center justify-center">
                      <Book className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-primary">
                        {law.zkratka || `${law.cislo}/${law.rok} Sb.`}
                      </div>
                      <div className="text-xs text-muted-foreground leading-snug line-clamp-2">
                        {law.nazev}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
