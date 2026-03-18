import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { ExpenseCategory, PUBLICIDADE_CATEGORIES, MANUTENCAO_STAND_CATEGORIES, INSTITUCIONAL_CATEGORIES, PRODUTOS_CATEGORIES, City, Project, PROJECTS_BY_CITY } from '../types';

interface TransactionModalProps {
  activeTab?: 'dashboard' | 'entry' | 'commercial' | 'institucional' | 'timeline' | 'admin';
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ activeTab }) => {
  const { isModalOpen, setIsModalOpen, addTransaction, selectedCity, selectedProject, userRole } = useExpense();
  
  const [date, setDate] = useState('');
  const [type, setType] = useState<'Publicidade' | 'Manutenção de Stand' | 'Institucional' | 'Produtos'>('Publicidade');
  const [category, setCategory] = useState<ExpenseCategory>(PUBLICIDADE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  
  const [city, setCity] = useState<City>(selectedCity !== 'ALL' ? selectedCity : 'Rio de Janeiro');
  const [project, setProject] = useState<Project>(selectedProject !== 'ALL' ? selectedProject : PROJECTS_BY_CITY[city][0]);

  useEffect(() => {
    if (isModalOpen) {
      const today = new Date();
      setDate(today.toISOString().split('T')[0]);
      
      if (activeTab === 'institucional') {
        setType('Institucional');
        setCategory(INSTITUCIONAL_CATEGORIES[0]);
      } else {
        setType('Publicidade');
        setCategory(PUBLICIDADE_CATEGORIES[0]);
      }
      
      setAmount('');
      setDescription('');
      
      const initialCity = selectedCity !== 'ALL' ? selectedCity : 'Rio de Janeiro';
      setCity(initialCity);
      setProject(selectedProject !== 'ALL' ? selectedProject : PROJECTS_BY_CITY[initialCity][0]);
    }
  }, [isModalOpen, selectedCity, selectedProject]);

  useEffect(() => {
    if (!PROJECTS_BY_CITY[city].includes(project)) {
      setProject(PROJECTS_BY_CITY[city][0]);
    }
  }, [city]);

  useEffect(() => {
    if (type === 'Publicidade') {
      setCategory(PUBLICIDADE_CATEGORIES[0]);
    } else if (type === 'Manutenção de Stand') {
      setCategory(MANUTENCAO_STAND_CATEGORIES[0]);
    } else if (type === 'Produtos') {
      setCategory(PRODUTOS_CATEGORIES[0]);
    } else {
      setCategory(INSTITUCIONAL_CATEGORIES[0]);
    }
  }, [type]);

  if (!isModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Por favor, insira um valor válido.');
      return;
    }

    addTransaction({
      date,
      city,
      project,
      type,
      category,
      amount: numAmount,
      description
    });

    setIsModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Novo Lançamento</h2>
          <button 
            onClick={() => setIsModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
            <input
              type="date"
              required
              value={date}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value as City)}
              disabled={userRole !== 'MASTER' && userRole !== 'ADMINISTRATIVO'}
              className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="Rio de Janeiro">Rio de Janeiro</option>
              <option value="Campinas">Campinas</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Empreendimento</label>
            <select
              value={project}
              onChange={(e) => setProject(e.target.value as Project)}
              className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
            >
              {PROJECTS_BY_CITY[city].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
            <div className={`grid gap-2 ${activeTab === 'institucional' ? 'grid-cols-1' : 'grid-cols-3'}`}>
              {activeTab !== 'institucional' && (
                <>
                  <button
                    type="button"
                    onClick={() => setType('Publicidade')}
                    className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all ${type === 'Publicidade' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    Publicidade
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('Manutenção de Stand')}
                    className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all ${type === 'Manutenção de Stand' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    Manutenção de Stand
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('Produtos')}
                    className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all ${type === 'Produtos' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    Produtos
                  </button>
                </>
              )}
              {activeTab === 'institucional' && (
                <button
                  type="button"
                  onClick={() => setType('Institucional')}
                  className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all ${type === 'Institucional' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Institucional
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
            >
              {(type === 'Publicidade' ? PUBLICIDADE_CATEGORIES : type === 'Manutenção de Stand' ? MANUTENCAO_STAND_CATEGORIES : type === 'Produtos' ? PRODUTOS_CATEGORIES : INSTITUCIONAL_CATEGORIES).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição (Opcional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Pagamento agência XYZ"
              className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
              <input
                type="number"
                required
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-colors"
            >
              Salvar Lançamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
