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
    {kind:'wrist', label:'Wrist views', name:'Current wrist-camera views'},
    {kind:'state', label:'State', name:'Current robot state'},
    {kind:'language', label:'Language', name:'Language instruction and subtask'},
    {kind:'action', label:'Action expert', name:'Action expert'},
  ];
  const contextQueries=[8,9,10];
  const canRead = (query, key) => query >= 8 || history[key].frame <= history[query].frame;
  const queryButton = (index, content, attributes = '') => `<button type="button" data-query="${index}" aria-pressed="false" aria-label="Inspect ${queries[index].name}" ${attributes}>${content}</button>`;
  const cameraToken = (frame, port = '') => queryButton(frame*2+1, 'C', `class="as-camera-token" ${port}`);
  const visualToken = (frame, port = '') => queryButton(frame*2, 'V', `class="as-visual-token" ${port}`);
  function backboneStrip(position) {
    return `<div class="as-backbone-strip as-${position}-strip" aria-label="Backbone ${position} token sequence">
      ${times.map((_,frame) => `<div class="as-strip-block" data-history-block="${frame}"><span class="as-strip-time">${times[frame]}</span>${visualToken(frame,`data-${position}-visual="${frame}"`)}${cameraToken(frame,`data-${position}-camera="${frame}"`)}</div>`).join('')}
      ${contextQueries.map(index=>queryButton(index,queries[index].label,'class="as-strip-context"')).join('')}
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
            <span class="as-output-icon" aria-hidden="true">📷</span>
            <span class="as-label">Reconstruct viewpoint geometry</span>
            <strong>Camera-pose head</strong>
            <svg class="as-head-preview as-pose-preview" viewBox="0 0 180 52" role="img" aria-label="Camera frustum with a rectangular projection plane">
              <path class="as-preview-camera" d="M23 22H34V36H23Z M34 25L41 22V36L34 33Z"/>
              <g class="as-preview-view">
                <path class="as-preview-rays" d="M41 29L93 7 M41 29L136 13 M41 29L136 42 M41 29L93 36"/>
                <path class="as-preview-plane" d="M93 7L136 13V42L93 36Z"/>
                <path class="as-preview-grid" d="M114.5 10V39 M93 21.5L136 27.5"/>
              </g>
            </svg>
            <b data-pose-status></b>
          </div>
          <div class="as-output as-language" data-language-head>
            <span class="as-output-icon" aria-hidden="true">💬</span>
            <span class="as-label" data-language-role>Predict the current subtask</span>
            <strong data-subtask-title>Autoregressive head</strong>
            <div class="as-head-preview as-subtask-preview" aria-label="Example predicted subtask: Open the bag"><span>Open the bag</span><i aria-hidden="true"></i></div>
            <b data-language-status></b>
          </div>
        </div>
        <div class="as-output as-action as-action-output">
          <span class="as-output-icon" aria-hidden="true">🦾</span>
          <span class="as-label">Generate robot commands</span>
          <strong>Action chunk</strong>
          <svg class="as-head-preview as-action-preview" viewBox="0 0 180 42" role="img" aria-label="Illustration of a generated action trajectory"><path class="as-trajectory-guide" d="M7 34C42 34 48 8 87 8s43 23 86 7"/><path class="as-trajectory" d="M7 34C42 34 48 8 87 8s43 23 86 7"/></svg>
          <b data-action-status></b>
        </div>
        <div class="as-readout-gap"><i class="as-language-flow"></i></div>
        <div class="as-action-flow"><i></i></div>
        <div class="as-vla as-processor">
          ${backboneStrip('output')}
          <div class="as-processor-title"><strong>Pretrained VLA</strong><span>π₀.₅ · PaliGemma vision–language backbone</span></div>
          ${backboneStrip('input')}
        </div>
        <div class="as-context-flow" aria-hidden="true"><span>Encoded<br>context</span><i></i></div>
        <div class="as-expert as-processor">
          <div class="as-action-token-strip">a₁ · a₂ · … · a₅₀</div>
          ${queryButton(11,'<strong>🦾 Action expert</strong><span>Transformer · flow matching</span>')}
          <div class="as-action-token-strip">Denoising input</div>
        </div>
        <div class="as-prefix-gap"><span>Input token sequence</span></div>
        <div class="as-noise-flow"><i></i></div>
        <div class="as-prefix">
          <div class="as-history">
            <div class="as-ego-example"><img loading="lazy" src="assets/replay/backpack-episode-128-cam_front-initial.jpg" alt="Example AMP head-camera observation of the backpack"><div><strong data-ego-label>Human / robot egocentric video</strong><span>Four front-camera frames · shared vision encoder</span></div></div>
            <div class="as-history-blocks" role="group" aria-label="Each frame's visual tokens followed by its camera token">
              ${times.map((time,frame) => `<div class="as-frame-input"><strong>${time}</strong><div>${visualToken(frame,`data-source-visual="${frame}"`)}${cameraToken(frame,`data-source-camera="${frame}"`)}</div></div>`).join('')}
            </div>
          </div>
          <div class="as-current-inputs">
            <div class="as-label">Robot context</div>
            <div class="as-wrist-pair">
              ${queryButton(8,'<img loading="lazy" src="assets/replay/backpack-episode-128-cam_left-initial.jpg" alt="AMP left wrist camera view"><span>Left wrist</span>')}
              ${queryButton(8,'<img loading="lazy" src="assets/replay/backpack-episode-128-cam_right-initial.jpg" alt="AMP right wrist camera view"><span>Right wrist</span>')}
            </div>
            ${queryButton(9,'<strong><span aria-hidden="true">🤖</span> State sₜ</strong>')}
          </div>
          <div class="as-language-inputs">
            <div class="as-label"><span aria-hidden="true">💬</span> Language</div>
            ${queryButton(10,'<small>High-level instruction</small><span>“Reach the bottle”</span>')}
            ${queryButton(10,'<small>Low-level subtask</small><span>“Open the bag”</span>')}
          </div>
        </div>
        <div class="as-action-input as-action">
          <span class="as-label">Action input</span>
          <svg viewBox="0 0 180 48" role="img" aria-label="Denoising turns noisy actions into an action trajectory" class="as-denoise">
            <g><circle cx="9" cy="11" r="2"/><circle cx="17" cy="32" r="2"/><circle cx="26" cy="16" r="2"/><circle cx="37" cy="36" r="2"/><circle cx="43" cy="8" r="2"/><circle cx="8" cy="24" r="2"/><circle cx="28" cy="38" r="2"/><circle cx="42" cy="24" r="2"/><circle cx="22" cy="7" r="2"/><circle cx="31" cy="27" r="2"/></g>
            <path class="as-denoise-arrow" d="M64 24H94m-6-5 6 5-6 5"/>
            <path class="as-denoise-curve" d="M108 36C123 36 125 10 142 10s18 22 30 8"/>
          </svg>
          <strong data-action-input></strong>
          <small data-flow-input-detail></small>
        </div>
        <div class="as-legend"><span>Visual features V</span><span class="as-legend-camera">📷 Camera tokens C</span><span class="as-legend-context">Wrist views</span><span class="as-legend-context">State</span><span class="as-legend-context">Language</span><span class="as-legend-action">Action tokens</span></div>
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
      pose:'Camera-pose supervision',role:'Predict the current subtask',subtask:'Autoregressive head',language:'Subtask + FAST tokens',action:'Flow-matching supervision',
      input:'Perturbed actions',inputDetail:'Learn to denoise',
      objective:'Mid-training: subtask + FAST + flow + camera-pose supervision',
      note:'Mixed human and robot demonstrations train task reasoning and action prediction together. Camera-pose supervision grounds the history in geometry. Missing action dimensions and geometric targets are masked.',
    },
    'fine-tuning': {
      data:'Task-specific fine-tuning · AMP teleoperation demonstrations',ego:'AMP front-camera history',
      pose:'Camera-pose supervision',role:'Predict the current subtask',subtask:'Autoregressive head',language:'Prediction objectives off',action:'Flow-matching supervision',
      input:'Perturbed actions',inputDetail:'Learn to denoise',
      objective:'Fine-tuning: action + camera-pose supervision',
      note:'This is the paper’s task-specific post-training stage. The AMP demonstrations provide aligned robot-action and camera trajectories. The model keeps the same architecture and action representation, while optimizing flow and camera-pose losses only.',
    },
    inference: {
      data:'Deployment · current robot observations + history',ego:'AMP front-camera history',
      pose:'Auxiliary head removed',role:'Condition the action expert',subtask:'Subtask instruction',language:'No training supervision',action:'Camera + manipulation commands',
      input:'Sampled noise',inputDetail:'Denoise to act',
      objective:'Inference: observe → denoise → execute',
      note:'The camera tokens remain in the visual prefix, with the same block-causal history mask. The auxiliary camera head is removed. Encoded visual, state and language context conditions the original π₀.₅ action expert to generate continuous action chunks; no training losses are evaluated.',
    },
  };
  function selectMode(mode) {
    root.dataset.mode=mode;
    modes.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===mode)));
    const current=stage[mode];
    for(const [attribute,key] of Object.entries({'stage-data':'data','ego-label':'ego','pose-status':'pose','language-role':'role','subtask-title':'subtask','language-status':'language','action-status':'action','action-input':'input','flow-input-detail':'inputDetail','objective':'objective','mode-note':'note'}))root.querySelector(`[data-${attribute}]`).textContent=current[key];
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
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const modeOrder = Object.keys(stage);
  const cycleDelay = 10000;
  let manualMode;
  let modelVisible = false;
  let cycleTimer;
  function syncPresentation() {
    const active = modelVisible && !document.hidden && !reducedMotion.matches;
    root.dataset.motion = active ? 'playing' : 'paused';
    clearTimeout(cycleTimer);
    cycleTimer = undefined;
    if (!active || manualMode) return;
    cycleTimer = setTimeout(() => {
      const current = modeOrder.indexOf(root.dataset.mode);
      selectMode(modeOrder[(current + 1) % modeOrder.length]);
      syncPresentation();
    }, cycleDelay);
  }
  modes.forEach(button => button.addEventListener('click', () => {
    manualMode = button.dataset.mode;
    selectMode(manualMode);
    syncPresentation();
  }));
  new IntersectionObserver(entries => {
    const entry = entries[0];
    modelVisible = entry.isIntersecting && entry.intersectionRatio >= .15;
    syncPresentation();
  }, {threshold:[0,.15]}).observe(root.querySelector('.as-architecture-scroll'));
  document.addEventListener('visibilitychange', syncPresentation);
  reducedMotion.addEventListener('change', syncPresentation);
  new ResizeObserver(drawConnections).observe(root.querySelector('.as-architecture'));
  // Keep camera-token connections attached while a hovered head lifts.
  let connectionFrame;
  function followHeadLift(){
    cancelAnimationFrame(connectionFrame);
    const finish=performance.now()+280;
    function follow(now){drawConnections();if(now<finish)connectionFrame=requestAnimationFrame(follow);}
    connectionFrame=requestAnimationFrame(follow);
  }
  root.querySelectorAll('.as-output').forEach(head=>{
    head.addEventListener('pointerenter',followHeadLift);
    head.addEventListener('pointerleave',followHeadLift);
  });
  root.querySelectorAll('img').forEach(image=>image.addEventListener('load',drawConnections));
  selectQuery(7);selectMode(manualMode || 'mid-training');syncPresentation();requestAnimationFrame(drawConnections);
})();
