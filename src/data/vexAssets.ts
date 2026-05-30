export type VexPart = {
  name: string;
  sku: string;
  category: 'Electronics' | 'Structure' | 'Motion' | 'Field';
  detail: string;
  dimensions?: string;
  cadUrl: string;
  sourceUrl: string;
};

export type VexField = {
  id: string;
  season: string;
  name: string;
  objects: string;
  sourceUrl: string;
  cadUrl: string;
};

export const vexParts: VexPart[] = [
  {
    name: 'V5 Robot Brain',
    sku: '276-4810',
    category: 'Electronics',
    detail: '21 Smart Ports, 4.25 in color touchscreen, VEXcode support.',
    dimensions: '4.0 in W x 5.5 in H x 1.3 in L',
    cadUrl: 'https://www.vexrobotics.com/276-4810.html',
    sourceUrl: 'https://www.vexrobotics.com/276-4810.html',
  },
  {
    name: 'V5 Smart Motor 11W',
    sku: '276-4840',
    category: 'Electronics',
    detail: 'Integrated encoder and swappable 100/200/600 RPM gear cartridges.',
    cadUrl: 'https://www.vexrobotics.com/276-4840.html',
    sourceUrl: 'https://www.vexrobotics.com/276-4840.html',
  },
  {
    name: 'V5 Robot Battery Li-Ion 1100mAh',
    sku: '276-4811',
    category: 'Electronics',
    detail: 'LiFePO4 battery with built-in charge indicator lights.',
    dimensions: '1.82 in W x 6.31 in L x 1.18 in H',
    cadUrl: 'https://www.vexrobotics.com/276-4811.html',
    sourceUrl: 'https://www.vexrobotics.com/276-4811.html',
  },
  {
    name: '1x5x1 Aluminum C-Channel',
    sku: '276-2298',
    category: 'Structure',
    detail: 'VEX structural channel with 0.500 in hole spacing.',
    cadUrl: 'https://www.vexrobotics.com/channel.html',
    sourceUrl: 'https://www.vexrobotics.com/channel.html',
  },
  {
    name: '4 in Omni-Directional Wheel',
    sku: '276-3526',
    category: 'Motion',
    detail: 'Common V5 drivetrain wheel represented in the robot preview.',
    cadUrl: 'https://www.vexrobotics.com/v5-motion.html',
    sourceUrl: 'https://www.vexrobotics.com/v5-motion.html',
  },
  {
    name: 'VEX V5 Parts Library for Onshape',
    sku: 'Onshape V5 Library',
    category: 'Field',
    detail: 'Onshape-managed VEX V5 library with part numbers, appearances, materials, and weights.',
    cadUrl: 'https://cad.onshape.com/documents?resourceTypeFilter=resource_type_filter_owned_by_onshape&nodeId=5d300c4847e3b8331ec6542a&column=modifiedAt&order=desc&viewMode=0',
    sourceUrl: 'https://www.onshape.com/en/blog/vex-iq-vex-v5-parts-libraries',
  },
];

export const vexFields: VexField[] = [
  {
    id: 'override',
    season: '2026-27',
    name: 'Override',
    objects: 'official 2026-2027 V5RC field, scoring elements, and build resources',
    sourceUrl: 'https://www.vexrobotics.com/official-path',
    cadUrl: 'https://link.vex.com/docs/26-27/v5rc/fieldcad',
  },
  {
    id: 'push-back',
    season: '2025-26',
    name: 'Push Back',
    objects: 'red and blue blocks, goals, four VEXcode VR starting positions',
    sourceUrl: 'https://api.vex.com/vr/home/playgrounds/v5rc_push_back.html',
    cadUrl: 'https://link.vex.com/docs/25-26/v5rc/fieldcad',
  },
  {
    id: 'high-stakes',
    season: '2024-25',
    name: 'High Stakes',
    objects: 'rings, mobile goals, wall stakes',
    sourceUrl: 'https://www.vexrobotics.com/high-stakes-manual',
    cadUrl: 'https://link.vex.com/docs/24-25/v5rc/fieldcad',
  },
  {
    id: 'over-under',
    season: '2023-24',
    name: 'Over Under',
    objects: 'triballs, goals, match-load zones',
    sourceUrl: 'https://www.vexrobotics.com/over-under-manual',
    cadUrl: 'https://link.vex.com/docs/23-24/vrc/fieldcad',
  },
  {
    id: 'spin-up',
    season: '2022-23',
    name: 'Spin Up',
    objects: 'discs, rollers, low and high goals',
    sourceUrl: 'https://www.vexrobotics.com/spin-up-manual',
    cadUrl: 'https://link.vex.com/docs/22-23/vrc/fieldcad',
  },
  {
    id: 'tipping-point',
    season: '2021-22',
    name: 'Tipping Point',
    objects: 'rings, mobile goals, alliance platforms',
    sourceUrl: 'https://www.vexrobotics.com/tipping-point-manual',
    cadUrl: 'https://link.vex.com/docs/21-22/vrc/fieldcad',
  },
];
