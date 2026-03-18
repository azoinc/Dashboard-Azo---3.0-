export type ExpenseCategory = 
  | 'AGÊNCIA OFF'
  | 'AGÊNCIA ON'
  | 'PROMOÇÃO'
  | 'PRODUÇÃO GRAFICA'
  | 'PRODUÇÃO DE COMUNICAÇÃO VISUAL'
  | 'PRODUÇÃO AUDIO VISUAL'
  | 'EVENTOS'
  | 'REUNIÕES MENSAIS IMOBS'
  | 'MÍDIA ON'
  | 'MIDIA OFF'
  | 'DESMOBILIZAÇÃO'
  | 'MANUTENÇÃO'
  | 'CASA DECORADA'
  | 'AGÊNCIA INSTITUCIONAL'
  | 'ASSESSORIA DE IMPRENSA'
  | 'BRINDES AZO EVS'
  | 'EVENTOS | ATIVAÇÃO'
  | 'PATROCINIOS'
  | 'PRÊMIOS DO MERCADO'
  | 'SOFTWARE | PLATAFORMAS'
  | 'SITE | MANUTENÇÃO'
  | 'MARCAS E PATENTE'
  | 'HOSPEDAGEM/DOMINIOS'
  | 'PRODUTOS GERAIS';

export const PUBLICIDADE_CATEGORIES: ExpenseCategory[] = [
  'AGÊNCIA OFF',
  'AGÊNCIA ON',
  'PROMOÇÃO',
  'PRODUÇÃO GRAFICA',
  'PRODUÇÃO DE COMUNICAÇÃO VISUAL',
  'PRODUÇÃO AUDIO VISUAL',
  'EVENTOS',
  'REUNIÕES MENSAIS IMOBS',
  'MÍDIA ON',
  'MIDIA OFF',
];

export const MANUTENCAO_STAND_CATEGORIES: ExpenseCategory[] = [
  'DESMOBILIZAÇÃO',
  'MANUTENÇÃO',
  'CASA DECORADA',
];

export const PRODUTOS_CATEGORIES: ExpenseCategory[] = [
  'PRODUTOS GERAIS'
];

export const INSTITUCIONAL_CATEGORIES: ExpenseCategory[] = [
  'AGÊNCIA INSTITUCIONAL',
  'ASSESSORIA DE IMPRENSA',
  'BRINDES AZO EVS',
  'MIDIA OFF',
  'EVENTOS | ATIVAÇÃO',
  'PATROCINIOS',
  'PRÊMIOS DO MERCADO',
  'SOFTWARE | PLATAFORMAS',
  'SITE | MANUTENÇÃO',
  'MARCAS E PATENTE',
  'HOSPEDAGEM/DOMINIOS',
];

export type City = 'Rio de Janeiro' | 'Campinas';
export type Project = 'Gávea' | 'Ipanema' | 'Insigna' | 'A Noite' | 'Ares' | 'Verter' | 'Casa da Mata' | 'Natus';
export type UserRole = 'MASTER' | 'DIRETORIA' | 'FUNCIONARIO_RJ' | 'FUNCIONARIO_CAMPINAS' | 'COMERCIAL_RJ' | 'COMERCIAL_CAMPINAS' | 'ADMINISTRATIVO';

export const PROJECTS_BY_CITY: Record<City, Project[]> = {
  'Rio de Janeiro': ['Gávea', 'Ipanema', 'Insigna', 'A Noite'],
  'Campinas': ['Ares', 'Verter', 'Casa da Mata', 'Natus']
};

export const ALL_PROJECTS = [...PROJECTS_BY_CITY['Rio de Janeiro'], ...PROJECTS_BY_CITY['Campinas']];

export interface ProjectBudget {
  publicidade: number;
  stand: number;
  institucional: number;
  produtos: number;
  vgv: number;
  percentMkt: number;
  percentManutStand: number;
  percentProduto: number;
  estoqueUnid: number;
  metaVendas: number;
}

export interface CommercialMetrics {
  leads: number;
  vendas: number;
  vgv: number;
  visitasOn: number;
  visitasOff: number;
}

export type CommercialRecordType = 'venda' | 'pipeline';

export interface BaseCommercialRecord {
  id: string;
  date: string; // YYYY-MM-DD
  project: Project;
  city: City;
  type: CommercialRecordType;
  supabaseId?: string;
}

export interface SaleRecord extends BaseCommercialRecord {
  type: 'venda';
  vendas: string;
  qtde: number;
  unidade: string;
  vgvNominal: number;
  vgvVp: number;
  ev: number;
  origem: string;
  status1: string;
  status2: string;
}

export interface PipelineRecord extends BaseCommercialRecord {
  type: 'pipeline';
  pipeline: string;
  qtdeTratativas: number;
  unidade: string;
  propostaNegociada: string;
  propostaVgvNominal: number;
  imobiliaria: string;
  origem: string;
  status: string;
  descritivo: string;
}

export type CommercialRecord = SaleRecord | PipelineRecord;

export interface MonthData {
  id: string; // YYYY-MM
  month: number; // 1-12
  year: number;
  budgets: Record<string, ProjectBudget>;
  commercial: Record<string, CommercialMetrics>;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  city: City;
  project: Project;
  type: 'Publicidade' | 'Manutenção de Stand' | 'Institucional' | 'Produtos';
  category: ExpenseCategory;
  amount: number;
  description: string;
}

export interface TransactionLog {
  id: string;
  transactionId: string;
  timestamp: string;
  oldAmount: number;
  newAmount: number;
}

export interface TimelineEvent {
  id: string;
  date: string; // YYYY-MM-DD
  project: Project;
  title: string;
  location: string;
  action: string;
  imageUrl?: string;
}

