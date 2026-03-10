FROM node:20.19.0-alpine
WORKDIR /app

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

COPY . .

# Build-time placeholders — only used during `next build` so the compiler
# doesn't error on missing env references. Real values are injected by Railway
# at runtime and override these. DATABASE_URL is intentionally NOT set as ENV
# so Railway's runtime value is never shadowed by a baked-in placeholder.
ARG ENCRYPTION_KEY=buildsecretbuildsecretbuildsecr
ARG CLERK_SECRET_KEY=sk_test_build
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_build
ENV ENCRYPTION_KEY=${ENCRYPTION_KEY}
ENV CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
# DATABASE_URL must come from Railway env vars — do not bake it into the image

RUN npm run build

EXPOSE 3000
# Run DB migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
