// Importa o SDK de Admin do Firebase
const admin = require('firebase-admin');

// Inicializa a aplicação Firebase Admin, se ainda não foi inicializada.
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
  // 1. Verificação de Segurança (Chave de API)
  const providedApiKey = event.headers['x-api-key'];
  if (providedApiKey !== process.env.API_SECRET_KEY) {
    return {
      statusCode: 401, // Unauthorized
      body: JSON.stringify({ error: 'Acesso não autorizado. Chave de API inválida.' }),
    };
  }

  // 2. Apenas permitir pedidos do tipo POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405, // Method Not Allowed
      body: JSON.stringify({ error: 'Método não permitido. Utilize POST.' }),
    };
  }

  try {
    // 3. Obter os dados enviados pelo script
    const data = JSON.parse(event.body);

    // Validação mínima: verificar se a descrição foi enviada
    if (!data.description) {
      return {
        statusCode: 400, // Bad Request
        body: JSON.stringify({ error: 'O campo "description" é obrigatório.' }),
      };
    }

    // 4. Montar o objeto da nova ocorrência com valores padrão
    const newOccurrence = {
      date: new Date().toISOString().split('T')[0],
      saleId: data.saleId || 'N/D',
      description: data.description,
      category: data.category || 'SLA', // Categoria padrão "SLA"
      status: 'Aberta',
      externa: data.externa || false, // Por padrão, será interna
      detectionArea: 'Sistema Automático',
      originArea: 'Expedição',
      salesperson: 'N/D',
      immediateAction: 'Registo automático por violação de SLA.',
      actionDescription: '',
    };

    // 5. Adicionar o novo documento ao Firestore
    const docRef = await db.collection('occurrences').add(newOccurrence);

    // 6. Enviar resposta de sucesso
    return {
      statusCode: 201, // Created
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, id: docRef.id, data: newOccurrence }),
    };

  } catch (error) {
    console.error('Erro ao criar ocorrência:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Ocorreu um erro interno no servidor.' }),
    };
  }
};

