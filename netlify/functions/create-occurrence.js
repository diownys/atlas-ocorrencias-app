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

  // Apenas permitir pedidos do tipo POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido. Utilize POST.' }) };
  }

  try {
    const data = JSON.parse(event.body);
    if (!data.description) {
      return { statusCode: 400, body: JSON.stringify({ error: 'O campo "description" é obrigatório.' }) };
    }

    const newOccurrence = {
      date: new Date().toISOString().split('T')[0],
      saleId: data.saleId || 'N/D',
      description: data.description,
      category: data.category || 'SLA',
      status: 'Aberta',
      externa: data.externa || false,
      detectionArea: 'Sistema Automático',
      originArea: 'Expedição',
      salesperson: 'N/D',
      immediateAction: 'Registo automático por violação de SLA.',
      actionDescription: '',
    };

    const docRef = await db.collection('occurrences').add(newOccurrence);

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, id: docRef.id }),
    };
  } catch (error) {
    console.error('Erro ao criar ocorrência:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erro interno no servidor.' }) };
  }
};