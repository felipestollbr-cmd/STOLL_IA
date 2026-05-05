import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Autenticação desabilitada — usuário fixo (local)
    setUser({
      id: 'default',
      name: 'Desenvolvedor',
      email: 'dev@localhost',
    });
    setLoading(false);
  }, []);

  const logout = () => {
    setUser(null);
  };

  const isAuthenticated = !!user;

  return { user, loading, error, logout, isAuthenticated };
}