import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Target, Save, ChevronRight, ChevronLeft, Building2 } from 'lucide-react';
import { Project, ALL_PROJECTS, SalesGoal } from '../types';
import { formatCurrency } from '../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  salesGoals: SalesGoal[];
  setSalesGoals: React.Dispatch<React.SetStateAction<SalesGoal[]>>;
  currentYear: string;
}

export function SalesGoalModal({ isOpen, onClose, salesGoals, setSalesGoals, currentYear }: Props) {
  const [step, setStep] = useState(1);
  const [year, setYear] = useState(currentYear);
  const [activeProjects, setActiveProjects] = useState<string[]>(ALL_PROJECTS);
  const [newProject, setNewProject] = useState('');
  
  // Try to find existing goal for this year
  const existingGoal = salesGoals.find(g => g.year === year);
  
  const [projectsData, setProjectsData] = useState<{
    name: string;
    target: { unid: number; vgv: number };
    q1: { unid: number; vgv: number };
    q2: { unid: number; vgv: number };
    q3: { unid: number; vgv: number };
    q4: { unid: number; vgv: number };
  }[]>(existingGoal?.projects || activeProjects.map(p => ({
    name: p,
    target: { unid: 0, vgv: 0 },
    q1: { unid: 0, vgv: 0 },
    q2: { unid: 0, vgv: 0 },
    q3: { unid: 0, vgv: 0 },
    q4: { unid: 0, vgv: 0 },
  })));

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // If year changes, reset data or load existing
  const handleYearChange = (newYear: string) => {
    setYear(newYear);
    const found = salesGoals.find(g => g.year === newYear);
    if (found) {
      setProjectsData(found.projects);
      setActiveProjects(found.projects.map(p => p.name));
    } else {
      setProjectsData(activeProjects.map(p => ({
        name: p,
        target: { unid: 0, vgv: 0 },
        q1: { unid: 0, vgv: 0 },
        q2: { unid: 0, vgv: 0 },
        q3: { unid: 0, vgv: 0 },
        q4: { unid: 0, vgv: 0 },
      })));
    }
  };

  const handleProjectToggle = (project: string) => {
    if (activeProjects.includes(project)) {
      setActiveProjects(prev => prev.filter(p => p !== project));
      setProjectsData(prev => prev.filter(p => p.name !== project));
    } else {
      setActiveProjects(prev => [...prev, project]);
      setProjectsData(prev => [...prev, {
        name: project,
        target: { unid: 0, vgv: 0 },
        q1: { unid: 0, vgv: 0 },
        q2: { unid: 0, vgv: 0 },
        q3: { unid: 0, vgv: 0 },
        q4: { unid: 0, vgv: 0 },
      }]);
    }
  };

  const handleDataChange = (projectName: string, field: 'target' | 'q1' | 'q2' | 'q3' | 'q4', key: 'unid' | 'vgv', value: number) => {
    setProjectsData(prev => prev.map(p => {
      if (p.name === projectName) {
        return {
          ...p,
          [field]: { ...p[field], [key]: value }
        };
      }
      return p;
    }));
  };

  const handleSave = () => {
    const newGoal: SalesGoal = {
      id: year,
      year,
      projects: projectsData
    };
    
    setSalesGoals(prev => {
      const existingIdx = prev.findIndex(g => g.year === year);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = newGoal;
        return next;
      }
      return [...prev, newGoal];
    });
    onClose();
  };

  if (!isOpen) return null;

  const steps = [
    { id: 1, title: 'Definição Anual' },
    { id: 2, title: '1º Trimestre' },
    { id: 3, title: '2º Trimestre' },
    { id: 4, title: '3º Trimestre' },
    { id: 5, title: '4º Trimestre' },
  ];

  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Target className="text-rose-500" />
              Geral & Projetos Ativos
            </h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Ano base da meta</label>
              <select 
                value={year}
                onChange={(e) => handleYearChange(e.target.value)}
                className="w-full md:w-1/3 px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-none"
              >
                {[2023, 2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y.toString()}>{y}</option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-3">Selecione os projetos ativos para este ano</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from(new Set([...ALL_PROJECTS, ...activeProjects])).map(proj => (
                  <label key={proj} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${activeProjects.includes(proj) ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <input 
                      type="checkbox" 
                      checked={activeProjects.includes(proj)}
                      onChange={() => handleProjectToggle(proj)}
                      className="rounded text-rose-500 focus:ring-rose-500"
                    />
                    <span className="text-sm font-medium">{proj}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4 flex max-w-sm">
                <input 
                  type="text"
                  value={newProject}
                  onChange={e => setNewProject(e.target.value)}
                  placeholder="Novo Projeto"
                  className="flex-1 px-4 py-2 text-sm rounded-l-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-none"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newProject.trim()) {
                      e.preventDefault();
                      if (!activeProjects.includes(newProject.trim())) {
                        handleProjectToggle(newProject.trim());
                      }
                      setNewProject('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newProject.trim() && !activeProjects.includes(newProject.trim())) {
                      handleProjectToggle(newProject.trim());
                      setNewProject('');
                    }
                  }}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-r-xl transition-colors"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>

          {activeProjects.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h4 className="text-md font-bold text-slate-800 mb-4">Meta Total do Ano por Projeto</h4>
              <div className="space-y-4">
                {projectsData.map(proj => (
                  <div key={proj.name} className="flex flex-col md:flex-row gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="w-full md:w-1/3 font-bold text-slate-700 flex items-center gap-2">
                      <Building2 size={18} className="text-slate-400" />
                      {proj.name}
                    </div>
                    <div className="w-full md:w-1/3">
                      <label className="text-xs text-slate-500 mb-1 block">Meta Unidades</label>
                      <input 
                        type="number"
                        onWheel={(e) => e.currentTarget.blur()}
                        value={proj.target.unid || ''}
                        onChange={(e) => handleDataChange(proj.name, 'target', 'unid', Number(e.target.value))}
                        className="w-full px-4 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-none"
                        placeholder="Ex: 50"
                      />
                    </div>
                    <div className="w-full md:w-1/3">
                      <label className="text-xs text-slate-500 mb-1 block">Meta VGV (VP) R$</label>
                      <input 
                        type="number"
                        onWheel={(e) => e.currentTarget.blur()}
                        value={proj.target.vgv || ''}
                        onChange={(e) => handleDataChange(proj.name, 'target', 'vgv', Number(e.target.value))}
                        className="w-full px-4 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-none"
                        placeholder="Ex: 15000000"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    const quarterField = `q${step - 1}` as 'q1' | 'q2' | 'q3' | 'q4';
    const quarterName = steps.find(s => s.id === step)?.title;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Target className="text-rose-500" />
            Metas {quarterName} ({year})
          </h3>
          <div className="space-y-4">
            {projectsData.map(proj => {
              const qData = proj[quarterField];
              return (
                <div key={proj.name} className="flex flex-col md:flex-row gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="w-full md:w-1/3 font-bold text-slate-700 flex items-center gap-2">
                    <Building2 size={18} className="text-slate-400" />
                    {proj.name}
                  </div>
                  <div className="w-full md:w-1/3">
                    <label className="text-xs text-slate-500 mb-1 block">Meta Unidades</label>
                    <input 
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={qData.unid || ''}
                      onChange={(e) => handleDataChange(proj.name, quarterField, 'unid', Number(e.target.value))}
                      className="w-full px-4 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-none"
                      placeholder="Ex: 12"
                    />
                  </div>
                  <div className="w-full md:w-1/3">
                    <label className="text-xs text-slate-500 mb-1 block">Meta VGV (VP) R$</label>
                    <input 
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={qData.vgv || ''}
                      onChange={(e) => handleDataChange(proj.name, quarterField, 'vgv', Number(e.target.value))}
                      className="w-full px-4 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-none"
                      placeholder="Ex: 3500000"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4 sm:p-6 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[100dvh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Configure as Metas (Projetos Ativos)</h2>
          <button onClick={onClose} className="text-slate-400 hover:bg-slate-100 hover:text-slate-600 p-2 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Gamified Stepper */}
        <div className="bg-slate-50 border-b border-slate-100 p-6 shrink-0">
          <div className="flex justify-between items-center relative">
            <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 bg-slate-200 z-0 rounded-full" />
            {steps.map((s, index) => (
              <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
                <button 
                  onClick={() => setStep(s.id)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                    step === s.id 
                      ? 'bg-rose-500 text-white ring-4 ring-rose-100 scale-110' 
                      : step > s.id 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-white text-slate-400 border-2 border-slate-200 hover:border-rose-300'
                  }`}
                >
                  {s.id}
                </button>
                <span className={`text-xs font-medium hidden md:block ${step === s.id ? 'text-rose-600' : 'text-slate-500'}`}>{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
          <button
            onClick={() => setStep(prev => Math.max(1, prev - 1))}
            disabled={step === 1}
            className="px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 transition-colors disabled:opacity-50"
          >
            <ChevronLeft size={18} /> Anterior
          </button>

          {step < 5 ? (
            <button
              onClick={() => setStep(prev => Math.min(5, prev + 1))}
              className="px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 bg-[#61072E] text-white hover:bg-rose-900 transition-colors"
            >
              Próximo <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 transition-all hover:scale-105"
            >
              <Save size={18} /> Salvar Metas
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
