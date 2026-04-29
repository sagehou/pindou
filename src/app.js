import { DOMESTIC_PALETTES, beadCssColor, findNearestBead, mergePalettes } from './core/palette.js';
import { createGrid, fillConnected, paintCell, replaceColor, replaceConnectedColor } from './core/grid.js';
import { createProject, parseProject, serializeProject } from './core/project.js';
import { createMakingSteps, createMaterialList } from './core/exporters.js';

const dom = {
  projectName: document.querySelector('#projectName'),
  saveState: document.querySelector('#saveState'),
  importImageBtn: document.querySelector('#importImageBtn'),
  openProjectBtn: document.querySelector('#openProjectBtn'),
  saveProjectBtn: document.querySelector('#saveProjectBtn'),
  clearCanvasBtn: document.querySelector('#clearCanvasBtn'),
  undoBtn: document.querySelector('#undoBtn'),
  redoBtn: document.querySelector('#redoBtn'),
  viewMode: document.querySelector('#viewMode'),
  zoomRange: document.querySelector('#zoomRange'),
  gridWidth: document.querySelector('#gridWidth'),
  gridHeight: document.querySelector('#gridHeight'),
  beadSize: document.querySelector('#beadSize'),
  pixelMode: document.querySelector('#pixelMode'),
  pixelizeBtn: document.querySelector('#pixelizeBtn'),
  toolGrid: document.querySelector('#toolGrid'),
  sourceLayerState: document.querySelector('#sourceLayerState'),
  gridLayerState: document.querySelector('#gridLayerState'),
  historyCount: document.querySelector('#historyCount'),
  canvas: document.querySelector('#beadCanvas'),
  canvasTitle: document.querySelector('#canvasTitle'),
  canvasSubtitle: document.querySelector('#canvasSubtitle'),
  metricGrid: document.querySelector('#metricGrid'),
  metricPalette: document.querySelector('#metricPalette'),
  metricSteps: document.querySelector('#metricSteps'),
  exportPngBtn: document.querySelector('#exportPngBtn'),
  exportStepsBtn: document.querySelector('#exportStepsBtn'),
  brandFilters: document.querySelector('#brandFilters'),
  selectedColor: document.querySelector('#selectedColor'),
  paletteGrid: document.querySelector('#paletteGrid'),
  disableCurrent: document.querySelector('#disableCurrent'),
  replaceSource: document.querySelector('#replaceSource'),
  replaceScope: document.querySelector('#replaceScope'),
  replaceColorBtn: document.querySelector('#replaceColorBtn'),
  materialList: document.querySelector('#materialList'),
  webdavUrl: document.querySelector('#webdavUrl'),
  webdavUser: document.querySelector('#webdavUser'),
  webdavPass: document.querySelector('#webdavPass'),
  webdavSyncBtn: document.querySelector('#webdavSyncBtn'),
  webdavState: document.querySelector('#webdavState'),
  statusDimensions: document.querySelector('#statusDimensions'),
  statusBeads: document.querySelector('#statusBeads'),
  statusColor: document.querySelector('#statusColor'),
  statusBoard: document.querySelector('#statusBoard'),
  imageInput: document.querySelector('#imageInput'),
  projectInput: document.querySelector('#projectInput')
};

const ctx = dom.canvas.getContext('2d');
const state = {
  project: createProject({ width: 48, height: 48, paletteBrands: ['MARD'] }),
  palette: mergePalettes(),
  selectedColorId: 'MARD:M-R01',
  selectedSourceColorId: null,
  selectedCell: null,
  tool: 'select',
  view: 'pixel',
  zoom: 16,
  undoStack: [],
  redoStack: [],
  sourceImage: null,
  pointerDown: false,
  activeStep: 0
};

init();

function init() {
  bindEvents();
  loadWebDavSettings();
  restoreAutosave();
  renderAll();
}

function bindEvents() {
  dom.importImageBtn.addEventListener('click', () => dom.imageInput.click());
  dom.openProjectBtn.addEventListener('click', () => dom.projectInput.click());
  dom.saveProjectBtn.addEventListener('click', saveProjectFile);
  dom.clearCanvasBtn.addEventListener('click', clearCanvas);
  dom.imageInput.addEventListener('change', handleImageInput);
  dom.projectInput.addEventListener('change', handleProjectInput);
  dom.pixelizeBtn.addEventListener('click', pixelizeSourceImage);
  dom.projectName.addEventListener('input', () => {
    state.project.name = dom.projectName.value.trim() || '未命名拼豆工程';
    autosave('已自动保存项目名');
  });
  dom.gridWidth.addEventListener('change', resizeEmptyGrid);
  dom.gridHeight.addEventListener('change', resizeEmptyGrid);
  dom.beadSize.addEventListener('change', () => {
    state.project.beadSizeMm = Number(dom.beadSize.value);
    autosave('豆径设置已更新');
    renderStatus();
  });
  dom.viewMode.addEventListener('change', () => {
    state.view = dom.viewMode.value;
    renderCanvas();
  });
  dom.zoomRange.addEventListener('input', () => {
    state.zoom = Number(dom.zoomRange.value);
    renderCanvas();
  });
  dom.toolGrid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tool]');
    if (!button) return;
    state.tool = button.dataset.tool;
    renderTools();
  });
  dom.undoBtn.addEventListener('click', undo);
  dom.redoBtn.addEventListener('click', redo);
  dom.canvas.addEventListener('pointerdown', handlePointerDown);
  dom.canvas.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', () => {
    state.pointerDown = false;
  });
  dom.paletteGrid.addEventListener('click', (event) => {
    const swatch = event.target.closest('[data-color-id]');
    if (!swatch) return;
    state.selectedColorId = swatch.dataset.colorId;
    renderPalette();
    renderReplacement();
    renderStatus();
  });
  dom.disableCurrent.addEventListener('change', toggleSelectedDisabled);
  dom.replaceColorBtn.addEventListener('click', replaceSelectedColor);
  dom.exportPngBtn.addEventListener('click', exportPng);
  dom.exportStepsBtn.addEventListener('click', exportSteps);
  dom.webdavSyncBtn.addEventListener('click', syncWebDav);
  dom.webdavUrl.addEventListener('change', saveWebDavSettings);
  dom.webdavUser.addEventListener('change', saveWebDavSettings);
}

function renderAll() {
  normalizeActivePaletteBrand();
  state.palette = mergePalettes(state.project.paletteBrands);
  renderProjectFields();
  renderTools();
  renderBrandFilters();
  renderPalette();
  renderReplacement();
  renderCanvas();
  renderMaterials();
  renderStatus();
}

function renderProjectFields() {
  dom.projectName.value = state.project.name;
  dom.gridWidth.value = state.project.grid.width;
  dom.gridHeight.value = state.project.grid.height;
  dom.beadSize.value = String(state.project.beadSizeMm);
  dom.sourceLayerState.textContent = state.project.source ? '已导入' : '未导入';
  dom.gridLayerState.textContent = `${state.project.grid.width} x ${state.project.grid.height}`;
  dom.historyCount.textContent = `${state.undoStack.length} 步`;
}

function renderTools() {
  for (const button of dom.toolGrid.querySelectorAll('[data-tool]')) {
    button.classList.toggle('active', button.dataset.tool === state.tool);
  }
}

function renderBrandFilters() {
  dom.brandFilters.innerHTML = '';
  for (const brandKey of Object.keys(DOMESTIC_PALETTES)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `brand-filter${state.project.paletteBrands[0] === brandKey ? ' active' : ''}`;
    button.dataset.brand = brandKey;
    button.setAttribute('aria-pressed', state.project.paletteBrands[0] === brandKey ? 'true' : 'false');
    button.innerHTML = `<span>${brandLabel(brandKey)}</span><small>${DOMESTIC_PALETTES[brandKey].length} 色</small>`;
    button.addEventListener('click', () => {
      state.project.paletteBrands = [brandKey];
      state.palette = mergePalettes(state.project.paletteBrands);
      if (!state.palette.some((bead) => bead.id === state.selectedColorId)) {
        state.selectedColorId = state.palette[0]?.id ?? null;
      }
      autosave('已切换色卡品牌');
      renderBrandFilters();
      renderPalette();
      renderMaterials();
      renderStatus();
    });
    dom.brandFilters.append(button);
  }
}

function renderPalette() {
  const selected = getSelectedBead();
  dom.selectedColor.innerHTML = selected
    ? `<span class="color-chip" style="background:${beadCssColor(selected)}"></span><div><strong>${selected.brand} ${selected.code}</strong><br><small>${selected.name}</small></div>`
    : '<small>未选择颜色</small>';

  dom.disableCurrent.checked = Boolean(selected && state.project.disabledColorIds.includes(selected.id));
  dom.paletteGrid.innerHTML = '';

  for (const bead of state.palette) {
    const disabled = state.project.disabledColorIds.includes(bead.id);
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = `swatch${bead.id === state.selectedColorId ? ' active' : ''}${disabled ? ' disabled' : ''}`;
    swatch.dataset.colorId = bead.id;
    swatch.innerHTML = `<span class="color-chip" style="background:${beadCssColor(bead)}"></span><span>${bead.code}<br><small>${bead.name}</small></span>`;
    dom.paletteGrid.append(swatch);

  }
}

function renderReplacement() {
  if (!state.selectedCell) {
    dom.replaceSource.textContent = '先用选择工具点击画布颜色';
    return;
  }

  const source = getBeadById(state.selectedSourceColorId);
  const target = getSelectedBead();
  const sourceLabel = source ? `${source.brand} ${source.code} ${source.name}` : '空白背景';
  const targetLabel = target ? `${target.brand} ${target.code} ${target.name}` : '未选择目标色';
  dom.replaceSource.innerHTML = `
    <span>源：${sourceLabel}</span>
    <span>目标：${targetLabel}</span>
  `;
}

function renderCanvas() {
  const grid = state.project.grid;
  const width = grid.width * state.zoom;
  const height = grid.height * state.zoom;
  dom.canvas.width = width;
  dom.canvas.height = height;
  dom.canvas.style.width = `${width}px`;
  dom.canvas.style.height = `${height}px`;
  ctx.clearRect(0, 0, width, height);

  updateCanvasLabels();

  if (state.view === 'source' && state.sourceImage) {
    ctx.drawImage(state.sourceImage, 0, 0, width, height);
    drawGridLines(grid, width, height);
    return;
  }

  drawCanvasBackground(width, height);
  const step = state.view === 'steps' ? createMakingSteps(grid, state.palette)[state.activeStep] : null;
  const highlighted = new Set(step?.cells.map((cell) => `${cell.x},${cell.y}`) ?? []);

  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const colorId = grid.cells[y][x];
      if (!colorId) continue;
      const bead = state.palette.find((item) => item.id === colorId);
      const alpha = highlighted.size > 0 && !highlighted.has(`${x},${y}`) ? 0.22 : 1;
      drawBead(x, y, bead, colorId, alpha);
    }
  }

  if (state.view === 'board') drawBoardLines(grid);
  drawSelectedCell();
  drawGridLines(grid, width, height);
}

function updateCanvasLabels() {
  const labels = {
    pixel: ['像素视图', '圆豆预览，点击格子直接精修'],
    blueprint: ['蓝图视图', '显示色号，适合核对和导出'],
    board: ['分板视图', '粗线标记 29 x 29 拼板边界'],
    steps: ['制作步骤', '按颜色高亮当前制作批次'],
    source: ['原图视图', '导入图片后用于对比构图']
  };
  const [title, subtitle] = labels[state.view];
  dom.canvasTitle.textContent = title;
  dom.canvasSubtitle.textContent = subtitle;
}

function drawCanvasBackground(width, height) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#f3f5f5';
  const tile = state.zoom;
  for (let y = 0; y < height; y += tile) {
    for (let x = 0; x < width; x += tile) {
      if ((x / tile + y / tile) % 2 === 0) ctx.fillRect(x, y, tile, tile);
    }
  }
}

function drawBead(x, y, bead, colorId, alpha = 1) {
  const left = x * state.zoom;
  const top = y * state.zoom;
  const size = state.zoom;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = bead ? beadCssColor(bead) : '#111';
  if (state.view === 'blueprint' || state.zoom < 11) {
    ctx.fillRect(left + 1, top + 1, size - 2, size - 2);
  } else {
    ctx.beginPath();
    ctx.arc(left + size / 2, top + size / 2, Math.max(2, size / 2 - 2), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.beginPath();
    ctx.arc(left + size * 0.38, top + size * 0.34, Math.max(1, size * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.view === 'blueprint' && state.zoom >= 16) {
    ctx.fillStyle = readableTextColor(bead?.rgb ?? [0, 0, 0]);
    ctx.font = `${Math.max(8, state.zoom * 0.34)}px Segoe UI`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((bead?.code ?? colorId).split('-').pop(), left + size / 2, top + size / 2);
  }
  ctx.restore();
}

function drawGridLines(grid, width, height) {
  ctx.strokeStyle = 'rgba(38, 50, 56, 0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= grid.width; x += 1) {
    ctx.moveTo(x * state.zoom + 0.5, 0);
    ctx.lineTo(x * state.zoom + 0.5, height);
  }
  for (let y = 0; y <= grid.height; y += 1) {
    ctx.moveTo(0, y * state.zoom + 0.5);
    ctx.lineTo(width, y * state.zoom + 0.5);
  }
  ctx.stroke();
}

function drawBoardLines(grid) {
  const boardWidth = state.project.board.width;
  const boardHeight = state.project.board.height;
  ctx.strokeStyle = '#263238';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = boardWidth; x < grid.width; x += boardWidth) {
    ctx.moveTo(x * state.zoom + 0.5, 0);
    ctx.lineTo(x * state.zoom + 0.5, grid.height * state.zoom);
  }
  for (let y = boardHeight; y < grid.height; y += boardHeight) {
    ctx.moveTo(0, y * state.zoom + 0.5);
    ctx.lineTo(grid.width * state.zoom, y * state.zoom + 0.5);
  }
  ctx.stroke();
}

function drawSelectedCell() {
  if (!state.selectedCell) return;
  const { x, y } = state.selectedCell;
  ctx.save();
  ctx.strokeStyle = '#9a7aa2';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(x * state.zoom + 2, y * state.zoom + 2, state.zoom - 4, state.zoom - 4);
  ctx.restore();
}

function renderMaterials() {
  const materials = createMaterialList(state.project.grid, state.palette);
  dom.materialList.innerHTML = '';
  if (materials.length === 0) {
    dom.materialList.innerHTML = '<p class="hint">生成或绘制后显示每色数量。</p>';
    return;
  }
  for (const item of materials) {
    const row = document.createElement('div');
    row.className = 'material-row';
    row.innerHTML = `<span class="color-chip" style="background:rgb(${item.rgb.join(',')})"></span><span>${item.brand} ${item.code}<br><small>${item.name}</small></span><strong>${item.count}</strong>`;
    dom.materialList.append(row);
  }
}

function renderStatus() {
  const grid = state.project.grid;
  const materials = createMaterialList(grid, state.palette);
  const beadCount = materials.reduce((sum, item) => sum + item.count, 0);
  const boardColumns = Math.ceil(grid.width / state.project.board.width);
  const boardRows = Math.ceil(grid.height / state.project.board.height);
  const selected = getSelectedBead();

  dom.statusDimensions.textContent = `${grid.width} x ${grid.height} / ${state.project.beadSizeMm}mm`;
  dom.statusBeads.textContent = `${beadCount} 颗豆`;
  dom.statusColor.textContent = selected ? `${selected.brand} ${selected.code} ${selected.name}` : '未选色';
  dom.statusBoard.textContent = `分板 ${boardColumns} x ${boardRows}`;
  dom.metricGrid.textContent = `${grid.width} x ${grid.height}`;
  dom.metricPalette.textContent = String(
    state.palette.filter((bead) => !state.project.disabledColorIds.includes(bead.id)).length
  );
  dom.metricSteps.textContent = String(createMakingSteps(grid, state.palette).length);
  renderProjectFields();
}

async function handleImageInput(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  state.sourceImage = image;
  state.project.source = { name: file.name, type: file.type, dataUrl, width: image.naturalWidth, height: image.naturalHeight };
  pixelizeSourceImage('已导入并生成拼豆图');
}

async function handleProjectInput(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  state.project = parseProject(text);
  state.undoStack = [];
  state.redoStack = [];
  state.palette = mergePalettes(state.project.paletteBrands);
  if (state.project.source?.dataUrl) state.sourceImage = await loadImage(state.project.source.dataUrl);
  state.selectedColorId = state.palette[0]?.id ?? null;
  autosave('工程已打开');
  renderAll();
}

function pixelizeSourceImage(successMessage = '已生成拼豆图') {
  if (!state.sourceImage) {
    setSaveState('请先导入图片');
    return;
  }
  const width = clamp(Number(dom.gridWidth.value), 8, 220);
  const height = clamp(Number(dom.gridHeight.value), 8, 220);
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const offscreenCtx = offscreen.getContext('2d', { willReadFrequently: true });
  offscreenCtx.imageSmoothingEnabled = dom.pixelMode.value !== 'nearest';
  offscreenCtx.drawImage(state.sourceImage, 0, 0, width, height);
  const data = offscreenCtx.getImageData(0, 0, width, height).data;
  const disabledColorIds = state.project.disabledColorIds;
  const grid = createGrid(width, height, null);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      if (data[index + 3] < 24) continue;
      const bead = findNearestBead([data[index], data[index + 1], data[index + 2]], state.palette, { disabledColorIds });
      grid.cells[y][x] = bead.id;
    }
  }

  pushUndo();
  state.project.grid = grid;
  state.project.beadSizeMm = Number(dom.beadSize.value);
  state.tool = 'select';
  state.selectedCell = null;
  state.selectedSourceColorId = null;
  autosave(successMessage);
  renderAll();
}

function resizeEmptyGrid() {
  const width = clamp(Number(dom.gridWidth.value), 8, 220);
  const height = clamp(Number(dom.gridHeight.value), 8, 220);
  if (state.project.grid.width === width && state.project.grid.height === height) return;
  pushUndo();
  state.project.grid = createGrid(width, height, null);
  autosave('画布尺寸已重置');
  renderAll();
}

function clearCanvas() {
  const { width, height } = state.project.grid;
  pushUndo();
  state.redoStack = [];
  state.project.grid = createGrid(width, height, null);
  state.activeStep = 0;
  state.selectedCell = null;
  state.selectedSourceColorId = null;
  autosave('画布已清空');
  renderAll();
}

function handlePointerDown(event) {
  state.pointerDown = true;
  applyCanvasTool(event);
}

function handlePointerMove(event) {
  if (!state.pointerDown || ['fill', 'eyedropper', 'select'].includes(state.tool)) return;
  applyCanvasTool(event);
}

function applyCanvasTool(event) {
  const cell = eventToCell(event);
  if (!cell) return;
  const current = state.project.grid.cells[cell.y][cell.x];

  if (state.tool === 'select' || state.tool === 'eyedropper') {
    state.selectedCell = cell;
    state.selectedSourceColorId = current;
    if (current && state.palette.some((bead) => bead.id === current)) {
      state.selectedColorId = current;
    }
    renderPalette();
    renderReplacement();
    renderStatus();
    return;
  }

  pushUndo();
  if (state.tool === 'brush') {
    state.project.grid = paintCell(state.project.grid, cell.x, cell.y, state.selectedColorId);
  } else if (state.tool === 'eraser') {
    state.project.grid = paintCell(state.project.grid, cell.x, cell.y, null);
  } else if (state.tool === 'fill') {
    state.project.grid = fillConnected(state.project.grid, cell.x, cell.y, state.selectedColorId);
  }
  state.redoStack = [];
  autosave('画布已更新');
  renderCanvas();
  renderMaterials();
  renderStatus();
}

function eventToCell(event) {
  const rect = dom.canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) / state.zoom);
  const y = Math.floor((event.clientY - rect.top) / state.zoom);
  if (x < 0 || y < 0 || x >= state.project.grid.width || y >= state.project.grid.height) return null;
  return { x, y };
}

function pushUndo() {
  state.undoStack.push(JSON.stringify(state.project.grid));
  if (state.undoStack.length > 80) state.undoStack.shift();
}

function undo() {
  const previous = state.undoStack.pop();
  if (!previous) return;
  state.redoStack.push(JSON.stringify(state.project.grid));
  state.project.grid = JSON.parse(previous);
  autosave('已撤销');
  renderAll();
}

function redo() {
  const next = state.redoStack.pop();
  if (!next) return;
  state.undoStack.push(JSON.stringify(state.project.grid));
  state.project.grid = JSON.parse(next);
  autosave('已重做');
  renderAll();
}

function toggleSelectedDisabled() {
  if (!state.selectedColorId) return;
  const disabled = new Set(state.project.disabledColorIds);
  if (dom.disableCurrent.checked) disabled.add(state.selectedColorId);
  else disabled.delete(state.selectedColorId);
  state.project.disabledColorIds = [...disabled];
  autosave('禁用色设置已更新');
  renderPalette();
}

function replaceSelectedColor() {
  if (!state.selectedCell || !state.selectedColorId) {
    setSaveState('请先在画布选择要替换的颜色');
    return;
  }
  if (state.selectedSourceColorId === state.selectedColorId) {
    setSaveState('源颜色和目标颜色相同');
    return;
  }
  pushUndo();
  if (dom.replaceScope.value === 'connected') {
    state.project.grid = replaceConnectedColor(
      state.project.grid,
      state.selectedCell.x,
      state.selectedCell.y,
      state.selectedColorId
    );
  } else {
    state.project.grid = replaceColor(state.project.grid, state.selectedSourceColorId, state.selectedColorId);
  }
  state.selectedSourceColorId = state.selectedColorId;
  autosave('已替换颜色');
  renderAll();
}

function saveProjectFile() {
  downloadBlob(`${safeFileName(state.project.name)}.pindou`, new Blob([serializeProject(state.project)], { type: 'application/json' }));
  setSaveState('工程已导出');
}

function exportPng() {
  dom.canvas.toBlob((blob) => {
    if (!blob) return;
    downloadBlob(`${safeFileName(state.project.name)}-blueprint.png`, blob);
  }, 'image/png');
}

function exportSteps() {
  const payload = {
    project: state.project.name,
    grid: { width: state.project.grid.width, height: state.project.grid.height },
    materials: createMaterialList(state.project.grid, state.palette),
    steps: createMakingSteps(state.project.grid, state.palette, 'color')
  };
  downloadBlob(`${safeFileName(state.project.name)}-steps.json`, new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
}

async function syncWebDav() {
  const url = dom.webdavUrl.value.trim();
  if (!url) {
    dom.webdavState.textContent = '请先填写 WebDAV 文件地址。';
    return;
  }
  dom.webdavState.textContent = '正在同步...';
  saveWebDavSettings();
  const headers = { 'Content-Type': 'application/json' };
  if (dom.webdavUser.value && dom.webdavPass.value) {
    headers.Authorization = `Basic ${btoa(`${dom.webdavUser.value}:${dom.webdavPass.value}`)}`;
  }
  try {
    const response = await fetch(url, { method: 'PUT', headers, body: serializeProject(state.project) });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    dom.webdavState.textContent = `同步成功：${new Date().toLocaleTimeString()}`;
    setSaveState('WebDAV 已同步');
  } catch (error) {
    dom.webdavState.textContent = `同步失败：${error.message}。请确认 WebDAV CORS 和凭据。`;
  }
}

function autosave(statusText = '已自动恢复点') {
  localStorage.setItem('pindou.autosave', serializeProject(state.project));
  setSaveState(statusText);
}

function restoreAutosave() {
  const saved = localStorage.getItem('pindou.autosave');
  if (!saved) return;
  try {
    state.project = parseProject(saved);
    normalizeActivePaletteBrand();
  } catch {
    localStorage.removeItem('pindou.autosave');
  }
}

function normalizeActivePaletteBrand() {
  const [brand] = state.project.paletteBrands ?? [];
  state.project.paletteBrands = DOMESTIC_PALETTES[brand] ? [brand] : ['MARD'];
}

function loadWebDavSettings() {
  const settings = JSON.parse(localStorage.getItem('pindou.webdav') ?? '{}');
  dom.webdavUrl.value = settings.url ?? '';
  dom.webdavUser.value = settings.user ?? '';
}

function saveWebDavSettings() {
  localStorage.setItem('pindou.webdav', JSON.stringify({ url: dom.webdavUrl.value.trim(), user: dom.webdavUser.value.trim() }));
}

function getSelectedBead() {
  return state.palette.find((bead) => bead.id === state.selectedColorId) ?? null;
}

function getBeadById(colorId) {
  return state.palette.find((bead) => bead.id === colorId) ?? null;
}

function brandLabel(brandKey) {
  const first = DOMESTIC_PALETTES[brandKey]?.[0];
  return first?.brand ?? brandKey;
}

function readableTextColor(rgb) {
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return luminance > 0.58 ? '#172025' : '#ffffff';
}

function setSaveState(text) {
  dom.saveState.textContent = text;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Image failed to load.')));
    image.src = src;
  });
}

function downloadBlob(fileName, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeFileName(value) {
  return (value || 'pindou-project').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80);
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
