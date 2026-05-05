// URL base da API do backend
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// URL do servidor OAuth (desabilitado se não definido)
const OAUTH_SERVER = import.meta.env.OAUTH_SERVER_URL || '';

// Função para obter a URL de login
export function getLoginUrl() {
  try {
    // Se não houver servidor OAuth, retorna uma URL padrão
    if (!OAUTH_SERVER) {
      console.warn('OAUTH_SERVER_URL não definida – autenticação desabilitada');
      return `${API_URL}/auth/login`;
    }
    const url = new URL('/oauth/authorize', OAUTH_SERVER);
    url.searchParams.set('client_id', import.meta.env.VITE_APP_ID || 'stoll-ia');
    url.searchParams.set('redirect_uri', window.location.origin + '/callback');
    url.searchParams.set('response_type', 'code');
    return url.toString();
  } catch (e) {
    console.error('Erro ao construir URL de login:', e);
    return `${API_URL}/auth/login`;
  }
}