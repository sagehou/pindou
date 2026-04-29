export function createGrid(width, height, fill = null) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('Grid width and height must be positive integers.');
  }

  return {
    width,
    height,
    cells: Array.from({ length: height }, () => Array.from({ length: width }, () => fill))
  };
}

export function paintCell(grid, x, y, colorId) {
  assertInBounds(grid, x, y);
  const cells = cloneCells(grid);
  cells[y][x] = colorId;
  return { ...grid, cells };
}

export function replaceColor(grid, fromColorId, toColorId) {
  const cells = grid.cells.map((row) => row.map((cell) => (cell === fromColorId ? toColorId : cell)));
  return { ...grid, cells };
}

export function replaceConnectedColor(grid, startX, startY, toColorId) {
  assertInBounds(grid, startX, startY);
  const target = grid.cells[startY][startX];
  if (target === toColorId) return grid;

  const cells = cloneCells(grid);
  const queue = [[startX, startY]];
  const seen = new Set();

  while (queue.length > 0) {
    const [x, y] = queue.shift();
    const key = `${x},${y}`;
    if (seen.has(key) || x < 0 || y < 0 || x >= grid.width || y >= grid.height) continue;
    seen.add(key);
    if (cells[y][x] !== target) continue;

    cells[y][x] = toColorId;
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return { ...grid, cells };
}

export function fillConnected(grid, startX, startY, colorId) {
  assertInBounds(grid, startX, startY);
  const target = grid.cells[startY][startX];
  if (target === colorId) return grid;

  const cells = cloneCells(grid);
  const queue = [[startX, startY]];
  const seen = new Set();

  while (queue.length > 0) {
    const [x, y] = queue.shift();
    const key = `${x},${y}`;
    if (seen.has(key) || x < 0 || y < 0 || x >= grid.width || y >= grid.height) continue;
    seen.add(key);
    if (cells[y][x] !== target) continue;

    cells[y][x] = colorId;
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return { ...grid, cells };
}

export function gridToCoordinates(grid) {
  const coordinates = [];
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const colorId = grid.cells[y][x];
      if (colorId) coordinates.push({ x, y, colorId });
    }
  }
  return coordinates;
}

function cloneCells(grid) {
  return grid.cells.map((row) => [...row]);
}

function assertInBounds(grid, x, y) {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
    throw new Error(`Cell ${x},${y} is outside the grid.`);
  }
}
