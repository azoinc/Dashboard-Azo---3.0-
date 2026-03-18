import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Project, City, PROJECTS_BY_CITY } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro', 'Todos os meses'
];

export const matchProject = (name: string): Project | null => {
  const n = name.toLowerCase().trim();
  if (n.includes('natus')) return 'Natus';
  if (n.includes('ares')) return 'Ares';
  if (n.includes('verter') || n.includes('cambu')) return 'Verter';
  if (n.includes('mata')) return 'Casa da Mata';
  if (n.includes('insigna')) return 'Insigna';
  if (n.includes('noite')) return 'A Noite';
  if (n.includes('gávea') || n.includes('gvea') || n.includes('gavea')) return 'Gávea';
  if (n.includes('ipanema') || n.includes('ar ip')) return 'Ipanema';
  return null;
};

export const getCityForProject = (p: Project): City => {
  return PROJECTS_BY_CITY['Rio de Janeiro'].includes(p) ? 'Rio de Janeiro' : 'Campinas';
};
