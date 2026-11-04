'use strict';
const $ = id => document.getElementById(id);
// Each task retains the reported main, no-mid-training, and history-only values.
const resultTasks = [
  ['Bag', [40,55,43,65.5], [50,59], [20,36.5]],
  ['Drawer', [35,75,51,78], [65,73.5], [55,67.5]],
  ['Table', [10,85,17.5,87.5], [80,80], [50,55]],
  ['Pot', [15,50,44,76], [50,61], [10,43]],
  ['Box', [50,85,52.5,85], [65,65], [50,50]],
];
const resultStudies = [
  {
    id: 'main-comparison',
    title: 'How does ActiveScale compare with an existing VLA?',
    label: 'Main comparison',
    explanation: 'π₀.₅ is post-trained on the same downstream demonstrations and evaluated with the same protocol. Comparable active-perception VLAs were not included because their checkpoints and full training recipes were unavailable at the time of our experiments.',
    takeaway: 'Biggest jump when the target starts out of view: Table, 10% → 85%.',
    methods: ['π₀.₅', 'ActiveScale'],
    colors: ['#5f6c80', '#7442ba'],
    averages: [[30,70], [41.6,78.4]],
    values: (task, metric) => [task[1][metric * 2], task[1][metric * 2 + 1]],
  },
  {
    id: 'mid-training-ablation',
    title: 'Does human–robot mid-training help?',
    label: 'Human–robot mid-training ablation',
    explanation: 'The model architecture is fixed. This comparison adds mixed human–robot mid-training before downstream post-training; it measures the benefit of the complete mixed-data stage.',
    takeaway: 'Pot: same success rate, but progress 61% → 76% with better-aligned lids.',
    methods: ['Without mid-training', 'With human–robot mid-training'],
    colors: ['#88699f', '#7442ba'],
    averages: [[62,70], [67.7,78.4]],
    values: (task, metric) => [task[2][metric], task[1][metric * 2 + 1]],
  },
  {
    id: 'camera-history-ablation',
    title: 'Do camera tokens help beyond observation history?',
    label: 'Camera-token / history ablation',
    explanation: 'All three variants use post-training only. History adds earlier front-camera views. The camera-token variant also adds camera-pose supervision.',
    takeaway: 'More frames alone can hurt (Bag 40% → 20%); camera tokens beat history-only on all five tasks.',
    methods: ['π₀.₅', 'History only', 'History + camera tokens'],
    colors: ['#5f6c80', '#347d7b', '#7442ba'],
    averages: [[30,37,62], [41.6,50.4,67.7]],
    values: (task, metric) => [task[1][metric * 2], task[3][metric], task[2][metric]],
  },
];

function resultElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createMetricPanel(study, metric) {
  const metricName = ['Success rate', 'Task progress'][metric];
  const panel = resultElement('section', 'qr-metric');
  panel.setAttribute('aria-label', study.label + ': ' + metricName);
  const heading = resultElement('div', 'qr-metric-heading');
  heading.append(resultElement('h4', '', metricName), resultElement('span', 'qr-unit', '%'));
  const axis = resultElement('div', 'qr-axis');
  axis.setAttribute('aria-hidden', 'true');
  [0,25,50,75,100].forEach(value => axis.append(resultElement('span', '', value)));
  panel.append(heading, axis);
  const rows = [['Average', study.averages[metric]], ...resultTasks.map(task => [task[0], study.values(task, metric)])];
  rows.forEach(([name, values], rowIndex) => {
    const row = resultElement('div', 'qr-row' + (rowIndex === 0 ? ' qr-row--average' : ''));
    row.append(resultElement('span', 'qr-task-name', name));
    const bars = resultElement('div', 'qr-bars');
    values.forEach((value, method) => {
      const bar = resultElement('div', 'qr-bar' + (value < 20 ? ' qr-bar--short' : ''));
      const label = name + ' · ' + study.methods[method] + ' · ' + metricName + ': ' + value.toFixed(1) + '%';
      bar.style.setProperty('--result-width', value + '%');
      bar.style.setProperty('--result-color', study.colors[method]);
      bar.style.setProperty('--bar-delay', (rowIndex * 55 + method * 65) + 'ms');
      bar.setAttribute('role', 'img');
      bar.setAttribute('aria-label', label);
      bar.tabIndex = 0;
      bar.title = label;
      bar.append(resultElement('span', 'qr-bar-number', value.toFixed(1) + '%'));
      bars.append(bar);
    });
    row.append(bars);
    panel.append(row);
  });
  return panel;
}

function initQuantitativeResults() {
  const mount = $('quantitative-results');
  if (!mount) return;
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./quantitative-results.css?v=20261104reentry1', document.baseURI).href;
  document.head.append(stylesheet);
  resultStudies.forEach(study => {
    const section = resultElement('section', 'qr-study');
    section.id = study.id;
    const title = resultElement('h3', '', study.title);
    title.id = study.id + '-title';
    section.setAttribute('aria-labelledby', title.id);
    section.append(resultElement('p', 'qr-study-label', study.label), title, resultElement('p', 'qr-explanation', study.explanation));
    if (study.takeaway) section.append(resultElement('p', 'qr-takeaway hand-note', study.takeaway));
    const legend = resultElement('div', 'qr-legend');
    legend.setAttribute('aria-label', 'Compared methods');
    study.methods.forEach((method, index) => {
      const item = resultElement('span', '');
      const swatch = resultElement('i', '');
      swatch.style.backgroundColor = study.colors[index];
      swatch.setAttribute('aria-hidden', 'true');
      item.append(swatch, document.createTextNode(method));
      legend.append(item);
    });
    const metrics = resultElement('div', 'qr-metric-pair');
    metrics.append(createMetricPanel(study, 0), createMetricPanel(study, 1));
    section.append(legend, metrics);
    mount.append(section);
  });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const rows = [...mount.querySelectorAll('.qr-row')];
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const row = entry.target.parentElement;
      if (reduced.matches || (entry.isIntersecting && entry.intersectionRatio >= .35)) {
        row.classList.add('is-visible');
      } else if (!entry.isIntersecting) {
        row.classList.remove('is-visible');
      }
    }
  }, {threshold: [0, .35]});
  rows.forEach(row => {
    row.classList.add('qr-reveal-ready');
    observer.observe(row.querySelector('.qr-bars'));
    row.addEventListener('focusin', () => row.classList.add('is-visible'));
  });
  reduced.addEventListener('change', () => {
    rows.forEach(row => {
      const bars = row.querySelector('.qr-bars');
      const rect = bars.getBoundingClientRect();
      row.classList.toggle('is-visible', reduced.matches || (rect.top < innerHeight && rect.bottom > 0));
      observer.unobserve(bars);
      observer.observe(bars);
    });
  });
}

// Qualitative task selection intentionally leaves every quantitative result visible.
import('./evaluation-lab.js?v=20261104sequence1').then(({initEvaluationLab}) => initEvaluationLab()).catch(error => console.error('Could not initialize task videos.', error));
initQuantitativeResults();
import('./progress-scoring.mjs?v=20261104polish6').then(({initProgressScoring}) => initProgressScoring()).catch(console.error);
$('copy')?.addEventListener('click',async()=>{
  try { await navigator.clipboard.writeText($('bibtex').textContent); $('copy').textContent='Copied'; }
  catch { const r=document.createRange();r.selectNodeContents($('bibtex'));const selection=getSelection();selection.removeAllRanges();selection.addRange(r);$('copy').textContent='Citation selected'; }
});
