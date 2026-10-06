import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { config } from 'dotenv';
import { createInMemoryDrizzle } from './in-memory-db';

let db: PostgresJsDatabase<typeof schema>;

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

if (isTest) {
  // SAFETY GUARD: Enforce complete test isolation. Tests must NEVER connect to the live development or production database.
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  const prodDatabaseUrl = process.env.DATABASE_URL;

  if (testDatabaseUrl) {
    if (prodDatabaseUrl && (testDatabaseUrl === prodDatabaseUrl || testDatabaseUrl.includes('supabase.co'))) {
      throw new Error(
        '[CRITICAL TEST SAFETY VIOLATION] Refusing to connect: TEST_DATABASE_URL matches the live development/production database! Tests are strictly prohibited from mutating production data.'
      );
    }
    try {
      const queryClient = postgres(testDatabaseUrl, { prepare: false });
      db = drizzle(queryClient, { schema });
    } catch (err) {
      console.warn('[Test Database] Connection to TEST_DATABASE_URL failed, falling back to in-memory store:', err);
      db = createInMemoryDrizzle() as unknown as PostgresJsDatabase<typeof schema>;
    }
  } else {
    // Default to isolated in-memory test database (zero network, zero production mutation)
    db = createInMemoryDrizzle() as unknown as PostgresJsDatabase<typeof schema>;
  }
} else {
  config({ path: '.env.local' });
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
}

export { db };
