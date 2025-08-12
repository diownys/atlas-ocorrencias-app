import React, { useState, useEffect, useRef } from 'react';
import { 
    LayoutDashboard, AlertTriangle, Settings, Plus, Search, Filter, ChevronDown, 
    CheckCircle, Clock, X, Pencil, LogOut, Trash2, Camera, Save, ListChecks, 
    ChevronLeft, ChevronRight, FileDown, Loader2, Eye, EyeOff, MessageSquare, Send 
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs } from "firebase/firestore";

// Cole as suas chaves do Firebase aqui
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- ASSETS ---
const logoUrl = "/images/logoUrl.png";

// --- HELPER COMPONENTS ---
const InputField = ({ label, name, value, ...props }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input id={name} name={name} value={value} {...props} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900" />
    </div>
);

const SelectField = ({ label, name, value, options, ...props }) => (
    <div>
        {label && <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <select id={name} name={name} value={value} {...props} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 disabled:bg-gray-200 disabled:cursor-not-allowed">
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

const TextareaField = ({ label, name, value, ...props }) => (
    <div className="md:col-span-2">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <textarea id={name} name={name} value={value} {...props} rows="3" className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"></textarea>
    </div>
);

const SearchableSelectField = ({ label, name, value, options, onChange, disabled }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (option) => {
        onChange(name, option);
        setSearchTerm('');
        setIsOpen(false);
    };
    
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div ref={wrapperRef} className="relative">
            {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
            <div className="relative">
                <input
                    type="text"
                    value={isOpen ? searchTerm : value}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 disabled:bg-gray-200 disabled:cursor-not-allowed"
                />
                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {isOpen && !disabled && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(opt => (
                            <li
                                key={opt}
                                onClick={() => handleSelect(opt)}
                                className="px-3 py-2 text-gray-800 hover:bg-blue-100 cursor-pointer"
                            >
                                {opt}
                            </li>
                        ))
                    ) : (
                        <li className="px-3 py-2 text-gray-500">Nenhum resultado encontrado</li>
                    )}
                </ul>
            )}
        </div>
    );
};

// --- MODAL COMPONENTS ---

const OccurrenceModal = ({ isOpen, onClose, onSave, editingData, formOptions }) => {
    const isEditMode = Boolean(editingData);
    
    const [isSaleIdEnabled, setIsSaleIdEnabled] = useState(false);
    const [isSalespersonEnabled, setIsSalespersonEnabled] = useState(false);

    const getInitialState = () => {
        if (isEditMode) return { ...editingData };
        return { 
            date: new Date().toISOString().split('T')[0], 
            saleId: 'N/D', 
            description: '', 
            category: formOptions.categories[0] || '', 
            detectionArea: formOptions.detectionAreas[0] || '', 
            originArea: formOptions.originAreas[0] || '', 
            salesperson: 'N/D', 
            immediateAction: '', 
            actionDescription: '', 
            status: 'Aberta' 
        };
    };
    
    const [formData, setFormData] = useState(getInitialState);

    useEffect(() => {
        const initialState = getInitialState();
        setFormData(initialState);
        if (isEditMode) {
            setIsSaleIdEnabled(initialState.saleId !== 'N/D');
            setIsSalespersonEnabled(initialState.salesperson !== 'N/D');
        } else {
            setIsSaleIdEnabled(false);
            setIsSalespersonEnabled(false);
        }
    }, [isOpen, editingData, formOptions]);

    const handleToggleSaleId = (enabled) => {
        setIsSaleIdEnabled(enabled);
        setFormData(prev => ({ ...prev, saleId: enabled ? '' : 'N/D' }));
    };

    const handleToggleSalesperson = (enabled) => {
        setIsSalespersonEnabled(enabled);
        setFormData(prev => ({ ...prev, salesperson: enabled ? (formOptions.salespeople[0] || '') : 'N/D' }));
    };

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    
    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); onClose(); };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">{isEditMode ? 'Editar Ocorrência' : 'Registrar Nova Ocorrência'}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><X size={20} className="text-gray-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="overflow-y-auto">
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Data" name="date" type="date" value={formData.date} onChange={handleChange} required />
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label htmlFor="saleId" className="block text-sm font-medium text-gray-700">Número da Venda</label>
                                <label className="flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={isSaleIdEnabled} onChange={(e) => handleToggleSaleId(e.target.checked)} />
                                    <div className="relative w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    <span className="ms-2 text-xs font-medium text-gray-600">Editar</span>
                                </label>
                            </div>
                            <input id="saleId" name="saleId" type="text" value={formData.saleId} onChange={handleChange} placeholder="VENDA-00000" required disabled={!isSaleIdEnabled} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 disabled:bg-gray-200 disabled:cursor-not-allowed" />
                        </div>
                        <SearchableSelectField label="Categoria" name="category" options={formOptions.categories} value={formData.category} onChange={handleSelectChange} />
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700">Vendedor</label>
                                <label className="flex items-center cursor-pointer">
                                     <input type="checkbox" className="sr-only peer" checked={isSalespersonEnabled} onChange={(e) => handleToggleSalesperson(e.target.checked)} />
                                     <div className="relative w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                     <span className="ms-2 text-xs font-medium text-gray-600">Editar</span>
                                </label>
                            </div>
                            {isSalespersonEnabled ? (
                                <SearchableSelectField name="salesperson" options={formOptions.salespeople} value={formData.salesperson} onChange={handleSelectChange} />
                            ) : (
                                <input type="text" value="N/D" disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-200 cursor-not-allowed" />
                            )}
                        </div>
                        <SearchableSelectField label="Área de Detecção" name="detectionArea" options={formOptions.detectionAreas} value={formData.detectionArea} onChange={handleSelectChange} />
                        <SearchableSelectField label="Área de Origem" name="originArea" options={formOptions.originAreas} value={formData.originArea} onChange={handleSelectChange} />
                        <TextareaField label="Descrição da Ocorrência" name="description" value={formData.description} onChange={handleChange} placeholder="Descreva o que aconteceu..." required/>
                        <TextareaField label="Ação Imediata" name="immediateAction" value={formData.immediateAction} onChange={handleChange} placeholder="Qual foi a primeira ação tomada?" required/>
                        <TextareaField label="Descrição da Ação Corretiva" name="actionDescription" value={formData.actionDescription} onChange={handleChange} placeholder="Descreva a solução aplicada ou em andamento." />
                        {isEditMode && (
                            <div className="md:col-span-2">
                                <SelectField label="Status" name="status" options={formOptions.statuses} value={formData.status} onChange={handleChange}/>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end items-center p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg text-gray-600 hover:bg-gray-200 mr-3">Cancelar</button>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors">
                            {isEditMode ? 'Atualizar' : <><Plus size={18} className="mr-2"/>Salvar</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const UserModal = ({ isOpen, onClose, onSave, editingUser, currentUser, formOptions }) => {
    const isEditMode = Boolean(editingUser);
    const getInitialUserState = () => isEditMode ? editingUser : { name: '', email: '', password: '', role: 'Usuário' };
    const [userData, setUserData] = useState(getInitialUserState);

    useEffect(() => { setUserData(getInitialUserState()); }, [isOpen, editingUser]);

    const handleChange = (e) => setUserData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSubmit = (e) => { e.preventDefault(); onSave(userData); onClose(); };
    
    const canChangeRole = currentUser.role === 'Administrador' && (!editingUser || editingUser.id !== currentUser.id);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">{isEditMode ? 'Editar Usuário' : 'Adicionar Usuário'}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <InputField label="Nome Completo" name="name" value={userData.name} onChange={handleChange} required />
                        <InputField label="Email" name="email" type="email" value={userData.email} onChange={handleChange} required />
                        <InputField label="Senha" name="password" type="password" onChange={handleChange} placeholder={isEditMode ? "Deixe em branco para não alterar" : ""} required={!isEditMode} />
                        <SelectField label="Grupo de Usuário" name="role" value={userData.role} onChange={handleChange} options={formOptions.roles} disabled={!canChangeRole} />
                    </div>
                    <div className="flex justify-end items-center p-4 bg-gray-50 rounded-b-lg">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg text-gray-600 hover:bg-gray-200 mr-3">Cancelar</button>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">{isEditMode ? 'Atualizar' : 'Adicionar'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 text-center">
                    <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
                    <h3 className="mt-2 text-lg font-bold text-gray-900">{title}</h3>
                    <p className="mt-2 text-sm text-gray-600">{message}</p>
                </div>
                <div className="flex justify-center items-center p-4 bg-gray-50 rounded-b-lg space-x-4">
                    <button onClick={onClose} className="py-2 px-4 rounded-lg text-gray-600 hover:bg-gray-200 w-full">Cancelar</button>
                    <button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg w-full">Excluir</button>
                </div>
            </div>
        </div>
    );
};

const Pagination = ({ itemsPerPage, totalItems, currentPage, onPageChange }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <nav className="flex items-center justify-between border-t border-gray-200 px-4 sm:px-0 mt-4 pt-4">
            <div className="hidden sm:block">
                <p className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">{startItem}</span> a <span className="font-medium">{endItem}</span> de <span className="font-medium">{totalItems}</span> resultados
                </p>
            </div>
            <div className="flex-1 flex justify-between sm:justify-end">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                    <ChevronLeft className="h-5 w-5 mr-2" />
                    Anterior
                </button>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                    Próximo
                    <ChevronRight className="h-5 w-5 ml-2" />
                </button>
            </div>
        </nav>
    );
}

// --- PAGE COMPONENTS ---

const LoadingScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="mt-4 text-lg text-gray-600">A ligar ao servidor...</p>
    </div>
);

const LoginPage = ({ auth }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    const [isResetView, setIsResetView] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetMessage, setResetMessage] = useState({ type: '', content: '' });

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            switch (err.code) {
                case 'auth/user-not-found':
                    setError('Nenhum usuário encontrado com este e-mail.');
                    break;
                case 'auth/wrong-password':
                    setError('A senha está incorreta. Tente novamente.');
                    break;
                case 'auth/invalid-email':
                    setError('O formato do e-mail é inválido.');
                    break;
                case 'auth/too-many-requests':
                     setError('Acesso temporariamente bloqueado devido a muitas tentativas. Tente novamente mais tarde.');
                     break;
                default:
                    setError('Ocorreu um erro ao tentar fazer o login.');
                    break;
            }
        }
        setIsLoading(false);
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setResetMessage({ type: '', content: '' });
        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, resetEmail);
            setResetMessage({ type: 'success', content: 'Link de redefinição enviado! Verifique sua caixa de entrada e spam.' });
        } catch (err) {
             setResetMessage({ type: 'error', content: 'Falha ao enviar o e-mail. Verifique se o e-mail está correto.' });
        }
        setIsLoading(false);
    };

    if (isResetView) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-800">Redefinir Senha</h2>
                        <p className="text-gray-500 mt-2">Digite seu e-mail para receber o link de redefinição.</p>
                    </div>
                    <form className="space-y-6" onSubmit={handlePasswordReset}>
                        <InputField label="Email" name="reset-email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="seu.email@exemplo.com" required />
                        
                        {resetMessage.content && (
                            <p className={`text-sm text-center ${resetMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                                {resetMessage.content}
                            </p>
                        )}

                        <div>
                            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed">
                                {isLoading ? <Loader2 className="animate-spin" /> : 'Enviar Link'}
                            </button>
                        </div>
                    </form>
                    <div className="text-center">
                        <a href="#" onClick={() => setIsResetView(false)} className="text-sm font-medium text-blue-600 hover:underline">
                            Voltar para o Login
                        </a>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
                <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <img src={logoUrl} alt="Atlas S.A Logo" className="h-10" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/128x40/1e293b/ffffff?text=Atlas+S.A'; }} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">Atlas S.A</h1>
                    <p className="text-gray-500 mt-2">Faça login para continuar</p>
                </div>
                <form className="space-y-6" onSubmit={handleLogin}>
                    <InputField label="Email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu.email@exemplo.com" required />
                    
                    <div className="relative">
                        <InputField label="Palavra-passe" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua palavra-passe" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2/3 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-800">
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                    <div>
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed">
                            {isLoading ? <Loader2 className="animate-spin" /> : 'Entrar'}
                        </button>
                    </div>
                </form>
                <div className="text-center">
                    <a href="#" onClick={() => setIsResetView(true)} className="text-sm font-medium text-blue-600 hover:underline">
                        Esqueci minha senha
                    </a>
                </div>
            </div>
        </div>
    );
};

const KpiCard = ({ title, value, icon }) => (
  <div className="bg-white p-4 rounded-lg shadow-md flex-1">
    <div className="flex justify-between items-start"><div className="flex flex-col"><span className="text-gray-500 text-sm">{title}</span><span className="text-2xl font-bold text-gray-800">{value}</span></div><div className="p-2 bg-blue-100 rounded-lg">{icon}</div></div>
  </div>
);

const OccurrencesBarChart = ({ occurrences }) => {
    const processData = () => {
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const today = new Date();
        const data = Array(6).fill(0).map((_, i) => {
            const d = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
            return { month: monthNames[d.getMonth()], year: d.getFullYear(), count: 0 };
        });

        occurrences.forEach(occ => {
            const occDate = new Date(occ.date + 'T00:00:00');
            const month = occDate.getMonth();
            const year = occDate.getFullYear();
            const dataPoint = data.find(d => d.month === monthNames[month] && d.year === year);
            if (dataPoint) {
                dataPoint.count++;
            }
        });
        return data;
    };

    const chartData = processData();
    const maxValue = Math.max(...chartData.map(d => d.count), 1);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-bold text-lg text-gray-800 mb-4">Ocorrências nos Últimos 6 Meses</h3>
            <div className="flex justify-between items-end h-64 space-x-4">
                {chartData.map((d) => (
                    <div key={`${d.month}-${d.year}`} className="flex flex-col items-center flex-1 h-full justify-end">
                        <div className="text-sm font-bold text-gray-700 mb-1">{d.count}</div>
                        <div className="w-full bg-blue-200 rounded-t-md hover:bg-blue-300 transition-all" style={{ height: `${(d.count / maxValue) * 80}%` }} title={`Ocorrências: ${d.count}`}></div>
                        <span className="text-xs text-gray-500 mt-2">{d.month}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const StatusPieChart = ({ occurrences, formOptions }) => {
    const processData = () => {
        const statusCounts = {};
        formOptions.statuses.forEach(s => statusCounts[s] = 0);

        occurrences.forEach(occ => {
            if (statusCounts.hasOwnProperty(occ.status)) {
                statusCounts[occ.status]++;
            }
        });

        return [
            { name: 'Aberta', value: statusCounts['Aberta'], color: '#ef4444' },
            { name: 'Em Análise', value: statusCounts['Em Análise'], color: '#f59e0b' },
            { name: 'Resolvida', value: statusCounts['Resolvida'], color: '#10b981' },
        ];
    };

    const data = processData();
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let accumulatedPercentage = 0;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-bold text-lg text-gray-800 mb-4">Status das Ocorrências</h3>
            <div className="flex items-center justify-around">
                <div className="relative w-40 h-40">
                    <svg viewBox="0 0 36 36" className="transform -rotate-90">
                        {data.map((item) => {
                            const percentage = total > 0 ? (item.value / total) * 100 : 0;
                            const strokeDasharray = `${percentage} ${100 - percentage}`;
                            const strokeDashoffset = -accumulatedPercentage;
                            accumulatedPercentage += percentage;
                            return (
                                <circle key={item.name} cx="18" cy="18" r="15.9155" fill="transparent" stroke={item.color} strokeWidth="3.8" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} title={`${item.name}: ${item.value}`} />
                            );
                        })}
                    </svg>
                     <div className="absolute inset-0 flex items-center justify-center">
                         <span className="text-2xl font-bold text-gray-800">{total}</span>
                     </div>
                </div>
                <ul className="space-y-2 text-sm">
                    {data.map((item) => (
                        <li key={item.name} className="flex items-center">
                            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                            <span className="text-gray-700">{item.name}</span>
                            <span className="ml-auto font-medium text-gray-500">{item.value}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const DashboardPage = ({ occurrences, formOptions }) => {
    const getOccurrencesLast6Months = () => {
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        return occurrences.filter(occ => {
            const occDate = new Date(occ.date + 'T00:00:00');
            return occDate >= sixMonthsAgo;
        });
    };

    const occurrencesLast6Months = getOccurrencesLast6Months();

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard (Últimos 6 Meses)</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <KpiCard title="Total de Ocorrências" value={occurrencesLast6Months.length} icon={<AlertTriangle className="text-blue-500" />} />
                <KpiCard title="Ocorrências Abertas" value={occurrencesLast6Months.filter(o => o.status === 'Aberta').length} icon={<Clock className="text-blue-500" />} />
                <KpiCard title="Em Análise" value={occurrencesLast6Months.filter(o => o.status === 'Em Análise').length} icon={<Search className="text-blue-500" />} />
                <KpiCard title="Resolvidas" value={occurrencesLast6Months.filter(o => o.status === 'Resolvida').length} icon={<CheckCircle className="text-blue-500" />} />
            </div>
            <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
                <OccurrencesBarChart occurrences={occurrencesLast6Months} />
                <StatusPieChart occurrences={occurrencesLast6Months} formOptions={formOptions} />
            </div>
        </div>
    );
};

const OccurrencesPage = ({ occurrences, onOpenNewModal, onOpenEditModal, onDeleteClick, filters, setFilters, formOptions }) => {
    const [openRow, setOpenRow] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const getStatusClass = (status) => ({ 'Resolvida': 'bg-green-100 text-green-800', 'Em Análise': 'bg-yellow-100 text-yellow-800', 'Aberta': 'bg-red-100 text-red-800' }[status] || 'bg-gray-100 text-gray-800');
    
    const filteredOccurrences = occurrences.filter(o => {
        const { status, searchTerm, startDate, endDate } = filters;
        if (status !== 'Todos' && o.status !== status) return false;
        if (searchTerm && !o.saleId.toLowerCase().includes(searchTerm.toLowerCase()) && !o.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (startDate && o.date < startDate) return false;
        if (endDate && o.date > endDate) return false;
        return true;
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);
    
    const handleExportXLS = () => {
        if (typeof XLSX === 'undefined') {
            alert("A biblioteca de exportação ainda não carregou. Tente novamente em alguns segundos.");
            return;
        }

        const mappedData = filteredOccurrences.map(occ => ({
            'Data': new Date(occ.date + 'T00:00:00').toLocaleDateString('pt-BR'),
            'ID Venda': occ.saleId,
            'Descrição': occ.description,
            'Categoria': occ.category,
            'Status': occ.status,
            'Área de Detecção': occ.detectionArea,
            'Área de Origem': occ.originArea,
            'Vendedor': occ.salesperson,
            'Ação Imediata': occ.immediateAction,
            'Ação Corretiva': occ.actionDescription,
        }));

        const worksheet = XLSX.utils.json_to_sheet(mappedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Ocorrências");
        XLSX.writeFile(workbook, "RelatorioOcorrencias.xlsx");
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredOccurrences.slice(indexOfFirstItem, indexOfLastItem);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Controle de Ocorrências</h1>
                <div className="flex items-center gap-2">
                    <button onClick={handleExportXLS} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors">
                        <FileDown size={18} className="mr-2" />
                        Exportar XLS
                    </button>
                    <button onClick={onOpenNewModal} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors">
                        <Plus size={18} className="mr-2" /> 
                        Nova Ocorrência
                    </button>
                </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="relative"><label className="text-xs text-gray-500">Pesquisa</label><Search className="absolute left-3 top-1/2 mt-1 text-gray-400" size={20} /><input type="text" placeholder="Nº Venda ou Descrição..." value={filters.searchTerm} onChange={e => setFilters({...filters, searchTerm: e.target.value})} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"/></div>
                    <div className="relative"><label className="text-xs text-gray-500">Status</label><Filter className="absolute left-3 top-1/2 mt-1 text-gray-400" size={16} /><select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="w-full appearance-none pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"><option value="Todos">Todos os Status</option>{formOptions.statuses.map(status => (<option key={status} value={status}>{status}</option>))}</select></div>
                    <div><label className="text-xs text-gray-500">Data de Início</label><InputField name="startDate" type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} /></div>
                    <div><label className="text-xs text-gray-500">Data de Fim</label><InputField name="endDate" type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} /></div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr><th scope="col" className="px-6 py-3"></th><th scope="col" className="px-6 py-3">Data</th><th scope="col" className="px-6 py-3">Nº Venda</th><th scope="col" className="px-6 py-3">Descrição</th><th scope="col" className="px-6 py-3">Categoria</th><th scope="col" className="px-6 py-3">Status</th><th scope="col" className="px-6 py-3">Ações</th></tr>
                        </thead>
                        <tbody>
                            {currentItems.map(item => (<React.Fragment key={item.id}><tr className="bg-white border-b hover:bg-gray-50"><td className="px-6 py-4 cursor-pointer" onClick={() => setOpenRow(openRow === item.id ? null : item.id)}><ChevronDown className={`transition-transform ${openRow === item.id ? 'rotate-180' : ''}`} size={16} /></td><td className="px-6 py-4">{new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td><td className="px-6 py-4 font-mono">{item.saleId}</td><td className="px-6 py-4 font-medium text-gray-900 truncate" style={{maxWidth: '200px'}}>{item.description}</td><td className="px-6 py-4">{item.category}</td><td className="px-6 py-4"><span className={`px-2 py-1 font-semibold leading-tight rounded-full text-xs ${getStatusClass(item.status)}`}>{item.status}</span></td><td className="px-6 py-4 flex items-center space-x-1"><button onClick={() => onOpenEditModal(item)} className="p-2 text-blue-600 hover:text-blue-800 transition-colors"><Pencil size={16} /></button><button onClick={() => onDeleteClick(item)} className="p-2 text-red-600 hover:text-red-800 transition-colors"><Trash2 size={16} /></button></td></tr>{openRow === item.id && (<tr className="bg-gray-50"><td colSpan="7" className="p-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs p-4 bg-white rounded-md"><div><h4 className="font-bold text-gray-600">Vendedor:</h4><p className="text-gray-500">{item.salesperson}</p></div><div><h4 className="font-bold text-gray-600">Área de Detecção:</h4><p className="text-gray-500">{item.detectionArea}</p></div><div><h4 className="font-bold text-gray-600">Área de Origem:</h4><p className="text-gray-500">{item.originArea}</p></div><div className="col-span-full"><h4 className="font-bold text-gray-600">Ação Imediata:</h4><p className="text-gray-500">{item.immediateAction}</p></div><div className="col-span-full"><h4 className="font-bold text-gray-600">Descrição da Ação Corretiva:</h4><p className="text-gray-500">{item.actionDescription}</p></div></div></td></tr>)}</React.Fragment>))}
                        </tbody>
                    </table>
                </div>
                <Pagination 
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredOccurrences.length}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
};

const ListManagerCard = ({ title, items, onUpdateList, listKey }) => {
    const [editingIndex, setEditingIndex] = useState(-1);
    const [editingValue, setEditingValue] = useState('');
    const [newItem, setNewItem] = useState('');

    const handleEdit = (index, value) => { setEditingIndex(index); setEditingValue(value); };
    const handleSave = (index) => {
        const updatedItems = [...items];
        updatedItems[index] = editingValue;
        onUpdateList(listKey, updatedItems);
        setEditingIndex(-1);
        setEditingValue('');
    };
    const handleDelete = (index) => {
        const updatedItems = items.filter((_, i) => i !== index);
        onUpdateList(listKey, updatedItems);
    };
    const handleAdd = () => {
        if (newItem.trim() === '' || items.includes(newItem.trim())) {
             setNewItem('');
             return;
        }
        const updatedItems = [...items, newItem.trim()];
        onUpdateList(listKey, updatedItems);
        setNewItem('');
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
            <div className="flex gap-2 mb-4">
                <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAdd()} placeholder="Adicionar novo item..." className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"/>
                <button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-2 rounded-lg flex items-center shrink-0"><Plus size={18} /></button>
            </div>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {items.map((item, index) => (
                    <li key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        {editingIndex === index ? ( <input type="text" value={editingValue} onChange={(e) => setEditingValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSave(index)} autoFocus className="w-full px-2 py-1 border border-blue-500 rounded-md bg-white"/> ) : ( <span className="text-gray-800">{item}</span> )}
                        <div className="flex items-center space-x-2 shrink-0 ml-2">
                            {editingIndex === index ? ( <button onClick={() => handleSave(index)} className="p-1 text-green-600 hover:text-green-800"><Save size={16} /></button> ) : ( <button onClick={() => handleEdit(index, item)} className="p-1 text-gray-500 hover:text-blue-600"><Pencil size={16} /></button> )}
                            <button onClick={() => handleDelete(index)} className="p-1 text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

const SettingsPage = ({ currentUser, users, onUpdateUser, onAddUser, onDeleteUser, formOptions, onUpdateList }) => {
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);
    const [roleFilter, setRoleFilter] = useState('Todos');
    const [nameSearch, setNameSearch] = useState('');

    const handleOpenUserModal = (user = null) => { setEditingUser(user); setIsUserModalOpen(true); };
    const handleSaveUser = (userData) => {
        if (editingUser) {
            const finalUserData = {...userData};
            if (!userData.password) {
                const originalUser = users.find(u => u.id === userData.id);
                finalUserData.password = originalUser.password;
            }
            onUpdateUser(finalUserData);
        } else {
            onAddUser(userData);
        }
    };
    const handleDeleteClick = (user) => { if (currentUser.id !== user.id) { setUserToDelete(user); } };
    const confirmDelete = () => { if (userToDelete) { onDeleteUser(userToDelete.id); setUserToDelete(null); } };
    const filteredUsers = users.filter(user => roleFilter === 'Todos' || user.role === roleFilter).filter(user => user.name.toLowerCase().includes(nameSearch.toLowerCase()));

    return (
        <div>
            <UserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} onSave={handleSaveUser} editingUser={editingUser} currentUser={currentUser} formOptions={formOptions} />
            <ConfirmationModal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} onConfirm={confirmDelete} title="Confirmar Exclusão" message={`Tem certeza que deseja excluir o usuário ${userToDelete?.name}? Esta ação não pode ser revertida.`} />
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Configurações</h1>
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Gerenciamento de Contas</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <h3 className="text-lg font-bold mb-4">Meu Perfil</h3>
                        <div className="flex flex-col items-center space-y-4 p-4 border border-gray-200 rounded-lg">
                            <div className="relative"><img className="h-24 w-24 rounded-full" src={`https://ui-avatars.com/api/?name=${currentUser.avatar}&background=6366F1&color=FFFFFF`} alt="Avatar" /><button className="absolute -bottom-1 -right-1 bg-blue-600 p-1.5 rounded-full text-white hover:bg-blue-700"><Camera size={14} /></button></div>
                            <div className="text-center"><p className="font-bold text-lg">{currentUser.name}</p><p className="text-sm text-gray-500">{currentUser.role}</p></div>
                            <button onClick={() => handleOpenUserModal(currentUser)} className="w-full text-center py-2 px-4 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Editar Perfil</button>
                        </div>
                    </div>
                    {currentUser.role === 'Administrador' && (
                        <div className="lg:col-span-2">
                            <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                                <h3 className="text-lg font-bold">Gerenciamento de Usuários</h3>
                                <button onClick={() => handleOpenUserModal()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center shrink-0"><Plus size={18} className="mr-2"/> Adicionar</button>
                            </div>
                            <div className="flex flex-wrap gap-4 items-end mb-4">
                                <div className="relative w-full sm:w-auto flex-grow">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pesquisar por nome</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input type="text" placeholder="Digite um nome..." value={nameSearch} onChange={(e) => setNameSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
                                    </div>
                                </div>
                                <div className="w-full sm:w-auto">
                                    <SelectField label="Filtrar por grupo" name="roleFilter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} options={['Todos', ...formOptions.roles]} />
                                </div>
                            </div>
                            <ul className="space-y-3 max-h-72 overflow-y-auto pr-2">
                                {filteredUsers.map(user => (
                                    <li key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                        <div className="flex items-center"><img className="h-10 w-10 rounded-full" src={`https://ui-avatars.com/api/?name=${user.avatar}&background=9ca3af&color=FFFFFF`} alt="Avatar" /><div className="ml-3"><p className="font-semibold text-gray-800">{user.name}</p><p className="text-sm text-gray-500">{user.role}</p></div></div>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => handleOpenUserModal(user)} className="p-2 text-gray-500 hover:text-blue-600"><Pencil size={16} /></button>
                                            <button onClick={() => handleDeleteClick(user)} className={`p-2 ${currentUser.id === user.id ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-red-600'}`} disabled={currentUser.id === user.id}><Trash2 size={16} /></button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
            {currentUser.role === 'Administrador' && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center gap-3 mb-4">
                        <ListChecks className="text-blue-500" />
                        <h2 className="text-xl font-bold text-gray-800">Gerenciamento de Listas</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ListManagerCard title="Categorias" items={formOptions.categories} onUpdateList={onUpdateList} listKey="categories" />
                        <ListManagerCard title="Vendedores" items={formOptions.salespeople} onUpdateList={onUpdateList} listKey="salespeople" />
                        <ListManagerCard title="Áreas de Detecção" items={formOptions.detectionAreas} onUpdateList={onUpdateList} listKey="detectionAreas" />
                        <ListManagerCard title="Áreas de Origem" items={formOptions.originAreas} onUpdateList={onUpdateList} listKey="originAreas" />
                    </div>
                </div>
            )}
        </div>
    );
};

const ChatWidget = ({ currentUser }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState({ type: '', text: '' });

    const handleSend = async (e) => {
        e.preventDefault();
        if (message.trim() === '' || !currentUser) return;

        setStatus({ type: 'sending', text: 'Enviando...' });

        try {
            const response = await fetch('/.netlify/functions/enviar-telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    userInfo: {
                        name: currentUser.name,
                        email: currentUser.email
                    }
                }),
            });

            if (!response.ok) {
                throw new Error('Falha na resposta da rede');
            }

            setStatus({ type: 'sent', text: 'Mensagem enviada com sucesso!' });
            setMessage('');
            setTimeout(() => { setIsOpen(false); setStatus({ type: '', text: '' }); }, 2000);

        } catch (error) {
            setStatus({ type: 'error', text: 'Erro ao enviar. Tente novamente.' });
            setTimeout(() => setStatus({ type: '', text: '' }), 5000);
        }
    };
    
    return (
        <div className="fixed bottom-5 right-5 z-50 font-sans">
            {isOpen && (
                <div className="bg-white w-80 h-96 rounded-lg shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 fade-in-25 duration-300">
                    <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
                        <h3 className="font-bold">Fale Conosco</h3>
                        <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-blue-700"><X size={20} /></button>
                    </div>
                    <div className="p-4 flex-1 text-sm text-gray-700">
                        <p>Olá! Tem alguma dúvida ou problema? Deixe sua mensagem abaixo e nossa equipe entrará em contato.</p>
                    </div>
                    <div className="p-2 border-t bg-gray-50 rounded-b-lg">
                        {status.text && <p className={`text-xs text-center mb-2 ${status.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>{status.text}</p>}
                        <form onSubmit={handleSend} className="flex items-center gap-2">
                            <input type="text" placeholder="Digite sua mensagem..." value={message} onChange={(e) => setMessage(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={status.type === 'sending'}/>
                            <button type="submit" className="bg-blue-600 text-white p-2.5 rounded-full hover:bg-blue-700 disabled:bg-blue-400 shrink-0" disabled={status.type === 'sending' || message.trim() === ''}>
                                {status.type === 'sending' ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {!isOpen && (
                <button onClick={() => setIsOpen(true)} className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all transform hover:scale-110" title="Fale Conosco"><MessageSquare size={28} /></button>
            )}
        </div>
    );
};

// --- APP PRINCIPAL ---
export default function App() {
  const [authIsLoading, setAuthIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [occurrences, setOccurrences] = useState([]);
  const [formOptions, setFormOptions] = useState({ categories: [], detectionAreas: [], originAreas: [], salespeople: [], statuses: [], roles: [] });
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isOccurrenceModalOpen, setIsOccurrenceModalOpen] = useState(false);
  const [editingOccurrence, setEditingOccurrence] = useState(null);
  const [occurrenceToDelete, setOccurrenceToDelete] = useState(null);
  
  const getInitialFilters = () => {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    const startDate = sixMonthsAgo.toISOString().split('T')[0];
    return { status: 'Todos', searchTerm: '', startDate, endDate };
  };
  const [occurrenceFilters, setOccurrenceFilters] = useState(getInitialFilters);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.async = true;
    document.head.appendChild(script);

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
            const usersCollection = collection(db, "users");
            const snapshot = await getDocs(usersCollection);
            const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const matchedUser = usersList.find(u => u.email.toLowerCase() === user.email.toLowerCase());
            setCurrentUser(matchedUser || null);
        } else {
            setCurrentUser(null);
        }
        setAuthIsLoading(false);
    });

    const unsubscribeOccurrences = onSnapshot(collection(db, "occurrences"), (snapshot) => {
        const occurrencesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOccurrences(occurrencesData.sort((a, b) => new Date(b.date) - new Date(a.date)));
    });

    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    const unsubscribeFormOptions = onSnapshot(doc(db, "settings", "formOptions"), (doc) => {
        if (doc.exists()) setFormOptions(doc.data());
    });

    return () => {
        if(script.parentNode) document.head.removeChild(script);
        unsubscribeAuth();
        unsubscribeOccurrences();
        unsubscribeUsers();
        unsubscribeFormOptions();
    };
  }, []);
  
  const handleSaveOccurrence = async (data) => {
    if (editingOccurrence) {
        const { id, ...occurrenceData } = data;
        await updateDoc(doc(db, "occurrences", id), occurrenceData);
    } else {
        await addDoc(collection(db, "occurrences"), data);
    }
  };
  
  const handleDeleteOccurrence = async (occurrenceId) => {
      await deleteDoc(doc(db, "occurrences", occurrenceId));
  };
  
  const handleUpdateUser = async (updatedUser) => {
      const { id, ...userData } = updatedUser;
      await updateDoc(doc(db, "users", id), userData);
      if (currentUser.id === id) setCurrentUser(updatedUser);
  };

  const handleAddUser = async (newUser) => {
      const newAvatar = newUser.name ? newUser.name.charAt(0).toUpperCase() : '?';
      await addDoc(collection(db, "users"), { ...newUser, avatar: newAvatar });
  };
  
  const handleDeleteUser = async (userId) => {
      await deleteDoc(doc(db, "users", userId));
  };

  const handleUpdateList = async (listKey, updatedItems) => {
      const settingsRef = doc(db, "settings", "formOptions");
      await updateDoc(settingsRef, { [listKey]: updatedItems });
  };

  const handleOpenNewOccurrenceModal = () => { setEditingOccurrence(null); setIsOccurrenceModalOpen(true); };
  const handleOpenEditOccurrenceModal = (occurrence) => { setEditingOccurrence(occurrence); setIsOccurrenceModalOpen(true); };
  const handleCloseOccurrenceModal = () => { setIsOccurrenceModalOpen(false); setEditingOccurrence(null); };
  const handleLogout = () => signOut(auth);

  const NavItem = ({ page, icon, label }) => (
    <li><a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(page); }} className={`flex items-center p-2 rounded-lg group transition-colors ${ currentPage === page ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white' }`}>{icon}<span className="ml-3">{label}</span></a></li>
  );
  
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage occurrences={occurrences} formOptions={formOptions} />;
      case 'occurrences': return <OccurrencesPage occurrences={occurrences} filters={occurrenceFilters} setFilters={setOccurrenceFilters} onOpenNewModal={handleOpenNewOccurrenceModal} onOpenEditModal={handleOpenEditOccurrenceModal} onDeleteClick={setOccurrenceToDelete} formOptions={formOptions} />;
      case 'settings': return <SettingsPage currentUser={currentUser} users={users} onUpdateUser={handleUpdateUser} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} formOptions={formOptions} onUpdateList={handleUpdateList} />;
      default: return <DashboardPage occurrences={occurrences} formOptions={formOptions} />;
    }
  };

  if (authIsLoading) {
      return <LoadingScreen />;
  }

  if (!currentUser) {
    return <LoginPage auth={auth} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <OccurrenceModal isOpen={isOccurrenceModalOpen} onClose={handleCloseOccurrenceModal} onSave={handleSaveOccurrence} editingData={editingOccurrence} formOptions={formOptions} />
      <ConfirmationModal
          isOpen={!!occurrenceToDelete}
          onClose={() => setOccurrenceToDelete(null)}
          onConfirm={() => {
              handleDeleteOccurrence(occurrenceToDelete.id);
              setOccurrenceToDelete(null);
          }}
          title="Confirmar Exclusão"
          message={`Tem a certeza que deseja excluir a ocorrência da venda ${occurrenceToDelete?.saleId}? Esta ação não pode ser revertida.`}
      />
      <aside className="w-64 bg-gray-800 text-white flex flex-col p-4 fixed h-full shadow-lg">
        <div className="flex items-center mb-8">
            <img src={logoUrl} alt="Atlas S.A Logo" className="h-8" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/128x32/1e293b/ffffff?text=Atlas+S.A'; }} />
            <span className="text-2xl font-bold ml-2">Atlas S.A</span>
        </div>
        <nav className="flex-1"><ul className="space-y-2">
            <NavItem page="dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" />
            <NavItem page="occurrences" icon={<AlertTriangle size={20} />} label="Ocorrências" />
        </ul></nav>
        <div>
          <ul className="space-y-2 pt-4 border-t border-gray-700">
              <NavItem page="settings" icon={<Settings size={20} />} label="Configurações" />
          </ul>
           <div className="flex items-center justify-between mt-6 p-2 bg-gray-700/50 rounded-lg">
            <div className="flex items-center">
              <img className="h-10 w-10 rounded-full" src={`https://ui-avatars.com/api/?name=${currentUser.avatar}&background=6366F1&color=FFFFFF`} alt="Avatar do utilizador" />
              <div className="ml-3"><p className="text-sm font-semibold">{currentUser.name}</p><p className="text-xs text-gray-400">{currentUser.role}</p></div>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-full transition-colors"><LogOut size={18} /></button>
          </div>
        </div>
      </aside>
      <main className="flex-1 ml-64"><div className="p-6 overflow-y-auto h-full">{renderPage()}</div></main>
      
      <ChatWidget currentUser={currentUser} />
    </div>
  );
}