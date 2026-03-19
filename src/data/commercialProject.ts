export interface ProjectData {
  name: string;
  target: { unid: number; vgv: number };
  q1: { unid: number; vgv: number };
  q2: { unid: number; vgv: number };
  q3: { unid: number; vgv: number };
  q4: { unid: number; vgv: number };
  total: { unid: number; vgv: number };
  vso: number;
}

export const spProjects: ProjectData[] = [
  { name: 'Natus Home', target: { unid: 1, vgv: 1429733 }, q1: { unid: 1, vgv: 1429733 }, q2: { unid: 0, vgv: 0 }, q3: { unid: 0, vgv: 0 }, q4: { unid: 0, vgv: 0 }, total: { unid: 1, vgv: 1429733 }, vso: 100 },
  { name: 'Ares Home', target: { unid: 4, vgv: 6950720 }, q1: { unid: 1, vgv: 1737680 }, q2: { unid: 2, vgv: 3475360 }, q3: { unid: 1, vgv: 1737680 }, q4: { unid: 0, vgv: 0 }, total: { unid: 4, vgv: 6950720 }, vso: 100 },
  { name: 'Verter Cambuí', target: { unid: 5, vgv: 12104725 }, q1: { unid: 1, vgv: 2420945 }, q2: { unid: 1, vgv: 2420945 }, q3: { unid: 2, vgv: 4841890 }, q4: { unid: 1, vgv: 2420945 }, total: { unid: 5, vgv: 12104725 }, vso: 100 },
  { name: 'Casa da Mata', target: { unid: 33, vgv: 67175519 }, q1: { unid: 2, vgv: 4071244 }, q2: { unid: 5, vgv: 10178109 }, q3: { unid: 2, vgv: 4071244 }, q4: { unid: 1, vgv: 2035622 }, total: { unid: 10, vgv: 20356218 }, vso: 30 },
];

export const rjProjects: ProjectData[] = [
  { name: 'Insigna', target: { unid: 17, vgv: 71967296 }, q1: { unid: 1, vgv: 4233370 }, q2: { unid: 1, vgv: 4233370 }, q3: { unid: 2, vgv: 8466741 }, q4: { unid: 1, vgv: 4233370 }, total: { unid: 5, vgv: 21166852 }, vso: 29 },
  { name: 'Noite', target: { unid: 8, vgv: 7763821 }, q1: { unid: 2, vgv: 1940955 }, q2: { unid: 2, vgv: 1940955 }, q3: { unid: 2, vgv: 1940955 }, q4: { unid: 2, vgv: 1940955 }, total: { unid: 8, vgv: 7763821 }, vso: 100 },
  { name: 'Gávea 99', target: { unid: 35, vgv: 32536690 }, q1: { unid: 3, vgv: 2788859 }, q2: { unid: 4, vgv: 3718479 }, q3: { unid: 3, vgv: 2788859 }, q4: { unid: 4, vgv: 3718479 }, total: { unid: 14, vgv: 13014676 }, vso: 40 },
  { name: 'Ar Ipanema', target: { unid: 24, vgv: 32368494 }, q1: { unid: 6, vgv: 8092124 }, q2: { unid: 3, vgv: 4046062 }, q3: { unid: 3, vgv: 4046062 }, q4: { unid: 2, vgv: 2697375 }, total: { unid: 14, vgv: 18881622 }, vso: 58 },
];

export const allCommercialProjects = [...spProjects, ...rjProjects];
