import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, Search, Plus, CheckCircle2, 
  Clock, Menu, X, Trash2, Edit, CalendarDays, Inbox, Stethoscope,
  Download, Activity, Users, XCircle, LogOut, Eye
} from 'lucide-react';

// 🔴 COLOQUE AQUI O SEU IP LOCAL (ex: "http://192.168.1.15:8000" para celular e PC)
  const API_BASE_URL = "https://ximed-app.onrender.com";  
  export default function App() {
  // --- ESTADOS DE AUTENTICAÇÃO ---
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: '123456' });
  const [loginError, setLoginError] = useState('');

  // --- ESTADOS NATIVOS DA APLICAÇÃO ---
  const [activeTab, setActiveTab] = useState('agendamentos');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [examSearchTerm, setExamSearchTerm] = useState('');

  const logoUrl = "/ximed.jfif";
  const [appointments, setAppointments] = useState([]);
  const [exams, setExams] = useState([]);

  // ESTADOS DOS MODAIS
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [formData, setFormData] = useState({ 
    patientName: '', cpf: '', examName: '', company: '', role: '', date: '', status: 'Pendente' 
  });

  const [newDate, setNewDate] = useState('');

  // --- CARREGAR DADOS DO BACKEND APÓS AUTENTICAÇÃO ---
  const fetchData = async () => {
    if (!token) return;
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      // Buscar Exames (PCMSO)
      const resExams = await fetch(`${API_BASE_URL}/exams`, { headers });
      if (resExams.status === 401) {
        handleLogout(); // Se o token for inválido, desloga imediatamente
        return;
      }
      if (resExams.ok) {
        const dataExams = await resExams.json();
        setExams(dataExams);
      }

      // Buscar Agendamentos
      const resApps = await fetch(`${API_BASE_URL}/appointments`, { headers });
      if (resApps.ok) {
        const dataApps = await resApps.json();
        const mappedApps = dataApps.map(a => ({
          id: a.id,
          patientName: a.patient_name || a.patientName || "Não informado",
          cpf: a.cpf || "",
          examName: a.exam_name || a.examName || "Exame Ocupacional",
          company: a.company || "XIMED Cliente",
          role: a.role || "",
          date: a.appointment_date || a.date || "",
          status: a.status || "Pendente"
        }));
        setAppointments(mappedApps);
      }
    } catch (err) {
      console.error("Erro ao carregar dados da API:", err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  // DERIVAÇÃO DINÂMICA DE COLABORADORES
  const collaborators = useMemo(() => {
    return appointments.map(item => {
      let statusASO = 'Pendente ASO';
      if (item.status === 'Confirmado') statusASO = 'Apto (ASO Concluído)';
      if (item.status === 'Cancelado') statusASO = 'ASO Cancelado';

      return {
        id: item.id,
        name: item.patientName,
        cpf: item.cpf,
        role: item.role || "Não informado",
        company: item.company || "XIMED Cliente",
        status: statusASO,
        examName: item.examName,
        date: item.date
      };
    });
  }, [appointments]);

  // --- AUTENTICAÇÃO ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const bodyData = new URLSearchParams();
      bodyData.append('username', loginForm.username);
      bodyData.append('password', loginForm.password);

      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyData,
      });

      if (!response.ok) {
        throw new Error('Credenciais inválidas. Tente admin / 123456');
      }

      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setAppointments([]);
    setExams([]);
  };

  // MÁSCARA DE CPF
  const formatCPF = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleCPFChange = (e) => {
    setFormData({ ...formData, cpf: formatCPF(e.target.value) });
  };

  // OPERAÇÕES DO CRUD E MODAIS
  const handleOpenCreateModal = () => {
    setSelectedItem(null);
    setFormData({ patientName: '', cpf: '', examName: '', company: '', role: '', date: '', status: 'Pendente' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setSelectedItem(item);
    setFormData({ 
      patientName: item.patientName, 
      cpf: item.cpf, 
      examName: item.examName, 
      company: item.company || '',
      role: item.role || '',
      date: item.date, 
      status: item.status
    });
    setIsModalOpen(true);
  };

  const handleOpenQuickView = (item) => {
    setSelectedItem(item);
    setIsQuickViewOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.patientName || !formData.examName) return;

    if (selectedItem) {
      setAppointments(appointments.map(item => 
        item.id === selectedItem.id ? { ...item, ...formData } : item
      ));
    } else {
      setAppointments([{ id: Date.now(), ...formData }, ...appointments]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Deseja realmente cancelar este agendamento? Ele será marcado como 'Cancelado'.")) {
      try {
        await fetch(`${API_BASE_URL}/appointments/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error("Erro ao deletar agendamento no servidor:", err);
      }
      setAppointments(appointments.map(item => 
        item.id === id ? { ...item, status: 'Cancelado' } : item
      ));
    }
  };

  const handleToggleStatus = (id) => {
    setAppointments(appointments.map(item => {
      if (item.id === id) {
        const nextStatus = item.status === 'Pendente' ? 'Confirmado' : item.status === 'Confirmado' ? 'Cancelado' : 'Pendente';
        return { ...item, status: nextStatus };
      }
      return item;
    }));
  };

  const handleOpenDateModal = (item) => {
    setSelectedItem(item);
    setNewDate(item.date);
    setIsDateModalOpen(true);
  };

  const handleSaveDate = (e) => {
    e.preventDefault();
    if (!newDate) return;
    setAppointments(appointments.map(item => 
      item.id === selectedItem.id ? { ...item, date: newDate } : item
    ));
    setIsDateModalOpen(false);
  };

  // EXPORTAÇÃO CSV
  const handleExportCSV = () => {
    if (appointments.length === 0) return alert("Sem dados para exportar.");
    const headers = "ID,Paciente,CPF,Exame,Empresa,Cargo,Data,Status\n";
    const rows = appointments.map(a => `"${a.id}","${a.patientName}","${a.cpf}","${a.examName}","${a.company || ''}","${a.role || ''}","${a.date}","${a.status}"`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_agendamentos_ximed_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  // FILTRAGEM DE AGENDAMENTOS
  const filteredAppointments = useMemo(() => {
    return appointments.filter(item => {
      const matchesSearch = item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.examName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (item.company && item.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            item.cpf.includes(searchTerm);
      const matchesStatus = statusFilter === 'Todos' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [appointments, searchTerm, statusFilter]);

  // FILTRAGEM DO CATÁLOGO DE EXAMES
  const filteredExams = useMemo(() => {
    return exams.filter(e => 
      (e.name || '').toLowerCase().includes(examSearchTerm.toLowerCase()) ||
      (e.code || '').toLowerCase().includes(examSearchTerm.toLowerCase()) ||
      (e.category || '').toLowerCase().includes(examSearchTerm.toLowerCase())
    );
  }, [exams, examSearchTerm]);

  const confirmedCount = appointments.filter(a => a.status === 'Confirmado').length;
  const pendingCount = appointments.filter(a => a.status === 'Pendente').length;
  const canceledCount = appointments.filter(a => a.status === 'Cancelado').length;

  // --- TELA DE LOGIN (MOSTRADA SE NÃO ESTIVER AUTENTICADO) ---
  if (!token) {
    return (
      <div className="min-h-screen w-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 border border-slate-100">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-blue-50 border border-blue-100 mb-3">
              <img src={logoUrl} alt="XIMED" className="w-12 h-12 rounded-xl object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">XIMED Saúde Ocupacional</h1>
            <p className="text-xs text-slate-500 mt-1">Aceda à plataforma com o utilizador do sistema</p>
          </div>

          {loginError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold p-3.5 rounded-xl mb-4 text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Utilizador</label>
              <input
                type="text"
                name="username"
                autoComplete="username"
                required
                placeholder="Ex: admin"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Palavra-passe</label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm shadow-md transition"
            >
              Iniciar Sessão
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
            Utilizador padrão: <span className="font-semibold text-slate-600">admin</span> / Senha: <span className="font-semibold text-slate-600">123456</span>
          </div>
        </div>
      </div>
    );
  }

  // --- PAINEL PRINCIPAL DA APLICAÇÃO ---
  return (
    <div className="h-screen w-screen bg-slate-100 text-slate-800 flex flex-col md:flex-row font-sans overflow-hidden">
      
      {/* Topbar Mobile */}
      <div className="md:hidden bg-[#0A0F24] border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md text-white">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="XIMED Logo" className="w-8 h-8 rounded-lg object-cover border border-slate-700 shadow-sm" />
          <div>
            <span className="font-bold text-base block leading-none">XIMED</span>
            <span className="text-[9px] text-amber-400 font-semibold tracking-wider">SAÚDE OCUPACIONAL</span>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-300 hover:bg-slate-800 rounded-xl">
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" />}

      {/* Sidebar Escura */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-[#0A0F24] text-white p-6 flex flex-col justify-between shrink-0 h-full transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div>
          <div className="hidden md:flex items-center gap-3 mb-8 border-b border-slate-800/80 pb-6">
            <img src={logoUrl} alt="XIMED Logo" className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow-md" />
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-wide">XIMED</h1>
              <span className="text-[10px] text-amber-400 font-semibold tracking-wider block">SAÚDE OCUPACIONAL</span>
            </div>
          </div>

          <nav className="space-y-2">
            <button 
              onClick={() => { setActiveTab('agendamentos'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition ${activeTab === 'agendamentos' ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5" />
                <span>Agendamentos</span>
              </div>
              {pendingCount > 0 && (
                <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                  {pendingCount}
                </span>
              )}
            </button>

            <button 
              onClick={() => { setActiveTab('colaboradores'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition ${activeTab === 'colaboradores' ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5" />
                <span>Colaboradores / Vidas</span>
              </div>
              <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full font-medium">
                {collaborators.length}
              </span>
            </button>

            <button 
              onClick={() => { setActiveTab('pcmso'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition ${activeTab === 'pcmso' ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5" />
                <span>Catálogo PCMSO</span>
              </div>
              <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full font-medium">
                {exams.length}
              </span>
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-900/50 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-xs">
              AD
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Admin XIMED</p>
              <p className="text-xs text-slate-400">Autenticado</p>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            title="Sair do sistema"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 h-full overflow-y-auto p-4 md:p-8">
        
        {/* ABA 1: AGENDAMENTOS OCUPACIONAIS */}
        {activeTab === 'agendamentos' && (
          <>
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Agendamento de Exames Ocupacionais</h2>
                <p className="text-slate-500 text-sm">Painel de controle de exames clínicos XIMED.</p>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={handleExportCSV} title="Exportar CSV" className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition">
                  <Download className="w-4 h-4 text-blue-600" />
                  <span className="hidden sm:inline">Exportar Relatório</span>
                </button>
                <button onClick={handleOpenCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md transition active:scale-95">
                  <Plus className="w-4 h-4" />
                  <span>Novo Agendamento</span>
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <StatCard title="Exames Confirmados" value={confirmedCount.toString()} subtitle="ASOs Realizados" icon={<CheckCircle2 className="text-emerald-600" />} />
              <StatCard title="Exames Pendentes" value={pendingCount.toString()} subtitle="Aguardando Confirmação" icon={<Clock className="text-amber-600" />} />
              <StatCard title="Exames Cancelados" value={canceledCount.toString()} subtitle="Agendamentos Cancelados" icon={<XCircle className="text-rose-600" />} />
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Consultar por paciente, exame, empresa ou CPF..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {['Todos', 'Confirmado', 'Pendente', 'Cancelado'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${statusFilter === status ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-400 text-xs uppercase border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Paciente</th>
                      <th className="py-3 px-4 font-semibold">Exame a Realizar</th>
                      <th className="py-3 px-4 font-semibold">Empresa</th>
                      <th className="py-3 px-4 font-semibold">Data / Hora</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAppointments.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          <button 
                            onClick={() => handleOpenQuickView(item)}
                            className="hover:text-blue-600 transition flex items-center gap-1.5 text-left"
                            title="Clique para ver ficha rápida"
                          >
                            <span>{item.patientName}</span>
                            <Eye className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
                          </button>
                          <div className="text-xs font-normal text-slate-400">{item.cpf || 'Sem CPF'}</div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                            <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                            {item.examName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {item.company || 'XIMED Cliente'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">{item.date}</td>
                        <td className="py-3.5 px-4">
                          <button 
                            onClick={() => handleToggleStatus(item.id)}
                            title="Clique para alternar status"
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                              item.status === 'Confirmado' 
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60' 
                                : item.status === 'Cancelado'
                                ? 'bg-rose-50 text-rose-600 border border-rose-200/60'
                                : 'bg-amber-50 text-amber-600 border border-amber-200/60'
                            }`}
                          >
                            {item.status === 'Confirmado' && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {item.status === 'Pendente' && <Clock className="w-3.5 h-3.5" />}
                            {item.status === 'Cancelado' && <XCircle className="w-3.5 h-3.5" />}
                            {item.status}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleOpenQuickView(item)} title="Ver Ficha Rápida" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleOpenDateModal(item)} title="Alterar Data do Exame" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                              <CalendarDays className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleOpenEditModal(item)} title="Editar Agendamento" className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(item.id)} title="Cancelar Agendamento" className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAppointments.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-12">
                          <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-slate-500 font-medium text-sm">Nenhum agendamento encontrado</p>
                          <button onClick={handleOpenCreateModal} className="mt-3 bg-blue-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs hover:bg-blue-700 transition">
                            + Cadastrar Agendamento
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ABA 2: COLABORADORES */}
        {activeTab === 'colaboradores' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Colaboradores & Vidas ({collaborators.length})</h2>
            <p className="text-slate-500 text-sm mb-6">Lista sincronizada automaticamente com os agendamentos cadastrados no sistema.</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-400 text-xs uppercase border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Nome Completo</th>
                    <th className="py-3 px-4">CPF</th>
                    <th className="py-3 px-4">Cargo</th>
                    <th className="py-3 px-4">Empresa</th>
                    <th className="py-3 px-4">Status ASO</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {collaborators.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{c.name}</td>
                      <td className="py-3.5 px-4">{c.cpf}</td>
                      <td className="py-3.5 px-4">{c.role}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{c.company}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          c.status.includes('Apto') 
                            ? 'bg-emerald-50 text-emerald-600' 
                            : c.status.includes('Cancelado')
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button 
                          onClick={() => handleOpenQuickView(c)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                  {collaborators.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-10 text-slate-400">
                        Nenhum colaborador registrado. Cadastre um agendamento para adicionar automaticamente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 3: CATÁLOGO PCMSO */}
        {activeTab === 'pcmso' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Catálogo PCMSO / Exames ({filteredExams.length})</h2>
                <p className="text-slate-500 text-sm">Tabela oficial de exames cadastrados com padronização eSocial.</p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar exame ou categoria..." 
                  value={examSearchTerm}
                  onChange={(e) => setExamSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredExams.map(e => (
                <div key={e.id} className="border border-slate-200 rounded-xl p-4 hover:border-blue-500 hover:shadow-md transition bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {e.code || `EX-${e.id}`}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {e.periodicity || "Anual"}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm mb-1">{e.name}</h3>
                    <p className="text-xs text-slate-500 mb-3">{e.description || e.category || "Exame Ocupacional PCMSO"}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Valor Base:</span>
                    <span className="text-emerald-600">R$ {e.price ? e.price.toFixed(2) : "0.00"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL NOVO / EDITAR AGENDAMENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {selectedItem ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Colaborador *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.patientName} 
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CPF *</label>
                <input 
                  type="text" 
                  required 
                  maxLength={14}
                  value={formData.cpf} 
                  onChange={handleCPFChange}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Empresa Cliente *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.company} 
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Ex: Petrobras"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Exame Ocupacional *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.examName} 
                  onChange={(e) => setFormData({ ...formData, examName: e.target.value })}
                  placeholder="Ex: Audiometria Ocupacional"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data / Hora *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.date} 
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    placeholder="Ex: 24/10/2026 - 14:00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select 
                    value={formData.status} 
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none bg-white"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Confirmado">Confirmado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-xl text-sm transition">
                  Cancelar
                </button>
                <button type="submit" className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl text-sm transition shadow-md">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE FICHA RÁPIDA */}
      {isQuickViewOpen && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Ficha de Atendimento</h3>
              <button onClick={() => setIsQuickViewOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-700">
              <div>
                <span className="text-xs text-slate-400 block">Paciente / Colaborador</span>
                <span className="font-bold text-slate-900 text-base">{selectedItem.patientName || selectedItem.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-slate-400 block">CPF</span>
                  <span className="font-medium">{selectedItem.cpf || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Empresa</span>
                  <span className="font-medium">{selectedItem.company || 'XIMED Cliente'}</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Exame Solicitado</span>
                <span className="font-semibold text-blue-600">{selectedItem.examName}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Data do Exame</span>
                <span className="font-medium">{selectedItem.date}</span>
              </div>
            </div>

            <button onClick={() => setIsQuickViewOpen(false)} className="mt-6 w-full bg-slate-900 text-white font-semibold py-2 rounded-xl text-sm hover:bg-slate-800 transition">
              Fechar Ficha
            </button>
          </div>
        </div>
      )}

      {/* MODAL ALTERAR DATA */}
      {isDateModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-2xl border border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Reagendar Exame</h3>
            <form onSubmit={handleSaveDate} className="space-y-3">
              <input 
                type="text" 
                required 
                value={newDate} 
                onChange={(e) => setNewDate(e.target.value)}
                placeholder="Ex: 28/10/2026 - 10:30"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsDateModalOpen(false)} className="w-1/2 bg-slate-100 text-slate-700 font-semibold py-1.5 rounded-xl text-xs">
                  Cancelar
                </button>
                <button type="submit" className="w-1/2 bg-blue-600 text-white font-semibold py-1.5 rounded-xl text-xs shadow-md">
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// COMPONENTE DE CARD ESTATÍSTICO
function StatCard({ title, value, subtitle, icon }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
      <div>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
        <span className="text-xs text-slate-500">{subtitle}</span>
      </div>
      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
        {icon}
      </div>
    </div>
  );
}