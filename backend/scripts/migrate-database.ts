/**
 * Script de Migración de Base de Datos
 * 
 * Este script migra todos los registros de una base de datos PostgreSQL origen
 * (Supabase) a una base de datos PostgreSQL destino.
 * 
 * Uso: npx ts-node-dev --transpile-only -r tsconfig-paths/register scripts/migrate-database.ts
 */

import { Pool } from 'pg';






const SOURCE_DB = {
  host: '',
  port: 5432,
  database: 'postgres',
  user: '',
  password: '',
  ssl: { rejectUnauthorized: false }
};


const DEST_DB = {
  host: '',
  port: 10187,
  database: 'railway',
  user: 'postgres',
  password: '',
  ssl: { rejectUnauthorized: false }
};





const MIGRATION_ORDER = [
  
  'User',
  'Admin',
  'Categories',
  'ColorPalette',
  'FAQ',
  'BusinessData',
  
  
  'BusinessBankData',  
  'Products',          
  'Promos',            
  'Cart',              
  
  
  'Sales',             
  'OrderItems',        
  'Orders',            
];


const RELATION_TABLES = [
  '_CategoriesToPromos',
  '_ProductsToPromos',
  '_ProductsToSales',
];





async function getTableColumns(pool: Pool, tableName: string): Promise<string[]> {
  const result = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = $1 
    AND table_schema = 'public'
    ORDER BY ordinal_position
  `, [tableName]);
  return result.rows.map(row => row.column_name);
}

async function getTableCount(pool: Pool, tableName: string): Promise<number> {
  const result = await pool.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
  return parseInt(result.rows[0].count);
}

async function resetSequence(pool: Pool, tableName: string, columnName: string): Promise<void> {
  try {
    
    const seqResult = await pool.query(`
      SELECT pg_get_serial_sequence('"${tableName}"', '${columnName}') as seq_name
    `);
    
    const seqName = seqResult.rows[0]?.seq_name;
    if (seqName) {
      
      const maxResult = await pool.query(`SELECT COALESCE(MAX("${columnName}"), 0) as max_val FROM "${tableName}"`);
      const maxVal = parseInt(maxResult.rows[0].max_val) || 0;
      
      
      await pool.query(`SELECT setval('${seqName}', $1, true)`, [Math.max(maxVal, 1)]);
      console.log(`  ✓ Secuencia ${seqName} reiniciada a ${maxVal}`);
    }
  } catch (error) {
    
  }
}


const JSON_COLUMNS = ['images', 'tags', 'options', 'items', 'manualProducts', 'paymentMethods', 'selected_options'];


const ARRAY_COLUMNS = ['colors'];

function serializeValue(value: any, columnName: string): any {
  if (value === null || value === undefined) return value;
  
  
  if (ARRAY_COLUMNS.includes(columnName)) {
    
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    
    return value;
  }
  
  
  if (JSON_COLUMNS.includes(columnName) && typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return value;
}

async function migrateTable(
  sourcePool: Pool,
  destPool: Pool,
  tableName: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    console.log(`\n📦 Migrando tabla: ${tableName}`);
    
    
    const columns = await getTableColumns(sourcePool, tableName);
    if (columns.length === 0) {
      console.log(`  ⚠️ Tabla no encontrada o vacía en origen`);
      return { success: true, count: 0 };
    }
    
    
    const sourceCount = await getTableCount(sourcePool, tableName);
    console.log(`  📊 Registros en origen: ${sourceCount}`);
    
    if (sourceCount === 0) {
      console.log(`  ⏭️ Tabla vacía, saltando...`);
      return { success: true, count: 0 };
    }
    
    
    const columnsStr = columns.map(c => `"${c}"`).join(', ');
    const sourceData = await sourcePool.query(`SELECT ${columnsStr} FROM "${tableName}"`);
    
    
    await destPool.query(`DELETE FROM "${tableName}"`);
    
    
    
    
    const BATCH_SIZE = 100;
    let inserted = 0;
    
    for (let i = 0; i < sourceData.rows.length; i += BATCH_SIZE) {
      const batch = sourceData.rows.slice(i, i + BATCH_SIZE);
      
      for (const row of batch) {
        
        const values = columns.map(col => serializeValue(row[col], col));
        const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
        
        try {
          await destPool.query(
            `INSERT INTO "${tableName}" (${columnsStr}) VALUES (${placeholders})`,
            values
          );
          inserted++;
        } catch (insertError: any) {
          console.error(`  ❌ Error insertando registro:`, insertError.message);
        }
      }
      
      console.log(`  ⏳ Progreso: ${Math.min(i + BATCH_SIZE, sourceData.rows.length)}/${sourceData.rows.length}`);
    }
    
    
    
    
    if (columns.includes('id')) {
      await resetSequence(destPool, tableName, 'id');
    }
    
    console.log(`  ✅ Migrados: ${inserted} registros`);
    return { success: true, count: inserted };
    
  } catch (error: any) {
    console.error(`  ❌ Error migrando ${tableName}:`, error.message);
    return { success: false, count: 0, error: error.message };
  }
}

async function migrateRelationTable(
  sourcePool: Pool,
  destPool: Pool,
  tableName: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    console.log(`\n🔗 Migrando relación: ${tableName}`);
    
    
    const checkResult = await sourcePool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = $1
      ) as exists
    `, [tableName]);
    
    if (!checkResult.rows[0].exists) {
      console.log(`  ⚠️ Tabla de relación no encontrada en origen`);
      return { success: true, count: 0 };
    }
    
    
    const sourceData = await sourcePool.query(`SELECT "A", "B" FROM "${tableName}"`);
    
    if (sourceData.rows.length === 0) {
      console.log(`  ⏭️ Sin relaciones, saltando...`);
      return { success: true, count: 0 };
    }
    
    
    await destPool.query(`DELETE FROM "${tableName}"`);
    
    
    let inserted = 0;
    for (const row of sourceData.rows) {
      try {
        await destPool.query(
          `INSERT INTO "${tableName}" ("A", "B") VALUES ($1, $2)`,
          [row.A, row.B]
        );
        inserted++;
      } catch (error: any) {
        console.error(`  ❌ Error insertando relación:`, error.message);
      }
    }
    
    console.log(`  ✅ Migradas: ${inserted} relaciones`);
    return { success: true, count: inserted };
    
  } catch (error: any) {
    console.error(`  ❌ Error migrando ${tableName}:`, error.message);
    return { success: false, count: 0, error: error.message };
  }
}





async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 MIGRACIÓN DE BASE DE DATOS');
  console.log('═'.repeat(60));
  console.log(`\n📍 Origen: ${SOURCE_DB.host}:${SOURCE_DB.port}/${SOURCE_DB.database}`);
  console.log(`📍 Destino: ${DEST_DB.host}:${DEST_DB.port}/${DEST_DB.database}`);
  
  
  const sourcePool = new Pool(SOURCE_DB);
  const destPool = new Pool(DEST_DB);
  
  try {
    
    console.log('\n🔌 Probando conexiones...');
    await sourcePool.query('SELECT 1');
    console.log('  ✓ Conexión a origen exitosa');
    await destPool.query('SELECT 1');
    console.log('  ✓ Conexión a destino exitosa');
    
    
    console.log('\n🔓 Deshabilitando verificación de foreign keys...');
    await destPool.query(`SET session_replication_role = replica`);
    
    
    const stats = {
      tablesSuccess: 0,
      tablesFailed: 0,
      totalRecords: 0,
    };
    
    
    console.log('\n' + '─'.repeat(60));
    console.log('📋 MIGRANDO TABLAS PRINCIPALES');
    console.log('─'.repeat(60));
    
    for (const tableName of MIGRATION_ORDER) {
      const result = await migrateTable(sourcePool, destPool, tableName);
      if (result.success) {
        stats.tablesSuccess++;
        stats.totalRecords += result.count;
      } else {
        stats.tablesFailed++;
      }
    }
    
    
    console.log('\n' + '─'.repeat(60));
    console.log('🔗 MIGRANDO TABLAS DE RELACIÓN');
    console.log('─'.repeat(60));
    
    for (const tableName of RELATION_TABLES) {
      const result = await migrateRelationTable(sourcePool, destPool, tableName);
      if (result.success) {
        stats.tablesSuccess++;
        stats.totalRecords += result.count;
      } else {
        stats.tablesFailed++;
      }
    }
    
    
    console.log('\n🔒 Rehabilitando verificación de foreign keys...');
    await destPool.query(`SET session_replication_role = DEFAULT`);
    
    
    console.log('\n' + '═'.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('═'.repeat(60));
    console.log(`  ✅ Tablas migradas exitosamente: ${stats.tablesSuccess}`);
    console.log(`  ❌ Tablas con errores: ${stats.tablesFailed}`);
    console.log(`  📦 Total de registros migrados: ${stats.totalRecords}`);
    console.log('═'.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error fatal durante la migración:', error);
    process.exit(1);
  } finally {
    
    await sourcePool.end();
    await destPool.end();
    console.log('\n🔌 Conexiones cerradas');
  }
}


main().catch(console.error);

