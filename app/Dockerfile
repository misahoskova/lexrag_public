# Dev-only Dockerfile
FROM node:22-alpine
WORKDIR /app

COPY app/package.json ./package.json
COPY app/.npmrc ./.npmrc
RUN npm i

COPY app/tsconfig.json ./tsconfig.json

COPY app/eslint.config.mjs ./eslint.config.mjss
COPY app/next.config.ts ./next.config.ts
COPY app/postcss.config.mjs ./postcss.config.mjs
COPY app/drizzle.config.ts ./drizzle.config.ts
COPY app/components.json ./components.json
COPY app/.prettierrc ./.prettierrc
COPY app/.prettierignore ./.prettierignore


EXPOSE 3000


CMD ["npm", "run", "dev"]