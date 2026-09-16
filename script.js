'use strict';
// Set the published https://arxiv.org/abs/... URL here when available.
// An empty value leaves no visible paper link or placeholder.
const arxivUrl = '';
if (arxivUrl) {
  const paperLink = document.createElement('a');
  paperLink.className = 'pill primary';
  paperLink.href = arxivUrl;
  paperLink.target = '_blank';
  paperLink.rel = 'noopener';
  paperLink.textContent = 'Paper';
  document.querySelector('.publication-links').prepend(paperLink);
}

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
