CREATE EXTENSION IF NOT EXISTS vector;

CREATE TEXT SEARCH DICTIONARY czech_hunspell (
    TEMPLATE = ispell,
    DictFile = czech,
    AffFile = czech,
    StopWords = czech
);

CREATE TEXT SEARCH CONFIGURATION czech (COPY = simple);
ALTER TEXT SEARCH CONFIGURATION czech 
    ALTER MAPPING FOR word, asciiword, hword, hword_part, asciihword 
    WITH czech_hunspell, simple;