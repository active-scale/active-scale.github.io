(() => {
  'use strict';
  const mount=document.getElementById('dataset-wall');if(!mount)return;
  mount.classList.replace('dataset-wall','data-recipe');
  const base='assets/dataset-preview/';
  const humanSources=[
    ['EgoLive','https://arxiv.org/abs/2604.23570',base+'egolive-cover.png'],
    ['EgoVerse','https://egoverse.ai/',base+'egoverse-human-ego-poster.jpg',base+'egoverse-human-ego.mp4'],
    ['EgoSuite','https://egosuite100k.lightwheel.ai/',base+'egosuite-human-ego-poster.jpg',base+'egosuite-human-ego.mp4'],
  ];
  const stages=[
    ['internet','A vast library of how people look and act.','Everyday egocentric video records head and hand motion across many activities and places: people scan a shelf, peek into a bag, and check the target before the hand moves.',4400],
    ['human','Head pose teaches looking. Wrists teach acting.','We keep curated clips with valid camera trajectories. The head-camera pose supervises viewpoint changes; the wrist trajectories supervise manipulation.',4600],
    ['gap','Why keep robot data in the mix?','In our preliminary human-only mid-training trials, downstream robot grasps became offset. We therefore keep a robot-aligned action signal during adaptation.',4600],
    ['robot','Robot data keeps the actions grounded.','Co-training on demonstrations from several robot bodies preserves the VLA’s pretrained robot control while human video adds active-view priors.',4200],
    ['robot-selected','Three robot sources.','AgiBot World and RoboCOIN add diverse robot demonstrations. AMP adds coordinated active-camera and bimanual motion.',4200],
    ['mixed','Mix both, then specialize.','Starting from π₀.₅, we mid-train on 1,000 hours of human and robot data sampled 1:1, with camera-pose supervision on the frame history. Each task is then post-trained on AMP demonstrations.',5200],
  ];
  const video=(label,stages,attrs='')=>`<video ${attrs} data-stages="${stages}" muted playsinline loop preload="none" aria-label="${label}"></video>`;
  const humanCards=humanSources.map(([name,href,poster,clip])=>`<a href="${href}" class="recipe-source-card"><div class="recipe-source-media">${clip?video(name+' egocentric preview','human,gap',`data-source="${clip}" poster="${poster}"`):`<img src="${poster}" alt="EgoLive dataset overview" loading="lazy">`}</div><strong>${name} ↗</strong></a>`).join('');
  const goals=`<div class="recipe-learning-goals"><div><span class="recipe-history-glyph" aria-hidden="true"><i></i><i></i><i></i></span><small>Temporal observations</small><strong>Connect changing views</strong></div><div><span class="recipe-pose-glyph" aria-hidden="true">↗ <b>XYZ</b></span><small>Camera-pose supervision</small><strong>Learn viewpoint motion</strong></div><div><span class="recipe-action-glyph" aria-hidden="true">⌁ → ⌁</span><small>Robot action supervision</small><strong>Retain robot control</strong></div></div>`;
  mount.innerHTML=`
    <div class="recipe-toolbar"><div class="recipe-progress" role="group" aria-label="Data recipe scenes">${stages.map(([id,title],i)=>`<button type="button" data-step="${i}" aria-label="Scene ${i+1}: ${title}" title="${title}"><span></span></button>`).join('')}</div></div>
    <div class="recipe-story" data-stage="internet">
      <div class="recipe-stage-heading"><h3></h3><p aria-live="polite"></p></div>
      <div class="recipe-scenes">
        <div class="recipe-source-side">
          <div class="recipe-layer recipe-net"><div class="recipe-count-label">Internet-scale egocentric video</div><div class="recipe-mosaic recipe-net-mosaic" aria-hidden="true"></div></div>
          <div class="recipe-layer recipe-selected"><div class="recipe-source-cards">${humanCards}</div><div class="recipe-pose-signals"><span>Head-camera trajectory</span><span>Left wrist trajectory</span><span>Right wrist trajectory</span></div></div>
          <div class="recipe-layer recipe-robot-net"><div class="recipe-count-label">Real robot demonstrations · public dataset previews</div><div class="recipe-mosaic recipe-robot-mosaic"></div></div>
          <div class="recipe-layer recipe-robot-selected"><div class="recipe-source-cards recipe-robot-cards"><a href="https://agibot-world.com/" class="recipe-source-card"><div class="recipe-source-media">${video('AgiBot World robot demonstrations','robot-selected',`data-robot-video data-robot-feature="agibot"`)}</div><strong>AgiBot World ↗</strong></a><a href="https://flagopen.github.io/RoboCOIN/" class="recipe-source-card"><div class="recipe-source-media">${video('RoboCOIN robot demonstrations','robot-selected',`data-robot-video data-robot-feature="robocoin"`)}</div><strong>RoboCOIN ↗</strong></a><a href="#system" class="recipe-source-card"><div class="recipe-source-media">${video('AMP data collection','robot-selected',`data-robot-video data-source="assets/trimmed/teleoperation.mp4" poster="assets/trimmed/teleoperation-poster.jpg"`)}</div><strong>AMP ↗</strong></a></div><div class="recipe-data-summary"><span>Diverse robot bodies</span><span>Robot state + actions</span><span>Head-camera motion where available</span></div></div>
        </div>
        <div class="recipe-right-side">
          <div class="recipe-layer recipe-scale"><small class="recipe-scale-kicker">A library spanning</small><span>Everyday activities</span><span>Diverse environments</span><span>Changing viewpoints</span><small>Head + hand motion</small><div class="recipe-scale-flow" aria-hidden="true">↓</div><strong>Implicit <span class="recipe-prior-phrase">active-perception priors</span></strong><p>Where to look · when to move · how to reach</p></div>
          <div class="recipe-layer recipe-human-motion"><canvas aria-label="Head and wrist trajectories provide viewpoint and manipulation supervision"></canvas><div class="recipe-supervision-key"><span><b>Head pose</b> → active-view targets</span><span><b>Wrist poses</b> → manipulation targets</span></div></div>
          <div class="recipe-layer recipe-gap"><div class="recipe-gap-scene"><canvas aria-label="Illustration of a robot gripper closing beside its target"></canvas><span class="recipe-target-label">Target object</span><span class="recipe-miss-label">Gripper closes beside it</span></div><strong>Grasp offset</strong><p>Illustration of the preliminary human-only observation</p></div>
          <div class="recipe-layer recipe-retain"><div class="recipe-training-block"><small>From human experience</small><strong>Active-view + manipulation priors</strong></div><span class="recipe-data-arrow">+</span><div class="recipe-training-block recipe-robot-block"><small>From robot experience</small><strong>Robot-aligned state and actions</strong></div><span class="recipe-data-arrow">↓</span><strong>Transfer human priors.<br>Retain robot control.</strong></div>
        </div>
        <div class="recipe-layer recipe-final">
          <div class="recipe-mixing-row"><div class="recipe-final-input recipe-final-human">${video('Human motion for mixed mid-training','mixed',`data-source="${humanSources[1][3]}" poster="${humanSources[1][2]}"`)}<strong>Human demonstrations</strong><span>Active-view + manipulation experience</span></div><div class="recipe-final-model"><small>Start from pretrained π₀.₅</small><strong>Mixed mid-training</strong><span>1:1 human / robot sampling</span><div class="recipe-mix-packets" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div></div><div class="recipe-final-input recipe-final-robot">${video('Robot actions for mixed mid-training','mixed',`data-robot-video data-robot-feature="robocoin"`)}<strong>Robot demonstrations</strong><span>Robot-aligned action learning</span></div></div>
          ${goals}
          <div class="recipe-next-training"><span>Then: task-specific AMP post-training</span><b>↓</b><strong>Specialize looking and acting for the target robot.</strong></div>
        </div>
      </div>
    </div>`;
  const story=mount.querySelector('.recipe-story'),title=mount.querySelector('h3'),caption=mount.querySelector('.recipe-stage-heading p');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  for(let i=0;i<56;i++){
    const tile=document.createElement('div');tile.className='recipe-tile';tile.style.setProperty('--tile',i);
    const image=document.createElement('img');image.loading='lazy';image.alt='';image.src=base+'net-ego-'+String(i%28).padStart(2,'0')+'.webp';tile.append(image);mount.querySelector('.recipe-net-mosaic').append(tile);
  }
  let index=0,playing=false,visible=false,elapsed=0,lastTime,animation=0,human,gap,humanLoading,gapLoading;
  function loadHuman(){humanLoading??=import('./data-human.mjs?v=20261104shorts1').then(module=>module.initDataHuman(mount.querySelector('.recipe-human-motion canvas'))).then(controller=>{human=controller;syncMedia();}).catch(console.error);}
  function loadGap(){gapLoading??=import('./data-gap.mjs?v=20261104data2').then(module=>module.initDataGap(mount.querySelector('.recipe-gap canvas'))).then(controller=>{gap=controller;syncMedia();}).catch(console.error);}
  function syncMedia(){
    const kind=stages[index][0],animate=visible&&!document.hidden&&!reduced.matches;
    mount.classList.toggle('is-active',visible&&!document.hidden);
    human?.setPlaying(animate&&kind==='human');gap?.setPlaying(animate&&kind==='gap');
    for(const media of mount.querySelectorAll('video')){
      const shown=media.dataset.stages?.split(',').includes(kind);
      if(animate&&shown&&media.dataset.source){if(!media.hasAttribute('src'))media.src=media.dataset.source;media.play().catch(()=>{});}else media.pause();
    }
  }
  fetch(base+'robot-video-manifest.json').then(response=>{if(!response.ok)throw new Error('Robot dataset previews unavailable');return response.json();}).then(manifest=>{
    for(const media of mount.querySelectorAll('[data-robot-feature]')){
      const feature=manifest.featured[media.dataset.robotFeature];media.dataset.source=base+feature.video;media.poster=base+feature.poster;
    }
    const clips=[...manifest.montage];if(clips.length===8)clips.push({...manifest.featured.agibot,dataset:'AgiBot World highlights'});
    const wall=mount.querySelector('.recipe-robot-mosaic');
    clips.forEach((clip,i)=>{const tile=document.createElement('div');tile.className='recipe-tile';tile.style.setProperty('--tile',i);tile.innerHTML=video(clip.dataset+' robot data example','robot',`data-robot-video data-source="${base+clip.video}" poster="${base+clip.poster}"`);wall.append(tile);});syncMedia();
  }).catch(error=>{console.error(error);mount.querySelector('.recipe-robot-mosaic').textContent='Robot dataset previews could not load.';});
  function render(){
    const [kind,heading,description]=stages[index];story.dataset.stage=kind;title.textContent=heading;caption.textContent=description;
    // Restart entrances even when the selected scene has not changed.
    story.classList.remove('is-entering');
    if(!reduced.matches){void story.offsetWidth;story.classList.add('is-entering');}
    [...mount.querySelectorAll('[data-step]')].forEach((step,i)=>{step.classList.toggle('is-current',i===index);step.setAttribute('aria-current',i===index?'step':'false');});
    if(visible&&kind==='human')loadHuman();if(visible&&kind==='gap')loadGap();syncMedia();
  }
  function pause(){playing=false;cancelAnimationFrame(animation);animation=0;lastTime=undefined;}
  function tick(now){
    if(!playing)return;
    if(lastTime!==undefined)elapsed+=now-lastTime;
    lastTime=now;
    if(elapsed>=stages[index][3]){index=(index+1)%stages.length;elapsed=0;render();}
    animation=requestAnimationFrame(tick);
  }
  function resume(){
    if(playing||!visible||document.hidden||reduced.matches)return;
    playing=true;lastTime=undefined;animation=requestAnimationFrame(tick);
  }
  mount.querySelectorAll('[data-step]').forEach(step=>step.addEventListener('click',()=>{
    index=Number(step.dataset.step);elapsed=0;lastTime=undefined;render();resume();
  }));
  new IntersectionObserver(([entry])=>{
    const entering=!visible&&entry.isIntersecting&&entry.intersectionRatio>=.15;
    visible=entry.isIntersecting&&entry.intersectionRatio>=.15;
    if(entering&&!reduced.matches){story.classList.remove('is-entering');void story.offsetWidth;story.classList.add('is-entering');}
    if(visible){resume();if(stages[index][0]==='human')loadHuman();if(stages[index][0]==='gap')loadGap();}
    else pause();
    syncMedia();
  },{threshold:[0,.15]}).observe(mount);
  reduced.addEventListener('change',()=>{if(reduced.matches)pause();else resume();syncMedia();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else resume();syncMedia();});render();
})();
