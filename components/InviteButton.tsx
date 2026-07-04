'use client';

import { useState } from 'react';

export default function InviteButton() {
  const [label, setLabel] = useState('👥 Convidar amigos');

  const invite = async () => {
    const url = window.location.origin;
    const text = 'Entra no nosso Bolão da Copa 2026! ⚽🏆';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Bolão da Copa 2026', text, url });
        return;
      }
    } catch { /* usuário cancelou o compartilhamento */ }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setLabel('✅ Link copiado!');
      setTimeout(() => setLabel('👥 Convidar amigos'), 2500);
    } catch {
      prompt('Copie o link do bolão:', url);
    }
  };

  return (
    <button className="invite-btn" onClick={invite}>{label}</button>
  );
}
