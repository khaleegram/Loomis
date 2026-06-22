# Loomis API — production image (pnpm monorepo).
# Build context: repository root (see railway.toml / docs/deploy-loomis-digital.md).

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 build-essential ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

FROM base AS deploy
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages/contracts ./packages/contracts
COPY packages/core ./packages/core
COPY packages/config ./packages/config
RUN pnpm install --frozen-lockfile
RUN pnpm deploy --filter=@loomis/api --prod /deploy

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deploy /deploy .
RUN chown -R node:node /app
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "const p=process.env.API_PORT||process.env.PORT||8080;fetch('http://127.0.0.1:'+p+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "run", "start"]
