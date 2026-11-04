const tasks = [
  {
    name: 'Bag', category: 'Occlusion-driven manipulation',
    description: 'Open the backpack, reveal its interior, and take out the bottle.',
    moments: [
      [.5, 'Grasp the backpack', 'Position the hands around the closed bag.'],
      [6.5, 'Open the backpack', 'Move the head camera to reveal the bag interior.'],
      [10, 'Grasp the bottle', 'Use the revealed view to guide the grasp.'],
      [13.5, 'Take out the bottle', 'Track the bottle as it leaves the bag.'],
    ],
  },
  {
    name: 'Drawer', category: 'Occlusion-driven manipulation',
    description: 'Open the drawer, retrieve the object, place it on the plate, and close the drawer.',
    moments: [
      [2, 'Grasp the handle', 'Locate the drawer handle before pulling.'],
      [7.5, 'Grasp the object', 'Inspect the opened drawer to find the object.'],
      [12.5, 'Place the object', 'Keep the plate and object in view.'],
      [16.5, 'Close the drawer', 'Return attention to the drawer front.'],
    ],
  },
  {
    name: 'Table', category: 'Occlusion-driven manipulation',
    description: 'Find the object beneath the raised table and place it in the requested bin.',
    moments: [
      [2, 'Locate the object', 'Look beneath the tabletop to reveal the target.'],
      [6, 'Grasp the object', 'Maintain a useful view through the occluding structure.'],
      [10, 'Locate the bin', 'Shift attention from the object to its destination.'],
      [13, 'Place the object', 'Align the held object with the selected bin.'],
    ],
  },
  {
    name: 'Pot', category: 'Active Search and Localization',
    description: 'Find the instructed object, place it in the pot, and cover the pot with its lid.',
    moments: [
      [1.5, 'Locate the object', 'Search across the shelf for the instructed object.'],
      [7.5, 'Grasp the object', 'Localize the object for the reach and grasp.'],
      [12.5, 'Place in the pot', 'Bring the destination into the working view.'],
      [18.5, 'Cover the pot', 'Track the lid and pot while completing the task.'],
    ],
    replay: 'pot',
  },
  {
    name: 'Box', category: 'Active Search and Localization',
    description: 'Find the blue cookie box on the shelf and place it on the requested brown box.',
    moments: [
      [1, 'Locate the object', 'Search the shelving unit at different heights.'],
      [4.5, 'Grasp the object', 'Localize the selected package before grasping.'],
      [8.5, 'Locate the box', 'Shift the view toward the requested destination.'],
      [11, 'Place the object', 'Follow the transfer and final placement.'],
    ],
  },
];

const replayEpisodes = {Bag: {index: 0, number: 128}, Box: {index: 1, number: 42}, Pot: {index: 2, number: 38}};

const asset = (task, suffix) => 'assets/' + (suffix === 'video' ? 'trimmed/' + task.toLowerCase() + '.mp4' : 'evaluation/' + task.toLowerCase() + '-step-' + suffix + '.jpg');
const timestamp = seconds => '0:' + Math.floor(seconds).toString().padStart(2, '0') + (seconds % 1 ? '.5' : '');

export function initEvaluationLab() {
  const mount = document.getElementById('evaluation-lab');
  if (!mount) return;
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./evaluation-lab.css?v=20261104k', import.meta.url).href;
  document.head.append(stylesheet);
  mount.innerHTML = `
    <div class="ev-task-groups" aria-label="Evaluation tasks">
      <section class="ev-family ev-family--occlusion" aria-labelledby="ev-occlusion-heading"><h3 id="ev-occlusion-heading">Occlusion-driven manipulation</h3><div class="ev-task-list"></div></section>
      <section class="ev-family ev-family--search" aria-labelledby="ev-search-heading"><h3 id="ev-search-heading">Active Search and Localization</h3><div class="ev-task-list"></div></section>
    </div>
    <div class="ev-player">
      <div class="ev-video-wrap">
        <video controls muted loop playsinline data-scroll-play preload="metadata"></video>
        <div class="ev-current-moment" aria-live="off"><span></span><strong></strong></div>
      </div>
      <aside class="ev-context">
        <p class="ev-category"></p><h3></h3><p class="ev-description"></p>
        <div class="ev-attention"><span>Viewpoint requirement</span><p></p></div>
        <button type="button" class="ev-replay-link" hidden>Compare recorded robot motion →</button>
      </aside>
      <aside class="ev-companion" hidden><div class="ev-companion-heading"><strong>Recorded demonstration</strong><button type="button" class="ev-close-replay" aria-label="Close recorded motion">×</button></div><p class="ev-companion-note">A separate demonstration from the autonomous rollout. The two timelines are independent.</p><div class="ev-replay-mount"></div></aside>
    </div>
    <div class="ev-timeline"><span class="ev-clock">0:00</span><div class="ev-seek"><div class="ev-markers" aria-label="Key moments"></div><input type="range" min="0" max="1" step="0.01" value="0" aria-label="Task video timeline"></div></div>
    <div class="ev-chapters" aria-label="Video chapters"></div>
    <p class="ev-chapter-note">Select a chapter to inspect a representative moment.</p>`;
  const selector = mount.querySelector('.ev-task-groups');
  const video = mount.querySelector('video');
  const chapters = mount.querySelector('.ev-chapters');
  const scrub = mount.querySelector('.ev-seek input');
  const markers = mount.querySelector('.ev-markers');
  const replayLink = mount.querySelector('.ev-replay-link');
  let selected = 0;
  let pendingSeek;
  let replayController;
  let replayPromise;
  let replayGeneration = 0;
  const player = mount.querySelector('.ev-player');
  const companion = mount.querySelector('.ev-companion');
  function closeReplay() {
    replayGeneration++;
    replayController?.pause();
    companion.hidden = true;
    player.classList.remove('ev-has-replay');
  }

  function updateMoment() {
    const task = tasks[selected];
    scrub.value = video.currentTime || 0;
    mount.querySelector('.ev-clock').textContent = timestamp(Math.floor(video.currentTime || 0));
    let active = 0;
    task.moments.forEach(([time], i) => {if (video.currentTime >= time) active = i;});
    const [, name, explanation] = task.moments[active];
    chapters.querySelectorAll('button').forEach((button, i) => {
      button.setAttribute('aria-current', String(i === active));
    });
    mount.querySelector('.ev-current-moment span').textContent = 'Step ' + (active + 1);
    mount.querySelector('.ev-current-moment strong').textContent = name;
    mount.querySelector('.ev-attention p').textContent = explanation;
  }

  function seek(time) {
    if (video.readyState >= 1) video.currentTime = Math.min(time, video.duration || time);
    else pendingSeek = time;
    updateMoment();
  }

  function choose(index) {
    const task = tasks[index];
    if (!task) return;
    closeReplay();
    selected = index;
    mount.dataset.taskFamily = index < 3 ? 'occlusion' : 'search';
    pendingSeek = undefined;
    video.pause();
    video.poster = 'assets/trimmed/' + task.name.toLowerCase() + '-poster.jpg';
    video.src = asset(task.name, 'video');
    video.setAttribute('aria-label', task.name + ' autonomous rollout');
    selector.querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    mount.querySelector('.ev-context h3').textContent = task.name;
    mount.querySelector('.ev-category').textContent = task.category;
    mount.querySelector('.ev-description').textContent = task.description;
    replayLink.hidden = !task.replay;
    replayLink.dataset.episode = task.replay || '';
    scrub.value = 0;
    scrub.disabled = true;
    markers.style.visibility = 'hidden';
    markers.replaceChildren(...task.moments.map(([time, label], i) => {
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.title = label + ' · ' + timestamp(time);
      marker.setAttribute('aria-label', marker.title);
      marker.textContent = i + 1;
      marker.dataset.time = time;
      marker.addEventListener('click', () => seek(time));
      return marker;
    }));
    chapters.replaceChildren(...task.moments.map(([time, name], i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', name + ' at ' + time + ' seconds');
      const frame = document.createElement('img');
      frame.src = asset(task.name, i);
      frame.alt = '';
      frame.loading = 'lazy';
      const label = document.createElement('strong');
      label.textContent = name;
      const timeLabel = document.createElement('span');
      timeLabel.textContent = timestamp(time);
      button.append(frame, timeLabel, label);
      button.addEventListener('click', () => seek(time));
      return button;
    }));
    updateMoment();
  }

  tasks.forEach((task, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    const image = document.createElement('img');
    image.src = 'assets/trimmed/' + task.name.toLowerCase() + '-poster.jpg';
    image.alt = '';
    image.loading = 'lazy';
    const name = document.createElement('strong');
    name.textContent = task.name;
    button.append(image, name);
    button.addEventListener('click', () => choose(i));
    selector.querySelectorAll('.ev-task-list')[i < 3 ? 0 : 1].append(button);
  });
  scrub.addEventListener('input', () => seek(Number(scrub.value)));
  video.addEventListener('timeupdate', updateMoment);
  video.addEventListener('seeked', updateMoment);
  video.addEventListener('loadedmetadata', () => {
    scrub.max = video.duration;
    scrub.disabled = false;
    markers.style.visibility = 'visible';
    markers.querySelectorAll('button').forEach(button => button.style.left = 100 * Number(button.dataset.time) / video.duration + '%');
    if (pendingSeek !== undefined) {video.currentTime = pendingSeek; pendingSeek = undefined;}
    updateMoment();
  });
  replayLink.addEventListener('click', async () => {
    const task = tasks[selected];
    if (!task.replay) return;
    const {index: episodeIndex, number: episodeNumber} = replayEpisodes[task.name];
    const request = ++replayGeneration;
    companion.hidden = false;
    player.classList.add('ev-has-replay');
    mount.querySelector('.ev-companion-heading strong').textContent = 'Recorded demonstration · episode ' + episodeNumber;
    const replayMount = mount.querySelector('.ev-replay-mount');
    try {
      if (!replayPromise) {
        replayPromise = import('./recorded-replay.mjs?v=20261104collision1').then(module => module.initRecordedReplay(replayMount, {episodeIndex, compact: true}));
      }
      replayController = await replayPromise;
      if (request !== replayGeneration) {replayController?.pause(); return;}
      await replayController.selectEpisode(episodeIndex);
    } catch (error) {
      if (request !== replayGeneration) return;
      replayController = undefined;
      replayMount.textContent = 'The recorded motion could not load.';
      replayPromise = undefined;
      console.error(error);
    }
  });
  mount.querySelector('.ev-close-replay').addEventListener('click', closeReplay);
  choose(0);
  return {selectTask: name => {
    const index = tasks.findIndex(task => task.name === name);
    if (index >= 0 && index !== selected) choose(index);
  }};
}
