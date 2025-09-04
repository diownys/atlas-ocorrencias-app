// Importa o SDK de Admin do Firebase
const admin = require('firebase-admin');

// Inicializa a aplicação Firebase Admin, se ainda não foi inicializada.
// Ele lê as credenciais automaticamente das variáveis de ambiente da Netlify.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const db = admin.firestore();

// A função principal que será executada pela Netlify
exports.handler = async (event, context) => {
  // Verificação de Segurança (Chave de API)
  if (event.headers['x-api-key'] !== process.env.API_SECRET_KEY) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Acesso não autorizado.' }) };
  }

  // Apenas permitir pedidos do tipo GET
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido.' }) };
  }

  try {
    const occurrencesRef = db.collection('occurrences');
    const snapshot = await occurrencesRef.get();
    const occurrences = [];
    snapshot.forEach(doc => {
      occurrences.push({ id: doc.id, ...doc.data() });
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(occurrences),
    };
  } catch (error) {
    console.error('Erro ao buscar ocorrências:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erro interno no servidor.' }) };
  }
};
