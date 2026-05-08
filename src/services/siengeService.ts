// src/services/siengeService.ts

const SIENGE_SUBDOMAIN = import.meta.env.VITE_SIENGE_SUBDOMAIN || '';
const SIENGE_API_USER = import.meta.env.VITE_SIENGE_API_USER || '';
const SIENGE_API_PASSWORD = import.meta.env.VITE_SIENGE_API_PASSWORD || '';

const getBaseUrl = () => `https://api.sienge.com.br/${SIENGE_SUBDOMAIN}/api/v1`;

const getHeaders = () => {
  const credentials = btoa(`${SIENGE_API_USER}:${SIENGE_API_PASSWORD}`);
  return {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
  };
};

export const siengeService = {
  // 1. Buscar Empreendimentos
  async getEmpreendimentos() {
    if (!SIENGE_SUBDOMAIN) return [];
    try {
      const response = await fetch(`${getBaseUrl()}/enterprises`, { headers: getHeaders() });
      if (!response.ok) throw new Error('Erro ao buscar empreendimentos');
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Sienge API Error:', error);
      return [];
    }
  },

  // 2. Buscar Estoque (Unidades Disponíveis)
  async getEstoque(enterpriseId: number) {
    if (!SIENGE_SUBDOMAIN) return { total: 0, disponiveis: 0, vgvEstoque: 0 };
    try {
      const response = await fetch(`${getBaseUrl()}/enterprises/${enterpriseId}/units`, { headers: getHeaders() });
      if (!response.ok) throw new Error('Erro ao buscar unidades');
      const data = await response.json();
      
      console.log(`Unidades Sienge API Response for ${enterpriseId}:`, data.results && data.results[0]);
      
      // "unidades que não foram vendidas"
      const disponiveisUnits = data.results?.filter((u: any) => {
        const status = String(u.status || '').toUpperCase();
        return status !== 'VENDIDA' && status !== 'SOLD' && !status.includes('VENDID');
      }) || [];
      
      const disponiveis = disponiveisUnits.length || 0;
      
      const vgvEstoque = disponiveisUnits.reduce((acc: number, curr: any) => {
        const unitValue = 
          curr.vgv || 
          curr.basePrice || 
          curr.price || 
          curr.salePrice || 
          curr.suggestedPrice || 
          curr.contractValue || 
          curr.value || 
          curr.cubPrice || 
          curr.appraisalValue || 
          (curr.prices && curr.prices.length > 0 ? curr.prices[0].value : 0) ||
          (curr.pricing ? curr.pricing.value || curr.pricing.price : 0) ||
          0;
        return acc + unitValue;
      }, 0) || 0;
      
      console.log(`Enterprise ${enterpriseId} disponiveis:`, disponiveis, 'vgvEstoque:', vgvEstoque);
      return {
        total: data.metadata?.total || 0,
        disponiveis,
        vgvEstoque
      };
    } catch (error) {
      console.error('Sienge API Error:', error);
      return { total: 0, disponiveis: 0, vgvEstoque: 0 };
    }
  },

  // 3. Buscar Vendas (Contratos Comerciais)
  async getVendas(startDate: string, endDate: string) {
    if (!SIENGE_SUBDOMAIN) return { vendas: 0, vgv: 0 };
    try {
      const response = await fetch(`${getBaseUrl()}/commercial-contracts?startDate=${startDate}&endDate=${endDate}`, { headers: getHeaders() });
      if (!response.ok) throw new Error('Erro ao buscar vendas');
      const data = await response.json();
      
      const vendas = data.results?.length || 0;
      const vgv = data.results?.reduce((acc: number, curr: any) => acc + (curr.contractValue || 0), 0) || 0;
      
      return { vendas, vgv };
    } catch (error) {
      console.error('Sienge API Error:', error);
      return { vendas: 0, vgv: 0 };
    }
  },

  // 4. Buscar Custos (Contas a Pagar - Realizado)
  async getCustosMarketing(startDate: string, endDate: string) {
    if (!SIENGE_SUBDOMAIN) return [];
    try {
      const response = await fetch(`${getBaseUrl()}/bills?paymentDateStart=${startDate}&paymentDateEnd=${endDate}`, { headers: getHeaders() });
      if (!response.ok) throw new Error('Erro ao buscar contas a pagar');
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Sienge API Error:', error);
      return [];
    }
  }
};
