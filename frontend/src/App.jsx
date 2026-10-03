import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Calendar, 
  Users, 
  Activity, 
  Plus, 
  Trash2, 
  Clock, 
  Search,
  Phone,
  FileText,
  CheckCircle2,
  XCircle,
  MapPin,
  Edit2
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function App() {
  const [activeTab, setActiveTab] = useState('exams');
  const [patients, setPatients] = useState([]);
  const [exams, setExams] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Toast Notification
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Formulários de Estado
  const [patientForm, setPatientForm] = useState({ name: '', cpf: '', phone: '', company: '' });
  
  // Estado para Formulário de Exame (Criar / Editar - CRUD)
  const [examForm, setExamForm] = useState({ name: '', description: '', price: '' });
  const [editingExamId, setEditingExamId] = useState(null);

  const [appointmentForm, setAppointmentForm] = useState({ 
    patient_id: '', 
    exam_id: '', 
    appointment_date: '',
    exam_type: 'Admissional',
    unit: 'Unidade Nova América'
  });

  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const fetchData = async () => {
    try {
      const [resPatients, resExams, resAppointments] = await Promise.all([
        axios.get(`${API_BASE}/patients`),
        axios.get(`${API_BASE}/exams`),
        axios.get(`${API_BASE}/appointments`),
      ]);
      setPatients(resPatients.data);
      setExams(resExams.data);
      
      const formattedApps = resAppointments.data.map(app => ({
        ...app,
        aso_status: app.aso_status || 'Apto (ASO Emitido)',
        exam_type: app.exam_type || 'Periódico Ocupacional',
        unit: app.unit || 'Unidade Nova América'
      }));
      setAppointments(formattedApps);
    } catch (err) {
      console.error("Erro no fetchData:", err);
      showNotification('Erro na conexão com a API FastAPI', 'error');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCPF = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  // --- CRUD COLABORADORES ---
  const handleCreatePatient = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/patients`, patientForm);
      setPatientForm({ name: '', cpf: '', phone: '', company: '' });
      showNotification('Colaborador registrado no cadastro de SST!');
      fetchData();
    } catch (err) {
      console.error("Erro ao criar paciente:", err.response?.data || err.message);
      showNotification(err.response?.data?.detail || 'Erro ao cadastrar colaborador', 'error');
    }
  };

  // --- CRUD EXAMES (PCMSO) ---
  const handleSaveExam = async (e) => {
    e.preventDefault();
    try {
      const parsedPrice = parseFloat(examForm.price);
      if (isNaN(parsedPrice)) {
        showNotification('Informe um valor numérico válido para o preço', 'error');
        return;
      }

      const payload = {
        name: examForm.name,
        description: examForm.description || '',
        price: parsedPrice
      };
      
      if (editingExamId) {
        await axios.put(`${API_BASE}/exams/${editingExamId}`, payload);
        showNotification('Exame atualizado no PCMSO!');
      } else {
        await axios.post(`${API_BASE}/exams`, payload);
        showNotification('Exame adicionado ao catálogo PCMSO!');
      }

      // LIMPA FORMULÁRIO E MODO EDIÇÃO
      setEditingExamId(null);
      setExamForm({ name: '', description: '', price: '' });
      fetchData();
    } catch (err) {
      console.error("Erro detalhado ao salvar exame:", err.response?.data || err.message);
      showNotification(err.response?.data?.detail || 'Erro ao salvar exame no backend', 'error');
    }
  };

  const handleEditExam = (exam) => {
    setEditingExamId(exam.id);
    setExamForm({
      name: exam.name,
      description: exam.description || '',
      price: exam.price.toString()
    });
  };

  const handleCancelEditExam = () => {
    setEditingExamId(null);
    setExamForm({ name: '', description: '', price: '' });
  };

  const handleDeleteExam = async (id) => {
    if (confirm('Deseja remover este exame do catálogo PCMSO?')) {
      try {
        await axios.delete(`${API_BASE}/exams/${id}`);
        showNotification('Exame removido com sucesso', 'warning');
        
        if (editingExamId === id) {
          setEditingExamId(null);
          setExamForm({ name: '', description: '', price: '' });
        }

        fetchData();
      } catch (err) {
        console.error("Erro ao deletar exame:", err.response?.data || err.message);
        showNotification(err.response?.data?.detail || 'Erro ao excluir exame', 'error');
      }
    }
  };

  // --- CRUD AGENDAMENTOS ---
  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/appointments`, {
        patient_id: parseInt(appointmentForm.patient_id),
        exam_id: parseInt(appointmentForm.exam_id),
        appointment_date: appointmentForm.appointment_date,
      });
      setAppointmentForm({ 
        patient_id: '', 
        exam_id: '', 
        appointment_date: '', 
        exam_type: 'Admissional',
        unit: 'Unidade Nova América' 
      });
      showNotification('Agendamento SST gerado com sucesso!');
      fetchData();
    } catch (err) {
      console.error("Erro ao criar agendamento:", err.response?.data || err.message);
      showNotification(err.response?.data?.detail || 'Erro ao agendar exame', 'error');
    }
  };

  const handleDeleteAppointment = async (id) => {
    if (confirm('Deseja cancelar o agendamento ocupacional deste colaborador?')) {
      try {
        await axios.delete(`${API_BASE}/appointments/${id}`);
        showNotification('Agendamento removido', 'warning');
        fetchData();
      } catch (err) {
        console.error("Erro ao deletar agendamento:", err.response?.data || err.message);
        showNotification('Erro ao cancelar agendamento', 'error');
      }
    }
  };

  const toggleAsoStatus = (id) => {
    setAppointments(prev => prev.map(app => {
      if (app.id === id) {
        const nextStatus = app.aso_status === 'Apto (ASO Emitido)' ? 'Pendente ASO' : 'Apto (ASO Emitido)';
        showNotification(`Status ASO alterado: ${nextStatus}`);
        return { ...app, aso_status: nextStatus };
      }
      return app;
    }));
  };

  const filteredAppointments = appointments.filter(app => {
    const patientName = app.patient?.name?.toLowerCase() || '';
    const examName = app.exam?.name?.toLowerCase() || '';
    const query = searchTerm.toLowerCase();
    return patientName.includes(query) || examName.includes(query);
  });

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden relative">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-semibold transition-all transform animate-bounce ${
          toast.type === 'error' 
            ? 'bg-rose-600 text-white border-rose-700' 
            : toast.type === 'warning'
            ? 'bg-amber-500 text-white border-amber-600'
            : 'bg-sky-600 text-white border-sky-700'
        }`}>
          {toast.type === 'error' ? <XCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Sidebar - w-80 */}
      <aside className="w-80 bg-slate-950 text-slate-300 flex flex-col justify-between p-5 shadow-2xl border-r border-slate-800 shrink-0">
        <div>
          {/* Logo Ximed */}
          <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-slate-800">
            <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
              <div className="absolute bg-white w-8 h-2.5 rounded-sm"></div>
              <div className="absolute bg-white w-2.5 h-8 rounded-sm"></div>
              <div className="z-10 w-2.5 h-2.5 bg-amber-400 rounded-tr-full rounded-bl-full shadow-inner"></div>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-wider leading-none">XIMED</h1>
              <div className="w-full bg-amber-400 h-0.5 my-0.5"></div>
              <p className="text-[9px] text-slate-200 font-semibold uppercase tracking-tight">Saúde Ocupacional</p>
            </div>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'appointments'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 font-semibold'
                  : 'hover:bg-slate-900 hover:text-slate-100 text-slate-400'
              }`}
            >
              <Calendar className="w-5 h-5 shrink-0" />
              <span>Agendamentos Ocupacionais</span>
            </button>

            <button
              onClick={() => setActiveTab('patients')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'patients'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 font-semibold'
                  : 'hover:bg-slate-900 hover:text-slate-100 text-slate-400'
              }`}
            >
              <Users className="w-5 h-5 shrink-0" />
              <span>Colaboradores / Vidas</span>
            </button>

            <button
              onClick={() => setActiveTab('exams')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'exams'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 font-semibold'
                  : 'hover:bg-slate-900 hover:text-slate-100 text-slate-400'
              }`}
            >
              <Activity className="w-5 h-5 shrink-0" />
              <span>Catálogo PCMSO / Exames</span>
            </button>
          </nav>
        </div>

        <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-200 font-semibold">eSocial Evento S-2220</span>
          </div>
          <p className="text-[11px] text-slate-400">Conformidade Legal & NR-07</p>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {activeTab === 'appointments' && 'Gestão de Agendamentos & Emissão ASO'}
              {activeTab === 'patients' && 'Prontuário de Vidas Gerenciadas'}
              {activeTab === 'exams' && 'Exames Complementares (PCMSO)'}
            </h2>
            <p className="text-xs text-slate-500">
              Plataforma Integrada de Gestão de Saúde Ocupacional e Segurança do Trabalho.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-right">
              <span className="text-[11px] text-slate-400 block font-semibold uppercase tracking-wider">Agendamentos</span>
              <span className="text-base font-extrabold text-slate-800">{appointments.length}</span>
            </div>
            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-right">
              <span className="text-[11px] text-slate-400 block font-semibold uppercase tracking-wider">Vidas Gerenciadas</span>
              <span className="text-base font-extrabold text-sky-600">{patients.length}</span>
            </div>
          </div>
        </header>

        <main className="p-8">

          {/* TAB 1: AGENDAMENTOS */}
          {activeTab === 'appointments' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                <div className="flex items-center gap-2 mb-6 border-b pb-4 border-slate-100">
                  <Plus className="w-5 h-5 text-sky-600" />
                  <h3 className="font-bold text-slate-800">Novo Agendamento SST</h3>
                </div>

                <form onSubmit={handleCreateAppointment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Colaborador / Funcionário</label>
                    <select
                      required
                      value={appointmentForm.patient_id}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, patient_id: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition outline-none"
                    >
                      <option value="">Selecione o colaborador...</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} (CPF: {p.cpf})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Unidade Ximed de Atendimento</label>
                    <select
                      value={appointmentForm.unit}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, unit: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition outline-none"
                    >
                      <option value="Unidade Nova América">Unidade Nova América (RJ)</option>
                      <option value="Unidade Barra da Tijuca">Unidade Barra da Tijuca (RJ)</option>
                      <option value="Unidade Centro">Unidade Centro (RJ)</option>
                      <option value="Rede Credenciada Nacional">Rede Credenciada (Nacional)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo de Exame Ocupacional</label>
                    <select
                      value={appointmentForm.exam_type}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, exam_type: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition outline-none"
                    >
                      <option value="Admissional">Admissional</option>
                      <option value="Periódico">Periódico</option>
                      <option value="Demissional">Demissional</option>
                      <option value="Retorno ao Trabalho">Retorno ao Trabalho</option>
                      <option value="Mudança de Risco">Mudança de Risco Ocupacional</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Exame / Procedimento</label>
                    <select
                      required
                      value={appointmentForm.exam_id}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, exam_id: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition outline-none"
                    >
                      <option value="">Selecione o exame...</option>
                      {exams.map((e) => (
                        <option key={e.id} value={e.id}>{e.name} — R$ {parseFloat(e.price).toFixed(2)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Data e Hora da Consulta</label>
                    <input
                      type="datetime-local"
                      required
                      value={appointmentForm.appointment_date}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, appointment_date: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-xl shadow-md shadow-sky-500/20 transition-all"
                  >
                    Confirmar Agendamento SST
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800">Painel de Atendimentos & Status ASO</h3>
                    <p className="text-xs text-slate-400">Controle de presença e alteração direta do Atestado Ocupacional</p>
                  </div>
                  
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Pesquisar colaborador ou exame..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white transition outline-none w-full sm:w-64"
                    />
                  </div>
                </div>

                {filteredAppointments.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-sm">
                    Nenhum agendamento localizado na base de dados.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase font-bold tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="p-4 px-6">Colaborador / Unidade</th>
                          <th className="p-4">Exame / Tipo</th>
                          <th className="p-4">Data / Hora</th>
                          <th className="p-4">Status ASO</th>
                          <th className="p-4 text-right px-6">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAppointments.map((app) => (
                          <tr key={app.id} className="hover:bg-slate-50/80 transition-all">
                            <td className="p-4 px-6">
                              <span className="font-bold text-slate-800 block">
                                {app.patient?.name || 'Colaborador Registrado'}
                              </span>
                              <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-sky-500" />
                                {app.unit}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="bg-sky-50 text-sky-800 px-3 py-1 rounded-full text-xs font-bold block w-fit mb-1">
                                {app.exam?.name || 'Exame'}
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium">
                                {app.exam_type}
                              </span>
                            </td>
                            <td className="p-4 text-slate-600 font-medium text-xs">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {new Date(app.appointment_date).toLocaleString('pt-BR')}
                              </div>
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => toggleAsoStatus(app.id)}
                                className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition ${
                                  app.aso_status === 'Apto (ASO Emitido)'
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                }`}
                              >
                                {app.aso_status === 'Apto (ASO Emitido)' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                {app.aso_status}
                              </button>
                            </td>
                            <td className="p-4 text-right px-6">
                              <button
                                onClick={() => handleDeleteAppointment(app.id)}
                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Cancelar Agendamento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: COLABORADORES */}
          {activeTab === 'patients' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                <div className="flex items-center gap-2 mb-6 border-b pb-4 border-slate-100">
                  <Users className="w-5 h-5 text-sky-600" />
                  <h3 className="font-bold text-slate-800">Cadastrar Novo Colaborador</h3>
                </div>

                <form onSubmit={handleCreatePatient} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nome Completo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos Eduardo de Sousa"
                      value={patientForm.name}
                      onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">CPF (eSocial)</label>
                    <input
                      type="text"
                      required
                      placeholder="000.000.000-00"
                      value={patientForm.cpf}
                      onChange={(e) => setPatientForm({ ...patientForm, cpf: formatCPF(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Telefone / Contato</label>
                    <input
                      type="text"
                      required
                      placeholder="(21) 90000-0000"
                      value={patientForm.phone}
                      onChange={(e) => setPatientForm({ ...patientForm, phone: formatPhone(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition outline-none font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-xl shadow-md shadow-sky-500/20 transition-all"
                  >
                    Salvar Registro de Colaborador
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800">Base de Vidas Gerenciadas</h3>
                </div>

                <div className="divide-y divide-slate-100">
                  {patients.map((p) => (
                    <div key={p.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center font-bold text-sm">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{p.name}</h4>
                          <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-slate-400" /> CPF: {p.cpf}</span>
                            <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> Contato: {p.phone}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CATÁLOGO PCMSO COM CRUD COMPLETO */}
          {activeTab === 'exams' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                <div className="flex items-center justify-between mb-6 border-b pb-4 border-slate-100">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-sky-600" />
                    <h3 className="font-bold text-slate-800">
                      {editingExamId ? 'Editar Exame' : 'Novo Exame (PCMSO)'}
                    </h3>
                  </div>
                  {editingExamId && (
                    <button 
                      type="button" 
                      onClick={handleCancelEditExam}
                      className="text-xs text-slate-400 hover:text-slate-600 underline"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveExam} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nome do Exame</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Espirometria Ocupacional"
                      value={examForm.name}
                      onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Norma Regulamentadora / Descrição</label>
                    <input
                      type="text"
                      placeholder="Ex: NR-07 / Avaliação de capacidade pulmonar"
                      value={examForm.description}
                      onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Valor do Exame (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="95.00"
                      value={examForm.price}
                      onChange={(e) => setExamForm({ ...examForm, price: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white transition outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-xl shadow-md shadow-sky-500/20 transition-all"
                  >
                    {editingExamId ? 'Salvar Alterações no PCMSO' : 'Adicionar ao Catálogo PCMSO'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Tabela Geral de Exames do PCMSO</h3>
                  <span className="text-xs font-semibold text-slate-400">{exams.length} exames</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {exams.map((e) => (
                    <div key={e.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{e.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{e.description || 'Exame registrado sem especificação de NR'}</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-sm">
                          R$ {parseFloat(e.price).toFixed(2)}
                        </span>

                        <button
                          onClick={() => handleEditExam(e)}
                          className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition"
                          title="Editar Exame"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteExam(e.id)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Excluir Exame"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}