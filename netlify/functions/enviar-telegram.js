const axios = require('axios');

exports.handler = async function(event, context) {
  // A Netlify só permite o método POST para esta função
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Apenas o método POST é permitido' }),
    };
  }

  // Pegamos os segredos das "Environment Variables" da Netlify
  const botToken = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  // O corpo da requisição vem como uma string, então precisamos convertê-lo
  const body = JSON.parse(event.body);
  const { message, userInfo } = body;

  if (!message || message.trim() === "") {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'A mensagem não pode estar vazia.' }),
    };
  }

  const textoFormatado = `💬 *Nova mensagem do Suporte Atlas S.A* 💬\n\n` +
                         `👤 *De:* ${userInfo.name} (${userInfo.email})\n\n` +
                         `📝 *Mensagem:*\n${message}`;

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    await axios.post(url, {
      chat_id: chatId,
      text: textoFormatado,
      parse_mode: 'Markdown',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Mensagem enviada!' }),
    };
  } catch (error) {
    console.error("Erro ao enviar para o Telegram:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Falha ao enviar a mensagem.' }),
    };
  }
};