'use strict';

(() => {
  const mount = document.getElementById('related-work');
  if (!mount) return;

  // Keep this list editable as new active-perception work appears.
  // Foundations use journal publication years; recent entries use first arXiv submissions.
  // Foundational titles, authors and dates checked against primary sources on 2026-11-04.
  const foundations = [
    {
      name: 'Active Touch and Robot Perception',
      title: 'Active Touch and Robot Perception',
      authors: 'Kenneth Y. Goldberg · Ruzena Bajcsy',
      year: 1984, publicationDate: '1984-01-01',
      venue: 'Cognition and Brain Theory',
      href: 'https://goldberg.berkeley.edu/pubs/Active-Touch-and-Robot-Perception-Goldberg-Bajcsy-1984.pdf',
      detail: 'A robot actively explores object contours with a tactile probe to support recognition.'
    },
    {
      name: 'Active Vision', title: 'Active Vision',
      authors: 'John Aloimonos · Isaac Weiss · Amit Bandyopadhyay',
      year: 1988, publicationDate: '1988-01-01',
      venue: 'International Journal of Computer Vision',
      href: 'https://link.springer.com/article/10.1007/BF00133571',
      detail: 'Controlling the observer’s motion and viewing geometry can simplify visual computation.'
    },
    {
      name: 'Active Perception', title: 'Active Perception',
      authors: 'Ruzena Bajcsy',
      year: 1988, publicationDate: '1988-08-31',
      venue: 'Proceedings of the IEEE',
      href: 'https://ieeexplore.ieee.org/document/5968',
      detail: 'Models and control strategies guide sensing toward informative observations.'
    },
    {
      name: 'Animate Vision', title: 'Animate Vision',
      authors: 'Dana H. Ballard',
      year: 1991, publicationDate: '1991-02-01',
      venue: 'Artificial Intelligence',
      href: 'https://www.sciencedirect.com/science/article/pii/0004370291900804',
      detail: 'Gaze control connects visual computation to behavior and task demands.'
    },
    {
      name: 'Interactive Perception',
      title: 'Leveraging Action in Perception and Perception in Action',
      authors: 'Jeannette Bohg · Karol Hausman · Bharath Sankaran et al.',
      year: 2017, publicationDate: '2017-12-01',
      venue: 'IEEE Transactions on Robotics',
      href: 'https://arxiv.org/abs/1604.03670',
      detail: 'A survey of how physical interaction creates informative signals for robot perception.'
    },
    {
      name: 'Revisiting Active Perception', title: 'Revisiting Active Perception',
      authors: 'Ruzena Bajcsy · Yiannis Aloimonos · John K. Tsotsos',
      year: 2018, publicationDate: '2018-02-01',
      venue: 'Autonomous Robots · online 2017',
      href: 'https://link.springer.com/article/10.1007/s10514-017-9615-3',
      detail: 'Revisits the history of active perception and its role in embodied sensing.'
    },
  ];
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
  heading.className = 'section-title';
  heading.textContent = 'Emerging active perception trends';
  const updated = document.createElement('p');
  updated.className = 'related-updated';
  updated.textContent = 'A selected reading list · Updated 4 November 2026';

  // ViA stays first by request; the rest run from earliest to latest.
  const chronologyKey = paper => paper.firstSubmitted || `${paper.year}-99-99`;
  papers.sort((a, b) => {
    if (a.name === 'Vision in Action') return -1;
    if (b.name === 'Vision in Action') return 1;
    return chronologyKey(a).localeCompare(chronologyKey(b)) || a.name.localeCompare(b.name);
  });
  foundations.sort((a,b) => a.publicationDate.localeCompare(b.publicationDate));

  function paperGroup(id, title, description, entries, foundational = false) {
    const group = document.createElement('section');
    group.className = 'related-group' + (foundational ? ' related-foundations' : '');
    group.setAttribute('aria-labelledby', id);
    const label = document.createElement('h3');label.id = id;label.textContent = title;
    const intro = document.createElement('p');intro.className = 'related-group-intro';intro.textContent = description;
    const list = document.createElement('ul');list.className = 'related-papers';
    for (const paper of entries) {
      const item = document.createElement('li');
      const link = document.createElement('a');link.href = paper.href;
      link.title = paper.name === paper.title ? paper.name : paper.name + ': ' + paper.title;
      const name = document.createElement('strong');name.textContent = paper.name;
      const year = document.createElement('span');year.className = 'related-year';year.textContent = paper.year + ' ↗';
      link.append(name, year);
      if (paper.authors) {
        const authors = document.createElement('span');authors.className = 'related-authors';authors.textContent = paper.authors;
        const venue = document.createElement('span');venue.className = 'related-venue';venue.textContent = paper.venue;
        link.append(authors, venue);
      }
      const detail = document.createElement('span');detail.className = 'related-detail';detail.textContent = paper.detail;
      link.append(detail);item.append(link);list.append(item);
    }
    group.append(label, intro, list);return group;
  }
  mount.replaceChildren(heading, updated,
    paperGroup('related-foundations', 'Foundations', 'Active touch, controlled viewpoints, and perception through interaction.', foundations, true),
    paperGroup('related-learning', 'Learning to look and manipulate', 'Recent approaches to learning camera control together with robot manipulation.', papers)
  );
})();
