(() => {
  'use strict';
  const root = document.querySelector('#model-lab');
  if (!root) return;
  const times = ['t−48', 't−32', 't−16', 't'];
  const symbol = (kind, frame) => `${kind === 'camera' ? 'C' : 'V<sup>f</sup>'}<sub>${times[frame]}</sub>`;
  const names = times.flatMap(time => [`Visual tokens at ${time}`, `Camera token C_${time}`]);
  const history = times.flatMap((time, frame) => [
    {kind:'visual', frame, label:symbol('visual',frame), name:names[frame*2]},
    {kind:'camera', frame, label:symbol('camera',frame), name:names[frame*2+1]},
  ]);
  const queries = [...history,
    {kind:'context', label:'Wrist / state / language', name:'Current wrist, proprioception and language context'},
    {kind:'action', label:'Action expert', name:'Action expert'},
  ];
  const canRead = (query, key) => query >= 8 || history[key].frame <= history[query].frame;
  const queryButton = (index, content, attributes = '') => `<button type="button" data-query="${index}" aria-pressed="false" aria-label="Inspect ${queries[index].name}" ${attributes}>${content}</button>`;
  const cameraToken = (frame, port = '') => queryButton(frame*2+1, symbol('camera',frame), `class="as-camera-token" ${port}`);
  const visualToken = (frame, port = '') => queryButton(frame*2, symbol('visual',frame), `class="as-visual-token" ${port}`);
  function backboneStrip(position) {
    return `<div class="as-backbone-strip as-${position}-strip" aria-label="Backbone ${position} token sequence">
      ${times.map((_,frame) => `<div class="as-strip-block" data-history-block="${frame}">${visualToken(frame,`data-${position}-visual="${frame}"`)}${cameraToken(frame,`data-${position}-camera="${frame}"`)}</div>`).join('')}
      <div class="as-strip-context">${position === 'input' ? 'Wrist · state<br>language' : 'Context<br>outputs'}</div>
    </div>`;
  }
  root.innerHTML = `
    <div class="as-model-head">
      <h3>ActiveScale architecture</h3>
      <div class="as-model-modes" role="group" aria-label="Model stage">
        <button type="button" data-mode="mid-training" aria-pressed="true">Mid-training</button>
        <button type="button" data-mode="fine-tuning" aria-pressed="false">Fine-tuning</button>
        <button type="button" data-mode="inference" aria-pressed="false">Inference</button>
      </div>
    </div>
    <div class="as-stage-data" data-stage-data></div>
    <div class="as-architecture-scroll">
      <div class="as-architecture">
        <svg class="as-token-connections" aria-label="Each output camera token is projected into the shared camera-pose head"><defs>
          <marker id="as-pose-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#b48312"/></marker>
          <marker id="as-visual-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#8061b3"/></marker>
        </defs><g data-pose-connections></g><g data-input-connections></g></svg>
        <div class="as-vlm-output">
          <div class="as-output as-pose" data-pose-head>
            <span class="as-label">From the four yellow output camera tokens</span>
            <strong><span aria-hidden="true">📷</span> Camera-pose reconstruction</strong>
            <span>Linear projection → shared VGGT-style head</span>
            <small>3 translation + 4 quaternion + 2 FoV values</small>
            <b data-pose-status></b>
          </div>
          <div class="as-output as-language" data-language-head>
            <span class="as-label">Autoregressive outputs</span>
            <strong data-subtask-title>Subtask + FAST prediction</strong>
            <span class="as-command">“Open the bag”</span>
            <small data-fast-detail></small>
            <b data-language-status></b>
          </div>
        </div>
        <div class="as-output as-action as-action-output">
          <span class="as-label">Continuous output</span><strong><span aria-hidden="true">🦾</span> Action chunk</strong>
          <svg viewBox="0 0 180 46" role="img" aria-label="A continuous action trajectory"><path class="as-trajectory-guide" d="M5 37C42 37 48 8 87 8s43 23 88 8"/><path class="as-trajectory" d="M5 37C42 37 48 8 87 8s43 23 88 8"/></svg>
          <small>Camera motion + bimanual manipulation</small><b data-action-status></b>
        </div>
        <div class="as-readout-gap"><span class="as-readout-label">Output hidden states</span><i class="as-language-flow"></i></div>
        <div class="as-action-flow"><i></i></div>
        <div class="as-vla as-processor">
          ${backboneStrip('output')}
          <div class="as-processor-title"><strong>Pretrained VLA</strong><span>π₀.₅ · PaliGemma vision–language backbone</span></div>
          ${backboneStrip('input')}
        </div>
        <div class="as-context-flow" aria-hidden="true"><span>Encoded<br>context</span><i></i></div>
        <div class="as-expert as-processor">
          <div class="as-action-token-strip">a₁ · a₂ · … · a₅₀</div>
          ${queryButton(9,'<strong>🦾 Action expert</strong><span>Transformer · flow matching</span>')}
          <div class="as-action-token-strip">xτ + flow time τ</div>
        </div>
        <div class="as-prefix-gap"><span>Input token sequence</span></div>
        <div class="as-noise-flow"><i></i></div>
        <div class="as-prefix">
          <div class="as-history">
            <div class="as-ego-example"><img loading="lazy" src="assets/replay/backpack-episode-128-cam_front-initial.jpg" alt="Example AMP head-camera observation of the backpack"><div><strong data-ego-label>Human / robot egocentric video</strong><span>Four front-camera frames · shared vision encoder</span></div></div>
            <div class="as-history-blocks" role="group" aria-label="Each frame's visual tokens followed by its camera token">
              ${times.map((time,frame) => `<div class="as-frame-input"><strong>I<sup>f</sup><sub>${time}</sub></strong><div>${visualToken(frame,`data-source-visual="${frame}"`)}${cameraToken(frame,`data-source-camera="${frame}"`)}</div></div>`).join('')}
            </div>
            <p class="as-embedding-note">Append one camera token after each frame: <b>c<sub>first</sub></b> for the earliest valid frame; <b>c<sub>rest</sub></b> for subsequent frames.</p>
          </div>
          <div class="as-current-inputs">
            <div class="as-label">Current robot context · where available</div>
            <div class="as-wrist-pair">
              ${queryButton(8,'<img loading="lazy" src="assets/replay/backpack-episode-128-cam_left-initial.jpg" alt="AMP left wrist camera view"><span>Left wrist</span>')}
              ${queryButton(8,'<img loading="lazy" src="assets/replay/backpack-episode-128-cam_right-initial.jpg" alt="AMP right wrist camera view"><span>Right wrist</span>')}
            </div>
            ${queryButton(8,'<strong><span aria-hidden="true">🤖</span> State sₜ</strong>')}
          </div>
          <div class="as-language-inputs">
            <div class="as-label"><span aria-hidden="true">💬</span> Language</div>
            ${queryButton(8,'<small>High-level instruction</small><span>“Reach the bottle”</span>')}
            <span class="as-language-route">High-level subtask → low-level conditioning</span>
            ${queryButton(8,'<small>Current low-level subtask</small><span>“Open the bag”</span>')}
          </div>
        </div>
        <div class="as-action-input as-action">
          <span class="as-label"><span aria-hidden="true">🦾</span> Action input</span>
          <svg viewBox="0 0 180 64" aria-hidden="true" class="as-noise">${Array.from({length:62},(_,i)=>`<circle cx="${14+((i*37)%153)}" cy="${8+((i*23)%49)}" r="1.6"/>`).join('')}</svg>
          <strong data-action-input></strong><span>Flow time τ</span><small data-flow-input-detail></small>
          <span class="as-command">Subtask-conditioned context</span>
        </div>
        <div class="as-legend"><span>Visual features V</span><span>📷 Camera tokens C</span><span>State + language</span><span>Action tokens</span></div>
      </div>
    </div>
    <div class="as-attention-link"><span><span aria-hidden="true">↕</span> Click a visual or camera token to highlight its attention row.</span><strong data-linked-query aria-live="polite"></strong></div>
    <section class="as-attention" aria-labelledby="as-attention-title">
      <div class="as-attention-heading"><h3 id="as-attention-title">What can each camera token read?</h3><span>Block-causal attention mask</span></div>
      <p>Pick a query row or a yellow camera token. Each temporal block reads itself and earlier blocks, including their visual and camera tokens.</p>
      <div class="as-mask-scroll"><table class="as-mask">
        <caption>Rows are queries (Q); columns are keys (K). This is the allowed-access mask, not measured attention weights. Example: four valid history frames.</caption>
        <thead><tr><th rowspan="2" scope="col">Query ↓ / Key →</th>${times.map(time=>`<th colspan="2" scope="colgroup">${time}</th>`).join('')}</tr><tr>${history.map(key=>`<th scope="col" class="${key.kind==='camera'?'as-camera-key':''}">${key.label}</th>`).join('')}</tr></thead>
        <tbody>${queries.map((query,index)=>`<tr class="${query.kind==='camera'?'as-camera-row':''}"><th scope="row">${queryButton(index,query.label)}</th>${history.map((key,k)=>`<td data-cell="${index}" class="${canRead(index,k)?'read':'masked'} ${key.kind==='camera'?'as-camera-key':''}" title="${query.name} → ${key.name}: ${canRead(index,k)?'allowed':'masked'}"><span aria-hidden="true">${canRead(index,k)?'•':'—'}</span><span class="as-sr">${canRead(index,k)?'Allowed':'Masked'}</span></td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
      <div class="as-mask-legend"><span class="read">Allowed visual key</span><span class="read as-camera-key">Allowed camera key</span><span class="masked">Masked future block</span></div>
      <div class="as-query-detail" aria-live="polite"><strong data-query-title></strong><p data-query-detail></p><div data-read-frames class="as-read-frames"></div></div>
      <p class="as-mask-note">Only access to front-camera history is expanded here. The wrist / state / language and action-expert rows show their access to that history; their internal attention details are not depicted. The temporal mask stays the same across all three stages.</p>
    </section>
    <div class="as-mode-summary"><strong data-objective></strong><p data-mode-note></p></div>
  `;
  const buttons = [...root.querySelectorAll('[data-query]')];
  const cells = [...root.querySelectorAll('[data-cell]')];
  const modes = [...root.querySelectorAll('[data-mode]')];
  let selected = 7;
  function selectQuery(index) {
    selected = index;
    const query = queries[index];
    buttons.forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.query)===index)));
    cells.forEach(cell=>cell.classList.toggle('as-mask-selected',Number(cell.dataset.cell)===index));
    root.querySelectorAll('[data-history-block]').forEach(block=>block.classList.toggle('as-block-selected',query.frame===Number(block.dataset.historyBlock)));
    root.querySelectorAll('[data-pose-line]').forEach(path=>path.classList.toggle('as-line-selected',query.frame===Number(path.dataset.poseLine)));
    root.querySelector('[data-query-title]').innerHTML=query.label;
    const earlier = index>=8 ? 3 : query.frame;
    const read = times.slice(0,earlier+1);
    root.querySelector('[data-linked-query]').innerHTML = query.label + ' → ' + read.length + (read.length === 1 ? ' view' : ' views');
    root.querySelector('[data-query-detail]').textContent = index>=8
      ? `${query.name} can read every valid front-camera block: ${read.join(', ')}.`
      : query.kind==='camera'
        ? `The hidden state of C_${times[query.frame]} can gather visual and camera-token information from ${read.join(', ')}. It cannot access later frames. Its output hidden state is projected into the camera-pose head during both learning stages.`
        : `The visual-token queries at ${times[query.frame]} read their own temporal block and every preceding block, including the camera tokens. Later blocks are masked.`;
    root.querySelector('[data-read-frames]').innerHTML=times.map((time,frame)=>`<span class="${frame<=earlier?'as-is-read':'as-is-masked'}">I<sup>f</sup><sub>${time}</sub> ${frame<=earlier?'✓':'masked'}</span>`).join('');
  }
  const stage = {
    'mid-training': {
      data:'Human–robot co-training · balanced 1:1 sampling',ego:'Human / robot egocentric video',
      pose:'Valid targets: 0.2 L_cam',subtask:'Subtask + FAST prediction',fast:'High-level human: subtask CE · low-level human / robot: FAST CE',language:'Autoregressive objectives enabled',action:'Flow-matching supervision',
      input:'Noisy action chunk xτ',inputDetail:'xτ = τ ε + (1 − τ) a',
      objective:'Mid-training: subtask + FAST + flow + camera-pose supervision',
      note:'High-level human samples supervise subtask prediction. Low-level human and robot samples supervise FAST and flow; human action losses receive weight 0.2. Camera loss has weight 0.2 and applies only where geometric targets are valid. Missing action dimensions and pose targets are masked.',
    },
    'fine-tuning': {
      data:'Task-specific fine-tuning · AMP teleoperation demonstrations',ego:'AMP front-camera history',
      pose:'Valid targets: 0.2 L_cam',subtask:'Subtask / FAST objectives off',fast:'No autoregressive subtask or FAST loss',language:'Architecture unchanged',action:'Flow-matching supervision',
      input:'Noisy action chunk xτ',inputDetail:'xτ = τ ε + (1 − τ) a',
      objective:'Fine-tuning: L_flow + 0.2 L_cam',
      note:'This is the paper’s task-specific post-training stage. The AMP demonstrations provide aligned robot-action and camera trajectories. The model keeps the same architecture and action representation, while optimizing flow and camera-pose losses only.',
    },
    inference: {
      data:'Deployment · current robot observations + history',ego:'AMP front-camera history',
      pose:'Auxiliary head removed',subtask:'Subtask conditioning',fast:'FAST training objective is not evaluated',language:'No autoregressive training loss',action:'Continuous camera + manipulation actions',
      input:'Gaussian noise ε',inputDetail:'Iterative flow-matching denoising',
      objective:'Inference: observe → denoise → execute',
      note:'The camera tokens remain in the visual prefix, with the same block-causal history mask. The auxiliary camera head is removed. Encoded visual, state and language context conditions the original π₀.₅ action expert to generate continuous action chunks; no training losses are evaluated.',
    },
  };
  function selectMode(mode) {
    root.dataset.mode=mode;
    modes.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===mode)));
    const current=stage[mode];
    for(const [attribute,key] of Object.entries({'stage-data':'data','ego-label':'ego','pose-status':'pose','subtask-title':'subtask','fast-detail':'fast','language-status':'language','action-status':'action','action-input':'input','flow-input-detail':'inputDetail','objective':'objective','mode-note':'note'}))root.querySelector(`[data-${attribute}]`).textContent=current[key];
  }
  function drawConnections() {
    const architecture=root.querySelector('.as-architecture');
    const bounds=architecture.getBoundingClientRect();
    if(!bounds.width)return;
    const svg=root.querySelector('.as-token-connections');
    svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);
    const point=(element,edge)=>{const r=element.getBoundingClientRect();return {x:r.left+r.width/2-bounds.left,y:(edge==='top'?r.top:r.bottom)-bounds.top};};
    const head=root.querySelector('[data-pose-head]').getBoundingClientRect();
    const curve=(from,to)=>`M${from.x},${from.y} C${from.x},${from.y-(from.y-to.y)*.48} ${to.x},${to.y+(from.y-to.y)*.48} ${to.x},${to.y}`;
    root.querySelector('[data-pose-connections]').innerHTML=times.map((_,frame)=>{
      const from=point(root.querySelector(`[data-output-camera="${frame}"]`),'top');
      const to={x:head.left-bounds.left+head.width*(frame+1)/5,y:head.bottom-bounds.top+2};
      return `<path d="${curve(from,to)}" class="as-pose-line ${selected<8&&Math.floor(selected/2)===frame?'as-line-selected':''}" data-pose-line="${frame}" marker-end="url(#as-pose-arrow)"/>`;
    }).join('');
    root.querySelector('[data-input-connections]').innerHTML=times.flatMap((_,frame)=>['visual','camera'].map(kind=>{
      const from=point(root.querySelector(`[data-source-${kind}="${frame}"]`),'top');
      const to=point(root.querySelector(`[data-input-${kind}="${frame}"]`),'bottom');
      return `<path d="${curve(from,to)}" class="as-input-line as-${kind}-line" marker-end="url(#as-${kind==='camera'?'pose':'visual'}-arrow)"/>`;
    })).join('');
  }
  buttons.forEach(button=>button.addEventListener('click',()=>selectQuery(Number(button.dataset.query))));
  modes.forEach(button=>button.addEventListener('click',()=>selectMode(button.dataset.mode)));
  new ResizeObserver(drawConnections).observe(root.querySelector('.as-architecture'));
  root.querySelectorAll('img').forEach(image=>image.addEventListener('load',drawConnections));
  selectQuery(7);selectMode('mid-training');requestAnimationFrame(drawConnections);
})();
