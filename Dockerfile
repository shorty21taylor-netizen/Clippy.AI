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
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=${DATABASE_URL}

# NEXT_PUBLIC_* vars are baked into the client bundle at build time.
# Railway passes env vars to the build context automatically, so these
# will be picked up from the Railway environment variables panel.
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
