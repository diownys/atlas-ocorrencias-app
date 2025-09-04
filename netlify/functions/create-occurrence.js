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

  // 2. Apenas permitir pedidos do tipo GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405, // Method Not Allowed
      body: JSON.stringify({ error: 'Método não permitido.' }),
    };
  }

  try {
    // 3. Buscar os dados no Firestore
    const occurrencesRef = db.collection('occurrences');
    const snapshot = await occurrencesRef.get();

    if (snapshot.empty) {
      return {
        statusCode: 200,
        body: JSON.stringify([]), // Retorna uma lista vazia se não houver ocorrências
      };
    }

    // 4. Formatar os dados para enviar como resposta
    const occurrences = [];
    snapshot.forEach(doc => {
      occurrences.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // 5. Enviar a resposta com sucesso
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(occurrences),
    };
  } catch (error) {
    // 6. Tratar possíveis erros
    console.error('Erro ao buscar ocorrências:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Ocorreu um erro interno no servidor.' }),
    };
  }
};

