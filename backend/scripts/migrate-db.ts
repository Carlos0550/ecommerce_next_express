import 'dotenv/config';
import { Pool, PoolClient } from 'pg';

/**
 * Script de migración de base de datos A → B
 * Asume que ambas tienen exactamente el mismo schema.
 *
 * Uso:
 *   SOURCE_DATABASE_URL="postgres://..." TARGET_DATABASE_URL="postgres://..." npx ts-node-dev --transpile-only backend/scripts/migrate-db.ts
 *
 * La DB origen siempre se conecta en modo read-only.
 */

const SOURCE_DB_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_DB_URL = process.env.TARGET_DATABASE_URL;

if (!SOURCE_DB_URL || !TARGET_DB_URL) {
  console.error('❌ Debes definir SOURCE_DATABASE_URL y TARGET_DATABASE_URL');
  console.error('   Ejemplo: SOURCE_DATABASE_URL="postgres://user:pass@host:port/db" TARGET_DATABASE_URL="postgres://user:pass@host:port/db" npx ts-node-dev --transpile-only backend/scripts/migrate-db.ts');
  process.exit(1);
}

const sourcePool = new Pool({ connectionString: SOURCE_DB_URL, application_name: 'cinnamon-migrate-readonly' });
const targetPool = new Pool({ connectionString: TARGET_DB_URL, application_name: 'cinnamon-migrate-target' });

/* ─── utilidades ─── */

async function getRegularTables(client: PoolClient): Promise<string[]> {
  const result = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
      AND table_name NOT LIKE 'sql_%'
      AND table_name != '_prisma_migrations'
      AND table_name NOT LIKE '\_%'
    ORDER BY table_name
  `);
  return result.rows.map((r) => r.table_name);
}

async function getRelationTables(client: PoolClient): Promise<string[]> {
  const result = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name LIKE '\_%'
    ORDER BY table_name
  `);
  return result.rows.map((r) => r.table_name);
}

async function getTableColumns(client: PoolClient, tableName: string): Promise<{ name: string; dataType: string }[]> {
  const result = await client.query(
    `
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = $1 AND table_schema = 'public'
    ORDER BY ordinal_position
  `,
    [tableName],
  );
  return result.rows.map((r) => ({
    name: r.column_name,
    dataType: r.data_type === 'USER-DEFINED' ? r.udt_name : r.data_type,
  }));
}

async function getTableCount(client: PoolClient, tableName: string): Promise<number> {
  const result = await client.query(`SELECT COUNT(*)::int as count FROM "${tableName}"`);
  return result.rows[0].count;
}

function serializeValue(value: any, columnName: string, dataType: string): any {
  if (value === null || value === undefined) return null;

  // JSON/JSONB desde pg ya vienen como objeto/array; aseguramos string para insert
  if ((dataType === 'json' || dataType === 'jsonb') && typeof value === 'object') {
    return JSON.stringify(value);
  }

  // Arrays de PostgreSQL (dataType === 'ARRAY')
  if (dataType === 'ARRAY' && Array.isArray(value)) {
    return value;
  }

  // Timestamptz pueden venir como Date o string; pg maneja ambos bien
  return value;
}

async function resetSequence(client: PoolClient, tableName: string, columnName: string): Promise<void> {
  try {
    const seqResult = await client.query(
      `SELECT pg_get_serial_sequence($1, $2) as seq_name`,
      [tableName, columnName],
    );
    const seqName = seqResult.rows[0]?.seq_name;
    if (seqName) {
      const maxResult = await client.query(`SELECT COALESCE(MAX("${columnName}"), 0) as max_val FROM "${tableName}"`);
      const maxVal = parseInt(maxResult.rows[0].max_val, 10) || 0;
      await client.query(`SELECT setval($1, $2, true)`, [seqName, Math.max(maxVal, 1)]);
      console.log(`   ✓ Secuencia ${seqName} reiniciada a ${maxVal}`);
    }
  } catch (err) {
    // Ignorar si no hay secuencia
  }
}

/* ─── migración ─── */

interface MigrateResult {
  success: boolean;
  count: number;
  error?: string;
}

async function migrateTable(
  sourceClient: PoolClient,
  targetClient: PoolClient,
  tableName: string,
): Promise<MigrateResult> {
  try {
    console.log(`\n📦 ${tableName}`);

    const columns = await getTableColumns(sourceClient, tableName);
    if (columns.length === 0) {
      console.log(`   ⚠️ Sin columnas, saltando`);
      return { success: true, count: 0 };
    }

    const sourceCount = await getTableCount(sourceClient, tableName);
    console.log(`   📊 Registros: ${sourceCount}`);
    if (sourceCount === 0) {
      return { success: true, count: 0 };
    }

    const colNames = columns.map((c) => `"${c.name}"`).join(', ');
    const sourceData = await sourceClient.query(`SELECT ${colNames} FROM "${tableName}"`);

    // Limpiar destino
    await targetClient.query(`DELETE FROM "${tableName}"`);

    const BATCH_SIZE = 100;
    let inserted = 0;

    for (let i = 0; i < sourceData.rows.length; i += BATCH_SIZE) {
      const batch = sourceData.rows.slice(i, i + BATCH_SIZE);

      for (const row of batch) {
        const values = columns.map((col) => serializeValue(row[col.name], col.name, col.dataType));
        const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');

        try {
          await targetClient.query(`INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders})`, values);
          inserted++;
        } catch (insertError: any) {
          console.error(`   ❌ Error insertando en ${tableName}:`, insertError.message);
          console.error(`      Datos:`, JSON.stringify(row).slice(0, 200));
        }
      }

      const progress = Math.min(i + BATCH_SIZE, sourceData.rows.length);
      console.log(`   ⏳ Progreso: ${progress}/${sourceData.rows.length}`);
    }

    // Resetear secuencia si hay columna 'id'
    if (columns.some((c) => c.name === 'id')) {
      await resetSequence(targetClient, tableName, 'id');
    }

    console.log(`   ✅ Migrados: ${inserted}/${sourceCount}`);
    return { success: true, count: inserted };
  } catch (error: any) {
    console.error(`   ❌ Error migrando ${tableName}:`, error.message);
    return { success: false, count: 0, error: error.message };
  }
}

async function migrateRelationTable(
  sourceClient: PoolClient,
  targetClient: PoolClient,
  tableName: string,
): Promise<MigrateResult> {
  try {
    console.log(`\n🔗 ${tableName}`);

    const check = await sourceClient.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) as exists`,
      [tableName],
    );
    if (!check.rows[0].exists) {
      console.log(`   ⚠️ No existe en origen, saltando`);
      return { success: true, count: 0 };
    }

    const sourceData = await sourceClient.query(`SELECT "A", "B" FROM "${tableName}"`);
    if (sourceData.rows.length === 0) {
      console.log(`   ⏭️ Sin relaciones, saltando`);
      return { success: true, count: 0 };
    }

    await targetClient.query(`DELETE FROM "${tableName}"`);

    let inserted = 0;
    for (const row of sourceData.rows) {
      try {
        await targetClient.query(`INSERT INTO "${tableName}" ("A", "B") VALUES ($1, $2)`, [row.A, row.B]);
        inserted++;
      } catch (err: any) {
        console.error(`   ❌ Error relación ${tableName}:`, err.message);
      }
    }

    console.log(`   ✅ Migradas: ${inserted}/${sourceData.rows.length} relaciones`);
    return { success: true, count: inserted };
  } catch (error: any) {
    console.error(`   ❌ Error migrando ${tableName}:`, error.message);
    return { success: false, count: 0, error: error.message };
  }
}

/* ─── main ─── */

async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 MIGRACIÓN DE BASE DE DATOS');
  console.log('═'.repeat(60));
  console.log(`\n📍 Origen:  ${SOURCE_DB_URL!.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@')}`);
  console.log(`📍 Destino: ${TARGET_DB_URL!.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@')}`);

  const sourceClient = await sourcePool.connect();
  const targetClient = await targetPool.connect();

  try {
    // Origen: read-only
    await sourceClient.query('BEGIN TRANSACTION READ ONLY');
    console.log('\n🔒 Origen en modo READ ONLY');

    // Destino: deshabilitar FK checks
    await targetClient.query('SET session_replication_role = replica');
    console.log('🔓 FK checks deshabilitadas en destino');

    // Test conexiones
    await sourceClient.query('SELECT 1');
    await targetClient.query('SELECT 1');
    console.log('✅ Conexiones OK\n');

    const regularTables = await getRegularTables(sourceClient);
    const relationTables = await getRelationTables(sourceClient);

    console.log(`📋 Tablas regulares detectadas: ${regularTables.join(', ')}`);
    console.log(`🔗 Tablas de relación detectadas: ${relationTables.join(', ') || 'ninguna'}\n`);

    // Orden topológico basado en FKs del schema actual
    const desiredOrder = [
      'User',
      'PasswordResetToken',
      'Categories',
      'Products',
      'Sales',
      'Cart',
      'OrderItems',
      'Orders',
      'FAQ',
      'BusinessData',
      'BusinessBankData',
      'WhatsAppSession',
      'ProcessedMessage',
      'WhatsAppAlbumBuffer',
    ];

    const orderedRegular = [
      ...desiredOrder.filter((t) => regularTables.includes(t)),
      ...regularTables.filter((t) => !desiredOrder.includes(t)),
    ];

    const stats = { tablesSuccess: 0, tablesFailed: 0, totalRecords: 0 };

    console.log('─'.repeat(60));
    console.log('📦 MIGRANDO TABLAS PRINCIPALES');
    console.log('─'.repeat(60));

    for (const tableName of orderedRegular) {
      const result = await migrateTable(sourceClient, targetClient, tableName);
      if (result.success) {
        stats.tablesSuccess++;
        stats.totalRecords += result.count;
      } else {
        stats.tablesFailed++;
      }
    }

    if (relationTables.length > 0) {
      console.log('\n' + '─'.repeat(60));
      console.log('🔗 MIGRANDO TABLAS DE RELACIÓN');
      console.log('─'.repeat(60));

      for (const tableName of relationTables) {
        const result = await migrateRelationTable(sourceClient, targetClient, tableName);
        if (result.success) {
          stats.tablesSuccess++;
          stats.totalRecords += result.count;
        } else {
          stats.tablesFailed++;
        }
      }
    }

    // Cerrar transacción origen (rollback implícito al cerrar, pero por claridad)
    await sourceClient.query('ROLLBACK');

    // Rehabilitar FK checks en destino
    await targetClient.query('SET session_replication_role = DEFAULT');

    console.log('\n' + '═'.repeat(60));
    console.log('📊 RESUMEN');
    console.log('═'.repeat(60));
    console.log(`   ✅ Tablas exitosas: ${stats.tablesSuccess}`);
    console.log(`   ❌ Tablas con errores: ${stats.tablesFailed}`);
    console.log(`   📦 Total registros migrados: ${stats.totalRecords}`);
    console.log('═'.repeat(60));
  } catch (fatal: any) {
    console.error('\n❌ Error fatal:', fatal.message);
    try {
      await sourceClient.query('ROLLBACK');
    } catch {}
    process.exit(1);
  } finally {
    sourceClient.release();
    targetClient.release();
    await sourcePool.end();
    await targetPool.end();
    console.log('\n🔌 Conexiones cerradas');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
