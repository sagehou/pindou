export const DOMESTIC_PALETTES = {
  MARD: [
    { id: 'MARD:M-R01', brand: 'MARD', code: 'M-R01', name: '正红', rgb: [242, 45, 65], sizeMm: 5 },
    { id: 'MARD:M-Y01', brand: 'MARD', code: 'M-Y01', name: '柠檬黄', rgb: [250, 213, 45], sizeMm: 5 },
    { id: 'MARD:M-B01', brand: 'MARD', code: 'M-B01', name: '湖蓝', rgb: [36, 122, 216], sizeMm: 5 },
    { id: 'MARD:M-G01', brand: 'MARD', code: 'M-G01', name: '草绿', rgb: [52, 168, 92], sizeMm: 5 },
    { id: 'MARD:M-K01', brand: 'MARD', code: 'M-K01', name: '黑色', rgb: [35, 36, 38], sizeMm: 5 },
    { id: 'MARD:M-W01', brand: 'MARD', code: 'M-W01', name: '白色', rgb: [245, 244, 238], sizeMm: 5 },
    { id: 'MARD:M-P01', brand: 'MARD', code: 'M-P01', name: '肤粉', rgb: [246, 178, 164], sizeMm: 5 },
    { id: 'MARD:M-BR01', brand: 'MARD', code: 'M-BR01', name: '咖啡', rgb: [123, 74, 45], sizeMm: 5 }
  ],
  COCO: [
    { id: 'COCO:C-R01', brand: 'COCO', code: 'C-R01', name: '番茄红', rgb: [225, 52, 58], sizeMm: 5 },
    { id: 'COCO:C-O01', brand: 'COCO', code: 'C-O01', name: '橙色', rgb: [240, 130, 38], sizeMm: 5 },
    { id: 'COCO:C-B01', brand: 'COCO', code: 'C-B01', name: '宝蓝', rgb: [28, 90, 190], sizeMm: 5 },
    { id: 'COCO:C-V01', brand: 'COCO', code: 'C-V01', name: '紫罗兰', rgb: [129, 80, 172], sizeMm: 5 },
    { id: 'COCO:C-W01', brand: 'COCO', code: 'C-W01', name: '瓷白', rgb: [248, 248, 244], sizeMm: 5 },
    { id: 'COCO:C-K01', brand: 'COCO', code: 'C-K01', name: '曜石黑', rgb: [28, 29, 32], sizeMm: 5 }
  ],
  MANMAN: [
    { id: 'MANMAN:MM-01', brand: '漫漫', code: 'MM-01', name: '樱桃红', rgb: [235, 61, 78], sizeMm: 5 },
    { id: 'MANMAN:MM-12', brand: '漫漫', code: 'MM-12', name: '奶油黄', rgb: [246, 221, 117], sizeMm: 5 },
    { id: 'MANMAN:MM-33', brand: '漫漫', code: 'MM-33', name: '薄荷绿', rgb: [101, 190, 151], sizeMm: 5 },
    { id: 'MANMAN:MM-46', brand: '漫漫', code: 'MM-46', name: '浅灰', rgb: [182, 184, 184], sizeMm: 5 }
  ],
  PANPAN: [
    { id: 'PANPAN:PP-02', brand: '盼盼', code: 'PP-02', name: '玫红', rgb: [218, 58, 120], sizeMm: 5 },
    { id: 'PANPAN:PP-18', brand: '盼盼', code: 'PP-18', name: '青绿', rgb: [33, 157, 150], sizeMm: 5 },
    { id: 'PANPAN:PP-27', brand: '盼盼', code: 'PP-27', name: '深棕', rgb: [93, 55, 39], sizeMm: 5 },
    { id: 'PANPAN:PP-50', brand: '盼盼', code: 'PP-50', name: '透明', rgb: [220, 232, 230], sizeMm: 5 }
  ],
  MIXIAOWO: [
    { id: 'MIXIAOWO:MX-03', brand: '咪小窝', code: 'MX-03', name: '珊瑚粉', rgb: [244, 135, 132], sizeMm: 5 },
    { id: 'MIXIAOWO:MX-15', brand: '咪小窝', code: 'MX-15', name: '天蓝', rgb: [95, 171, 224], sizeMm: 5 },
    { id: 'MIXIAOWO:MX-26', brand: '咪小窝', code: 'MX-26', name: '奶茶', rgb: [198, 151, 111], sizeMm: 5 },
    { id: 'MIXIAOWO:MX-41', brand: '咪小窝', code: 'MX-41', name: '深灰', rgb: [88, 91, 96], sizeMm: 5 }
  ]
};

export function mergePalettes(brandNames = Object.keys(DOMESTIC_PALETTES)) {
  return brandNames.flatMap((brand) => DOMESTIC_PALETTES[brand] ?? []);
}

export function findNearestBead(rgb, palette, options = {}) {
  const disabled = new Set(options.disabledColorIds ?? []);
  let best = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const bead of palette) {
    if (disabled.has(bead.id)) continue;
    const distance = perceptualDistance(rgb, bead.rgb);
    if (distance < bestDistance) {
      best = bead;
      bestDistance = distance;
    }
  }

  if (!best) {
    throw new Error('No enabled bead colors are available for matching.');
  }

  return { ...best, distance: bestDistance };
}

export function beadCssColor(bead) {
  return `rgb(${bead.rgb[0]}, ${bead.rgb[1]}, ${bead.rgb[2]})`;
}

function perceptualDistance(a, b) {
  const rMean = (a[0] + b[0]) / 2;
  const r = a[0] - b[0];
  const g = a[1] - b[1];
  const blue = a[2] - b[2];
  const redWeight = 2 + rMean / 256;
  const blueWeight = 2 + (255 - rMean) / 256;
  return Math.sqrt(redWeight * r * r + 4 * g * g + blueWeight * blue * blue);
}
