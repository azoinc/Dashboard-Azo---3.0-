import React, { useState, useRef } from 'react';
import { useExpense } from '../context/ExpenseContext';
import { Project, ALL_PROJECTS } from '../types';
import { PlusCircle, Trash2, Image as ImageIcon, Upload, X } from 'lucide-react';
import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function Timeline() {
  const { timelineEvents, addTimelineEvent, deleteTimelineEvent, selectedMonthId, currentMonthData } = useExpense();
  
  const [date, setDate] = useState('');
  const [project, setProject] = useState<Project>(ALL_PROJECTS[0]);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [action, setAction] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentMonthData) return <div>Carregando...</div>;

  const currentMonthEvents = timelineEvents.filter(e => e.date.startsWith(selectedMonthId)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImageSelection = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !project || !title || !location || !action) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setIsUploading(true);
    let uploadedImageUrl = '';

    try {
      if (imageFile) {
        const storageRef = ref(storage, `timeline_images/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        uploadedImageUrl = await getDownloadURL(snapshot.ref);
      }

      addTimelineEvent({
        date,
        project,
        title,
        location,
        action,
        imageUrl: uploadedImageUrl
      });

      setDate('');
      setTitle('');
      setLocation('');
      setAction('');
      clearImageSelection();
      setIsAdding(false);
    } catch (error) {
      console.error("Error uploading image: ", error);
      alert("Erro ao fazer upload da imagem. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  if (selectedMonthId.endsWith('-ALL')) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Selecione um mês específico para visualizar a timeline diária.
      </div>
    );
  }

  // Generate days 1 to 30/31 for the current month
  const [year, month] = selectedMonthId.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Timeline</h2>
          <p className="text-slate-500 mt-1">
            Acompanhamento de ações diárias
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-sm transition-colors font-medium w-fit"
        >
          <PlusCircle size={20} />
          <span>Nova Ação</span>
        </button>
      </header>

      {isAdding && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Adicionar Ação na Timeline</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Empreendimento</label>
                <select
                  value={project}
                  onChange={(e) => setProject(e.target.value as Project)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                >
                  {ALL_PROJECTS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Ação de Panfletagem"
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Local</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Shopping Iguatemi"
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Imagem (Opcional)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl relative overflow-hidden group hover:border-emerald-500 transition-colors">
                  {imagePreview ? (
                    <div className="absolute inset-0 w-full h-full">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={clearImageSelection}
                          className="bg-rose-500 text-white p-2 rounded-full hover:bg-rose-600 transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-slate-400" />
                      <div className="flex text-sm text-slate-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-emerald-600 hover:text-emerald-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-emerald-500"
                        >
                          <span>Fazer upload de um arquivo</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-slate-500">PNG, JPG, GIF até 10MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ação</label>
              <textarea
                required
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="Descreva a ação realizada..."
                rows={3}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Ação</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentMonthEvents.map(event => (
          <div key={event.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            {event.imageUrl ? (
              <div className="h-48 w-full bg-slate-100 relative">
                <img src={event.imageUrl} alt={event.action} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="h-32 w-full bg-slate-50 flex items-center justify-center border-b border-slate-100">
                <ImageIcon size={32} className="text-slate-300" />
              </div>
            )}
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    {event.project}
                  </span>
                  <div className="text-xs text-slate-500 mt-2 font-medium">
                    {new Date(event.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                  </div>
                </div>
                <button
                  onClick={() => deleteTimelineEvent(event.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <h4 className="font-bold text-slate-800 mt-1">{event.title}</h4>
              <p className="text-xs text-slate-500 mt-1 font-medium">{event.location}</p>
              <p className="text-sm text-slate-600 mt-2 flex-1">{event.action}</p>
            </div>
          </div>
        ))}
        {currentMonthEvents.length === 0 && (
          <div className="col-span-full bg-slate-50 rounded-2xl border border-slate-200 border-dashed p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
              <ImageIcon size={24} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Nenhuma ação registrada</h3>
            <p className="text-slate-500 mt-1 max-w-md">
              Adicione ações diárias para acompanhar o histórico de atividades deste mês.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
