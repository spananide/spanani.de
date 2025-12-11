// assets/js/addons.js – ganz kleine, feine Extras

// 1. Subtile Cursor-Animation (nur ein kleiner Glüh-Punkt)
document.addEventListener('mousemove', e => {
    const cursor = document.getElementById('custom-cursor');
    cursor.style.transform = `translate(${e.clientX - 8}px, ${e.clientY - 8}px)`;
});

// 2. Leichter Text-Scroll-Effekt für den Untertitel (nur beim ersten Laden)
const subtitle = document.querySelector('#header p');
if (subtitle) {
    subtitle.style.opacity = '0';
    subtitle.style.transform = 'translateY(20px)';
    setTimeout(() => {
        subtitle.style.transition = 'opacity 1.8s ease, transform 1.8s ease';
        subtitle.style.opacity = '0.85';
        subtitle.style.transform = 'translateY(0)';
    }, 600);
}

// 3. Footer © Jahr immer aktuell
document.querySelectorAll('#footer, .footer').forEach(el => {
    el.innerHTML = `© ${new Date().getFullYear()} Spanani`;
});