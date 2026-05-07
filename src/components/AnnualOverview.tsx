import React, { useMemo, useState } from "react";
import { formatCurrency, getCityForProject } from "../utils";
import {
  Target,
  TrendingUp,
  Building2,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Settings,
} from "lucide-react";
import { useExpense } from "../context/ExpenseContext";
import { SaleRecord } from "../types";
import { SalesGoalModal } from "./SalesGoalModal";
import { useSiengeIntegration } from '../hooks/useSiengeIntegration';

interface ProjectRealized {
  q1: { vendas: number; vgvRealizado: number };
  q2: { vendas: number; vgvRealizado: number };
  q3: { vendas: number; vgvRealizado: number };
  q4: { vendas: number; vgvRealizado: number };
  totalRealized: { vendas: number; vgvRealizado: number };
}

type ProjectData = {
  name: string;
  target: { unid: number; vgv: number };
  q1: { unid: number; vgv: number };
  q2: { unid: number; vgv: number };
  q3: { unid: number; vgv: number };
  q4: { unid: number; vgv: number };
  total: { unid: number; vgv: number };
};

type ProjectCombined = ProjectData & ProjectRealized & { vso: number };

const calculateTotal = (projects: ProjectCombined[]): ProjectCombined => {
  return projects.reduce(
    (acc, curr) => ({
      name: "Total",
      target: {
        unid: acc.target.unid + curr.target.unid,
        vgv: acc.target.vgv + curr.target.vgv,
      },
      q1: {
        unid: acc.q1.unid + curr.q1.unid,
        vgv: acc.q1.vgv + curr.q1.vgv,
        vendas: acc.q1.vendas + curr.q1.vendas,
        vgvRealizado: acc.q1.vgvRealizado + curr.q1.vgvRealizado,
      },
      q2: {
        unid: acc.q2.unid + curr.q2.unid,
        vgv: acc.q2.vgv + curr.q2.vgv,
        vendas: acc.q2.vendas + curr.q2.vendas,
        vgvRealizado: acc.q2.vgvRealizado + curr.q2.vgvRealizado,
      },
      q3: {
        unid: acc.q3.unid + curr.q3.unid,
        vgv: acc.q3.vgv + curr.q3.vgv,
        vendas: acc.q3.vendas + curr.q3.vendas,
        vgvRealizado: acc.q3.vgvRealizado + curr.q3.vgvRealizado,
      },
      q4: {
        unid: acc.q4.unid + curr.q4.unid,
        vgv: acc.q4.vgv + curr.q4.vgv,
        vendas: acc.q4.vendas + curr.q4.vendas,
        vgvRealizado: acc.q4.vgvRealizado + curr.q4.vgvRealizado,
      },
      total: {
        unid: acc.total.unid + curr.total.unid,
        vgv: acc.total.vgv + curr.total.vgv,
      },
      totalRealized: {
        vendas: acc.totalRealized.vendas + curr.totalRealized.vendas,
        vgvRealizado:
          acc.totalRealized.vgvRealizado + curr.totalRealized.vgvRealizado,
      },
      vso: 0,
    }),
    {
      name: "Total",
      target: { unid: 0, vgv: 0 },
      q1: { unid: 0, vgv: 0, vendas: 0, vgvRealizado: 0 },
      q2: { unid: 0, vgv: 0, vendas: 0, vgvRealizado: 0 },
      q3: { unid: 0, vgv: 0, vendas: 0, vgvRealizado: 0 },
      q4: { unid: 0, vgv: 0, vendas: 0, vgvRealizado: 0 },
      total: { unid: 0, vgv: 0 },
      totalRealized: { vendas: 0, vgvRealizado: 0 },
      vso: 0,
    } as ProjectCombined,
  );
};

const formatVGV = (value: number) => {
  if (value === 0) return "-";
  return formatCurrency(value).replace("R$", "").trim();
};

export const AnnualOverview = () => {
  const [expandedSP, setExpandedSP] = useState(true);
  const [expandedRJ, setExpandedRJ] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    commercialRecords,
    selectedYear,
    selectedCity,
    selectedProject,
    salesGoals,
    setSalesGoals
  } = useExpense();

  const siengeData = useSiengeIntegration('', '');

  const { combinedSP, combinedRJ, totalSP, totalRJ, totalGeral } =
    useMemo(() => {
      const yearGoal = salesGoals.find(g => g.year === selectedYear);
      const activeProjects = yearGoal?.projects || [];

      const buildRealized = (baseProject: any): ProjectCombined => {
        const result: ProjectRealized = {
          q1: { vendas: 0, vgvRealizado: 0 },
          q2: { vendas: 0, vgvRealizado: 0 },
          q3: { vendas: 0, vgvRealizado: 0 },
          q4: { vendas: 0, vgvRealizado: 0 },
          totalRealized: { vendas: 0, vgvRealizado: 0 },
        };

        const mapProjectName = (name: string): string => {
          switch (name) {
            case "Natus Home": return "Natus";
            case "Ares Home": return "Ares";
            case "Verter Cambuí": return "Verter";
            case "Casa da Mata": return "Casa da Mata";
            case "Insigna": return "Insigna";
            case "Noite": return "A Noite";
            case "Gávea 99": return "Gávea";
            case "Ar Ipanema": return "Ipanema";
            default: return name;
          }
        };

        const mappedName = mapProjectName(baseProject.name);

        let records = commercialRecords.filter(
          (r) => r.type === "venda" && r.project === mappedName,
        );

        records = records.filter((r) => r.date.startsWith(selectedYear));

        records.forEach((r) => {
          const sale = r as SaleRecord;
          const month = parseInt(sale.date.split("-")[1], 10);
          const qtde = sale.qtde || 0;
          const vgv = sale.vgvVp || sale.vgvNominal || 0;

          if (month >= 1 && month <= 3) {
            result.q1.vendas += qtde;
            result.q1.vgvRealizado += vgv;
          } else if (month >= 4 && month <= 6) {
            result.q2.vendas += qtde;
            result.q2.vgvRealizado += vgv;
          } else if (month >= 7 && month <= 9) {
            result.q3.vendas += qtde;
            result.q3.vgvRealizado += vgv;
          } else if (month >= 10 && month <= 12) {
            result.q4.vendas += qtde;
            result.q4.vgvRealizado += vgv;
          }
          result.totalRealized.vendas += qtde;
          result.totalRealized.vgvRealizado += vgv;
        });

        const totalMetaUnid = baseProject.q1.unid + baseProject.q2.unid + baseProject.q3.unid + baseProject.q4.unid;
        const totalMetaVgv = baseProject.q1.vgv + baseProject.q2.vgv + baseProject.q3.vgv + baseProject.q4.vgv;

        return {
          ...baseProject,
          total: { unid: totalMetaUnid, vgv: totalMetaVgv },
          q1: { ...baseProject.q1, ...result.q1 },
          q2: { ...baseProject.q2, ...result.q2 },
          q3: { ...baseProject.q3, ...result.q3 },
          q4: { ...baseProject.q4, ...result.q4 },
          totalRealized: result.totalRealized,
          vso: totalMetaUnid > 0 ? Math.round((result.totalRealized.vendas / totalMetaUnid) * 100) : 0
        };
      };

      const spCombined = activeProjects
        .filter(p => getCityForProject(p.name as any) === 'Campinas')
        .filter((p) => selectedProject === "ALL" || selectedProject === p.name)
        .filter((p) => selectedCity === "ALL" || selectedCity === "Campinas")
        .map(buildRealized);

      const rjCombined = activeProjects
        .filter(p => getCityForProject(p.name as any) === 'Rio de Janeiro')
        .filter((p) => selectedProject === "ALL" || selectedProject === p.name)
        .filter(
          (p) => selectedCity === "ALL" || selectedCity === "Rio de Janeiro",
        )
        .map(buildRealized);

      const tSP = calculateTotal(spCombined);
      tSP.name = "São Paulo";
      tSP.vso =
        tSP.total.unid > 0
          ? Math.round((tSP.totalRealized.vendas / tSP.total.unid) * 100)
          : 0;

      const tRJ = calculateTotal(rjCombined);
      tRJ.name = "Rio de Janeiro";
      tRJ.vso =
        tRJ.total.unid > 0
          ? Math.round((tRJ.totalRealized.vendas / tRJ.total.unid) * 100)
          : 0;

      const tGeral = calculateTotal([tSP, tRJ]);
      tGeral.name = "Total Geral";
      tGeral.vso =
        tGeral.total.unid > 0
          ? Math.round((tGeral.totalRealized.vendas / tGeral.total.unid) * 100)
          : 0;

      return {
        combinedSP: spCombined,
        combinedRJ: rjCombined,
        totalSP: tSP,
        totalRJ: tRJ,
        totalGeral: tGeral,
      };
    }, [
      commercialRecords,
      selectedYear,
      selectedCity,
      selectedProject,
      salesGoals
    ]);

  const renderRow = (
    project: ProjectCombined,
    isTotal = false,
    isGrandTotal = false,
  ) => {
    const baseClasses = isGrandTotal
      ? "bg-slate-800 text-white font-bold"
      : isTotal
        ? "bg-slate-100 font-bold text-slate-800"
        : "hover:bg-slate-50 text-slate-600 bg-white";

    return (
      <tr
        key={project.name}
        className={`border-b border-slate-200 transition-colors ${baseClasses}`}
      >
        <td
          className={`px-4 py-3 whitespace-nowrap sticky left-0 z-10 ${isGrandTotal ? "bg-slate-800" : isTotal ? "bg-slate-100" : "bg-white"} border-r border-slate-200`}
        >
          <div className="flex items-center space-x-2">
            {!isTotal && !isGrandTotal && (
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
            )}
            <span>{project.name}</span>
          </div>
        </td>

        {/* Meta */}
        <td className="px-4 py-3 text-center bg-slate-50/50">
          {project.target.unid || "-"}
        </td>
        <td className="px-4 py-3 text-right border-r border-slate-200 bg-slate-50/50">
          {formatVGV(project.target.vgv)}
        </td>

        {/* Q1 */}
        <td className="px-4 py-3 text-center border-l border-slate-200">
          {project.q1.unid || "-"}
        </td>
        <td className="px-4 py-3 text-center font-semibold text-emerald-600">
          {project.q1.vendas > 0 ? project.q1.vendas : "-"}
        </td>
        <td className="px-4 py-3 text-right">{formatVGV(project.q1.vgv)}</td>
        <td className="px-4 py-3 text-right border-r border-slate-200 font-semibold text-emerald-600">
          {formatVGV(project.q1.vgvRealizado)}
        </td>

        {/* Q2 */}
        <td className="px-4 py-3 text-center">{project.q2.unid || "-"}</td>
        <td className="px-4 py-3 text-center font-semibold text-emerald-600">
          {project.q2.vendas > 0 ? project.q2.vendas : "-"}
        </td>
        <td className="px-4 py-3 text-right">{formatVGV(project.q2.vgv)}</td>
        <td className="px-4 py-3 text-right border-r border-slate-200 font-semibold text-emerald-600">
          {formatVGV(project.q2.vgvRealizado)}
        </td>

        {/* Q3 */}
        <td className="px-4 py-3 text-center">{project.q3.unid || "-"}</td>
        <td className="px-4 py-3 text-center font-semibold text-emerald-600">
          {project.q3.vendas > 0 ? project.q3.vendas : "-"}
        </td>
        <td className="px-4 py-3 text-right">{formatVGV(project.q3.vgv)}</td>
        <td className="px-4 py-3 text-right border-r border-slate-200 font-semibold text-emerald-600">
          {formatVGV(project.q3.vgvRealizado)}
        </td>

        {/* Q4 */}
        <td className="px-4 py-3 text-center">{project.q4.unid || "-"}</td>
        <td className="px-4 py-3 text-center font-semibold text-emerald-600">
          {project.q4.vendas > 0 ? project.q4.vendas : "-"}
        </td>
        <td className="px-4 py-3 text-right">{formatVGV(project.q4.vgv)}</td>
        <td className="px-4 py-3 text-right border-r border-slate-200 font-semibold text-emerald-600">
          {formatVGV(project.q4.vgvRealizado)}
        </td>

        {/* Total */}
        <td className="px-4 py-3 text-center font-semibold bg-indigo-50/30">
          {project.total.unid || "-"}
        </td>
        <td className="px-4 py-3 text-center font-semibold bg-indigo-50/30 text-emerald-600">
          {project.totalRealized.vendas > 0
            ? project.totalRealized.vendas
            : "-"}
        </td>
        <td className="px-4 py-3 text-right font-semibold bg-indigo-50/30">
          {formatVGV(project.total.vgv)}
        </td>
        <td className="px-4 py-3 text-right font-semibold border-r border-slate-200 bg-indigo-50/30 text-emerald-600">
          {formatVGV(project.totalRealized.vgvRealizado)}
        </td>

        {/* VSO */}
        <td className="px-4 py-3 text-center">
          <div className="flex items-center justify-center space-x-2">
            <span
              className={`w-10 text-right font-medium ${project.vso >= 100 ? "text-emerald-600" : project.vso >= 50 ? "text-amber-600" : "text-rose-600"}`}
            >
              {project.vso}%
            </span>
            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
              <div
                className={`h-full rounded-full ${project.vso >= 100 ? "bg-emerald-500" : project.vso >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                style={{ width: `${Math.min(project.vso, 100)}%` }}
              />
            </div>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-start space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Target size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Meta Anual (VGV) VP
            </p>
            <h4 className="text-[0.9rem] font-bold text-slate-800 mt-1">
              {formatCurrency(totalGeral.target.vgv)}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {totalGeral.target.unid} unidades no total
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-start space-x-4">
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              VGV em Estoque
            </p>
            <h4 className="text-[0.9rem] font-bold text-slate-800 mt-1">
              {formatCurrency(siengeData?.vgvEstoque || 0)}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Sienge API
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-start space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Realizado (VGV) VP
            </p>
            <h4 className="text-[0.9rem] font-bold text-slate-800 mt-1">
              {formatCurrency(totalGeral.totalRealized.vgvRealizado)}
            </h4>
            <p className="text-xs text-emerald-600 font-medium mt-1">
              {totalGeral.target.vgv > 0
                ? (
                    (totalGeral.totalRealized.vgvRealizado /
                      totalGeral.target.vgv) *
                    100
                  ).toFixed(1)
                : 0}
              % da meta de VGV
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-start space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Unidades Vendidas
            </p>
            <h4 className="text-[0.9rem] font-bold text-slate-800 mt-1">
              {totalGeral.totalRealized.vendas}{" "}
              <span className="text-lg text-slate-400 font-medium">
                / {totalGeral.target.unid}
              </span>
            </h4>
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{
                  width: `${totalGeral.target.unid > 0 ? (totalGeral.totalRealized.vendas / totalGeral.target.unid) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-start space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <BarChart3 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">VSO Geral</p>
            <h4 className="text-[0.9rem] font-bold text-slate-800 mt-1">
              {totalGeral.vso}%
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Velocidade de Vendas sobre Oferta
            </p>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Target className="text-indigo-500" size={20} />
              Meta de Vendas - Projetos Ativos
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Visão anual distribuída por trimestres e praças
            </p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl shadow-sm transition-colors font-medium text-sm"
          >
            <Settings size={16} /> 
            Configurar Metas
          </button>
        </div>

        <div className="overflow-x-auto" style={{ maxWidth: "100%" }}>
          <table className="w-full text-sm text-left">
            <thead
              className="bg-slate-50 text-slate-600 uppercase font-semibold"
              style={{ fontSize: "10px" }}
            >
              <tr>
                <th
                  rowSpan={2}
                  className="px-4 py-3 sticky left-0 z-20 bg-slate-50 border-r border-slate-200 border-b min-w-[200px]"
                >
                  Empreendimento
                </th>
                <th
                  colSpan={2}
                  className="px-4 py-2 text-center border-r border-slate-200 border-b bg-slate-100/50"
                >
                  Total por Projeto
                </th>
                <th
                  colSpan={4}
                  className="px-4 py-2 text-center border-r border-slate-200 border-b"
                >
                  1º Tri
                </th>
                <th
                  colSpan={4}
                  className="px-4 py-2 text-center border-r border-slate-200 border-b"
                >
                  2º Tri
                </th>
                <th
                  colSpan={4}
                  className="px-4 py-2 text-center border-r border-slate-200 border-b"
                >
                  3º Tri
                </th>
                <th
                  colSpan={4}
                  className="px-4 py-2 text-center border-r border-slate-200 border-b"
                >
                  4º Tri
                </th>
                <th
                  colSpan={4}
                  className="px-4 py-2 text-center border-r border-slate-200 border-b bg-indigo-50/50 text-indigo-800"
                >
                  Total
                </th>
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-center border-b border-slate-200"
                >
                  VSO
                </th>
              </tr>
              <tr>
                {/* Meta */}
                <th className="px-4 py-2 text-center border-b border-slate-200 bg-slate-100/50 whitespace-nowrap">
                  Unid
                </th>
                <th className="px-4 py-2 text-right border-r border-slate-200 border-b bg-slate-100/50 whitespace-nowrap">
                  VGV (vp)
                </th>

                {/* 1º Tri */}
                <th className="px-4 py-2 text-center border-b border-slate-200 whitespace-nowrap">
                  Meta
                </th>
                <th className="px-4 py-2 text-center border-b border-slate-200 text-slate-700 whitespace-nowrap">
                  Vendas
                </th>
                <th className="px-4 py-2 text-right border-b border-slate-200 whitespace-nowrap">
                  VGV Meta
                </th>
                <th className="px-4 py-2 text-right border-r border-slate-200 border-b text-slate-700 whitespace-nowrap">
                  VGV Realizado
                </th>

                {/* 2º Tri */}
                <th className="px-4 py-2 text-center border-b border-slate-200 whitespace-nowrap">
                  Meta
                </th>
                <th className="px-4 py-2 text-center border-b border-slate-200 text-slate-700 whitespace-nowrap">
                  Vendas
                </th>
                <th className="px-4 py-2 text-right border-b border-slate-200 whitespace-nowrap">
                  VGV Meta
                </th>
                <th className="px-4 py-2 text-right border-r border-slate-200 border-b text-slate-700 whitespace-nowrap">
                  VGV Realizado
                </th>

                {/* 3º Tri */}
                <th className="px-4 py-2 text-center border-b border-slate-200 whitespace-nowrap">
                  Meta
                </th>
                <th className="px-4 py-2 text-center border-b border-slate-200 text-slate-700 whitespace-nowrap">
                  Vendas
                </th>
                <th className="px-4 py-2 text-right border-b border-slate-200 whitespace-nowrap">
                  VGV Meta
                </th>
                <th className="px-4 py-2 text-right border-r border-slate-200 border-b text-slate-700 whitespace-nowrap">
                  VGV Realizado
                </th>

                {/* 4º Tri */}
                <th className="px-4 py-2 text-center border-b border-slate-200 whitespace-nowrap">
                  Meta
                </th>
                <th className="px-4 py-2 text-center border-b border-slate-200 text-slate-700 whitespace-nowrap">
                  Vendas
                </th>
                <th className="px-4 py-2 text-right border-b border-slate-200 whitespace-nowrap">
                  VGV Meta
                </th>
                <th className="px-4 py-2 text-right border-r border-slate-200 border-b text-slate-700 whitespace-nowrap">
                  VGV Realizado
                </th>

                {/* Total */}
                <th className="px-4 py-2 text-center border-b border-slate-200 bg-indigo-50/50 text-indigo-800 whitespace-nowrap">
                  Meta
                </th>
                <th className="px-4 py-2 text-center border-b border-slate-200 bg-indigo-50/50 text-indigo-800 whitespace-nowrap">
                  Vendas
                </th>
                <th className="px-4 py-2 text-right border-b border-slate-200 bg-indigo-50/50 text-indigo-800 whitespace-nowrap">
                  VGV Meta
                </th>
                <th className="px-4 py-2 text-right border-r border-slate-200 border-b bg-indigo-50/50 text-indigo-800 whitespace-nowrap">
                  VGV Realizado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {/* SP Section */}
              {combinedSP.length > 0 && (
                <>
                  <tr
                    className="bg-slate-100/80 cursor-pointer hover:bg-slate-200/80 transition-colors"
                    onClick={() => setExpandedSP(!expandedSP)}
                  >
                    <td
                      colSpan={24}
                      className="px-4 py-3 font-bold text-slate-800 sticky left-0"
                    >
                      <div className="flex items-center space-x-2">
                        {expandedSP ? (
                          <ChevronDown size={18} className="text-slate-500" />
                        ) : (
                          <ChevronRight size={18} className="text-slate-500" />
                        )}
                        <span>São Paulo</span>
                        <span className="text-[10px] font-normal text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                          {combinedSP.length} projetos
                        </span>
                      </div>
                    </td>
                  </tr>
                  {expandedSP && combinedSP.map((p) => renderRow(p))}
                  {expandedSP && renderRow(totalSP, true)}
                </>
              )}

              {/* RJ Section */}
              {combinedRJ.length > 0 && (
                <>
                  <tr
                    className="bg-slate-100/80 cursor-pointer hover:bg-slate-200/80 transition-colors"
                    onClick={() => setExpandedRJ(!expandedRJ)}
                  >
                    <td
                      colSpan={24}
                      className="px-4 py-3 font-bold text-slate-800 sticky left-0 border-t border-slate-200"
                    >
                      <div className="flex items-center space-x-2">
                        {expandedRJ ? (
                          <ChevronDown size={18} className="text-slate-500" />
                        ) : (
                          <ChevronRight size={18} className="text-slate-500" />
                        )}
                        <span>Rio de Janeiro</span>
                        <span className="text-[10px] font-normal text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                          {combinedRJ.length} projetos
                        </span>
                      </div>
                    </td>
                  </tr>
                  {expandedRJ && combinedRJ.map((p) => renderRow(p))}
                  {expandedRJ && renderRow(totalRJ, true)}
                </>
              )}

              {/* Grand Total */}
              {(combinedRJ.length > 0 || combinedSP.length > 0) && renderRow(totalGeral, false, true)}
              {(combinedRJ.length === 0 && combinedSP.length === 0) && (
                <tr>
                  <td colSpan={24} className="text-center py-10 text-slate-500">
                    Nenhuma meta configurada para {selectedYear}. Clique em "Configurar Metas" para iniciar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <SalesGoalModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        salesGoals={salesGoals}
        setSalesGoals={setSalesGoals}
        currentYear={selectedYear}
      />
    </div>
  );
};
