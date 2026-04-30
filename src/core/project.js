import { createGrid } from './grid.js';

export const PROJECT_KIND = 'pindou.project';
export const PROJECT_SCHEMA_VERSION = 1;

export function createProject(options = {}) {
  const width = options.width ?? 48;
  const height = options.height ?? 48;

  return {
    kind: PROJECT_KIND,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: options.id ?? createId(),
    name: options.name ?? '未命名拼豆工程',
    createdAt: options.createdAt ?? new Date().toISOString(),
    updatedAt: options.updatedAt ?? new Date().toISOString(),
    beadSizeMm: options.beadSizeMm ?? 5,
    board: options.board ?? { width: 29, height: 29 },
    paletteBrands: options.paletteBrands ?? ['MARD', 'COCO', 'MANMAN', 'PANPAN', 'MIXIAOWO'],
    source: options.source ?? null,
    crop: options.crop ?? null,
    mask: options.mask ?? null,
    grid: options.grid ?? createGrid(width, height, null),
    paletteVariants: options.paletteVariants ?? {},
    inventory: options.inventory ?? {},
    disabledColorIds: options.disabledColorIds ?? [],
    exportSettings: options.exportSettings ?? { mode: 'color', pageSize: 'A4', showSymbols: true },
    history: options.history ?? []
  };
}

export function serializeProject(project) {
  return JSON.stringify(
    {
      ...project,
      kind: PROJECT_KIND,
      schemaVersion: PROJECT_SCHEMA_VERSION,
      updatedAt: new Date().toISOString()
    },
    null,
    2
  );
}

export function parseProject(text) {
  const project = JSON.parse(text);
  if (project.kind !== PROJECT_KIND) {
    throw new Error('This file is not a Pindou project.');
  }
  if (project.schemaVersion !== PROJECT_SCHEMA_VERSION) {
    throw new Error(`Unsupported Pindou project schema: ${project.schemaVersion}`);
  }
  return project;
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `pindou-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
