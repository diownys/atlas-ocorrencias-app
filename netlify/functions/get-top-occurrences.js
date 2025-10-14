const admin = require('firebase-admin');

// ---------- CORS ----------
const ALLOWED_ORIGINS = new Set([
  'https://sistema-envios-nuvem.pages.dev',
  'http://localhost:5173',
  'http://localhost:3000',
]);
const cors = (origin) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://sistema-envios-nuvem.pages.dev',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json; charset=utf-8',
  // Cache 2min no Edge para reduzir chamadas repetidas
  'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
});

// ---------- Categorização ----------
const categories = {
  'Erro de Endereço': ['endereço','incorreto','incorreta','endereco errado'],
  'Falha de Transporte/Logística': ['transportadora','expedição','envio','coleta','entregue','chegou','extravio','extraviado'],
  'Falha de Processo (Janela/Horário)': ['janela','horário','atraso na emissão','fora do horario'],
  'Problema Técnico Interno': ['conexão','internet','imprimir','sistema','impressora','não consigo acessar','erp'],
  'Irregularidade Fiscal/Documental': ['receita','contrato','irregularidade','sefaz','retido','nota fiscal','nf'],
  'Avaria ou Problema no Produto': ['avaria','danificado','quebrado','medicamento','laboratório'],
  'Erro de Separação/Conferência': ['conferência','separado errado','item errado','item faltante','trocado'],
};
function categorize(txt='') {
  const t = String(txt || '').toLowerCase();
  for (const [cat, list] of Object.entries(categories)) {
    for (const k of list) if (t.includes(k)) return cat;
  }
  return 'Outros';
}

// ---------- Firebase Admin ----------
if (!admin.apps.length) {
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey    = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) {
    console.error('[FIREBASE_ENV] faltando variáveis', { hasProjectId: !!projectId, hasClientEmail: !!clientEmail, hasPrivateKey: !!privateKey });
    throw new Error('ENV do Firebase ausentes.');
  }
  privateKey = privateKey.replace(/\\n/g, '\n');
  admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
  console.log('[FIREBASE] Admin inicializado');
}
const db = admin.firestore();

// ---------- Handler ----------
exports.handler = async (event) => {
  const headers = cors(event.headers?.origin || '');

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET')  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido.' }) };

  try {
    // Ajuste o nome do campo de data conforme seu schema: 'createdAt' ou 'created_at'
    const DATE_FIELD = 'createdAt';   // <-- troque para 'created_at' se for o seu caso
    const DAYS = 90;                  // período analisado
    const LIMIT = 1000;               // teto de docs por chamada (protege quota)
    const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);

    let snap;
    try {
      // Projeção só dos campos necessários + filtro de período + limite
      snap = await db.collection('occurrences')
        .where(DATE_FIELD, '>=', since)
        .orderBy(DATE_FIELD, 'desc')
        .select('actionDescription', 'externa', DATE_FIELD)
        .limit(LIMIT)
        .get();
    } catch (e) {
      // Se faltar índice, caímos num fallback menos eficiente, mas seguro
      console.warn('[OCC_WARN] Query index missing ou erro -> usando fallback limitado:', e?.message || e);
      snap = await db.collection('occurrences')
        .select('actionDescription', 'externa')
        .limit(300)
        .get();
    }

    console.log('[OCC] Total lido:', snap.size);
    const counts = { internas: {}, externas: {} };
    let nullDesc = 0;

    snap.forEach(doc => {
      const d = doc.data() || {};
      const desc = d.actionDescription;
      if (!desc) { nullDesc++; return; }
      const cat = categorize(desc);
      const tipo = d.externa === true ? 'externas' : 'internas';
      counts[tipo][cat] = (counts[tipo][cat] || 0) + 1;
    });
    if (nullDesc) console.log('[OCC] Sem actionDescription:', nullDesc);

    const toTop3 = (obj) =>
      Object.entries(obj).map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

    const payload = { internas: toTop3(counts.internas), externas: toTop3(counts.externas) };
    console.log('[OCC] Top3 internas:', payload.internas);
    console.log('[OCC] Top3 externas:', payload.externas);

    return { statusCode: 200, headers, body: JSON.stringify(payload) };
  } catch (err) {
    console.error('[OCC_ERROR]', err?.message || err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno no servidor.' }) };
  }
};
