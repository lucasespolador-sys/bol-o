# ⚽ Bolão da Copa 2026 — em família!

Bolão do mata-mata da Copa do Mundo 2026 (das oitavas à final), com:

- 🔄 **Resultados automáticos** — sincroniza com a [World Cup 2026 API](https://worldcup26.ir) (gratuita, sem chave): a cada minuto durante os jogos, sempre que alguém abre o site e uma vez por dia via cron da Vercel
- 🏆 **Classificação ao vivo** — os pontos de todo mundo recalculados em tempo real
- 📝 **Quadro de palpites** — cada participante preenche seu chaveamento completo; os vencedores avançam automaticamente no quadro
- 👨‍👩‍👧‍👦 **Multiusuário** — cada pessoa se cadastra com nome + PIN; os palpites ficam guardados no banco (Postgres/Neon) e ficam visíveis para todos quando o mata-mata começa
- 🛠️ **Central do organizador** — pontuação configurável, resultados manuais, gestão de participantes

## Como pontua

**Em cada jogo** (multiplicado pelo peso da fase):

| Acerto | Pontos |
|---|---|
| 🎯 Cravou o placar | 10 |
| ✅ Vencedor + saldo de gols (ex.: apostou 2×0, deu 3×1) | 6 |
| ➖ Só quem passou | 3 |

**Peso por fase:** Oitavas ×1 · Quartas ×2 · Semi ×3 · 3º lugar ×2 · Final ×4.
Cravar o placar da final vale **40 pontos**.

**Bônus de chaveamento:**

| Acerto | Pontos |
|---|---|
| 🥈 Cada semifinalista certo | 8 |
| 🎖️ Cada finalista certo | 12 |
| 🥉 Acertar o 3º colocado | 8 |
| 🏆 Acertar o campeão | 25 |

Das **quartas em diante**, o placar só conta se você tinha previsto aquele confronto no seu
quadro. Nas **oitavas** conta para todo mundo (os 8 jogos já estão definidos). Todos os valores
podem ser alterados em **Central → Pontuação**.

> Regra do placar: vale o placar do jogo; em caso de empate, os pênaltis definem "quem passou".
> No palpite, se você apostar em empate, escolhe quem avança nos pênaltis.

## 🚀 Publicando na Vercel (passo a passo)

1. **Importe o projeto**: em [vercel.com/new](https://vercel.com/new), escolha este repositório
   (`lucasespolador-sys/bol-o`) e clique em **Deploy** (não precisa mudar nada).

2. **Conecte o banco de dados** (qualquer Postgres serve — as tabelas são criadas
   automaticamente pelo app no primeiro acesso, não precisa rodar SQL nenhum):

   **Opção A — Supabase** (se você já criou um projeto lá):
   no painel do Supabase, clique em **Connect** (topo da página) → aba
   **Connection String** → copie a URI do **Transaction pooler** (recomendada para
   Vercel; parece com `postgresql://postgres.xxxx:SENHA@aws-0-...pooler.supabase.com:6543/postgres`)
   e troque `[YOUR-PASSWORD]` pela senha do banco. Na Vercel, em
   **Settings → Environment Variables**, crie `POSTGRES_URL` com esse valor.
   A conexão direta (`db.xxxx.supabase.co:5432`) também funciona.

   **Opção B — Neon pela própria Vercel**: aba **Storage** → **Create Database** →
   **Neon (Postgres)** → **Connect Project**. As variáveis (`POSTGRES_URL` etc.)
   são adicionadas sozinhas.

3. **Defina a senha do organizador**: aba **Settings → Environment Variables**, adicione:
   - `ADMIN_PIN` = a senha que você vai usar na aba Central (ex.: `minhasenha123`)
   - `AUTH_SECRET` = qualquer texto longo e aleatório (ex.: cole o resultado de um gerador de senhas)

4. **Redeploy**: aba **Deployments** → menu do último deploy → **Redeploy** (para carregar
   o banco e as variáveis novas).

5. **Pronto!** Abra o site, vá em **Central**, entre com o `ADMIN_PIN` e clique em
   **Sincronizar agora** — os confrontos das oitavas aparecem na hora. Mande o link
   para a família se cadastrar em **Meus Palpites**. 🎉

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `POSTGRES_URL` | ✅ (automática) | Conexão do banco Neon/Postgres (criada pela integração da Vercel) |
| `ADMIN_PIN` | ✅ | Senha da aba Central (padrão inseguro: `copa2026` — troque!) |
| `AUTH_SECRET` | recomendada | Segredo para assinar os logins dos participantes |
| `WC_API_BASE` | opcional | Outra instância da World Cup 2026 API (padrão: `https://worldcup26.ir`) |

## Como funciona a atualização automática

- **Durante os jogos**: o site consulta a API no máximo 1×/minuto (disparado pelas visitas —
  a página de classificação se atualiza sozinha a cada 60 s).
- **Fora dos jogos**: sincroniza a cada 30 min quando alguém visita, para pegar horários e
  o chaveamento das próximas fases.
- **Cron da Vercel**: uma sincronização garantida por dia (`vercel.json`), mesmo sem visitas.
- **Plano B**: se a API cair, o organizador lança os resultados manualmente em
  **Central → Resultados** — a pontuação recalcula na hora.

## Desenvolvimento local

```bash
npm install
cp .env.example .env.local   # preencha POSTGRES_URL com um banco Neon/Postgres
npm run dev                  # http://localhost:3000
npm test                     # testes do motor de pontuação
```

## Estrutura

```
lib/types.ts      # fases, slots do chaveamento, regras padrão
lib/scoring.ts    # motor de pontuação (puro, testado)
lib/sync.ts       # sincronização com a World Cup 2026 API
lib/db.ts         # Postgres (Neon) — cria as tabelas sozinho
app/              # páginas: Classificação, Meus Palpites, Jogos, Central
app/api/          # rotas: auth, state, predictions, sync, admin
tests/            # testes do motor de pontuação
```

Dados de jogos por cortesia da [World Cup 2026 API](https://github.com/lucasespolador-sys/worldcup2026) (open source).
