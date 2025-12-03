// Leichter Maus-Parallax-Effekt für die Cards
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.transform = `perspective(1000px) rotateY(${(x/rect.width - 0.5)*10}deg) rotateX(${-(y/rect.height - 0.5)*10}deg)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(1000px) rotateY(0) rotateX(0)';
  });
});