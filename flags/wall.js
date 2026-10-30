export function render(root, ctx) {
  root.innerHTML = `
    <div class="screen-stub">
      <header class="quiz-top-bar">
        <button class="btn-icon" id="stub-back" aria-label="${ctx.t('back')}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div class="quiz-top-center">${ctx.t('mode_wall')}</div>
        <div style="width: 44px;"></div>
      </header>
      <div class="stub-body">
        <p class="stub-msg">${ctx.t('coming_soon')}</p>
        <button class="btn btn-primary" id="stub-home">${ctx.t('back_to_home')}</button>
      </div>
    </div>
  `;

  const goHome = () => ctx.go('home');
  const backBtn = root.querySelector('#stub-back');
  const homeBtn = root.querySelector('#stub-home');

  backBtn?.addEventListener('click', goHome);
  homeBtn?.addEventListener('click', goHome);

  return function cleanup() {
    backBtn?.removeEventListener('click', goHome);
    homeBtn?.removeEventListener('click', goHome);
  };
}
