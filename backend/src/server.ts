import 'dotenv/config';
import { exec } from 'child_process';
import '@/config/dayjs';
import express from 'express';
import cors from 'cors';
import { validateEnvironmentVariables } from '@/config/env';
import { prisma } from '@/config/prisma';
import { pingRedis } from '@/config/redis';
import UserRouter from '@/modules/User/routes';
import AdminAuthRouter from '@/modules/AuthAdmin/routes';
import ShopAuthRouter from '@/modules/AuthShop/routes';
import ProductRouter from '@/modules/Products/routes';
import SalesRouter from '@/modules/Sales/routes';
import CartRouter from '@/modules/Cart/routes';
import OrdersRouter from '@/modules/Orders/routes';
import ProfileRouter from '@/modules/Profile/routes';
import BusinessRouter from '@/modules/Business/router';
import FaqRouter from '@/modules/FAQ/routes';
import PaletteRouter from '@/modules/Palettes/routes';
import WhatsAppRouter from '@/modules/WhatsApp/routes';
import TenantRouter from '@/modules/Tenant/routes';
import { initUploadsCleanupJob } from './jobs/cleanupUploads';
import swaggerUi from 'swagger-ui-express';
import spec from './docs/openapi';
import morgan from 'morgan';
import { initProductsCacheSyncJob } from './jobs/productsCacheSync';
import path from 'path';
import fs from 'fs';

validateEnvironmentVariables();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : isProduction
  ? [] 
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174'];

console.log(`🔒 CORS configurado - Producción: ${isProduction}, Orígenes permitidos: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : '(ninguno configurado)'}`);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    
    if (isProduction && allowedOrigins.length === 0) {
      console.warn(`⚠️ CORS: Rechazando origen ${origin} - ALLOWED_ORIGINS no configurado`);
      return callback(new Error('CORS: ALLOWED_ORIGINS debe configurarse en producción'));
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (!isProduction) {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS: Origen no permitido en desarrollo: ${origin}`);
        callback(new Error('CORS: Origen no permitido'));
      }
    } else {
      console.warn(`⚠️ CORS: Origen no permitido: ${origin}. Permitidos: ${allowedOrigins.join(', ')}`);
      callback(new Error('CORS: Origen no permitido'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-slug', 'x-tenant-id'],
}));

app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: {
    write: (msg) => console.log(msg.trim()),
  },
}));


app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const pong = await pingRedis();
    res.json({ ok: true, db: 'connected', redis: pong === 'PONG' ? 'connected' : 'unknown' });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'health_check_failed' });
  }
});

app.use('/api/tenant', TenantRouter);
app.use('/api/admin', AdminAuthRouter);
app.use('/api/shop', ShopAuthRouter);
app.use('/api', UserRouter);
app.use('/api', ProfileRouter);
app.use('/api/faqs', FaqRouter);
app.use("/api/products", ProductRouter)
app.use("/api/sales", SalesRouter)
app.use("/api/cart", CartRouter)
app.use("/api/orders", OrdersRouter)
app.use("/api/business", BusinessRouter)
app.use("/api", PaletteRouter)
app.use("/api/whatsapp", WhatsAppRouter)


app.get(/^\/api\/storage\/([^\/]+)\/(.+)$/, async (req, res) => {
  try {
    const matches = req.url.match(/^\/api\/storage\/([^\/]+)\/(.+)$/);
    if (!matches) {
      return res.status(400).json({ ok: false, error: 'invalid_path' });
    }
    const bucket = matches[1];
    const filePath = matches[2];
    
    if (!bucket || !filePath) {
      return res.status(400).json({ ok: false, error: 'invalid_path' });
    }

    if (filePath.includes('..') || bucket.includes('..')) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }

    const fullPath = path.join(process.cwd(), 'uploads', 'storage', bucket, filePath);
    
    try {
      await fs.promises.access(fullPath);
    } catch {
      return res.status(404).json({ ok: false, error: 'file_not_found' });
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
    };
    const contentType = contentTypes[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error sirviendo archivo local:', error);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
app.get('/docs.json', (_req, res) => res.json(spec));


app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error no manejado:', err);
  
  
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ ok: false, error: 'cors_error', message: err.message });
  }
  
  
  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    return res.status(400).json({ ok: false, error: 'validation_error', message: err.message });
  }
  
  
  if (err.status === 401 || err.name === 'UnauthorizedError') {
    return res.status(401).json({ ok: false, error: 'unauthorized', message: err.message });
  }
  
  
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Error interno del servidor' 
    : err.message;
  
  res.status(status).json({ 
    ok: false, 
    error: 'internal_error',
    message 
  });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  
  if(process.env.NODE_ENV === "production"){
    exec('npx prisma migrate deploy', (error, stdout, stderr) => {
      if (error) {
        console.error(`Migration error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`Migration info: ${stderr}`);
      }
      console.log(`Migration result: ${stdout}`);
    });
  }

  initUploadsCleanupJob();
  initProductsCacheSyncJob();
  
  
  import('./modules/WhatsApp/services/whatsapp.services').then(({ whatsAppServices }) => {
    whatsAppServices.startTimeoutWorker();
  }).catch(err => {
    console.error('Error iniciando worker de timeout de WhatsApp:', err);
  });
});
