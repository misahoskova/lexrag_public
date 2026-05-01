'use client';

import React, { useState } from 'react';
import LegalLanding from '../components/LegalLanding';
import LegalAssistantUI from '../components/LexWorkspace';

interface Law {
  id: number;
  cislo: number;
  rok: number;
  nazev: string;
  zkratka?: string;
}

export default function Page() {
  const [view, setView] = useState<'landing' | 'search'>('landing');
  const [selectedLaw, setSelectedLaw] = useState<Law | 'all'>('all');

  const handleSelect = (selection: Law | 'all') => {
    setSelectedLaw(selection);
    setView('search');
  };

  const handleBack = () => {
    setView('landing');
  };

  return (
    <>
      {view === 'landing' ? (
        <LegalLanding onSelect={handleSelect} />
      ) : (
        <LegalAssistantUI selectedLaw={selectedLaw} onBack={handleBack} />
      )}
    </>
  );
}
