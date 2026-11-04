(() => {
  'use strict';
  const root = document.querySelector('#model-lab');
  if (!root) return;

  const groups = [
    {label: 't−48', name: 'Earliest frame', detail: 'The earliest valid front-camera block reads its own visual features and learnable camera token.'},
    {label: 't−32', name: 'Second frame', detail: 'The second front-camera block reads itself and the preceding valid view.'},
    {label: 't−16', name: 'Third frame', detail: 'The third front-camera block reads itself and the first two views.'},
    {label: 't', name: 'Current frame', detail: 'The current front-camera block reads the entire valid front-camera history.'},
    {label: 'Context', name: 'Current wrist, state and language inputs', detail: 'The current wrist images, tokenized proprioception and language can read all valid front-camera history blocks.'},
    {label: 'Action', name: 'Action expert', detail: 'The transformer action expert reads the encoded VLM context and denoises a joint chunk of camera and manipulation actions.'},
  ];
  const access = (query, key) => {
    if (key < 4) return key <= query ? 'read' : 'masked';
    return query < 4 ? 'masked' : 'omitted';
  };
  const inspectButton = (index, body, label = groups[index].name) => `<button type="button" data-query="${index}" aria-pressed="false" aria-label="Inspect ${label}">${body}</button>`;
  const tokenPack = (camera = false) => `<span class="as-token-pack" aria-hidden="true"><i></i><i></i><i></i>${camera ? '<i class="as-camera-token"></i>' : '<i></i>'}</span>`;
  const flow = (color = 'rgb') => `<span class="as-vertical-flow as-${color}" aria-hidden="true"></span>`;

  root.innerHTML = `
    <div class="as-model-head">
      <h3>ActiveScale architecture</h3>
      <div class="as-model-modes" role="group" aria-label="Architecture mode">
        <button type="button" data-mode="training" aria-pressed="true">Training</button>
        <button type="button" data-mode="inference" aria-pressed="false">Inference</button>
      </div>
    </div>
    <div class="as-architecture-scroll">
      <div class="as-architecture">
        <div class="as-vlm-output">
          <div class="as-output as-pose">
            <span class="as-label">From camera-token hidden states</span>
            <strong>Camera-pose reconstruction</strong>
            <span>VGGT-style head · 9-D pose</span>
            <small>Translation · quaternion · vertical + horizontal FoV</small>
            <b data-pose-status>Auxiliary geometric supervision</b>
          </div>
          <div class="as-output as-language">
            <span class="as-label">Autoregressive outputs</span>
            <strong>Subtask prediction</strong>
            <span class="as-command">“Open the bag”</span>
            <small data-fast-detail>Discrete FAST action tokens</small>
            <b data-language-status>Subtask + FAST supervision in mid-training</b>
          </div>
        </div>
        <div class="as-output as-action as-action-output">
          <span class="as-label">Continuous output</span>
          <strong>Action chunk</strong>
          <svg viewBox="0 0 180 46" role="img" aria-label="A continuous action trajectory">
            <path class="as-trajectory-guide" d="M5 37C42 37 48 8 87 8s43 23 88 8"/>
            <path class="as-trajectory" d="M5 37C42 37 48 8 87 8s43 23 88 8"/>
          </svg>
          <small>Camera motion + bimanual manipulation</small>
        </div>

        <div class="as-output-flows">${flow('pose')}${flow('language')}</div>
        <div class="as-action-flow">${flow('action')}</div>

        <div class="as-vla as-processor">
          <div class="as-processor-tokens" aria-hidden="true">${tokenPack(true)}${tokenPack(true)}${tokenPack()}${tokenPack()}</div>
          <div class="as-processor-title"><strong>Pretrained VLA</strong><span>π₀.₅ · PaliGemma vision–language backbone</span></div>
          <div class="as-processor-tokens" aria-hidden="true">${tokenPack(true)}${tokenPack(true)}${tokenPack()}${tokenPack()}</div>
        </div>
        <div class="as-context-flow" aria-hidden="true"><span>Encoded<br>context</span><i></i></div>
        <div class="as-expert as-processor">
          <div class="as-processor-tokens" aria-hidden="true">${tokenPack()}${tokenPack()}</div>
          ${inspectButton(5, '<strong>Action expert</strong><span>Transformer · flow matching</span>')}
          <div class="as-processor-tokens" aria-hidden="true">${tokenPack()}${tokenPack()}</div>
        </div>

        <div class="as-prefix-flows" aria-hidden="true">
          <span data-flow="0"></span><span data-flow="1"></span><span data-flow="2"></span><span data-flow="3"></span><span data-flow="4"></span>
        </div>
        <div class="as-noise-flow">${flow('action')}</div>

        <div class="as-prefix">
          <div class="as-history">
            <div class="as-label">Egocentric observations · shared vision encoder</div>
            <div class="as-ego-example"><img loading="lazy" src="assets/replay/backpack-episode-128-cam_front-initial.jpg" alt="Example AMP head-camera view of the backpack"><span>Human / robot<br>head-camera video</span></div>
            <div class="as-history-blocks" role="group" aria-label="Inspect front-camera history">
              ${groups.slice(0,4).map((group, index) => inspectButton(index, `<strong>${group.label}</strong>${tokenPack(true)}`)).join('')}
            </div>
          </div>
          <div class="as-current-inputs">
            <div class="as-label">Current robot context</div>
            <div class="as-wrist-pair">
              ${inspectButton(4, '<img loading="lazy" src="assets/replay/backpack-episode-128-cam_left-initial.jpg" alt="AMP left wrist camera view"><span>Left wrist</span>', 'left wrist image')}
              ${inspectButton(4, '<img loading="lazy" src="assets/replay/backpack-episode-128-cam_right-initial.jpg" alt="AMP right wrist camera view"><span>Right wrist</span>', 'right wrist image')}
            </div>
            ${inspectButton(4, '<strong>State sₜ</strong><span>Tokenized proprioception</span>', 'proprioceptive state')}
          </div>
          <div class="as-language-inputs">
            <div class="as-label">Language conditioning</div>
            ${inspectButton(4, '<small>High-level instruction</small><span>“Reach the bottle”</span>', 'high-level instruction')}
            ${inspectButton(4, '<small>Low-level subtask</small><span>“Open the bag”</span>', 'low-level subtask')}
          </div>
        </div>
        <div class="as-action-input as-action">
          <span class="as-label" data-noise-title>Action input</span>
          <svg viewBox="0 0 180 64" aria-hidden="true" class="as-noise">
            ${Array.from({length: 62}, (_, index) => {
              const x = 14 + ((index * 37) % 153);
              const y = 8 + ((index * 23) % 49);
              return `<circle cx="${x}" cy="${y}" r="1.6"/>`;
            }).join('')}
          </svg>
          <strong data-action-input>Noisy action chunk xτ</strong>
          <span>Flow time τ</span>
          <small class="as-command">Conditioned on “Open the bag”</small>
        </div>
        <div class="as-legend"><span>Visual features</span><span>Camera tokens</span><span>State + language</span><span>Action tokens</span></div>
      </div>
    </div>
    <p class="as-model-note" data-mode-note></p>
    <details class="as-attention">
      <summary>Explore the block-causal attention mask</summary>
      <p>Choose a query to see which front-camera observations it can read.</p>
      <table class="as-mask"><caption>Rows are queries. Columns are keys.</caption>
        <thead><tr><th scope="col">Q / K</th>${groups.map(group => `<th scope="col">${group.label}</th>`).join('')}</tr></thead>
        <tbody>${groups.map((group, query) => `<tr><th scope="row">${inspectButton(query, group.label)}</th>${groups.map((key, index) => {
          const state = access(query, index);
          return `<td data-cell="${query}" class="${state}" title="${group.name} → ${key.name}: ${state}"><span class="as-sr">${state}</span></td>`;
        }).join('')}</tr>`).join('')}</tbody>
      </table>
      <div class="as-mask-legend"><span class="read">Reads</span><span class="masked">Masked</span><span class="omitted">Detail omitted</span></div>
    </details>
    <p class="as-query-detail" data-query-detail aria-live="polite"></p>
  `;

  const queries = [...root.querySelectorAll('[data-query]')];
  const cells = [...root.querySelectorAll('[data-cell]')];
  const paths = [...root.querySelectorAll('[data-flow]')];
  const modes = [...root.querySelectorAll('[data-mode]')];
  const detail = root.querySelector('[data-query-detail]');
  function selectQuery(index) {
    queries.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.query) === index)));
    cells.forEach(cell => cell.classList.toggle('as-mask-selected', Number(cell.dataset.cell) === index));
    paths.forEach(path => {
      const key = Number(path.dataset.flow);
      path.classList.toggle('as-flow-active', key === index || access(index, key) === 'read');
    });
    detail.textContent = groups[index].detail;
  }
  function selectMode(mode) {
    const training = mode === 'training';
    root.dataset.mode = mode;
    modes.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    root.querySelector('[data-pose-status]').textContent = training ? 'Auxiliary geometric supervision' : 'Removed during action inference';
    root.querySelector('[data-fast-detail]').textContent = training ? 'Discrete FAST action tokens' : 'FAST supervision used during mid-training';
    root.querySelector('[data-language-status]').textContent = training ? 'Subtask + FAST supervision in mid-training' : 'Subtask-conditioned action context';
    root.querySelector('[data-action-input]').textContent = training ? 'Noisy action chunk xτ' : 'Gaussian noise ε';
    root.querySelector('[data-mode-note]').textContent = training
      ? 'Mid-training uses subtask, FAST, flow and valid camera-pose supervision. AMP post-training uses flow and camera-pose losses. Example robot inputs show the recorded Backpack initial views.'
      : 'The camera tokens remain in the visual prefix. The pose head is removed, and the action expert denoises a continuous chunk of camera and manipulation commands.';
  }
  queries.forEach(button => button.addEventListener('click', () => selectQuery(Number(button.dataset.query))));
  modes.forEach(button => button.addEventListener('click', () => selectMode(button.dataset.mode)));
  selectQuery(3);
  selectMode('training');
})();
