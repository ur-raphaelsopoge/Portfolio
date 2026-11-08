const revealTargets = document.querySelectorAll(
  '.navbar, .hero-content > *, .section-divider span, .section-grid, .section-grid h3, .section-grid h4, .section-grid .entry, .section-grid .about-text, .projects-section > .section-title, .project-card, .github-section, .footer'
);

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle('is-visible', entry.isIntersecting);
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -4% 0px'
  });

  revealTargets.forEach((element, index) => {
    element.classList.add('scroll-reveal');
    element.style.setProperty('--reveal-delay', `${(index % 5) * 65}ms`);
    revealObserver.observe(element);
  });
} else {
  revealTargets.forEach((element) => element.classList.add('is-visible'));
}

const profileCard = document.querySelector('.profile-card');
const profileVideos = {
  dark: profileCard.querySelector('.video-dark'),
  light: profileCard.querySelector('.video-light')
};

function getActiveVideo() {
  return document.body.classList.contains('light-mode') ? profileVideos.light : profileVideos.dark;
}

function pauseProfileVideos() {
  Object.values(profileVideos).forEach((video) => video.pause());
}

function playActiveVideo() {
  pauseProfileVideos();
  const video = getActiveVideo();
  video.currentTime = 0;
  video.play().catch(() => {});
}

profileCard.addEventListener('mouseenter', playActiveVideo);
profileCard.addEventListener('mouseleave', pauseProfileVideos);

const themeToggle = document.getElementById('themeToggle');
const toggleIcon = document.getElementById('toggleIcon');
let isLightTheme = document.body.classList.contains('light-mode');

function applyTheme(isLight) {
  isLightTheme = isLight;
  document.body.classList.toggle('light-mode', isLight);
  toggleIcon.textContent = isLight ? '☀️' : '🌙';
  themeToggle.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
  themeToggle.setAttribute('aria-pressed', String(isLight));

  if (profileCard.matches(':hover')) playActiveVideo();
}

applyTheme(document.body.classList.contains('light-mode'));

themeToggle.addEventListener('click', () => {
  const isLight = !isLightTheme;
  isLightTheme = isLight;
  const updateTheme = () => applyTheme(isLight);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!document.startViewTransition || prefersReducedMotion) {
    updateTheme();
    return;
  }

  const { left, top, width, height } = themeToggle.getBoundingClientRect();
  const x = left + width / 2;
  const y = top + height / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  const transition = document.startViewTransition(updateTheme);

  transition.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${radius}px at ${x}px ${y}px)`
        ]
      },
      {
        duration: 700,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)'
      }
    );
  });
});

document.getElementById('scrollUp').addEventListener('click', () => {
  window.scrollBy({ top: -window.innerHeight / 2, behavior: 'smooth' });
});

document.getElementById('scrollDown').addEventListener('click', () => {
  window.scrollBy({ top: window.innerHeight / 2, behavior: 'smooth' });
});

const GITHUB_USER = 'ur-raphaelsopoge';
const heatmapGrid = document.getElementById('heatmapGrid');
const heatmapScroll = document.getElementById('heatmapScroll');
const heatmapFallback = document.getElementById('heatmapFallback');
const contributionTotal = document.getElementById('contributionTotal');

async function loadContributions() {
  try {
    const response = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${GITHUB_USER}?y=last`
    );
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);

    const { contributions } = await response.json();
    if (
      !Array.isArray(contributions) ||
      contributions.length === 0 ||
      !contributions.every((day) =>
        Number.isInteger(day.count) &&
        day.count >= 0 &&
        Number.isInteger(day.level) &&
        day.level >= 0 &&
        day.level <= 4 &&
        typeof day.date === 'string' &&
        Number.isFinite(Date.parse(day.date))
      )
    ) {
      throw new Error('Invalid contributions response');
    }

    const total = contributions.reduce((sum, day) => sum + day.count, 0);
    const startOffset = new Date(contributions[0].date).getUTCDay();
    const cells = document.createDocumentFragment();
    for (let i = 0; i < startOffset; i++) {
      cells.appendChild(document.createElement('div'));
    }

    contributions.forEach((day) => {
      const cell = document.createElement('div');
      cell.className = `heatmap-cell level-${day.level}`;
      cell.title = `${day.count} contributions on ${day.date}`;
      cells.appendChild(cell);
    });

    heatmapGrid.replaceChildren(cells);
    contributionTotal.textContent = `${total} contributions in the last year`;
    heatmapScroll.scrollLeft = heatmapScroll.scrollWidth;
  } catch {
    heatmapGrid.classList.add('is-hidden');
    heatmapFallback.classList.add('is-visible');
    heatmapFallback.src = heatmapFallback.dataset.src;
    contributionTotal.textContent = 'Contribution totals are temporarily unavailable';
  }
}

heatmapFallback.addEventListener('error', () => {
  contributionTotal.textContent = 'Unable to load contributions. View the GitHub profile above.';
});

loadContributions();

let dragStartX = 0;
let dragStartScroll = 0;

heatmapScroll.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse') return;
  dragStartX = e.clientX;
  dragStartScroll = heatmapScroll.scrollLeft;
  heatmapScroll.classList.add('dragging');
  heatmapScroll.setPointerCapture(e.pointerId);
});

heatmapScroll.addEventListener('pointermove', (e) => {
  if (!heatmapScroll.classList.contains('dragging')) return;
  heatmapScroll.scrollLeft = dragStartScroll - (e.clientX - dragStartX);
});

['pointerup', 'pointercancel'].forEach((type) => {
  heatmapScroll.addEventListener(type, () => heatmapScroll.classList.remove('dragging'));
});

const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxClose = document.getElementById('lightboxClose');
let activeCertificate;

document.querySelectorAll('.cert-item').forEach((item) => {
  item.addEventListener('click', () => {
    activeCertificate = item;
    lightboxImage.src = item.dataset.image;
    lightboxImage.alt = item.dataset.title;
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    requestAnimationFrame(() => requestAnimationFrame(() => lightboxClose.focus()));
  });
});

function closeLightbox() {
  if (!lightbox.classList.contains('open')) return;

  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('lightbox-open');
  activeCertificate?.focus();
}

lightboxClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', (event) => {
  if (!lightbox.classList.contains('open')) return;

  if (event.key === 'Escape') {
    closeLightbox();
  } else if (event.key === 'Tab') {
    event.preventDefault();
    lightboxClose.focus();
  }
});