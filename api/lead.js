// Função do Vercel que recebe os leads da página, filtra robôs e envia o e-mail.
// A chave de envio fica guardada no Vercel (variável RESEND_API_KEY), nunca aparece na página.
//
// Variáveis no Vercel (Settings > Environment Variables):
//   RESEND_API_KEY  -> chave criada em resend.com (obrigatória)
//   LEAD_EMAIL      -> e-mail que recebe os leads (opcional; padrão abaixo)

const crypto = require('crypto');

const SECRET = process.env.RESEND_API_KEY || '';
const TO = process.env.LEAD_EMAIL || 'daaguiar@gmail.com';
const DDDS = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));

const MIN_MS = 2000;            // ninguém preenche o formulário em menos de 2 s
const MAX_MS = 6 * 3600 * 1000; // ficha vale por 6 horas
const LIMITE = 3;               // no máximo 3 envios...
const JANELA = 10 * 60 * 1000;  // ...a cada 10 minutos por IP
const porIP = new Map();
const vistos = new Map();       // evita o mesmo número repetido

function assinar(t) {
  return crypto.createHmac('sha256', SECRET).update('lead:' + t).digest('hex').slice(0, 32);
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}
function limitar(map, chave, max, janela) {
  const agora = Date.now();
  const lista = (map.get(chave) || []).filter(function (x) { return agora - x < janela; });
  lista.push(agora);
  map.set(chave, lista);
  if (map.size > 5000) map.clear();
  return lista.length > max;
}

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');

  // 1) Ao abrir a página, ela pede uma "ficha" assinada com a hora.
  if (req.method === 'GET') {
    const t = Date.now();
    return res.status(200).json({ t: t, k: assinar(t), cfg: !!SECRET });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  // Para robôs, respondemos "ok" sem enviar nada (assim eles não aprendem o filtro).
  // No modo teste (?teste na página) devolvemos o motivo, para facilitar o diagnóstico.
  let b = req.body;
  try { if (typeof b === 'string') b = JSON.parse(b || '{}'); } catch (e) { b = {}; }
  b = b || {};
  const fingir = function (motivo, extra) {
    console.log('Lead não enviado:', motivo, extra || '');
    const r = { ok: true, sent: false };
    if (b.teste) { r.motivo = motivo; if (extra) r.detalhe = extra; }
    return res.status(200).json(r);
  };

  // 2) Precisa vir da própria página
  const origem = String(req.headers.origin || req.headers.referer || '');
  const host = String(req.headers.host || '');
  if (!host || origem.indexOf(host) === -1) return fingir('origem', origem + ' / ' + host);

  // 3) Campo invisível preenchido = robô
  if (b.empresa) return fingir('campo-invisivel');

  // 4) Ficha válida, nem rápida nem velha demais
  const t = Number(b.t);
  const idade = Date.now() - t;
  if (!SECRET) return fingir('RESEND_API_KEY não configurada no Vercel (ou falta Redeploy)');
  if (!t || b.k !== assinar(t)) return fingir('ficha inválida');
  if (idade < MIN_MS) return fingir('enviado rápido demais (' + idade + ' ms)');
  if (idade > MAX_MS) return fingir('ficha expirada');

  // 5) Nome e celular válidos
  const nome = String(b.nome || '').trim().slice(0, 80);
  const d = String(b.whatsapp || '').replace(/\D/g, '');
  if (nome.length < 2 || !/[a-zA-ZÀ-ú]/.test(nome)) return fingir('nome inválido');
  if (d.length !== 11 || !DDDS.has(d.slice(0, 2)) || d[2] !== '9' || /^(\d)\1+$/.test(d.slice(2))) return fingir('celular inválido');

  // 6) Limite por IP e por número
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'sem-ip';
  if (limitar(porIP, ip, LIMITE, JANELA)) return fingir('muitos envios deste IP');
  if (limitar(vistos, d, 2, 24 * 3600 * 1000)) return fingir('número repetido');

  // 7) Envia o e-mail
  const fone = '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  const com9 = 'https://wa.me/55' + d;
  const sem9 = 'https://wa.me/55' + d.slice(0, 2) + d.slice(3);
  const linha = function (k, v) { return '<tr><td style="padding:6px 12px 6px 0;color:#666"><b>' + esc(k) + '</b></td><td style="padding:6px 0">' + v + '</td></tr>'; };
  const html =
    '<h2 style="margin:0 0 12px;font-family:Arial">Novo lead · Masterclass Atendimento Mágico</h2>' +
    '<table style="font-family:Arial;font-size:15px;border-collapse:collapse">' +
    linha('Nome', esc(nome)) +
    linha('WhatsApp', esc(fone)) +
    linha('Abrir conversa', '<a href="' + com9 + '">' + com9 + '</a>') +
    linha('Se não abrir (sem o 9)', '<a href="' + sem9 + '">' + sem9 + '</a>') +
    linha('Data', esc(new Date().toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' }))) +
    linha('Origem', esc(b.utm_source) || '-') +
    linha('Campanha', esc(b.utm_campaign) || '-') +
    linha('Anúncio', esc(b.utm_content) || '-') +
    linha('IP', esc(ip)) +
    linha('Dispositivo', esc(String(req.headers['user-agent'] || '').slice(0, 160))) +
    '</table>';

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + SECRET, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Landing Page Masterclass <onboarding@resend.dev>',
        to: [TO],
        subject: 'Novo lead Masterclass: ' + nome,
        html: html
      })
    });
    if (!r.ok) {
      const txt = await r.text();
      console.error('Resend', r.status, txt);
      return res.status(200).json(b.teste ? { ok: false, sent: false, motivo: 'Resend recusou (' + r.status + ')', detalhe: txt.slice(0, 300) } : { ok: false, sent: false });
    }
    return res.status(200).json({ ok: true, sent: true });
  } catch (e) {
    console.error('Falha no envio', e);
    return res.status(200).json(b.teste ? { ok: false, sent: false, motivo: 'falha ao conectar no Resend', detalhe: String(e) } : { ok: false, sent: false });
  }
};
