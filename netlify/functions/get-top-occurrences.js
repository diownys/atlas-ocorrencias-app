// netlify/functions/get-top-occurrences.js

// Importa o SDK de Admin do Firebase
const admin = require('firebase-admin');

/* ==========================================================================
   CORS – lista branca de origens permitidas
   Ajuste conforme seus domínios reais (produção e dev)
   ========================================================================== */
const ALLOWED_ORIGINS = new Set([
  'https://sistema-envios-nuvem.pages.dev', // Cloudflare Pages (prod)
  'http://localhost:5173',                  // Vite (dev)
  'http://localhost:3000',                  // Outra porta comum (dev)
]);

function makeCorsHeaders(origin) {
  // Se quiser liberar geral, troque para: const allowOrigin = '*';
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://sistema-envios-nuvem.pages.dev';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8',
  };
}

/* ==========================================================================
   "CÉREBRO" de categorias
   ========================================================================== */
const categories = {
  'Erro de Endereço': ['endereço', 'incorreto', 'incorreta', 'endereco errado'],
  'Falha de Transporte/Logística': [
    'transportadora', 'expedição', 'envio',
    'coleta', 'entregue', 'chegou', 'extravio', 'extraviado',
  ],
  'Falha de Processo (Janela/Horário)': [
    'janela', 'horário', 'atraso na emissão', 'fora do horario',
  ],
  'Problema Técnico Interno': [
    'conexão', 'internet', 'imprimir',
    'sistema', 'impressora', 'não consigo acessar', 'erp',
  ],
  'Irregularidade Fiscal/Documental': [
    'receita', 'contrato', 'irregularidade',
    'sefaz', 'retido', 'nota fiscal', 'nf',
  ],
  'Avaria ou Problema no Produto': [
    'avaria', 'danificado', 'quebrado', 'medicamento', 'laboratório',
  ],
  'Erro de Separação/Conferência': [
    'conferência', 'separado errado',
    'item errado', 'item faltante', 'trocado',
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

/* ==========================================================================
   Firebase Admin – inicialização
   ========================================================================== */
if (!admin.apps.length) {
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey    = process.env.FIREBASE_PRIVATE_KEY || '';

  // Netlify costuma armazenar com \n escapado
  privateKey = privateKey.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

const db = admin.firestore();

/* ==========================================================================
   Handler principal (Netlify)
   ========================================================================== */
exports.handler = async (event /*, context */) => {
  const origin = event.headers?.origin || '';
  const cors = makeCorsHeaders(origin);

  // 1) Pré-flight CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  // 2) Apenas GET é permitido
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: cors,
      body: JSON.stringify({ error: 'Método não permitido.' }),
    };
  }

  try {
    // 3) Coleta todas as ocorrências (pense em filtrar por data para performance)
    const snapshot = await db.collection('occurrences').get();
    const all = [];
    snapshot.forEach((doc) => all.push({ id: doc.id, ...doc.data() }));

    // 4) Conta por categoria e tipo (internas/externas via booleano 'externa')
    const counts = { internas: {}, externas: {} };
    for (const occ of all) {
      if (!occ.actionDescription) continue;

      const category = categorizeOccurrence(occ.actionDescription);
      const type = occ.externa === true ? 'externas' : 'internas';
      counts[type][category] = (counts[type][category] || 0) + 1;
    }

    const toTop3 = (obj) =>
      Object.entries(obj)
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

    const payload = {
      internas: toTop3(counts.internas),
      externas: toTop3(counts.externas),
    };

    return { statusCode: 200, headers: cors, body: JSON.stringify(payload) };
  } catch (error) {
    console.error('Erro ao processar ocorrências:', error);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'Erro interno no servidor.' }),
    };
  }
};
