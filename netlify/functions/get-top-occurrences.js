// Importa o SDK de Admin do Firebase
const admin = require("firebase-admin");

// ===================================================================
//        CÉREBRO DE CATEGORIAS
// ===================================================================
const categories = {
  "Erro de Endereço": ["endereço", "incorreto", "incorreta", "endereco errado"],
  "Falha de Transporte/Logística": [
    "transportadora", "expedição", "envio",
    "coleta", "entregue", "chegou", "extravio", "extraviado",
  ],
  "Falha de Processo (Janela/Horário)": [
    "janela", "horário", "atraso na emissão", "fora do horario",
  ],
  "Problema Técnico Interno": [
    "conexão", "internet", "imprimir",
    "sistema", "impressora", "não consigo acessar", "erp",
  ],
  "Irregularidade Fiscal/Documental": [
    "receita", "contrato", "irregularidade",
    "sefaz", "retido", "nota fiscal", "nf",
  ],
  "Avaria ou Problema no Produto": [
    "avaria", "danificado", "quebrado", "medicamento", "laboratório",
  ],
  "Erro de Separação/Conferência": [
    "conferência", "separado errado",
    "item errado", "item faltante", "trocado",
  ],
};

function categorizeOccurrence(description) {
  const lowerCaseDescription = description.toLowerCase();
  for (const category in categories) {
    if (Object.prototype.hasOwnProperty.call(categories, category)) {
      for (const keyword of categories[category]) {
        if (lowerCaseDescription.includes(keyword)) {
          return category;
        }
      }
    }
  }
  return "Outros";
}

// Inicializa a aplicação Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const db = admin.firestore();

// A função principal da Netlify
exports.handler = async (event, context) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método não permitido." }),
    };
  }

  try {
    const occurrencesRef = db.collection("occurrences");
    const snapshot = await occurrencesRef.get();
    const allOccurrences = [];
    snapshot.forEach((doc) => {
      allOccurrences.push({ id: doc.id, ...doc.data() });
    });

    const counts = { internas: {}, externas: {} };
    allOccurrences.forEach((occ) => {
      // =======================================================
      //          CORREÇÃO APLICADA AQUI
      // Trocamos 'occ.title' por 'occ.actionDescription'
      // para bater com os nomes dos campos do seu banco.
      // =======================================================
      if (occ.actionDescription && occ.type) {
        const category = categorizeOccurrence(occ.actionDescription); // <-- MUDANÇA AQUI
        const type = occ.type === "interna" ? "internas" : "externas";
        counts[type][category] = (counts[type][category] || 0) + 1;
      }
    });

    const getTop3 = (countObject) => {
      return Object.entries(countObject)
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
    };

    const top3Internas = getTop3(counts.internas);
    const top3Externas = getTop3(counts.externas);

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ internas: top3Internas, externas: top3Externas }),
    };
  } catch (error) {
    console.error("Erro ao processar ocorrências:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro interno no servidor." }),
    };
  }
};