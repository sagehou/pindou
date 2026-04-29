# Pindou Editor MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static browser-based 拼豆 pixel editor MVP that can run from GitHub Pages.

**Architecture:** Use a dependency-free ES module app with pure core modules for palette mapping, grid editing, project serialization, and export data. Browser UI lives in `src/app.js` and renders into `index.html`; testable logic lives in `src/core/*.js` and is covered by Node's built-in test runner.

**Tech Stack:** HTML, CSS, vanilla JavaScript ES modules, Canvas API, IndexedDB/localStorage fallback, Node `node:test`.

---

### Task 1: Repository and Static Shell

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `index.html`
- Create: `src/styles.css`

- [ ] **Step 1: Add package metadata and scripts**

```json
{
  "name": "pindou-editor",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.js",
    "check": "node --check src/app.js && node --check src/core/*.js"
  }
}
```

- [ ] **Step 2: Add Git ignore rules**

```gitignore
.superpowers/
node_modules/
dist/
coverage/
*.log
```

- [ ] **Step 3: Add static HTML entry**

Create `index.html` with a root editor layout, file inputs, canvas, side panels, export buttons, and module script `src/app.js`.

- [ ] **Step 4: Add responsive editor CSS**

Create `src/styles.css` with desktop panels, central canvas, bottom status bar, and mobile drawer/tool dock behavior.

### Task 2: Core Logic With Tests

**Files:**
- Create: `src/core/palette.js`
- Create: `src/core/grid.js`
- Create: `src/core/project.js`
- Create: `src/core/exporters.js`
- Create: `tests/core.test.js`

- [ ] **Step 1: Write failing tests for palette matching, grid edits, project serialization, and step export**

Use Node `node:test` assertions to verify nearest color mapping, paint/fill behavior, `.pindou` JSON roundtrip, and color-count steps.

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm test`
Expected: FAIL because core modules do not exist.

- [ ] **Step 3: Implement core modules**

Implement domestic sample palettes, RGB distance mapping, grid creation/editing/fill, project JSON serialization, and material/step exporters.

- [ ] **Step 4: Run tests and verify they pass**

Run: `npm test`
Expected: PASS for all core tests.

### Task 3: Browser Editor MVP

**Files:**
- Create: `src/app.js`
- Modify: `index.html`
- Modify: `src/styles.css`

- [ ] **Step 1: Wire UI state**

Implement project state, selected tool, selected color, active view, zoom, panels, and status rendering.

- [ ] **Step 2: Implement image import and pixelization**

Load JPG/PNG/WebP into a browser canvas, downsample into a user-selected grid size, map colors to selected domestic palettes, and render a bead grid.

- [ ] **Step 3: Implement editing tools**

Support brush, eraser, eyedropper, fill, undo, redo, and color replacement on the grid.

- [ ] **Step 4: Implement project open/save**

Save a `.pindou` JSON file for the MVP and reopen it. Keep the file extension and schema ready for later ZIP packaging.

- [ ] **Step 5: Implement exports**

Export PNG blueprint from canvas and JSON making steps containing material counts and per-color coordinates.

### Task 4: Verification

**Files:**
- Existing files from Tasks 1-3.

- [ ] **Step 1: Run syntax check**

Run: `npm run check`
Expected: exit 0.

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Inspect git status**

Run: `git status --short`
Expected: app, docs, and tests are tracked as new files with no accidental generated content except ignored `.superpowers/`.
