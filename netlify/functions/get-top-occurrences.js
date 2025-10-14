// netlify/functions/get-top-occurrences.js

// 1) Firebase Admin
const admin = require('firebase-admin');

// 2) CORS (lista branca) — ajuste conforme seus domínios
const ALLOWED_ORIGINS = new Set([
  'https://sistema-envios-nuvem.pages.dev', // Cloudflare Pages (prod)
  'http://localhost:5173',
  'http://localhost:3000',
]);

function makeCorsHeaders(origin) {
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://sistema-envios-nuvem.pages.dev';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store', // evita cache de função
  };
}

// 3) Categorias
const categories = {
  'Erro de Endereço': ['endereço', 'incorreto', 'incorreta', 'endereco errado'],
  'Falha de Transporte/Logística': [
    'transportadora', 'expedição', 'envio', 'coleta',
    'entregue', 'chegou', 'extravio', 'extraviado',
  ],
  'Falha de Processo (Janela/Horário)': [
    'janela', 'horário', 'atraso na emissão', 'fora do horario',
  ],
  'Problema Técnico Interno': [
    'conexão', 'internet', 'imprimir', 'sistema', 'impressora', 'não consigo acessar', 'erp',
  ],
  'Irregularidade Fiscal/Documental': [
    'receita', 'contrato', 'irregularidade', 'sefaz', 'retido', 'nota fiscal', 'nf',
  ],
  'Avaria ou Problema no Produto': [
    'avaria', 'danificado', 'quebrado', 'medicamento', 'laboratório',
  ],
  'Erro de Separação/Conferência': [
    'conferência', 'separado errado', 'item errado', 'item faltante', 'trocado',
  ],
};

function categorizeOccurrence(description = '') {
  const txt = String(description || '').toLowerCase();
  for (const [category, list] of Object.entries(categories)) {
    for (const keyword of list) {
      if (txt.includes(keyword)) return category;
    }
  }
  return 'Outros';
}

// 4) Inicialização do Admin SDK (com guards)
(function initFirebase() {
  try {
    if (!admin.apps.length) {
      const projectId   = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey    = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        console.error('[FIREBASE_ENV] Variáveis ausentes:', {
          hasProjectId: !!projectId,
          hasClientEmail: !!clientEmail,
          hasPrivateKey: !!privateKey,
        });
        throw new Error('Variáveis do Firebase ausentes (verifique as ENV no Netlify).');
      }

      privateKey = privateKey.replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
      console.log('[FIREBASE] Admin inicializado com sucesso');
    }
  } catch (e) {
    console.error('[FIREBASE_INIT_ERROR]', e);
  }
})();

const db = admin.firestore();

// 5) Handler da função
exports.handler = async (event) => {
  const origin = event.headers?.origin || '';
  const headers = makeCorsHeaders(origin);

  // Pré-flight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido.' }) };
  }

  try {
    // 🔎 Diagnóstico rápido das ENV em runtime
    if (!admin.apps.length) {
      throw new Error('Firebase Admin não inicializado. Cheque FIREBASE_* nas ENV.');
    }

    // ⚡️ PERF: evite buscar tudo. Se tiver timestamp, filtre/limite:
    // Exemplo: últimos 90 dias (ajuste o campo conforme seu schema: createdAt/created_at)
    // const since = Date.now() - 1000 * 60 * 60 * 24 * 90;
    // const snapshot = await db.collection('occurrences')
    //   .where('createdAt', '>=', new Date(since)) // ou 'created_at'
    //   .orderBy('createdAt', 'desc')
    //   .limit(2000)
    //   .get();

    const snapshot = await db.collection('occurrences').get();

    console.log('[OCC] Total docs:', snapshot.size);

    const counts = { internas: {}, externas: {} };

    snapshot.forEach((doc) => {
      const data = doc.data() || {};
      const desc = data.actionDescription;
      if (!desc) return;

      const category = categorizeOccurrence(desc);
      const type = data.externa === true ? 'externas' : 'internas';
      counts[type][category] = (counts[type][category] || 0) + 1;
    });

    const toTop3 = (obj) =>
      Object.entries(obj)
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

    const payload = {
      internas: toTop3(counts.internas),
      externas: toTop3(counts.externas),
    };

    console.log('[OCC] Top3 internas:', payload.internas);
    console.log('[OCC] Top3 externas:', payload.externas);

    return { statusCode: 200, headers, body: JSON.stringify(payload) };
  } catch (error) {
    console.error('[OCC_ERROR]', error?.message || error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro interno no servidor.' }), // evite expor detalhes sensíveis
    };
  }
};
