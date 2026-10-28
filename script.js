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

function applyTheme() {
  const isLight = document.body.classList.toggle('light-mode');
  toggleIcon.textContent = isLight ? '☀️' : '🌙';

  if (profileCard.matches(':hover')) playActiveVideo();
}

themeToggle.addEventListener('click', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!document.startViewTransition || prefersReducedMotion) {
    applyTheme();
    return;
  }

  const { left, top, width, height } = themeToggle.getBoundingClientRect();
  const x = left + width / 2;
  const y = top + height / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  const transition = document.startViewTransition(applyTheme);

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
const contributionTotal = document.getElementById('contributionTotal');

async function loadContributions() {
  try {
    const response = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${GITHUB_USER}?y=last`
    );
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);

    const { contributions } = await response.json();
    const total = contributions.reduce((sum, day) => sum + day.count, 0);
    contributionTotal.textContent = `${total} contributions in the last year`;

    const startOffset = new Date(contributions[0].date).getUTCDay();
    for (let i = 0; i < startOffset; i++) {
      heatmapGrid.appendChild(document.createElement('div'));
    }

    contributions.forEach((day) => {
      const cell = document.createElement('div');
      cell.className = `heatmap-cell level-${day.level}`;
      cell.title = `${day.count} contributions on ${day.date}`;
      heatmapGrid.appendChild(cell);
    });

    heatmapScroll.scrollLeft = heatmapScroll.scrollWidth;
  } catch (error) {
    contributionTotal.textContent = 'Unable to load contributions right now';
  }
}

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

document.querySelectorAll('.cert-item').forEach((item) => {
  item.addEventListener('click', () => {
    lightboxImage.src = item.dataset.image;
    lightboxImage.alt = item.dataset.title;
    lightbox.classList.add('open');
  });
});

lightbox.addEventListener('click', () => lightbox.classList.remove('open'));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') lightbox.classList.remove('open');
});