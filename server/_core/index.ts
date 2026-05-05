import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { initDatabase } from '../db';
import { appRouter } from '../routers';
import { createContext } from './context';
import { env } from './env';
import path from 'path';
import fs from 'fs';
import executeRouter from '../routes/execute';

// ============ INICIALIZAÇÃO DO BANCO ============
async function start() {
  console.log('🚀 Iniciando STOLL...');

  // Inicializa o banco SQLite (sql.js)
  await initDatabase();
  console.log('📦 Banco de dados pronto');

  // ============ SERVIDOR EXPRESS ============
  const app = express();

  // Middlewares
  app.use(cors({
    origin: env.NODE_ENV === 'development'
      ? 'http://localhost:5173'
      : true,
    credentials: true,
  }));
  app.use(express.json());

  // ============ tRPC ============
  app.use(
    '/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  app.use('/execute', executeRouter);

  // ============ SERVE FRONTEND ============
  const clientDistPath = path.join(process.cwd(), 'client', 'dist');

  if (env.NODE_ENV === 'development') {
    // Em desenvolvimento, o Vite cuida do frontend
    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>STOLL - Agente Autônomo</title>
          <link rel="icon" type="image/svg+xml" href="/vite.svg" />
        </head>
        <body>
          <div id="root"></div>
          <script type="module" src="http://localhost:5173/@vite/client"></script>
          <script type="module" src="http://localhost:5173/src/main.tsx"></script>
        </body>
        </html>
      `);
    });
  } else {
    // Em produção, serve os arquivos estáticos do build
    if (fs.existsSync(clientDistPath)) {
      app.use(express.static(clientDistPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(clientDistPath, 'index.html'));
      });
    } else {
      app.get('/', (req, res) => {
        res.send('STOLL Backend - Frontend não compilado. Execute pnpm build primeiro.');
      });
    }
  }

  // ============ INICIAR ============
  const port = env.PORT || 3000;
  app.listen(port, () => {
    console.log(`
╔══════════════════════════════════════════╗
║        🤖 STOLL - Agente Autônomo       ║
╠══════════════════════════════════════════╣
║  Porta: ${String(port).padEnd(30)}║
║  LLM:   ${(env.LLM_PROVIDER || 'ollama').padEnd(30)}║
║  Banco: SQLite (sql.js)                 ║
║  URL:   http://localhost:${port}              ║
╚══════════════════════════════════════════╝
✅ STOLL pronto!
    `);
  });
}

// ============ TRATAMENTO DE ERROS ============
process.on('uncaughtException', (err) => {
  console.error('❌ Erro não tratado:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('❌ Promise rejeitada não tratada:', reason?.message || reason);
});

// ============ INICIAR ============
start().catch((err) => {
  console.error('❌ Falha ao iniciar o servidor:', err.message);
  console.error(err.stack);
  process.exit(1);
});