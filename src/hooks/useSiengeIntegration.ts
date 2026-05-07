import { useState, useEffect } from 'react';
import { siengeService } from '../services/siengeService';

export function useSiengeIntegration(startDate: string, endDate: string) {
  const [siengeData, setSiengeData] = useState({
    vendas: 0,
    vgv: 0,
    estoque: 0,
    vgvEstoque: 0,
    custos: [],
    loading: false,
    isConfigured: !!import.meta.env.VITE_SIENGE_SUBDOMAIN
  });

  useEffect(() => {
    async function fetchData() {
      if (!siengeData.isConfigured || !startDate || !endDate) return;
      
      setSiengeData(prev => ({ ...prev, loading: true }));
      
      try {
        const [vendasData, custosData, empreendimentos] = await Promise.all([
          siengeService.getVendas(startDate, endDate),
          siengeService.getCustosMarketing(startDate, endDate),
          siengeService.getEmpreendimentos()
        ]);

        let sumEstoque = 0;
        let sumVgvEstoque = 0;
        if (empreendimentos && empreendimentos.length > 0) {
           const estoques = await Promise.all(
              empreendimentos.map((emp: any) => siengeService.getEstoque(emp.id))
           );
           estoques.forEach(est => {
             sumEstoque += est.disponiveis || 0;
             sumVgvEstoque += est.vgvEstoque || 0;
           });
        }
        
        setSiengeData(prev => ({
          ...prev,
          vendas: vendasData.vendas,
          vgv: vendasData.vgv,
          estoque: sumEstoque,
          vgvEstoque: sumVgvEstoque,
          custos: custosData,
          loading: false
        }));
      } catch (error) {
        console.error("Erro ao carregar dados do Sienge", error);
        setSiengeData(prev => ({ ...prev, loading: false }));
      }
    }

    fetchData();
  }, [startDate, endDate, siengeData.isConfigured]);

  return siengeData;
}
