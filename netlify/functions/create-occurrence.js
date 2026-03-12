const admin = require('firebase-admin');

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

exports.handler = async (event, context) => {
  if (event.headers['x-api-key'] !== process.env.API_SECRET_KEY) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Acesso não autorizado.' }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido. Utilize POST.' }) };
  }

  try {
    const data = JSON.parse(event.body);

    // Validação básica: a descrição ainda é o coração da ocorrência
    if (!data.description) {
      return { statusCode: 400, body: JSON.stringify({ error: 'O campo "description" é obrigatório.' }) };
    }

    // Agora o objeto newOccurrence pega os dados do seu JSON ou usa um padrão
    const newOccurrence = {
      // Se você enviar "date", ele usa. Senão, gera a data de hoje.
      date: data.date || new Date().toISOString().split('T')[0], 
      
      saleId: data.saleId || 'N/D',
      description: data.description,
      category: data.category || 'SLA',
      status: data.status || 'Aberta',
      externa: data.externa !== undefined ? data.externa : false,
      
      // Campos que agora são flexíveis:
      detectionArea: data.detectionArea || 'Sistema Automático',
      originArea: data.originArea || 'Expedição',
      salesperson: data.salesperson || 'N/D',
      immediateAction: data.immediateAction || 'Registo automático por violação de SLA.',
      actionDescription: data.actionDescription || '',
    };

    const docRef = await db.collection('occurrences').add(newOccurrence);

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, id: docRef.id, data: newOccurrence }),
    };
  } catch (error) {
    console.error('Erro ao criar ocorrência:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erro interno no servidor.' }) };
  }
};
