FROM node:20.19.0-alpine
WORKDIR /app

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

COPY . .

# DATABASE_URL is only needed at runtime, but Next.js page-data collection
# imports route files that touch the db module. The lazy proxy in lib/db.ts
# defers the real connection until first use, so a placeholder is enough here.
# These are only needed at runtime. Lazy init in lib/ means build succeeds
# with placeholders; real values come from Railway environment variables.
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ARG ENCRYPTION_KEY=buildsecretbuildsecretbuildsecr
ARG CLERK_SECRET_KEY=sk_test_build
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_build
ENV DATABASE_URL=${DATABASE_URL}
ENV ENCRYPTION_KEY=${ENCRYPTION_KEY}
ENV CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
