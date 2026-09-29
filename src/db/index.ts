import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { config } from 'dotenv';
import { createInMemoryDrizzle } from './in-memory-db';

config({ path: '.env.local' });

let db: PostgresJsDatabase<typeof schema>;

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl && !databaseUrl.includes('placeholder') && !databaseUrl.includes('localhost:5432/dreampath')) {
  try {
    const queryClient = postgres(databaseUrl, { prepare: false });
    db = drizzle(queryClient, { schema });
  } catch (err) {
    console.warn('[AI Studio] PostgreSQL connection failed, falling back to in-memory store:', err);
    db = createInMemoryDrizzle() as unknown as PostgresJsDatabase<typeof schema>;
  }
} else {
  console.warn('[AI Studio] DATABASE_URL not configured. Operating in preview mode with verified in-memory dataset.');
  db = createInMemoryDrizzle() as unknown as PostgresJsDatabase<typeof schema>;
}

export { db };
