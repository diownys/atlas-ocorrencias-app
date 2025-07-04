import React, { useState } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
// As importações do Firebase serão adicionadas depois, quando conectarmos a função
// import { getFunctions, httpsCallable } from "firebase/functions";

export const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    // Estado para controlar as mensagens de status (enviando, enviado, erro)
    const [status, setStatus] = useState({ type: '', text: '' });

    const handleSend = async (e) => {
        e.preventDefault();
        if (message.trim() === '') return;

        setStatus({ type: 'sending', text: 'Enviando...' });

        // --- LÓGICA DE ENVIO PARA O FIREBASE (SERÁ ATIVADA DEPOIS) ---
        console.log("Tentando enviar a mensagem:", message);
        // Simulação de chamada de API
        setTimeout(() => {
            // Simulação de sucesso
             setStatus({ type: 'sent', text: 'Mensagem enviada com sucesso!' });
             setMessage('');
             setTimeout(() => setIsOpen(false), 2000);

            // Simulação de erro (descomente para testar)
            // setStatus({ type: 'error', text: 'Erro ao enviar. Tente novamente.' });

            // Limpa a mensagem de status após alguns segundos
             setTimeout(() => setStatus({ type: '', text: '' }), 5000);
        }, 1500);
        // --- FIM DA LÓGICA DE ENVIO ---
    };

    return (
        <div className="fixed bottom-5 right-5 z-50 font-sans">
            {/* Janela do Chat */}
            {isOpen && (
                <div className="bg-white w-80 h-96 rounded-lg shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 fade-in-25 duration-300">
                    {/* Header */}
                    <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
                        <h3 className="font-bold">Fale Conosco</h3>
                        <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-blue-700"><X size={20} /></button>
                    </div>
                    {/* Corpo */}
                    <div className="p-4 flex-1 text-sm text-gray-700">
                        <p>Olá! Tem alguma dúvida ou problema? Deixe sua mensagem abaixo e nossa equipe entrará em contato.</p>
                    </div>
                    {/* Footer com Input */}
                    <div className="p-2 border-t bg-gray-50 rounded-b-lg">
                        {status.text && <p className={`text-xs text-center mb-2 ${status.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>{status.text}</p>}
                        <form onSubmit={handleSend} className="flex items-center gap-2">
                            <input 
                                type="text"
                                placeholder="Digite sua mensagem..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={status.type === 'sending'}
                            />
                            <button type="submit" className="bg-blue-600 text-white p-2.5 rounded-full hover:bg-blue-700 disabled:bg-blue-400 shrink-0" disabled={status.type === 'sending' || message.trim() === ''}>
                                {status.type === 'sending' ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Botão Flutuante */}
            {!isOpen && (
                <button 
                    onClick={() => setIsOpen(true)} 
                    className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all transform hover:scale-110"
                    title="Fale Conosco"
                >
                    <MessageSquare size={28} />
                </button>
            )}
        </div>
    );
};