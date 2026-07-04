'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BolaoState, fetchState } from './api';

/**
 * Carrega o estado do bolão e atualiza sozinho a cada 60 segundos —
 * é assim que todo mundo vê os placares e a classificação ao vivo.
 */
export function useBolao(pollMs = 60_000) {
  const [state, setState] = useState<BolaoState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await fetchState();
      setState(s);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    timer.current = setInterval(refresh, pollMs);
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (timer.current) clearInterval(timer.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh, pollMs]);

  return { state, error, loading, refresh };
}
