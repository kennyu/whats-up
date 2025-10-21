import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './localdb/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo',
});


