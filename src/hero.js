// Rotating subtitle: "Somewhere to give directions by / meet at / come home to"
export function startSubtitle(el, interval = 2800) {
  if (!el) return;
  const words = el.dataset.rotate.split('|');
  let i = 0;
  el.textContent = words[0];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  setInterval(() => {
    el.classList.add('is-out');
    setTimeout(() => {
      i = (i + 1) % words.length;
      el.textContent = words[i];
      el.classList.remove('is-out');
    }, 450);
  }, interval);
}
