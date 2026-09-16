'use strict';
const navLinks = [...document.querySelectorAll('.toc a[href^="#"]')];
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    navLinks.forEach(link => {
      const active = link.hash === `#${entry.target.id}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
}, { rootMargin: '-10% 0px -65% 0px' });
document.querySelectorAll('section[id]').forEach(section => observer.observe(section));
document.querySelectorAll('video').forEach(video => {
  video.addEventListener('play', () => {
    document.querySelectorAll('video').forEach(other => { if (other !== video) other.pause(); });
  });
});
const ablationTabs = [...document.querySelectorAll('.ablation-tab')];
ablationTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    ablationTabs.forEach(t => {
      const active = t === tab;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.ablation-panel').forEach(panel => {
      panel.hidden = panel.id !== tab.dataset.target;
    });
  });
});
const copyButton = document.querySelector('#copy-citation');
if (copyButton) copyButton.addEventListener('click', async () => {
  const citation = document.querySelector('#bibtex');
  try {
    await navigator.clipboard.writeText(citation.textContent);
    copyButton.textContent = 'Copied!';
  } catch {
    const range = document.createRange(); range.selectNodeContents(citation);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    copyButton.textContent = 'Select & copy';
  }
  setTimeout(() => { copyButton.textContent = 'Copy BibTeX'; }, 2500);
});
