'use strict';

(() => {
  const mount = document.getElementById('related-work');
  if (!mount) return;

  // Keep this list editable as new active-perception work appears.
  // Dates are first arXiv submissions, checked on 2026-11-03.
  const papers = [
    {
      name: 'Act, Sense, Act',
      title: 'Learning Active Perception from Large-Scale Egocentric Human Data',
      year: 2026,
      firstSubmitted: '2026-02-04', // https://arxiv.org/abs/2602.04600
      href: 'https://arxiv.org/abs/2602.04600',
      detail: 'Exploration and manipulation priors from human egocentric video.'
    },
    {
      name: 'Active Vision Might Be All You Need',
      title: 'Exploring Active Vision in Bimanual Robotic Manipulation',
      year: 2024,
      firstSubmitted: '2024-09-26', // https://arxiv.org/abs/2409.17435
      href: 'https://lara-soltani.com/av-aloha/',
      detail: 'AV-ALOHA combines bimanual teleoperation with a movable camera.'
    },
    {
      name: 'ActiveArena',
      title: 'Benchmarking and Understanding Active Perception in Robotic Manipulation',
      year: 2026,
      firstSubmitted: '2026-09-21', // https://arxiv.org/abs/2609.24124
      href: 'https://leeibo.github.io/ActiveArena/',
      detail: 'A benchmark for acquiring and remembering task-relevant visual evidence.'
    },
    {
      name: 'ActiveGlasses',
      title: 'Learning Manipulation with Active Vision from Ego-centric Human Demonstration',
      year: 2026,
      firstSubmitted: '2026-04-09', // https://arxiv.org/abs/2604.08534
      href: 'https://arxiv.org/abs/2604.08534',
      detail: 'Smart-glasses demonstrations transfer viewpoint and manipulation behavior.'
    },
    {
      name: 'ActiveMimic',
      title: 'Egocentric Video Pretraining with Active Perception',
      year: 2026,
      firstSubmitted: '2026-06-04', // https://arxiv.org/abs/2606.06194
      href: 'https://arxiv.org/abs/2606.06194',
      detail: 'Joint camera and wrist pretraining from egocentric human video.'
    },
    {
      name: 'ActiveUMI',
      title: 'Robotic Manipulation with Active Perception from Robot-Free Human Demonstrations',
      year: 2025,
      firstSubmitted: '2025-10-02', // https://arxiv.org/abs/2510.01607
      href: 'https://activeumi.github.io/',
      detail: 'A portable interface records coordinated head and hand demonstrations.'
    },
    {
      name: 'ActiveVLA',
      title: 'Injecting Active Perception into Vision-Language-Action Models for Precise 3D Robotic Manipulation',
      year: 2026,
      firstSubmitted: '2026-01-13', // https://arxiv.org/abs/2601.08325
      href: 'https://arxiv.org/abs/2601.08325',
      detail: 'View selection and spatial zoom for precise 3D manipulation.'
    },
    {
      name: 'EgoMI',
      title: 'Learning Active Vision and Whole-Body Manipulation from Egocentric Human Demonstrations',
      year: 2025,
      firstSubmitted: '2025-10-31', // https://arxiv.org/abs/2511.00153
      href: 'https://egocentric-manipulation-interface.github.io/',
      detail: 'Head and hand capture with memory for changing viewpoints.'
    },
    {
      name: 'EgoReveal',
      title: 'Learning Active Vision and Object Manipulation under Partial Occlusions from Egocentric Demonstrations',
      year: 2026,
      firstSubmitted: '2026-10-09', // https://arxiv.org/abs/2610.12999
      href: 'https://kurirona-166.github.io/projects/iros2026/',
      detail: 'Viewpoint repositioning reveals partly occluded objects before manipulation.'
    },
    {
      name: 'Eye, Robot',
      title: 'Learning to Look to Act with a BC-RL Perception-Action Loop',
      year: 2025,
      firstSubmitted: '2025-06-12', // https://arxiv.org/abs/2506.10968
      href: 'https://www.eyerobot.net/',
      detail: 'Gaze and manipulation learn together through a BC–RL loop.'
    },
    {
      name: 'EyeRobot 2.0',
      title: 'Active Gaze for Precise Manipulation without Wrist Cameras',
      year: 2026,
      firstSubmitted: '2026-10-02', // https://arxiv.org/abs/2610.03710
      href: 'https://eyerobot2.github.io/',
      detail: 'Active stereo fixation supports precise bimanual manipulation.'
    },
    {
      name: 'HALOMI',
      title: 'Learning Humanoid Loco-Manipulation with Active Perception from Human Demonstrations',
      year: 2026,
      firstSubmitted: '2026-06-17', // https://arxiv.org/abs/2606.18772
      href: 'https://arxiv.org/abs/2606.18772',
      detail: 'Human head–hand coordination transfers to humanoid loco-manipulation.'
    },
    {
      name: 'Learning to See While Learning to Act',
      title: 'Diffusion Models for Active Perception in Robot Imitation',
      year: 2026,
      firstSubmitted: '2026-06-22', // https://arxiv.org/abs/2606.23625
      href: 'https://arxiv.org/abs/2606.23625',
      detail: 'See2Act couples viewpoint refinement with action denoising.'
    },
    {
      name: 'SaPaVe',
      title: 'Towards Active Perception and Manipulation in Vision-Language-Action Models for Robotics',
      year: 2026,
      firstSubmitted: '2026-03-12', // https://arxiv.org/abs/2603.12193
      href: 'https://lmzpai.github.io/SaPaVe/',
      detail: 'Semantic camera control and manipulation under changing views.'
    },
    {
      name: 'Vision in Action',
      title: 'Learning Active Perception from Human Demonstrations',
      year: 2025,
      firstSubmitted: '2025-06-18', // https://arxiv.org/abs/2506.15666
      href: 'https://vision-in-action.github.io/',
      detail: 'A robot neck learns searching, tracking, and focusing from demonstrations.'
    }
  ];

  const heading = document.createElement('h2');
  heading.textContent = 'Related active perception work';
  const updated = document.createElement('p');
  updated.className = 'related-updated';
  updated.textContent = 'A reading list for active vision and manipulation · Updated 3 November 2026';
  const list = document.createElement('ul');
  list.className = 'related-papers';

  // ViA stays first by request; the rest run from earliest to latest.
  // A year-only future entry follows dated entries within that year.
  const chronologyKey = paper => paper.firstSubmitted || `${paper.year}-99-99`;
  papers.sort((a, b) => {
    if (a.name === 'Vision in Action') return -1;
    if (b.name === 'Vision in Action') return 1;
    return chronologyKey(a).localeCompare(chronologyKey(b)) || a.name.localeCompare(b.name);
  });
  for (const paper of papers) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = paper.href;
    link.title = paper.name + ': ' + paper.title;
    const title = document.createElement('strong');
    title.textContent = paper.name;
    const year = document.createElement('span');
    year.className = 'related-year';
    year.textContent = paper.year + ' ↗';
    const detail = document.createElement('span');
    detail.className = 'related-detail';
    detail.textContent = paper.detail;
    link.append(title, year, detail);
    item.append(link);
    list.append(item);
  }
  mount.replaceChildren(heading, updated, list);
})();
