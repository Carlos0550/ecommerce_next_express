import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
const args = process.argv.slice(2);
const migrationName = args[0];
const migrationType = args.find(arg => arg === '--type' || arg === '-t') 
  ? args[args.findIndex(arg => arg === '--type' || arg === '-t') + 1] 
  : 'dev';
if (!migrationName) {
  console.error('❌ Error: Debes proporcionar un nombre para la migración');
  console.log('\nUso:');
  console.log('  npm run migration:generate -- <nombre_migracion>');
  console.log('  npm run migration:generate -- <nombre_migracion> --type drift');
  console.log('\nEjemplos:');
  console.log('  npm run migration:generate -- add_promo_to_orders');
  console.log('  npm run migration:generate -- fix_drift --type drift');
  process.exit(1);
}
const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '');
const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}
if (migrationType === 'drift') {
  console.log('🔧 Generando migración para resolver drift...\n');
  const migrationDir = path.join(migrationsDir, `${timestamp}_${migrationName}`);
  const migrationFile = path.join(migrationDir, 'migration.sql');
  if (!fs.existsSync(migrationDir)) {
    fs.mkdirSync(migrationDir, { recursive: true });
  }
  try {
    console.log('📝 Comparando schema con la base de datos...');
    const sql = execSync(
      'npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script',
      { 
        encoding: 'utf-8',
        cwd: process.cwd(),
        stdio: 'pipe'
      }
    );
    if (!sql || sql.trim().length === 0) {
      console.log('✅ No hay diferencias entre el schema y la base de datos');
      fs.rmdirSync(migrationDir);
      process.exit(0);
    }
    fs.writeFileSync(migrationFile, sql);
    console.log(`✅ Migración generada: ${migrationFile}`);
    console.log(`\n📋 SQL generado (${sql.split('\n').length} líneas):`);
    console.log('─'.repeat(60));
    console.log(sql.substring(0, 500) + (sql.length > 500 ? '...' : ''));
    console.log('─'.repeat(60));
    console.log('\n💡 Para aplicar la migración, ejecuta:');
    console.log('   npx prisma migrate deploy');
  } catch (error: any) {
    console.error('❌ Error al generar la migración:', error.message);
    if (fs.existsSync(migrationDir)) {
      fs.rmSync(migrationDir, { recursive: true });
    }
    process.exit(1);
  }
} else {
  console.log(`🚀 Generando migración: ${migrationName}\n`);
  try {
    execSync(
      `npx prisma migrate dev --name ${migrationName} --create-only`,
      { 
        encoding: 'utf-8',
        cwd: process.cwd(),
        stdio: 'inherit'
      }
    );
    console.log('\n✅ Migración generada exitosamente');
    console.log('\n💡 Para aplicar la migración:');
    console.log('   npx prisma migrate deploy');
    console.log('\n💡 Para verificar que no hay drift:');
    console.log('   npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code');
  } catch (error: any) {
    console.error('❌ Error al generar la migración:', error.message);
    process.exit(1);
  }
}
