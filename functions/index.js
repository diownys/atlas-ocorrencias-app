const functions = require("firebase-functions");
const axios = require("axios");

exports.enviarMensagemTelegram = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "O usuário precisa estar autenticado para enviar mensagens.",
    );
  }

  const botToken = functions.config().telegram.token;
  const chatId = functions.config().telegram.chatid;

  const nomeUsuario = context.auth.token.name || "Usuário";
  const emailUsuario = context.auth.token.email;
  const mensagem = data.text;

  if (!mensagem || mensagem.trim() === "") {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "A mensagem não pode estar vazia.",
    );
  }

  const textoFormatado = `💬 *Nova mensagem do Suporte Atlas S.A* 💬\n\n` +
                         `👤 *De:* ${nomeUsuario} (${emailUsuario})\n\n` +
                         `📝 *Mensagem:*\n${mensagem}`;

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    await axios.post(url, {
      "chat_id": chatId,
      "text": textoFormatado,
      "parse_mode": "Markdown",
    });
    return {success: true, message: "Mensagem enviada!"};
  } catch (error) {
    console.error("Erro ao enviar para o Telegram:", error.response.data);
    throw new functions.https.HttpsError(
        "internal",
        "Não foi possível enviar a mensagem para o Telegram.",
    );
  }
});