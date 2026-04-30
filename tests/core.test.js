import test from 'node:test';
import assert from 'node:assert/strict';

import { DOMESTIC_PALETTES, findNearestBead, mergePalettes } from '../src/core/palette.js';
import { createGrid, fillConnected, paintCell, replaceColor, replaceConnectedColor } from '../src/core/grid.js';
import { createProject, serializeProject, parseProject } from '../src/core/project.js';
import { createMaterialList, createMakingSteps } from '../src/core/exporters.js';

test('findNearestBead maps rgb values to the closest enabled domestic bead color', () => {
  const palette = mergePalettes(['MARD']);
  const bead = findNearestBead([244, 42, 64], palette);

  assert.equal(bead.brand, 'MARD');
  assert.equal(bead.code, 'M-R01');
});

test('findNearestBead skips disabled colors', () => {
  const palette = mergePalettes(['MARD']);
  const bead = findNearestBead([244, 42, 64], palette, { disabledColorIds: ['MARD:M-R01'] });

  assert.notEqual(bead.id, 'MARD:M-R01');
});

test('findNearestBead keeps gray source colors on neutral bead colors', () => {
  const palette = mergePalettes(['MARD']);
  const bead = findNearestBead([128, 128, 128], palette);

  assert.ok(['MARD:M-K01', 'MARD:M-W01'].includes(bead.id));
});

test('grid editing paints, fills connected cells, and replaces colors', () => {
  let grid = createGrid(3, 3, 'empty');
  grid = paintCell(grid, 0, 0, 'red');
  grid = paintCell(grid, 1, 0, 'red');
  grid = paintCell(grid, 2, 2, 'blue');

  grid = fillConnected(grid, 0, 0, 'yellow');
  assert.equal(grid.cells[0][0], 'yellow');
  assert.equal(grid.cells[0][1], 'yellow');
  assert.equal(grid.cells[2][2], 'blue');

  grid = replaceColor(grid, 'yellow', 'orange');
  assert.equal(grid.cells[0][0], 'orange');
  assert.equal(grid.cells[0][1], 'orange');
});

test('connected replacement only changes the selected region and leaves matching interior colors intact', () => {
  const grid = {
    width: 4,
    height: 4,
    cells: [
      ['bg', 'bg', 'bg', 'bg'],
      ['bg', 'fg', 'fg', 'bg'],
      ['bg', 'fg', 'bg', 'bg'],
      ['bg', 'bg', 'bg', 'fg']
    ]
  };

  const replaced = replaceConnectedColor(grid, 0, 0, 'empty');

  assert.equal(replaced.cells[0][0], 'empty');
  assert.equal(replaced.cells[2][2], 'empty');
  assert.equal(replaced.cells[1][1], 'fg');
  assert.equal(replaced.cells[3][3], 'fg');
});

test('project serialization preserves grid, palette, inventory, and settings', () => {
  const project = createProject({
    name: '测试工程',
    width: 2,
    height: 2,
    beadSizeMm: 5,
    paletteBrands: ['MARD', 'COCO']
  });
  const edited = {
    ...project,
    grid: paintCell(project.grid, 1, 1, 'MARD:M-R01'),
    inventory: { 'MARD:M-R01': 120 },
    exportSettings: { mode: 'color', pageSize: 'A4' }
  };

  const roundTrip = parseProject(serializeProject(edited));
  assert.equal(roundTrip.name, '测试工程');
  assert.equal(roundTrip.grid.cells[1][1], 'MARD:M-R01');
  assert.equal(roundTrip.inventory['MARD:M-R01'], 120);
  assert.deepEqual(roundTrip.paletteBrands, ['MARD', 'COCO']);
});

test('exporters create material counts and ordered making steps', () => {
  const grid = createGrid(2, 2, null);
  const painted = {
    ...grid,
    cells: [
      ['MARD:M-R01', 'MARD:M-R01'],
      ['COCO:C-B01', null]
    ]
  };
  const palette = [...DOMESTIC_PALETTES.MARD, ...DOMESTIC_PALETTES.COCO];

  const materials = createMaterialList(painted, palette);
  assert.equal(materials[0].colorId, 'MARD:M-R01');
  assert.equal(materials[0].count, 2);
  assert.equal(materials[1].count, 1);

  const steps = createMakingSteps(painted, palette, 'color');
  assert.equal(steps.length, 2);
  assert.deepEqual(steps[0].cells, [{ x: 0, y: 0 }, { x: 1, y: 0 }]);
});
