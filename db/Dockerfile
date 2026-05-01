FROM postgres:16

# Instalace pgvector a hunspell slovníků
RUN apt-get update \
  && apt-get install -y postgresql-16-pgvector \
  hunspell-cs \
  && rm -rf /var/lib/apt/lists/*

# Zkopírování slovníků, vytvoření prázdného stop-listu a oprava práv pro uživatele postgres
RUN cp /usr/share/hunspell/cs_CZ.aff /usr/share/postgresql/16/tsearch_data/czech.affix \
  && cp /usr/share/hunspell/cs_CZ.dic /usr/share/postgresql/16/tsearch_data/czech.dict \
  && touch /usr/share/postgresql/16/tsearch_data/czech.stop \
  && chown postgres:postgres /usr/share/postgresql/16/tsearch_data/czech.*

# EXPOSE už řeší compose, tady nemusí být, ale nevadí tu

# inicializační skripty (spustí se při prvním startu)
COPY ./init /docker-entrypoint-initdb.d

EXPOSE 5432