import { DOMESTIC_PALETTES, beadCssColor, findNearestBead, mergePalettes } from './core/palette.js';
import { createGrid, fillConnected, paintCell, replaceColor, replaceConnectedColor } from './core/grid.js';
import { createProject, parseProject, serializeProject } from './core/project.js';
import { createMakingSteps, createMaterialList } from './core/exporters.js';

const BEAD_CATALOG = mergePalettes();

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
  cropSection: document.querySelector('#cropSection'),
  cropCanvas: document.querySelector('#cropCanvas'),
  cropSummary: document.querySelector('#cropSummary'),
  cropX: document.querySelector('#cropX'),
  cropY: document.querySelector('#cropY'),
  cropWidth: document.querySelector('#cropWidth'),
  cropHeight: document.querySelector('#cropHeight'),
  cropFullBtn: document.querySelector('#cropFullBtn'),
  cropSquareBtn: document.querySelector('#cropSquareBtn'),
  applyCropBtn: document.querySelector('#applyCropBtn'),
  toolGrid: document.querySelector('#toolGrid'),
  artTextInput: document.querySelector('#artTextInput'),
  artTextX: document.querySelector('#artTextX'),
  artTextY: document.querySelector('#artTextY'),
  artTextSize: document.querySelector('#artTextSize'),
  artTextFont: document.querySelector('#artTextFont'),
  artTextWeight: document.querySelector('#artTextWeight'),
  artTextItalic: document.querySelector('#artTextItalic'),
  artTextOutline: document.querySelector('#artTextOutline'),
  previewArtTextBtn: document.querySelector('#previewArtTextBtn'),
  applyArtTextBtn: document.querySelector('#applyArtTextBtn'),
  clearArtTextBtn: document.querySelector('#clearArtTextBtn'),
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
  remapPaletteBtn: document.querySelector('#remapPaletteBtn'),
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
const cropCtx = dom.cropCanvas.getContext('2d');
const state = {
  project: createProject({ width: 48, height: 48, paletteBrands: ['MARD'] }),
  palette: mergePalettes(['MARD']),
  selectedColorId: 'MARD:M-R01',
  selectedSourceColorId: null,
  selectedCell: null,
  tool: 'select',
  view: 'pixel',
  zoom: 16,
  undoStack: [],
  redoStack: [],
  sourceImage: null,
  cropInteraction: null,
  cropPreviewFrame: null,
  textPreview: null,
  pointerDown: false,
  activeStep: 0
};

init();

function init() {
  applyInitialViewportDefaults();
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
  dom.projectName.addEventListener('input', () => {
    state.project.name = dom.projectName.value.trim() || '未命名拼豆工程';
    autosave('已自动保存项目名');
  });
  dom.gridWidth.addEventListener('change', handleGridSizeChange);
  dom.gridHeight.addEventListener('change', handleGridSizeChange);
  dom.pixelMode.addEventListener('change', handlePixelModeChange);
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
  dom.remapPaletteBtn.addEventListener('click', remapCanvasToActivePalette);
  dom.webdavSyncBtn.addEventListener('click', syncWebDav);
  dom.webdavUrl.addEventListener('change', saveWebDavSettings);
  dom.webdavUser.addEventListener('change', saveWebDavSettings);

  for (const input of [dom.cropX, dom.cropY, dom.cropWidth, dom.cropHeight]) {
    input.addEventListener('input', handleCropInput);
  }
  dom.cropFullBtn.addEventListener('click', () => setCrop({ x: 0, y: 0, width: 1, height: 1 }));
  dom.cropSquareBtn.addEventListener('click', setSquareCrop);
  dom.applyCropBtn.addEventListener('click', applyCrop);
  dom.cropCanvas.addEventListener('pointerdown', handleCropPointerDown);
  dom.cropCanvas.addEventListener('pointermove', handleCropPointerMove);
  dom.cropCanvas.addEventListener('pointerup', endCropInteraction);
  dom.cropCanvas.addEventListener('pointercancel', endCropInteraction);

  for (const input of [
    dom.artTextInput,
    dom.artTextX,
    dom.artTextY,
    dom.artTextSize,
    dom.artTextFont,
    dom.artTextWeight,
    dom.artTextItalic,
    dom.artTextOutline
  ]) {
    input.addEventListener('input', updateArtTextPreviewIfActive);
  }
  dom.previewArtTextBtn.addEventListener('click', previewArtText);
  dom.applyArtTextBtn.addEventListener('click', applyArtText);
  dom.clearArtTextBtn.addEventListener('click', clearArtTextPreview);
}

function renderAll() {
  normalizeActivePaletteBrand();
  state.palette = mergePalettes(state.project.paletteBrands);
  renderProjectFields();
  renderTools();
  renderCropControls();
  renderArtTextControls();
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
      switchPaletteBrand(brandKey);
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
    const crop = getSourceCropRect();
    ctx.drawImage(state.sourceImage, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
    drawGridLines(grid, width, height);
    return;
  }

  drawCanvasBackground(width, height);
  const step = state.view === 'steps' ? createMakingSteps(grid, getDisplayPalette())[state.activeStep] : null;
  const highlighted = new Set(step?.cells.map((cell) => `${cell.x},${cell.y}`) ?? []);

  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const colorId = grid.cells[y][x];
      if (!colorId) continue;
      const bead = getBeadById(colorId);
      const alpha = highlighted.size > 0 && !highlighted.has(`${x},${y}`) ? 0.22 : 1;
      drawBead(x, y, bead, colorId, alpha);
    }
  }

  if (state.view === 'board') drawBoardLines(grid);
  drawArtTextPreview();
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
  ctx.fillStyle = bead ? beadCssColor(bead) : '#aeb8bf';
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
  const materials = createMaterialList(state.project.grid, getDisplayPalette());
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
  const materials = createMaterialList(grid, getDisplayPalette());
  const beadCount = materials.reduce((sum, item) => sum + item.count, 0);
  const boardColumns = Math.ceil(grid.width / state.project.board.width);
  const boardRows = Math.ceil(grid.height / state.project.board.height);
  const selected = getSelectedBead();

  dom.statusDimensions.textContent = `${grid.width} x ${grid.height} / ${state.project.beadSizeMm}mm`;
  dom.statusBeads.textContent = `${beadCount} 颗豆`;
  dom.statusColor.textContent = selected ? `${selected.brand} ${selected.code} ${selected.name}` : '未选色';
  dom.statusBoard.textContent = `分板 ${boardColumns} x ${boardRows}`;
  dom.metricGrid.textContent = `${grid.width} x ${grid.height}`;
  dom.metricPalette.textContent = `${state.palette.filter((bead) => !state.project.disabledColorIds.includes(bead.id)).length} 色`;
  dom.metricSteps.textContent = `${createMakingSteps(grid, getDisplayPalette()).length} 步`;
  renderProjectFields();
}

function applyInitialViewportDefaults() {
  if (!window.matchMedia?.('(max-width: 640px)').matches) return;
  state.zoom = 10;
  dom.zoomRange.value = String(state.zoom);
}

function switchPaletteBrand(brandKey) {
  if (!DOMESTIC_PALETTES[brandKey] || state.project.paletteBrands[0] === brandKey) return;

  syncActivePaletteVariant();
  const nextPalette = mergePalettes([brandKey]);
  const previousSelected = getBeadById(state.selectedColorId);
  const previousBrand = activeBrandKey();

  state.project.paletteBrands = [brandKey];
  state.palette = nextPalette;
  state.project.grid = getPaletteVariantGrid(brandKey)
    ?? createPaletteGridFromSource(nextPalette)
    ?? remapGridToPalette(state.project.grid, nextPalette, state.project.disabledColorIds).grid;
  state.selectedColorId = previousSelected
    ? nearestPaletteColorId(previousSelected.rgb, nextPalette, state.project.disabledColorIds)
    : nextPalette[0]?.id ?? null;
  state.selectedCell = null;
  state.selectedSourceColorId = null;
  state.textPreview = null;
  state.undoStack = [];
  state.redoStack = [];

  autosave(`已从 ${brandLabel(previousBrand)} 切换到 ${brandLabel(brandKey)} 配色`);
  renderAll();
}

function remapCanvasToActivePalette() {
  const remapped = remapGridToPalette(state.project.grid, state.palette, state.project.disabledColorIds);
  if (!remapped.changed) {
    setSaveState('画布已经使用当前色卡');
    return;
  }

  pushUndo();
  state.project.grid = remapped.grid;
  state.selectedSourceColorId = state.selectedSourceColorId
    ? remapped.colorMap.get(state.selectedSourceColorId) ?? state.selectedSourceColorId
    : null;
  state.textPreview = null;
  state.redoStack = [];
  autosave(`已转换画布到 ${brandLabel(state.project.paletteBrands[0])} 色卡`);
  renderAll();
}

function activeBrandKey() {
  return state.project.paletteBrands?.[0] ?? 'MARD';
}

function ensurePaletteVariants() {
  if (!state.project.paletteVariants || typeof state.project.paletteVariants !== 'object') {
    state.project.paletteVariants = {};
  }
}

function syncActivePaletteVariant() {
  ensurePaletteVariants();
  state.project.paletteVariants[activeBrandKey()] = cloneGrid(state.project.grid);
}

function getPaletteVariantGrid(brandKey) {
  ensurePaletteVariants();
  const variant = state.project.paletteVariants[brandKey];
  if (!variant || variant.width !== state.project.grid.width || variant.height !== state.project.grid.height) return null;
  return cloneGrid(variant);
}

function createPaletteGridFromSource(palette) {
  if (!state.sourceImage) return null;
  return createGridFromSourceImage(palette);
}

function createGridFromSourceImage(palette) {
  const width = clamp(Number(dom.gridWidth.value), 8, 220);
  const height = clamp(Number(dom.gridHeight.value), 8, 220);
  const crop = getSourceCropRect();
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const offscreenCtx = offscreen.getContext('2d', { willReadFrequently: true });
  offscreenCtx.imageSmoothingEnabled = dom.pixelMode.value !== 'nearest';
  offscreenCtx.drawImage(state.sourceImage, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
  const data = offscreenCtx.getImageData(0, 0, width, height).data;
  const disabledColorIds = state.project.disabledColorIds;
  const grid = createGrid(width, height, null);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      if (data[index + 3] < 24) continue;
      const bead = findNearestBead([data[index], data[index + 1], data[index + 2]], palette, { disabledColorIds });
      grid.cells[y][x] = bead.id;
    }
  }

  return grid;
}

function cloneGrid(grid) {
  return {
    ...grid,
    cells: grid.cells.map((row) => [...row])
  };
}

function remapGridToPalette(grid, targetPalette, disabledColorIds = []) {
  const colorMap = new Map();
  let changed = false;
  const cells = grid.cells.map((row) => row.map((colorId) => {
    if (!colorId) return colorId;
    if (!colorMap.has(colorId)) {
      colorMap.set(colorId, remapColorIdToPalette(colorId, targetPalette, disabledColorIds) ?? colorId);
    }
    const nextColorId = colorMap.get(colorId);
    if (nextColorId !== colorId) changed = true;
    return nextColorId;
  }));

  return { grid: { ...grid, cells }, changed, colorMap };
}

function remapColorIdToPalette(colorId, targetPalette, disabledColorIds = []) {
  if (targetPalette.some((bead) => bead.id === colorId)) return colorId;
  const bead = getBeadById(colorId);
  return bead ? nearestPaletteColorId(bead.rgb, targetPalette, disabledColorIds) : null;
}

function nearestPaletteColorId(rgb, palette, disabledColorIds = []) {
  try {
    return findNearestBead(rgb, palette, { disabledColorIds }).id;
  } catch {
    return palette[0]?.id ?? null;
  }
}

function renderCropControls() {
  const hasSource = Boolean(state.sourceImage);
  dom.cropSection.hidden = !hasSource;
  if (!hasSource) {
    state.cropPreviewFrame = null;
    return;
  }

  state.project.crop = normalizeCrop(state.project.crop);
  syncCropInputs(state.project.crop);
  renderCropSummary();
  renderCropPreview();
}

function syncCropInputs(crop) {
  dom.cropX.value = String(Math.round(crop.x * 1000));
  dom.cropY.value = String(Math.round(crop.y * 1000));
  dom.cropWidth.value = String(Math.round(crop.width * 1000));
  dom.cropHeight.value = String(Math.round(crop.height * 1000));
}

function renderCropSummary() {
  const crop = normalizeCrop(state.project.crop);
  const rect = getSourceCropRect();
  dom.cropSummary.textContent = `位置 ${Math.round(crop.x * 100)}%, ${Math.round(crop.y * 100)}% / 尺寸 ${rect.width} x ${rect.height}px`;
}

function renderCropPreview() {
  const image = state.sourceImage;
  cropCtx.clearRect(0, 0, dom.cropCanvas.width, dom.cropCanvas.height);
  cropCtx.fillStyle = '#f7f4f8';
  cropCtx.fillRect(0, 0, dom.cropCanvas.width, dom.cropCanvas.height);
  if (!image) return;

  const imageRect = fitRect(image.naturalWidth, image.naturalHeight, dom.cropCanvas.width, dom.cropCanvas.height);
  cropCtx.drawImage(image, imageRect.x, imageRect.y, imageRect.width, imageRect.height);

  const crop = normalizeCrop(state.project.crop);
  const cropRect = {
    x: imageRect.x + crop.x * imageRect.width,
    y: imageRect.y + crop.y * imageRect.height,
    width: crop.width * imageRect.width,
    height: crop.height * imageRect.height
  };
  state.cropPreviewFrame = { imageRect, cropRect };

  cropCtx.fillStyle = 'rgba(20, 16, 24, 0.56)';
  cropCtx.fillRect(imageRect.x, imageRect.y, imageRect.width, cropRect.y - imageRect.y);
  cropCtx.fillRect(imageRect.x, cropRect.y + cropRect.height, imageRect.width, imageRect.y + imageRect.height - cropRect.y - cropRect.height);
  cropCtx.fillRect(imageRect.x, cropRect.y, cropRect.x - imageRect.x, cropRect.height);
  cropCtx.fillRect(cropRect.x + cropRect.width, cropRect.y, imageRect.x + imageRect.width - cropRect.x - cropRect.width, cropRect.height);

  cropCtx.strokeStyle = '#ffffff';
  cropCtx.lineWidth = 2;
  cropCtx.strokeRect(cropRect.x + 0.5, cropRect.y + 0.5, cropRect.width - 1, cropRect.height - 1);
  cropCtx.fillStyle = '#ffffff';
  cropCtx.fillRect(cropRect.x + cropRect.width - 10, cropRect.y + cropRect.height - 10, 10, 10);
  cropCtx.strokeStyle = '#9a7aa2';
  cropCtx.strokeRect(cropRect.x + cropRect.width - 10, cropRect.y + cropRect.height - 10, 10, 10);
}

function handleCropInput() {
  const crop = normalizeCrop({
    x: Number(dom.cropX.value) / 1000,
    y: Number(dom.cropY.value) / 1000,
    width: Number(dom.cropWidth.value) / 1000,
    height: Number(dom.cropHeight.value) / 1000
  });
  setCrop(crop, '剪裁预览已更新，点击应用剪裁');
}

function setCrop(crop, statusText = '剪裁预览已更新') {
  state.project.crop = normalizeCrop(crop);
  syncCropInputs(state.project.crop);
  renderCropSummary();
  renderCropPreview();
  setSaveState(statusText);
}

function setSquareCrop() {
  if (!state.sourceImage) return;
  const side = Math.min(state.sourceImage.naturalWidth, state.sourceImage.naturalHeight);
  const width = side / state.sourceImage.naturalWidth;
  const height = side / state.sourceImage.naturalHeight;
  setCrop({ x: (1 - width) / 2, y: (1 - height) / 2, width, height }, '已切到居中正方形剪裁');
}

function applyCrop() {
  if (!state.sourceImage) {
    setSaveState('请先导入图片');
    return;
  }
  pixelizeSourceImage('已应用剪裁并生成拼豆图');
}

function handleCropPointerDown(event) {
  if (!state.sourceImage || !state.cropPreviewFrame) return;
  const point = cropCanvasPoint(event);
  const { imageRect, cropRect } = state.cropPreviewFrame;
  const nearHandle = point.x >= cropRect.x + cropRect.width - 18
    && point.x <= cropRect.x + cropRect.width + 8
    && point.y >= cropRect.y + cropRect.height - 18
    && point.y <= cropRect.y + cropRect.height + 8;
  const inside = point.x >= cropRect.x && point.x <= cropRect.x + cropRect.width
    && point.y >= cropRect.y && point.y <= cropRect.y + cropRect.height;

  if (!inside && !nearHandle) {
    const crop = normalizeCrop(state.project.crop);
    const centerX = clamp((point.x - imageRect.x) / imageRect.width, 0, 1);
    const centerY = clamp((point.y - imageRect.y) / imageRect.height, 0, 1);
    crop.x = clamp(centerX - crop.width / 2, 0, 1 - crop.width);
    crop.y = clamp(centerY - crop.height / 2, 0, 1 - crop.height);
    setCrop(crop);
  }

  state.cropInteraction = {
    mode: nearHandle ? 'resize' : 'move',
    startPoint: cropCanvasPoint(event),
    startCrop: normalizeCrop(state.project.crop),
    imageRect
  };
  dom.cropCanvas.setPointerCapture(event.pointerId);
}

function handleCropPointerMove(event) {
  if (!state.cropInteraction) return;
  const point = cropCanvasPoint(event);
  const { mode, startPoint, startCrop, imageRect } = state.cropInteraction;
  const dx = (point.x - startPoint.x) / imageRect.width;
  const dy = (point.y - startPoint.y) / imageRect.height;
  const next = { ...startCrop };

  if (mode === 'resize') {
    next.width = clamp(startCrop.width + dx, 0.05, 1 - startCrop.x);
    next.height = clamp(startCrop.height + dy, 0.05, 1 - startCrop.y);
  } else {
    next.x = clamp(startCrop.x + dx, 0, 1 - startCrop.width);
    next.y = clamp(startCrop.y + dy, 0, 1 - startCrop.height);
  }

  setCrop(next, '剪裁预览已更新，点击应用剪裁');
}

function endCropInteraction(event) {
  if (state.cropInteraction && dom.cropCanvas.hasPointerCapture(event.pointerId)) {
    dom.cropCanvas.releasePointerCapture(event.pointerId);
  }
  state.cropInteraction = null;
}

function cropCanvasPoint(event) {
  const rect = dom.cropCanvas.getBoundingClientRect();
  const scaleX = dom.cropCanvas.width / rect.width;
  const scaleY = dom.cropCanvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

function getSourceCropRect() {
  const image = state.sourceImage;
  if (!image) return { x: 0, y: 0, width: 1, height: 1 };
  const crop = normalizeCrop(state.project.crop);
  const x = Math.round(crop.x * image.naturalWidth);
  const y = Math.round(crop.y * image.naturalHeight);
  const width = Math.max(1, Math.round(crop.width * image.naturalWidth));
  const height = Math.max(1, Math.round(crop.height * image.naturalHeight));
  return {
    x: clamp(x, 0, image.naturalWidth - 1),
    y: clamp(y, 0, image.naturalHeight - 1),
    width: Math.min(width, image.naturalWidth - x),
    height: Math.min(height, image.naturalHeight - y)
  };
}

function normalizeCrop(crop) {
  const next = {
    x: Number(crop?.x ?? 0),
    y: Number(crop?.y ?? 0),
    width: Number(crop?.width ?? 1),
    height: Number(crop?.height ?? 1)
  };
  next.width = clamp(next.width, 0.05, 1);
  next.height = clamp(next.height, 0.05, 1);
  next.x = clamp(next.x, 0, 1 - next.width);
  next.y = clamp(next.y, 0, 1 - next.height);
  return next;
}

function fitRect(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
    width,
    height
  };
}

function renderArtTextControls() {
  const grid = state.project.grid;
  dom.artTextX.max = String(Math.max(0, grid.width - 1));
  dom.artTextY.max = String(Math.max(0, grid.height - 1));
  dom.artTextSize.max = String(Math.max(4, grid.height));
  dom.artTextX.value = String(clamp(Number(dom.artTextX.value), 0, Math.max(0, grid.width - 1)));
  dom.artTextY.value = String(clamp(Number(dom.artTextY.value), 0, Math.max(0, grid.height - 1)));
  dom.artTextSize.value = String(clamp(Number(dom.artTextSize.value), 4, Math.max(4, grid.height)));
}

function previewArtText() {
  const cells = buildArtTextCells();
  state.textPreview = cells.length > 0 ? { cells } : null;
  setSaveState(cells.length > 0 ? '艺术字预览中，满意后写入画布' : '先输入文字并选择颜色');
  renderCanvas();
}

function updateArtTextPreviewIfActive() {
  if (state.textPreview) previewArtText();
}

function clearArtTextPreview() {
  state.textPreview = null;
  setSaveState('艺术字预览已清除');
  renderCanvas();
}

function applyArtText() {
  const cells = state.textPreview?.cells ?? buildArtTextCells();
  if (cells.length === 0) {
    setSaveState('先输入文字并选择颜色');
    return;
  }

  pushUndo();
  const gridCells = state.project.grid.cells.map((row) => [...row]);
  for (const cell of cells) {
    gridCells[cell.y][cell.x] = cell.colorId;
  }
  state.project.grid = { ...state.project.grid, cells: gridCells };
  state.textPreview = null;
  state.redoStack = [];
  autosave('艺术字已写入画布');
  renderAll();
}

function buildArtTextCells() {
  const text = dom.artTextInput.value.trim();
  if (!text || !state.selectedColorId) return [];

  const grid = state.project.grid;
  const scale = 4;
  const width = grid.width * scale;
  const height = grid.height * scale;
  const x = clamp(Number(dom.artTextX.value), 0, Math.max(0, grid.width - 1)) * scale;
  const y = clamp(Number(dom.artTextY.value), 0, Math.max(0, grid.height - 1)) * scale;
  const fontSize = clamp(Number(dom.artTextSize.value), 4, Math.max(4, grid.height)) * scale;
  const fontStyle = dom.artTextItalic.checked ? 'italic ' : '';
  const font = `${fontStyle}${dom.artTextWeight.value} ${fontSize}px ${dom.artTextFont.value}`;
  const cellMap = new Map();

  if (dom.artTextOutline.checked) {
    const outlineColorId = nearestPaletteColorId([35, 36, 38], state.palette, state.project.disabledColorIds) ?? state.selectedColorId;
    const outlineCtx = createTextMaskContext(width, height, font);
    outlineCtx.lineWidth = Math.max(scale, fontSize * 0.12);
    outlineCtx.strokeText(text, x, y);
    collectTextCells(outlineCtx, grid, scale, outlineColorId, cellMap);
  }

  const fillCtx = createTextMaskContext(width, height, font);
  fillCtx.fillText(text, x, y);
  collectTextCells(fillCtx, grid, scale, state.selectedColorId, cellMap);

  return [...cellMap.entries()].map(([key, colorId]) => {
    const [cellX, cellY] = key.split(',').map(Number);
    return { x: cellX, y: cellY, colorId };
  });
}

function createTextMaskContext(width, height, font) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const maskCtx = canvas.getContext('2d', { willReadFrequently: true });
  maskCtx.fillStyle = '#000';
  maskCtx.strokeStyle = '#000';
  maskCtx.lineJoin = 'round';
  maskCtx.lineCap = 'round';
  maskCtx.textBaseline = 'top';
  maskCtx.font = font;
  return maskCtx;
}

function collectTextCells(maskCtx, grid, scale, colorId, cellMap) {
  const data = maskCtx.getImageData(0, 0, grid.width * scale, grid.height * scale).data;
  const coverageThreshold = Math.max(1, Math.floor(scale * scale * 0.18));

  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      let coverage = 0;
      for (let subY = 0; subY < scale; subY += 1) {
        for (let subX = 0; subX < scale; subX += 1) {
          const index = (((y * scale + subY) * grid.width * scale) + (x * scale + subX)) * 4 + 3;
          if (data[index] > 40) coverage += 1;
        }
      }
      if (coverage >= coverageThreshold) cellMap.set(`${x},${y}`, colorId);
    }
  }
}

function drawArtTextPreview() {
  if (!state.textPreview?.cells.length) return;
  for (const cell of state.textPreview.cells) {
    drawBead(cell.x, cell.y, getBeadById(cell.colorId), cell.colorId, 0.78);
  }
}

async function handleImageInput(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  state.sourceImage = image;
  state.project.source = { name: file.name, type: file.type, dataUrl, width: image.naturalWidth, height: image.naturalHeight };
  state.project.crop = { x: 0, y: 0, width: 1, height: 1 };
  event.target.value = '';
  renderCropControls();
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
  else state.sourceImage = null;
  state.selectedColorId = state.palette[0]?.id ?? null;
  state.textPreview = null;
  event.target.value = '';
  autosave('工程已打开');
  renderAll();
}

function pixelizeSourceImage(successMessage = '已生成拼豆图') {
  if (!state.sourceImage) {
    setSaveState('请先导入图片');
    return;
  }

  pushUndo();
  state.project.grid = createGridFromSourceImage(state.palette);
  state.project.paletteVariants = {};
  state.project.beadSizeMm = Number(dom.beadSize.value);
  state.tool = 'select';
  state.selectedCell = null;
  state.selectedSourceColorId = null;
  state.textPreview = null;
  state.redoStack = [];
  autosave(successMessage);
  renderAll();
}

function handleGridSizeChange() {
  const width = clamp(Number(dom.gridWidth.value), 8, 220);
  const height = clamp(Number(dom.gridHeight.value), 8, 220);
  if (state.project.grid.width === width && state.project.grid.height === height) return;
  if (state.sourceImage) {
    pixelizeSourceImage('已按新尺寸生成拼豆图');
    return;
  }
  pushUndo();
  state.project.grid = createGrid(width, height, null);
  state.textPreview = null;
  autosave('画布尺寸已重置');
  renderAll();
}

function handlePixelModeChange() {
  if (state.sourceImage) {
    pixelizeSourceImage('已按新模式生成拼豆图');
  } else {
    setSaveState('导入图片后会使用当前生成模式');
  }
}

function clearCanvas() {
  const { width, height } = state.project.grid;
  pushUndo();
  state.redoStack = [];
  state.project.grid = createGrid(width, height, null);
  state.activeStep = 0;
  state.selectedCell = null;
  state.selectedSourceColorId = null;
  state.textPreview = null;
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
  syncActivePaletteVariant();
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
    materials: createMaterialList(state.project.grid, getDisplayPalette()),
    steps: createMakingSteps(state.project.grid, getDisplayPalette(), 'color')
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
  syncActivePaletteVariant();
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
  return BEAD_CATALOG.find((bead) => bead.id === colorId) ?? state.palette.find((bead) => bead.id === colorId) ?? null;
}

function getDisplayPalette() {
  const byId = new Map(BEAD_CATALOG.map((bead) => [bead.id, bead]));
  for (const bead of state.palette) byId.set(bead.id, bead);
  return [...byId.values()];
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
