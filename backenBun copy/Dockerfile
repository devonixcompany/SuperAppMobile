FROM oven/bun:1

WORKDIR /app

# Install openssl
RUN apt-get update && apt-get install -y openssl

# Install dependencies
COPY package*.json ./
RUN bun install

# Copy source code
COPY . .

# Generate Prisma Client
RUN bunx prisma generate

EXPOSE 8080

CMD ["bun", "run", "src/app.ts"]