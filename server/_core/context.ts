import { CreateExpressContextOptions } from '@trpc/server/adapters/express';

export async function createContext({ req, res }: CreateExpressContextOptions) {
  // Autenticação simplificada (pode expandir depois)
  const user = { id: 'default', name: 'Usuário' };
  
  return {
    req,
    res,
    user,
  };
}