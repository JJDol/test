/**
 * Instructions to apply the pgvector migration.
 * 
 * Run: node scripts/apply-pgvector-migration.mjs
 * 
 * This script prints the migration SQL and instructions for applying it.
 */
import { readFileSync } from 'fs';

const migrationSQL = readFileSync(
  'supabase/migrations/20260312100000_enable_pgvector_and_create_document_chunks.sql',
  'utf-8'
);

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║          PGVECTOR MIGRATION - APPLY INSTRUCTIONS           ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log('Apply the migration using ONE of these methods:');
console.log('');
console.log('━━━ Option 1: Supabase Dashboard SQL Editor (Recommended) ━━━');
console.log('  1. Go to: https://supabase.com/dashboard/project/xsweqshcgrzndlewijar/sql/new');
console.log('  2. Paste the SQL below');
console.log('  3. Click "Run"');
console.log('');
console.log('━━━ Option 2: Supabase CLI ━━━');
console.log('  1. npx supabase login');
console.log('  2. npx supabase link --project-ref xsweqshcgrzndlewijar');
console.log('  3. npx supabase db push');
console.log('');
console.log('━━━ Migration SQL ━━━');
console.log('');
console.log(migrationSQL);
