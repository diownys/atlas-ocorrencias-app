// Importa o SDK de Admin do Firebase
const admin = require("firebase-admin");

// ===================================================================
//        CÉREBRO DE CATEGORIAS (BASEADO NA NOSSA ANÁLISE)
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

/**
 * Categoriza uma ocorrência baseada na sua descrição.
 * @param {string} description A descrição da ocorrência.
 * @return {string} A categoria encontrada ou 'Outros'.
 */
function categorizeOccurrence(description) {
  const lowerCaseDescription = description.toLowerCase();
  for (const category in categories) {
    // Usar hasOwnProperty para segurança em loops for...in
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
// ===================================================================

// Inicializa a aplicação Firebase Admin usando as credenciais do ambiente Netlify
// Isso garante que o código só é inicializado uma vez
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

// A função principal que será executada pela Netlify
exports.handler = async (event, context) => {
  // Apenas permitir pedidos do tipo GET para segurança
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método não permitido." }),
    };
  }

  try {
    // 1. BUSCAR TODAS AS OCORRÊNCIAS (como sua função já fazia)
    const occurrencesRef = db.collection("occurrences");
    const snapshot = await occurrencesRef.get();
    const allOccurrences = [];
    snapshot.forEach((doc) => {
      allOccurrences.push({ id: doc.id, ...doc.data() });
    });

    // 2. PROCESSAR E CONTAR AS OCORRÊNCIAS
    const counts = { internas: {}, externas: {} };
    allOccurrences.forEach((occ) => {
      if (occ.title && occ.type) {
        const category = categorizeOccurrence(occ.title);
        const type = occ.type === "interna" ? "internas" : "externas";
        counts[type][category] = (counts[type][category] || 0) + 1;
      }
    });

    // 3. CALCULAR O TOP 3
    const getTop3 = (countObject) => {
      return Object.entries(countObject)
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
    };

    const top3Internas = getTop3(counts.internas);
    const top3Externas = getTop3(counts.externas);

    // 4. RETORNAR O RESULTADO FINAL
    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" // Permite o acesso de outros domínios
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