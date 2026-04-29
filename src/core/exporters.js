import { gridToCoordinates } from './grid.js';

export function createMaterialList(grid, palette) {
  const paletteById = new Map(palette.map((bead) => [bead.id, bead]));
  const counts = new Map();

  for (const { colorId } of gridToCoordinates(grid)) {
    counts.set(colorId, (counts.get(colorId) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([colorId, count]) => {
      const bead = paletteById.get(colorId);
      return {
        colorId,
        count,
        brand: bead?.brand ?? '自定义',
        code: bead?.code ?? colorId,
        name: bead?.name ?? colorId,
        rgb: bead?.rgb ?? [0, 0, 0]
      };
    })
    .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand) || a.code.localeCompare(b.code));
}

export function createMakingSteps(grid, palette, mode = 'color') {
  if (mode === 'board') return createBoardSteps(grid, palette);
  return createColorSteps(grid, palette);
}

function createColorSteps(grid, palette) {
  const paletteById = new Map(palette.map((bead) => [bead.id, bead]));
  const groups = new Map();

  for (const { x, y, colorId } of gridToCoordinates(grid)) {
    if (!groups.has(colorId)) groups.set(colorId, []);
    groups.get(colorId).push({ x, y });
  }

  return [...groups.entries()]
    .map(([colorId, cells], index) => {
      const bead = paletteById.get(colorId);
      return {
        index: index + 1,
        mode: 'color',
        colorId,
        label: bead ? `${bead.brand} ${bead.code} ${bead.name}` : colorId,
        count: cells.length,
        cells
      };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((step, index) => ({ ...step, index: index + 1 }));
}

function createBoardSteps(grid, palette) {
  const boardWidth = 29;
  const boardHeight = 29;
  const steps = [];
  for (let y = 0; y < grid.height; y += boardHeight) {
    for (let x = 0; x < grid.width; x += boardWidth) {
      const cells = gridToCoordinates(grid).filter((cell) => (
        cell.x >= x && cell.x < x + boardWidth && cell.y >= y && cell.y < y + boardHeight
      ));
      if (cells.length > 0) {
        steps.push({
          index: steps.length + 1,
          mode: 'board',
          label: `板 ${Math.floor(x / boardWidth) + 1}-${Math.floor(y / boardHeight) + 1}`,
          count: cells.length,
          cells
        });
      }
    }
  }
  return steps.map((step) => ({ ...step, materials: createMaterialList({ ...grid, cells: cellsFromStep(grid, step) }, palette) }));
}

function cellsFromStep(grid, step) {
  const cells = Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => null));
  for (const cell of step.cells) {
    cells[cell.y][cell.x] = cell.colorId;
  }
  return cells;
}
