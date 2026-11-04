'use strict';
const $ = id => document.getElementById(id);
const tasks = [
  ['Bag', 'Occlusion', 'Open the bag and move the camera to locate the bottle inside.', [40,55,43,65.5], [50,59], [20,36.5]],
  ['Drawer', 'Occlusion', 'Open the drawer, locate the target object, and place it outside the drawer.', [35,75,51,78], [65,73.5], [55,67.5]],
  ['Table', 'Occlusion', 'Look beneath the table to locate the object before reaching for it.', [10,85,17.5,87.5], [80,80], [50,55]],
  ['Pot', 'Active search', 'Look into the workspace, place the target into the pot, and close the lid.', [15,50,44,76], [50,61], [10,43]],
  ['Box', 'Active search', 'Inspect the shelf and place the selected object in the requested box.', [50,85,52.5,85], [65,65], [50,50]]
];
function buttons(id, labels, active, onClick) {
  $(id).replaceChildren(...labels.map((label, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label;
    b.setAttribute('aria-pressed', String(i === active));
    b.addEventListener('click', () => onClick(i));
    return b;
  }));
}
function pressed(id, active) {
  [...$(id).children].forEach((b,i) => b.setAttribute('aria-pressed', String(i === active)));
}
let evaluationController;
import('./evaluation-lab.js?v=20261103e').then(({initEvaluationLab}) => {
  evaluationController = initEvaluationLab();
  evaluationController.selectTask($('chart-task').value);
});
document.addEventListener('evaluation-task', event => {
  $('chart-task').value = event.detail.task;
  drawChart();
});
const exps = [
  {labels:['π₀.₅','ActiveScale'], avg:[[30,70],[41.6,78.4]], note:'Both methods use the same downstream demonstrations and evaluation protocol.'},
  {labels:['Without mid-training','ActiveScale'], avg:[[62,70],[67.7,78.4]], note:'Compares the full pipeline with the same model architecture trained without mixed human–robot mid-training.'},
  {labels:['π₀.₅','History only','History + camera tokens'], avg:[[30,37,62],[41.6,50.4,67.7]], note:'All variants use post-training only. The camera-token configuration includes camera-pose supervision.'}
];
let exp=0, metric=0;
const colors=['#c7b4e6','#b494e7','#9e71df'];
function drawChart() {
  const e=exps[exp], chosen=$('chart-task').value;
  evaluationController?.selectTask(chosen);
  $('chart-note').textContent=e.note;
  $('experiment-question').textContent=['Can the robot solve tasks that require looking?','Does mixed mid-training help?','Do camera tokens help beyond history?'][exp];
  $('legend').innerHTML=e.labels.map((l,i)=>'<span><i style="background:'+colors[i]+'"></i>'+l+'</span>').join('');
  const rows=[['Average', e.avg[metric]], ...tasks.map(([n,,,base,noMid,hist])=>{
    const start=metric*2;
    const v=exp===0?[base[start],base[start+1]]:exp===1?[noMid[metric],base[start+1]]:[base[start],hist[metric],noMid[metric]];
    return [n,v];
  })];
  $('chart').replaceChildren(...rows.filter(([n])=>chosen==='all'||chosen===n||(chosen==='occlusion'&&['Bag','Drawer','Table'].includes(n))||(chosen==='search'&&['Pot','Box'].includes(n))).map(([n,vs])=>{
    const row=document.createElement('div'); row.className='chart-row';
    const name=document.createElement('h4');name.textContent=n;row.append(name);
    const bars=document.createElement('div');bars.className='bars';row.append(bars);
    vs.forEach((v,i)=>{
      const b=document.createElement('button'); b.className='bar'; b.type='button';
      b.style.setProperty('--width',v+'%');b.style.setProperty('--bar',colors[i]);
      const value=document.createElement('span');
      value.textContent=v.toFixed(1)+'%';
      if(v<18)b.classList.add('short');
      b.append(value);
      b.title=n+' · '+e.labels[i]+': '+v.toFixed(1)+'%';
      b.setAttribute('aria-label',b.title);
      b.addEventListener('click',()=>{$('chart-task').value=chosen===n?'all':n;drawChart();$('chart-task').focus();});
      bars.append(b);
    });
    return row;
  }));
}
buttons('experiments',['Main comparison','Mid-training','Camera tokens'],0,i=>{exp=i;pressed('experiments',i);drawChart();});
buttons('metrics',['Success','Progress'],0,i=>{metric=i;pressed('metrics',i);drawChart();});
$('chart-task').addEventListener('change',drawChart);drawChart();
$('copy').addEventListener('click',async()=>{
  try { await navigator.clipboard.writeText($('bibtex').textContent); $('copy').textContent='Copied'; }
  catch { const r=document.createRange();r.selectNodeContents($('bibtex'));const selection=getSelection();selection.removeAllRanges();selection.addRange(r);$('copy').textContent='Citation selected'; }
});
