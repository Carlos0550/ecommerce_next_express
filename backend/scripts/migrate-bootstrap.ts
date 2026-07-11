import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Client as Minio } from 'minio';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

type BackupData = Record<string, unknown>;

const BACKUP_FILE = path.join(__dirname, 'migration-backup.json');

function readEnv(name: string, required = true): string {
  const v = process.env[name];
  if (required && (!v || v.trim() === '')) {
    throw new Error(`Falta variable de entorno: ${name}`);
  }
  return v ?? '';
}

function buildSourceConfig() {
  if (process.env.SOURCE_DATABASE_RO !== 'true') {
    throw new Error('SOURCE_DATABASE_RO debe ser "true". Abortando por seguridad.');
  }
  const databaseUrl = readEnv('SOURCE_DATABASE_URL');
  if (!databaseUrl.startsWith('postgres')) {
    throw new Error('SOURCE_DATABASE_URL debe ser postgres://');
  }
  return {
    databaseUrl,
    minio: {
      endPoint: readEnv('SOURCE_MINIO_ENDPOINT'),
      port: parseInt(readEnv('SOURCE_MINIO_PORT'), 10),
      useSSL: readEnv('SOURCE_MINIO_USE_SSL') === 'true',
      accessKey: readEnv('SOURCE_MINIO_ACCESS_KEY'),
      secretKey: readEnv('SOURCE_MINIO_SECRET_KEY'),
      bucket: readEnv('SOURCE_MINIO_BUCKET'),
    },
  };
}

function buildTargetConfig() {
  return {
    databaseUrl: readEnv('DATABASE_URL'),
    minio: {
      endPoint: readEnv('MINIO_ENDPOINT'),
      port: parseInt(readEnv('MINIO_PORT'), 10),
      useSSL: readEnv('MINIO_USE_SSL') === 'true',
      accessKey: readEnv('MINIO_ACCESS_KEY'),
      secretKey: readEnv('MINIO_SECRET_KEY'),
      bucket: readEnv('MINIO_BUCKET'),
    },
  };
}

function createSourcePrisma(databaseUrl: string): PrismaClient {
  const pool = new Pool({
    connectionString: databaseUrl,
    options: '-c default_transaction_read_only=on',
  });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });
  const mutating = ['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany', 'executeRaw', '$executeRaw', '$executeRawUnsafe'];
  for (const key of mutating) {
    const original = (client as unknown as Record<string, unknown>)[key];
    if (typeof original === 'function') {
      (client as unknown as Record<string, unknown>)[key] = () => {
        throw new Error(`Operación de escritura "${key}" bloqueada: SOURCE es read-only.`);
      };
    }
  }
  return client;
}

function createTargetPrisma(databaseUrl: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}

function buildMinio(cfg: { endPoint: string; port: number; useSSL: boolean; accessKey: string; secretKey: string }): Minio {
  let host = cfg.endPoint;
  if (/^https?:\/\//i.test(host)) host = host.replace(/^https?:\/\//i, '');
  return new Minio({
    endPoint: host,
    port: cfg.port,
    useSSL: cfg.useSSL,
    accessKey: cfg.accessKey,
    secretKey: cfg.secretKey,
    region: 'us-east-1',
    requestOptions: { requestTimeout: 15000, timeout: 15000 },
  } as ConstructorParameters<typeof Minio>[0]);
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT ${ms}ms en ${label}`)), ms),
    ),
  ]);
}

function sourceHostPort(cfg: { endPoint: string; port: number; useSSL: boolean }): { host: string; port: string; protocol: string } {
  return { host: cfg.endPoint, port: String(cfg.port), protocol: cfg.useSSL ? 'https:' : 'http:' };
}

function targetHostPort(cfg: { endPoint: string; port: number; useSSL: boolean }): { host: string; port: string; protocol: string } {
  return { host: cfg.endPoint, port: String(cfg.port), protocol: cfg.useSSL ? 'https:' : 'http:' };
}

function isSourceUrl(u: string, src: { host: string; port: string }): boolean {
  try {
    const url = new URL(u);
    const matches = url.host === src.host || url.host === `${src.host}:${src.port}`;
    if (!matches) return false;
    if (url.host === src.host && !url.port) return true;
    return url.host === `${src.host}:${src.port}`;
  } catch {
    return false;
  }
}

function rewriteUrlHost(u: string, src: { host: string; port: string }, tgt: { host: string; port: string; protocol: string }): string {
  const url = new URL(u);
  url.protocol = tgt.protocol;
  if (url.host === src.host && !url.port) {
    url.host = tgt.port && tgt.port !== '80' && tgt.port !== '443' ? `${tgt.host}:${tgt.port}` : tgt.host;
  } else {
    url.host = `${tgt.host}:${tgt.port}`;
  }
  return url.toString();
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (c: Buffer | string) => {
      chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

async function extractPhase(): Promise<void> {
  const src = buildSourceConfig();
  console.log('--- EXTRACT: source -> backup ---');
  const prisma = createSourcePrisma(src.databaseUrl);
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Conexion source OK (read-only enforced at PG level).');
    const data: BackupData = {
      extractedAt: new Date().toISOString(),
      users: await prisma.user.findMany(),
      passwordResetTokens: await prisma.passwordResetToken.findMany(),
      categories: await prisma.categories.findMany(),
      products: await prisma.products.findMany(),
      sales: await prisma.sales.findMany(),
      cart: await prisma.cart.findMany(),
      orderItems: await prisma.orderItems.findMany(),
      orders: await prisma.orders.findMany(),
      faq: await prisma.fAQ.findMany(),
      businessData: await prisma.businessData.findMany(),
      businessBankData: await prisma.businessBankData.findMany(),
      whatsAppSessions: await prisma.whatsAppSession.findMany(),
      processedMessages: await prisma.processedMessage.findMany(),
      whatsAppAlbumBuffer: await prisma.whatsAppAlbumBuffer.findMany(),
      egresosCategories: await prisma.egresosCategories.findMany(),
      egresos: await prisma.egresos.findMany(),
    };
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2));
    const counts = Object.fromEntries(
      Object.entries(data).filter(([k]) => k !== 'extractedAt').map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]),
    );
    console.log('Backup escrito en', BACKUP_FILE);
    console.log('Conteos:', counts);
  } finally {
    await prisma.$disconnect();
  }
}

function objectKeyFromUrl(u: string, bucket: string): string {
  const path = new URL(u).pathname.replace(/^\/+/, '');
  if (path.toLowerCase().startsWith(`${bucket.toLowerCase()}/`)) {
    return path.slice(bucket.length + 1);
  }
  return path;
}

async function transferOne(
  url: string,
  srcClient: Minio,
  tgtClient: Minio,
  srcBucket: string,
  tgtBucket: string,
): Promise<boolean> {
  const key = objectKeyFromUrl(url, srcBucket);
  if (!key) return false;
  let stream: NodeJS.ReadableStream;
  try {
    stream = await srcClient.getObject(srcBucket, key);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'NoSuchKey' || code === 'NotFound') {
      return false;
    }
    console.warn(`  WARN getObject(${key}) [${code ?? 'ERR'}]: ${(err as Error).message}`);
    return false;
  }
  let buf: Buffer;
  try {
    buf = await streamToBuffer(stream);
  } catch (err) {
    console.warn(`  WARN stream(${key}): ${(err as Error).message}`);
    return false;
  }
  try {
    await tgtClient.putObject(tgtBucket, key, buf, buf.length);
  } catch (err) {
    const code = (err as { code?: string }).code;
    console.warn(`  WARN putObject(${key}) [${code ?? 'ERR'}]: ${(err as Error).message}`);
    return false;
  }
  return true;
}

async function storagePhase(): Promise<void> {
  const src = buildSourceConfig();
  const tgt = buildTargetConfig();
  console.log('--- STORAGE: source MinIO -> target MinIO ---');
  if (!fs.existsSync(BACKUP_FILE)) {
    throw new Error(`No existe ${BACKUP_FILE}. Corre --extract primero.`);
  }
  const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8')) as BackupData;
  const srcClient = buildMinio(src.minio);
  const tgtClient = buildMinio(tgt.minio);
  const srcHp = sourceHostPort(src.minio);
  const tgtHp = targetHostPort(tgt.minio);

  console.log(`Source: ${src.minio.useSSL ? 'https' : 'http'}://${src.minio.endPoint}:${src.minio.port}/${src.minio.bucket}`);
  console.log(`Target: ${tgt.minio.useSSL ? 'https' : 'http'}://${tgt.minio.endPoint}:${tgt.minio.port}/${tgt.minio.bucket}`);

  try {
    const srcOk = await withTimeout(srcClient.bucketExists(src.minio.bucket), 20000, 'source bucketExists');
    console.log(`Source bucket "${src.minio.bucket}" exists: ${srcOk}`);
    if (!srcOk) throw new Error(`Source bucket "${src.minio.bucket}" no existe.`);
  } catch (err) {
    const code = (err as { code?: string }).code;
    throw new Error(
      `No se pudo conectar al source MinIO (${src.minio.endPoint}:${src.minio.port}) [${code ?? 'ERR'}]: ${(err as Error).message}`,
    );
  }
  try {
    const tgtOk = await withTimeout(tgtClient.bucketExists(tgt.minio.bucket), 20000, 'target bucketExists');
    console.log(`Target bucket "${tgt.minio.bucket}" exists: ${tgtOk}`);
    if (!tgtOk) {
      await withTimeout(tgtClient.makeBucket(tgt.minio.bucket), 20000, 'target makeBucket');
      console.log(`Target bucket "${tgt.minio.bucket}" creado.`);
    }
  } catch (err) {
    const code = (err as { code?: string }).code;
    throw new Error(
      `No se pudo conectar al target MinIO (${tgt.minio.endPoint}:${tgt.minio.port}) [${code ?? 'ERR'}]: ${(err as Error).message}. Revisa MINIO_* del target (host sin esquema http://, puerto correcto, SSL).`,
    );
  }
  type UrlJob = {
    record: Record<string, unknown>;
    field: string;
    isJson: boolean;
    arrayIndex: number;
    originalUrl: string;
    key: string;
  };

  const tasks: Array<{ record: Record<string, unknown>; field: string; isJson: boolean }> = [];
  const products = (backup.products as Array<Record<string, unknown>>) ?? [];
  for (const p of products) tasks.push({ record: p, field: 'images', isJson: true });
  const categories = (backup.categories as Array<Record<string, unknown>>) ?? [];
  for (const c of categories) tasks.push({ record: c, field: 'image', isJson: false });
  const users = (backup.users as Array<Record<string, unknown>>) ?? [];
  for (const u of users) tasks.push({ record: u, field: 'profile_image', isJson: false });
  const businesses = (backup.businessData as Array<Record<string, unknown>>) ?? [];
  for (const b of businesses) {
    tasks.push({ record: b, field: 'business_image', isJson: false });
    tasks.push({ record: b, field: 'hero_image', isJson: false });
    tasks.push({ record: b, field: 'favicon', isJson: false });
  }
  const orders = (backup.orders as Array<Record<string, unknown>>) ?? [];
  for (const o of orders) tasks.push({ record: o, field: 'transfer_receipt_path', isJson: false });

  const uploadJobs: UrlJob[] = [];
  let skippedExternal = 0;

  const lookup = new Map<string, { success: boolean | undefined; promise: Promise<boolean> | undefined }>();
  const ensureUploaded = (key: string, url: string): Promise<boolean> => {
    const hit = lookup.get(key);
    if (hit?.success !== undefined) return Promise.resolve(hit.success);
    if (hit?.promise) return hit.promise;
    const p = transferOne(url, srcClient, tgtClient, src.minio.bucket, tgt.minio.bucket).catch((err) => {
      const code = (err as { code?: string }).code;
      if (code === 'NoSuchKey' || code === 'NotFound') return false;
      throw err;
    });
    const entry = { success: undefined as boolean | undefined, promise: p };
    lookup.set(key, entry);
    p.then(
      (ok) => {
        entry.success = ok;
        entry.promise = undefined;
      },
      () => {
        entry.promise = undefined;
      },
    );
    return p;
  };

  const rebuilt = new Map<string, string>();
  for (const { record, field, isJson } of tasks) {
    const raw = record[field];
    if (!raw) continue;
    if (isJson) {
      const arr = raw as unknown[];
      if (!Array.isArray(arr)) continue;
      for (let i = 0; i < arr.length; i++) {
        const u = arr[i];
        if (typeof u !== 'string') {
          rebuilt.set(`${field}:${i}:extKeep`, String(u ?? ''));
          continue;
        }
        if (!isSourceUrl(u, srcHp)) {
          rebuilt.set(`${field}:${i}:extKeep`, u);
          skippedExternal++;
          continue;
        }
        const key = objectKeyFromUrl(u, src.minio.bucket);
        if (!key) {
          rebuilt.set(`${field}:${i}:extKeep`, u);
          continue;
        }
        uploadJobs.push({ record, field, isJson: true, arrayIndex: i, originalUrl: u, key });
      }
    } else {
      const u = raw as string;
      if (!isSourceUrl(u, srcHp)) {
        rebuilt.set(`${field}:0:extKeep`, u);
        skippedExternal++;
        continue;
      }
      const key = objectKeyFromUrl(u, src.minio.bucket);
      if (!key) {
        rebuilt.set(`${field}:0:extKeep`, u);
        continue;
      }
      uploadJobs.push({ record, field, isJson: false, arrayIndex: 0, originalUrl: u, key });
    }
  }

  const WORKERS = 3;
  const BATCH = 10;
  let uploaded = 0;
  let skippedMissing = 0;
  let processed = 0;
  const total = uploadJobs.length;
  const logProgress = () => {
    console.log(`  ...procesadas=${processed}/${total}, transferidas=${uploaded}, externas=${skippedExternal}, faltantes=${skippedMissing}`);
  };

  let cursor = 0;
  async function worker(): Promise<void> {
    while (true) {
      const start = cursor;
      cursor += BATCH;
      if (start >= uploadJobs.length) return;
      const slice = uploadJobs.slice(start, start + BATCH);
      await Promise.all(
        slice.map(async (job) => {
          try {
            const ok = await ensureUploaded(job.key, job.originalUrl);
            if (ok) uploaded++;
            else skippedMissing++;
            processed++;
            rebuilt.set(`${job.field}:${job.arrayIndex}:src`, ok ? rewriteUrlHost(job.originalUrl, srcHp, tgtHp) : job.originalUrl);
            if (processed % 25 === 0 || processed === total) logProgress();
          } catch (err) {
            processed++;
            console.warn(`  WARN job [${(err as { code?: string }).code ?? 'ERR'}]: ${(err as Error).message}`);
            rebuilt.set(`${job.field}:${job.arrayIndex}:src`, job.originalUrl);
            if (processed % 25 === 0 || processed === total) logProgress();
          }
        }),
      );
    }
  }

  console.log(`Workers=${WORKERS}, batch=${BATCH}, urls_a_transferir=${total}`);
  await Promise.all(Array.from({ length: WORKERS }, () => worker()));

  for (const { record, field, isJson } of tasks) {
    const raw = record[field];
    if (!raw) continue;
    if (isJson) {
      const arr = raw as unknown[];
      if (!Array.isArray(arr)) continue;
      const next: string[] = [];
      for (let i = 0; i < arr.length; i++) {
        const u = arr[i];
        if (typeof u !== 'string') {
          next.push(typeof u === 'undefined' ? '' : String(u));
          continue;
        }
        const sourceResult = rebuilt.get(`${field}:${i}:src`);
        if (sourceResult !== undefined) {
          next.push(sourceResult);
          continue;
        }
        const extKeep = rebuilt.get(`${field}:${i}:extKeep`);
        next.push(extKeep ?? u);
      }
      record[field] = next;
    } else {
      const srcRes = rebuilt.get(`${field}:0:src`);
      const extKeep = rebuilt.get(`${field}:0:extKeep`);
      const u = raw as string;
      record[field] = srcRes ?? extKeep ?? u;
    }
  }

  fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2));
  console.log(`Storage: ${uploaded} transferidos, ${skippedExternal} externas sin tocar, ${skippedMissing} faltantes en source (URL intacta).`);
}

async function loadPhase(): Promise<void> {
  const tgt = buildTargetConfig();
  console.log('--- LOAD: backup -> target DB ---');
  if (!fs.existsSync(BACKUP_FILE)) {
    throw new Error(`No existe ${BACKUP_FILE}. Corre --extract primero.`);
  }
  const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8')) as BackupData;
  const prisma = createTargetPrisma(tgt.databaseUrl);
  try {
    console.log('Limpiando tablas target (orden inverso a FK)...');
    await prisma.egresos.deleteMany();
    await prisma.whatsAppAlbumBuffer.deleteMany();
    await prisma.processedMessage.deleteMany();
    await prisma.whatsAppSession.deleteMany();
    await prisma.businessBankData.deleteMany();
    await prisma.businessData.deleteMany();
    await prisma.fAQ.deleteMany();
    await prisma.orderItems.deleteMany();
    await prisma.orders.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.sales.deleteMany();
    await prisma.products.deleteMany();
    await prisma.categories.deleteMany();
    await prisma.egresosCategories.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.user.deleteMany();

    console.log('Insertando datos (secuencial, FK-safe)...');
    const chunks = <T>(arr: T[], size: number): T[][] => {
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };
    type InsertPlan = { name: string; rows: Array<Record<string, unknown>>; run: (rows: Array<Record<string, unknown>>) => Promise<unknown> };
    const plans: InsertPlan[] = [
      { name: 'User', rows: (backup.users as Array<Record<string, unknown>>) ?? [], run: (r) => prisma.user.createMany({ data: r as never }) },
      { name: 'PasswordResetToken', rows: (backup.passwordResetTokens as Array<Record<string, unknown>>) ?? [], run: (r) => prisma.passwordResetToken.createMany({ data: r as never }) },
      { name: 'Categories', rows: (backup.categories as Array<Record<string, unknown>>) ?? [], run: (r) => prisma.categories.createMany({ data: r as never }) },
      { name: 'EgresosCategories', rows: (backup.egresosCategories as Array<Record<string, unknown>>) ?? [], run: (r) => prisma.egresosCategories.createMany({ data: r as never }) },
      { name: 'Products', rows: (backup.products as Array<Record<string, unknown>>) ?? [], run: (r) => prisma.products.createMany({ data: r as never }) },
      { name: 'Sales', rows: (backup.sales as Array<Record<string, unknown>>) ?? [], run: (r) => prisma.sales.createMany({ data: r as never }) },
      { name: 'Cart', rows: (backup.cart as Array<Record<string, unknown>>) ?? [], run: (r) => prisma.cart.createMany({ data: r as never }) },
      { name: 'OrderItems', rows: (backup.orderItems as Array<Record<string, unknown>>) ?? [], run: (r) => prisma.orderItems.createMany({ data: r as never }) },
      { name: 'Orders', rows: (backup.orders as Array<Record<string, unknown>>) ?? [], run: (r) => prisma.orders.createMany({ data: r as never }) },
      { name: 'FAQ', rows: (backup.faq as Array<Record<string, unknown>>) ?? [], run: (r) => prisma.fAQ.createMany({ data: r as never }) },
      { name: 'WhatsAppSession', rows: (backup.whatsAppSessions as Array<Record<string, unknown>>) ?? [], run: (r) => prisma.whatsAppSession.createMany({ data: r as never }) },
      { name: 'ProcessedMessage', rows: (backup.processedMessages as Array<Record<string, unknown>>) ?? [], run: (r) => prisma.processedMessage.createMany({ data: r as never }) },
      { name: 'WhatsAppAlbumBuffer', rows: (backup.whatsAppAlbumBuffer as Array<Record<string, unknown>>) ?? [], run: (r) => prisma.whatsAppAlbumBuffer.createMany({ data: r as never }) },
      { name: 'Egresos', rows: (backup.egresos as Array<Record<string, unknown>>) ?? [], run: (r) => prisma.egresos.createMany({ data: r as never }) },
    ];
    for (const plan of plans) {
      const total = plan.rows.length;
      if (total === 0) continue;
      let inserted = 0;
      for (const c of chunks(plan.rows, 500)) {
        await plan.run(c);
        inserted += c.length;
        console.log(`  ${plan.name}: ${inserted}/${total}`);
      }
    }

    const businesses = (backup.businessData as Array<Record<string, unknown>>) ?? [];
    const banks = (backup.businessBankData as Array<Record<string, unknown>>) ?? [];
    for (const b of businesses) {
      const bid = b.id as string;
      const own = banks.filter((row) => row.businessId === bid).map(({ businessId: _bid, ...rest }) => rest);
      await prisma.businessData.create({
        data: { ...b, ...(own.length ? { bankData: { create: own as never } } : {}) },
      });
    }

    console.log('Migrando M2M Sales <-> Products...');
    await migrateM2M();

    console.log('Reseteando sequences de columnas autoincrement...');
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), (SELECT MAX("id") FROM "User"))`);
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Cart"', 'id'), (SELECT MAX("id") FROM "Cart"))`);

    console.log('Load completo.');
  } finally {
    await prisma.$disconnect();
  }
}

async function migrateM2M(): Promise<void> {
  const src = buildSourceConfig();
  const tgt = buildTargetConfig();
  const srcPool = new Pool({ connectionString: src.databaseUrl });
  const tgtPool = new Pool({ connectionString: tgt.databaseUrl });
  try {
    const colsRes = await srcPool.query<{ column_name: string; ordinal_position: number }>(
      `SELECT column_name, ordinal_position FROM information_schema.columns
       WHERE table_schema='public' AND table_name='_ProductsToSales'
       ORDER BY ordinal_position`,
    );
    if (colsRes.rowCount !== 2) {
      console.log(`M2M _ProductsToSales no encontrada o tiene ${colsRes.rowCount} columnas. Saltando.`);
      return;
    }
    const colAName = colsRes.rows[0]!.column_name;
    const colBName = colsRes.rows[1]!.column_name;
    const quoted = `"${colAName}", "${colBName}"`;
    const dataRes = await srcPool.query<unknown[][]>({
      text: `SELECT "${colAName}", "${colBName}" FROM "_ProductsToSales" WHERE "${colAName}" IS NOT NULL AND "${colBName}" IS NOT NULL`,
      values: [],
      rowMode: 'array',
    });
    const totalRows = dataRes.rowCount ?? dataRes.rows.length;
    if (!totalRows) {
      console.log('M2M sin filas no-nulas. Saltando.');
      return;
    }
    const client = await tgtPool.connect();
    try {
      const BATCH = 1000;
      let copied = 0;
      for (let off = 0; off < dataRes.rows.length; off += BATCH) {
        const batch = dataRes.rows.slice(off, off + BATCH);
        const placeholders: string[] = [];
        const values: unknown[] = [];
        let p = 1;
        for (const pair of batch) {
          placeholders.push(`($${p++}, $${p++})`);
          values.push(pair[0], pair[1]);
        }
        await client.query(
          `INSERT INTO "_ProductsToSales"(${quoted}) VALUES ${placeholders.join(', ')} ON CONFLICT DO NOTHING`,
          values,
        );
        copied += batch.length;
      }
      console.log(`M2M: ${copied} filas copiadas.`);
    } finally {
      client.release();
    }
  } finally {
    await srcPool.end();
    await tgtPool.end();
  }
}

async function verifyPhase(): Promise<void> {
  const src = buildSourceConfig();
  const tgt = buildTargetConfig();
  console.log('--- VERIFY: source vs target counts ---');
  if (!fs.existsSync(BACKUP_FILE)) throw new Error(`No existe ${BACKUP_FILE}.`);
  const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8')) as BackupData;
  const ps = createSourcePrisma(src.databaseUrl);
  const pt = createTargetPrisma(tgt.databaseUrl);
  try {
    const tables = [
      ['users', () => ps.user.count(), () => pt.user.count()],
      ['categories', () => ps.categories.count(), () => pt.categories.count()],
      ['products', () => ps.products.count(), () => pt.products.count()],
      ['sales', () => ps.sales.count(), () => pt.sales.count()],
      ['orders', () => ps.orders.count(), () => pt.orders.count()],
      ['cart', () => ps.cart.count(), () => pt.cart.count()],
      ['egresos', () => ps.egresos.count(), () => pt.egresos.count()],
    ] as const;
    const results = await Promise.all(
      tables.map(async ([name, fs2, ft]) => {
        const [s, t] = await Promise.all([fs2(), ft()]);
        return { name, source: s, target: t, ok: s === t };
      }),
    );
    let allOk = true;
    for (const r of results) {
      console.log(`  ${r.ok ? 'OK ' : 'FAIL'} ${r.name}: source=${r.source} target=${r.target}`);
      if (!r.ok) allOk = false;
    }
    const backupTotals = (backup.sales as Array<{ total: unknown }> | undefined)?.reduce<Record<string, number>>(
      (acc, _row) => {
        const v = (_row.total as unknown as string | number);
        acc.sum += Number(v);
        return acc;
      },
      { sum: 0 },
    );
    const targetTotals = await pt.sales.aggregate({ _sum: { total: true } });
    console.log(`  Sales.total sum: backup=${backupTotals?.sum} target=${targetTotals._sum.total}`);
    if (allOk) {
      console.log('VERIFY: OK');
    } else {
      console.log('VERIFY: FAIL');
      process.exit(2);
    }
  } finally {
    await ps.$disconnect();
    await pt.$disconnect();
  }
}

async function runAll(): Promise<void> {
  await extractPhase();
  await storagePhase();
  await loadPhase();
  await verifyPhase();
}

function help(): void {
  console.log(`
Uso: ts-node scripts/migrate-bootstrap.ts <fase>

Fases:
  --extract   Source DB read-only -> backup JSON
  --storage   Source MinIO -> Target MinIO + rewrite URLs en backup
  --load      Backup -> Target DB (resetea tablas y sequences)
  --verify    Source counts vs Target counts
  --all       extract + storage + load + verify

Variables de entorno requeridas (TARGET, ya en uso del sistema):
  DATABASE_URL, MINIO_ENDPOINT, MINIO_PORT, MINIO_USE_SSL,
  MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET

Variables de entorno requeridas (SOURCE, nuevas):
  SOURCE_DATABASE_URL, SOURCE_DATABASE_RO=true,
  SOURCE_MINIO_ENDPOINT, SOURCE_MINIO_PORT, SOURCE_MINIO_USE_SSL,
  SOURCE_MINIO_ACCESS_KEY, SOURCE_MINIO_SECRET_KEY, SOURCE_MINIO_BUCKET
`);
}

async function main(): Promise<void> {
  const mode = process.argv[2];
  try {
    switch (mode) {
      case '--extract':
        await extractPhase();
        break;
      case '--storage':
        await storagePhase();
        break;
      case '--load':
        await loadPhase();
        break;
      case '--verify':
        await verifyPhase();
        break;
      case '--all':
        await runAll();
        break;
      default:
        help();
    }
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
}

main();
