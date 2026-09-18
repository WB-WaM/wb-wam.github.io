'use strict';

// Enhance the original image links without navigating away from the paper page.
(() => {
  const dialog = $('figure-dialog');
  const viewport = $('figure-dialog-body');
  const image = $('figure-dialog-image');
  const zoom = $('figure-zoom');
  let opener = null;
  function setZoom(expanded) {
    viewport.classList.toggle('is-zoomed', expanded);
    zoom.setAttribute('aria-pressed', String(expanded));
    zoom.textContent = expanded ? 'Fit to window' : 'Zoom in';
    viewport.scrollTop = 0;
    viewport.scrollLeft = 0;
  }
  document.querySelectorAll('[data-figure-title]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      opener = link;
      $('figure-dialog-title').textContent = link.dataset.figureTitle;
      image.alt = link.dataset.figureTitle;
      image.src = link.href;
      setZoom(false);
      dialog.showModal();
      document.documentElement.classList.add('figure-is-open');
      $('figure-close').focus();
    });
  });
  zoom.addEventListener('click', () => setZoom(zoom.getAttribute('aria-pressed') !== 'true'));
  image.addEventListener('click', () => setZoom(zoom.getAttribute('aria-pressed') !== 'true'));
  $('figure-close').addEventListener('click', () => dialog.close());
  let backdropPointer = false;
  dialog.addEventListener('pointerdown', event => { backdropPointer = event.target === dialog; });
  dialog.addEventListener('click', event => { if (backdropPointer && event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('figure-is-open');
    setZoom(false);
    opener?.focus({preventScroll:true});
  });
})();

// Two concentric rings retain the source figure's duration shares and hierarchy.
// The small source slices are also selectable through full-size text buttons.
(() => {
  const corpus = data.pretrainingCorpus;
  const chart = $('dataset-chart');
  const legend = $('dataset-legend');
  if (!corpus || !chart) return;
  const totalLabel = corpus.totalHours.toLocaleString('en-US', {minimumFractionDigits:1, maximumFractionDigits:1}) + ' h';
  const svg = svgNode('svg', {viewBox:'0 0 440 400', 'aria-label':'Pre-training corpus composition', 'aria-describedby':'corpus-desc', role:'group'});
  svg.append(svgNode('desc', {id:'corpus-desc'}, '1,880.2 hours from nine datasets. The inner ring groups supervision types; the outer ring shows dataset shares of total duration. Select a slice or its label for details.'));
  const cx = 220, cy = 200;
  const polar = (radius, angle) => [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  function arc(inner, outer, start, end) {
    const a = polar(outer, start), b = polar(outer, end), c = polar(inner, end), d = polar(inner, start);
    const large = end - start > Math.PI ? 1 : 0;
    return `M${a} A${outer},${outer} 0 ${large} 1 ${b} L${c} A${inner},${inner} 0 ${large} 0 ${d} Z`;
  }
  const defs = svgNode('defs');
  const mask = svgNode('mask', {id:'corpus-reveal-mask', maskUnits:'userSpaceOnUse', x:0, y:0, width:440, height:400});
  mask.append(svgNode('circle', {cx, cy, r:142, fill:'none', stroke:'white', 'stroke-width':106, pathLength:1, class:'donut-reveal', transform:`rotate(-180 ${cx} ${cy})`}));
  defs.append(mask);svg.append(defs);
  const rings = svgNode('g', {mask:'url(#corpus-reveal-mask)'});
  const groupRing = svgNode('g'), sourceRing = svgNode('g');
  rings.append(groupRing, sourceRing);svg.append(rings);
  const center = svgNode('g', {'aria-hidden':'true', class:'donut-center'});
  const value = svgNode('text', {x:cx, y:cy-5, 'text-anchor':'middle', class:'donut-value'}, totalLabel);
  const label = svgNode('text', {x:cx, y:cy+24, 'text-anchor':'middle', class:'donut-label'}, 'Total duration');
  center.append(value, label);svg.append(center);
  const items = new Map(), controls = [], slices = [];
  let pinned = null, focused = null, hovered = null;

  function setCenter(item) {
    value.textContent = item ? item.share.toFixed(1) + '%' : totalLabel;
    value.style.fill = item ? (items.get(item.group)?.color || item.color) : '';
    const name = item ? item.name : 'Total duration';
    const words = name.split(' ');
    const lines = [''];
    words.forEach(word => {
      const last = lines.length - 1;
      if ((lines[last] + ' ' + word).trim().length > 21 && lines[last]) lines.push(word);
      else lines[last] += (lines[last] ? ' ' : '') + word;
    });
    label.replaceChildren(...lines.map((line, i) => svgNode('tspan', {x:cx, dy:i===0?0:19}, line)));
  }
  function renderSelection() {
    const active = hovered || focused || pinned;
    const item = items.get(active);
    chart.dataset.active = active || '';
    setCenter(item);
    slices.forEach(slice => {
      const selected = Boolean(item && (slice.id === active || (item.isGroup && slice.group === active)));
      slice.node.classList.toggle('is-active', selected);
      slice.node.classList.toggle('is-muted', Boolean(item && !selected && slice.id !== item.group));
      slice.node.setAttribute('aria-pressed', String(slice.id === pinned));
    });
    controls.forEach(control => {
      control.node.classList.toggle('is-active', control.id === active);
      control.node.setAttribute('aria-pressed', String(control.id === pinned));
    });
  }
  function activate(id) {
    pinned = pinned === id ? null : id;
    const item = items.get(pinned);
    $('dataset-selection').textContent = item ? `${item.name}: ${item.share.toFixed(1)}% of total duration.` : 'All sources: 1,880.2 hours.';
    renderSelection();
  }
  function bind(node, id, isSvg = false) {
    node.setAttribute('aria-pressed', 'false');
    node.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { hovered = id; renderSelection(); } });
    node.addEventListener('pointerleave', () => { hovered = null; renderSelection(); });
    node.addEventListener('focus', () => { focused = id; renderSelection(); });
    node.addEventListener('blur', () => { focused = null; renderSelection(); });
    node.addEventListener('click', () => activate(id));
    node.addEventListener('keydown', event => {
      if (event.key === 'Escape') { pinned = null; focused = null; hovered = null; renderSelection(); }
      if (isSvg && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); activate(id); }
    });
  }
  function addSlice(item, inner, outer, start, end, parent, isGroup = false) {
    const mid = (start + end) / 2;
    const node = svgNode('g', {class:'donut-slice' + (isGroup ? ' donut-group-slice' : ''), tabindex:0, role:'button', 'aria-label':`${item.name}: ${item.share.toFixed(1)}% of total duration`, 'data-source':item.id});
    node.style.setProperty('--slice-x', (Math.cos(mid) * 7).toFixed(2) + 'px');
    node.style.setProperty('--slice-y', (Math.sin(mid) * 7).toFixed(2) + 'px');
    // No minimum angle: even 0.1% is drawn at its true angular proportion.
    node.append(svgNode('path', {d:arc(inner, outer, start, end), fill:isGroup?item.tint:item.color, stroke:'white', 'stroke-width':isGroup?2:0.5}));
    if (isGroup) {
      const [x,y] = polar(111,mid);
      let rotation = mid * 180 / Math.PI + 90;
      if (rotation > 90 && rotation < 270) rotation += 180;
      node.append(svgNode('text', {x, y, transform:`rotate(${rotation} ${x} ${y})`, 'text-anchor':'middle', 'dominant-baseline':'middle', class:'donut-group-label', fill:item.color, 'aria-hidden':'true'}, item.share.toFixed(1) + '%'));
    }
    bind(node, item.id, true);parent.append(node);slices.push({id:item.id, group:item.group, node});
  }
  let angle = -Math.PI;
  corpus.groups.forEach(group => {
    const item = {...group, isGroup:true};items.set(group.id, item);
    const start = angle, end = start + group.share / 100 * Math.PI * 2;
    addSlice(item, 96, 126, start, end, groupRing, true);
    const section = document.createElement('div');section.className = 'dataset-source-group';
    const heading = document.createElement('button');heading.type = 'button';heading.className = 'dataset-group-button';
    heading.style.setProperty('--source-color', group.color);
    const groupName = document.createElement('span');groupName.textContent = group.name;
    const groupShare = document.createElement('strong');groupShare.textContent = group.share.toFixed(1) + '%';
    heading.append(groupName, groupShare);section.append(heading);bind(heading, group.id);controls.push({id:group.id,node:heading});
    const sources = document.createElement('div');sources.className = 'dataset-source-list';
    group.sources.forEach(source => {
      const sourceItem = {...source, group:group.id};items.set(source.id, sourceItem);
      const next = angle + source.share / 100 * Math.PI * 2;
      addSlice(sourceItem, 135, 179, angle, next, sourceRing);
      angle = next;
      const button = document.createElement('button');button.type = 'button';button.className = 'dataset-source-button';
      button.style.setProperty('--source-color', source.color);
      const swatch = document.createElement('i');swatch.setAttribute('aria-hidden','true');
      const name = document.createElement('span');name.className = 'dataset-source-name';name.textContent = source.name;
      const percent = document.createElement('span');percent.className = 'dataset-source-share';percent.textContent = source.share.toFixed(1) + '%';
      button.append(swatch, name, percent);sources.append(button);bind(button, source.id);controls.push({id:source.id,node:button});
    });
    section.append(sources);legend.append(section);
  });
  $('dataset-donut').append(svg);
  chart.hidden = false;$('dataset-static').hidden = true;
  const reveal = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { chart.classList.add('is-visible');reveal.disconnect(); }
  }, {threshold:0.15});
  reveal.observe($('dataset-donut'));
})();

// A quiet explanation on hover, keyboard focus, or tap; never a native title popup.
(() => {
  document.querySelectorAll('[data-note-tooltip]').forEach(note => {
    const trigger = note.querySelector('.dataset-note-trigger');
    const tooltip = note.querySelector('[role="tooltip"]');
    let timer, pinned = false;
    const show = () => { clearTimeout(timer);tooltip.hidden = false; };
    const hide = () => { clearTimeout(timer);tooltip.hidden = true;pinned = false; };
    const leave = () => {
      clearTimeout(timer);
      if (!pinned && !trigger.matches(':focus-visible')) timer = setTimeout(hide, 120);
    };
    trigger.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse') return;
      clearTimeout(timer);timer = setTimeout(show, 220);
    });
    trigger.addEventListener('pointerleave', leave);
    tooltip.addEventListener('pointerenter', show);
    tooltip.addEventListener('pointerleave', leave);
    trigger.addEventListener('focus', () => { if (trigger.matches(':focus-visible')) show(); });
    trigger.addEventListener('blur', hide);
    trigger.addEventListener('click', () => {
      if (pinned) hide();
      else { pinned = true;show(); }
    });
    document.addEventListener('pointerdown', event => { if (!note.contains(event.target)) hide(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
  });
})();
