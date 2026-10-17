const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function defaultLayerRule(layer, source) {
  const b = layer.bounds;
  return { x: (b.x + b.width / 2 - source.x) / source.width,
    y: (b.y + b.height / 2 - source.y) / source.height,
    width: b.width / source.width, maxHeight: 1, rotation: 0 };
}

function boundsOf(layers) {
  const x = Math.min(...layers.map(l => l.bounds.x));
  const y = Math.min(...layers.map(l => l.bounds.y));
  return { x, y,
    width: Math.max(...layers.map(l => l.bounds.x + l.bounds.width)) - x,
    height: Math.max(...layers.map(l => l.bounds.y + l.bounds.height)) - y };
}

// Whitespace separates sections; overlapping artwork stays spatially related.
// Each layer still owns its transform, selection and editable response rule.
function sectionsOf(layers, source) {
  const sections = [];
  const gap = source.height * .035;
  for (const layer of [...layers].sort((a, b) => a.bounds.y - b.bounds.y)) {
    const previous = sections.at(-1);
    if (previous && layer.bounds.y <= previous.bottom + gap) {
      previous.layers.push(layer);
      previous.bottom = Math.max(previous.bottom, layer.bounds.y + layer.bounds.height);
    } else sections.push({ layers: [layer], bottom: layer.bounds.y + layer.bounds.height });
  }
  return sections.map(section => ({ ...section, bounds: boundsOf(section.layers) }));
}

function autoPlacements(layers, source, target) {
  const result = new Map();
  if (!layers.length) return { result, mode: 'empty' };
  const { width, height } = target;
  const margin = Math.min(width, height) * .04, gap = margin;
  const sections = sectionsOf(layers, source), slots = [];
  let mode = 'stack';
  if (Math.abs(width / height - source.width / source.height) < .005) {
    const scale = width / source.width;
    for (const layer of layers) {
      const b = layer.bounds;
      result.set(layer.id, { cx: (b.x + b.width / 2 - source.x) * scale,
        cy: (b.y + b.height / 2 - source.y) * scale, scale });
    }
    return { result, mode: 'source' };
  }
  if (width / height >= 1.2 && source.width / source.height < 1 && sections.length >= 2) {
    mode = 'columns';
    let body = sections, top = margin;
    const first = sections[0];
    if (sections.length >= 3 && first.bounds.height < source.height * .15) {
      const headerHeight = Math.min(height * .16, first.bounds.height * (width - 2 * margin) / first.bounds.width);
      slots.push({ section: first, x: margin, y: top, width: width - 2 * margin, height: headerHeight });
      top += headerHeight + gap;
      body = sections.slice(1);
    }
    const availableWidth = width - 2 * margin - gap * (body.length - 1);
    const weights = body.map(s => Math.sqrt(s.bounds.height / s.bounds.width));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let left = margin;
    body.forEach((section, index) => {
      const slotWidth = availableWidth * weights[index] / totalWeight;
      slots.push({ section, x: left, y: top, width: slotWidth, height: height - top - margin });
      left += slotWidth + gap;
    });
  } else {
    const innerWidth = width - 2 * margin;
    const naturalHeights = sections.map(s => s.bounds.height * innerWidth / s.bounds.width);
    const sum = naturalHeights.reduce((a, b) => a + b, 0);
    const available = height - 2 * margin - gap * (sections.length - 1);
    const shrink = Math.min(1, available / sum);
    const heights = naturalHeights.map(h => h * shrink);
    const actualGap = sections.length > 1 ? (height - 2 * margin - sum * shrink) / (sections.length - 1) : 0;
    let top = sections.length > 1 ? margin : (height - heights[0]) / 2;
    sections.forEach((section, index) => {
      slots.push({ section, x: margin, y: top, width: innerWidth, height: heights[index] });
      top += heights[index] + actualGap;
    });
  }
  for (const slot of slots) {
    const b = slot.section.bounds;
    const scale = Math.min(slot.width / b.width, slot.height / b.height);
    const left = slot.x + (slot.width - b.width * scale) / 2;
    const top = slot.y + (slot.height - b.height * scale) / 2;
    for (const layer of slot.section.layers) {
      const box = layer.bounds;
      result.set(layer.id, { cx: left + (box.x + box.width / 2 - b.x) * scale,
        cy: top + (box.y + box.height / 2 - b.y) * scale, scale });
    }
  }
  return { result, mode };
}

export function planLayerLayout({ layers, source, target, rules = new Map() }) {
  const { width, height } = target;
  const valid = layers.filter(l => !l.background && l.bounds.width > 0 && l.bounds.height > 0);
  const automatic = autoPlacements(valid, source, target);
  const margin = Math.min(width, height) * .02;
  const backgrounds = layers.filter(l => l.background).map(l => ({ id: l.id, x: 0, y: 0, width, height }));
  const placements = valid.map(layer => {
    const b = layer.bounds, auto = automatic.result.get(layer.id);
    const rule = { x: auto.cx / width, y: auto.cy / height,
      width: b.width * auto.scale / width, maxHeight: 1, rotation: 0, ...rules.get(String(layer.id)) };
    const angle = rule.rotation * Math.PI / 180;
    const rotatedWidth = Math.abs(b.width * Math.cos(angle)) + Math.abs(b.height * Math.sin(angle));
    const rotatedHeight = Math.abs(b.width * Math.sin(angle)) + Math.abs(b.height * Math.cos(angle));
    // Preserve original edges and intentional overlaps until a user edits a layer.
    const edited = rules.has(String(layer.id));
    const scale = edited ? Math.min(width * rule.width / b.width,
      height * rule.maxHeight / rotatedHeight, (width - margin * 2) / rotatedWidth,
      (height - margin * 2) / rotatedHeight) : auto.scale;
    const cx = edited ? clamp(rule.x * width, margin + rotatedWidth * scale / 2, width - margin - rotatedWidth * scale / 2) : auto.cx;
    const cy = edited ? clamp(rule.y * height, margin + rotatedHeight * scale / 2, height - margin - rotatedHeight * scale / 2) : auto.cy;
    return { id: layer.id, scale, cx, cy, rotation: rule.rotation, rule };
  });
  return { mode: automatic.mode, backgrounds, placements };
}
