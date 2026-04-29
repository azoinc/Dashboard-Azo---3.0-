import React from 'react';
import { Target, HardHat } from 'lucide-react';

export default function CommercialPipeline() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 animate-in fade-in duration-500">
      {/* Quando tiver a imagem, substitua o ícone abaixo por: <img src="/seu-caminho-da-imagem.png" alt="Em construção" className="w-64 mb-6" /> */}
      <HardHat size={80} className="text-indigo-200 mb-6" />
      <h2 className="text-3xl font-bold text-slate-800 mb-2">Pipeline</h2>
      <p className="text-lg">Esta seção está em construção.</p>
    </div>
  );
}
