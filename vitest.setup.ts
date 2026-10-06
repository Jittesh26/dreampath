// Vitest Setup & Test Isolation Safety Guard
import { beforeAll } from 'vitest';
import { config } from 'dotenv';
import { resetInMemoryStore } from '@/db/in-memory-db';

// Enforce test environment flags
(process.env as Record<string, string | undefined>).NODE_ENV = 'test';
process.env.VITEST = 'true';

// Load non-database environment variables from .env.local (e.g. Supabase anon keys, AI keys)
config({ path: '.env.local' });

// SAFETY GUARD: Protect live production/development databases
const rawDbUrl = process.env.DATABASE_URL;

if (process.env.TEST_DATABASE_URL) {
  if (
    rawDbUrl &&
    (process.env.TEST_DATABASE_URL === rawDbUrl ||
      process.env.TEST_DATABASE_URL.includes('supabase.co'))
  ) {
    throw new Error(
      '[CRITICAL TEST SAFETY VIOLATION] TEST_DATABASE_URL points to the live development/production database! Tests are strictly prohibited from mutating production data.'
    );
  }
} else {
  // Wipe DATABASE_URL during test execution so no module can connect to the real database
  delete process.env.DATABASE_URL;
}

// Reset in-memory database store before all tests in each suite
beforeAll(() => {
  resetInMemoryStore();
});
