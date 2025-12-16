(() => {
  const ensureInlineAutoplay = () => {
    const videos = document.querySelectorAll('video');
    const forcePlay = () => {
      videos.forEach((video) => {
        video.muted = true;
        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        if (!video.autoplay) video.autoplay = true;
        if (!video.loop) video.loop = true;
        video.play?.().catch(() => {});
      });
    };

    forcePlay();
    ['touchstart', 'click'].forEach((evt) => {
      document.addEventListener(evt, forcePlay, { passive: true });
    });
  };

  const createNavButton = (type, root) => {
    const btn = document.createElement('button');
    btn.className = `nav ${type}`;
    btn.type = 'button';
    btn.setAttribute('aria-label', type === 'prev' ? '이전 슬라이드' : '다음 슬라이드');
    btn.innerHTML = '';
    root.appendChild(btn);
    return btn;
  };

  const initCarousel = (root, options = {}) => {
    if (!root || root.dataset.carouselInit === 'true') return;

    const slidesWrap = root.querySelector('.slides');
    const originalSlides = Array.from(root.querySelectorAll('.slide'));
    const prevBtn = root.querySelector('.nav.prev') || createNavButton('prev', root);
    const nextBtn = root.querySelector('.nav.next') || createNavButton('next', root);

    if (!slidesWrap || !originalSlides.length) return;
    root.dataset.carouselInit = 'true';

    // 앞뒤 클론 추가로 부드러운 무한 순환
    const firstClone = originalSlides[0].cloneNode(true);
    const lastClone = originalSlides[originalSlides.length - 1].cloneNode(true);
    slidesWrap.insertBefore(lastClone, originalSlides[0]);
    slidesWrap.appendChild(firstClone);
    const slideEls = Array.from(slidesWrap.querySelectorAll('.slide'));

    const interval = Number(root.dataset.interval) || options.interval || 5000;
    const threshold = Number(root.dataset.threshold) || options.threshold || 60;

    const gap = () => {
      const style = getComputedStyle(slidesWrap);
      return parseFloat(style.columnGap || style.gap || 0);
    };
    const slideSize = () => slideEls[0].getBoundingClientRect().width;
    const centerOffset = () => (root.clientWidth - slideSize()) / 2;

    let activeIndex = 1; // 클론 앞에 위치한 실제 첫 슬라이드
    let timer = null;
    let isDragging = false;
    let startX = 0;
    let currentX = 0;

    const setTransform = (offset) => {
      slidesWrap.style.transform = `translateX(${offset}px)`;
    };

    const restartAuto = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(next, interval);
    };

    const goTo = (nextIndex, { restart = true, animate = true } = {}) => {
      const maxIndex = slideEls.length - 1;
      activeIndex = Math.max(0, Math.min(nextIndex, maxIndex));
      const offset = -(slideSize() + gap()) * activeIndex + centerOffset();
      slidesWrap.classList.remove('dragging');
      if (!animate) {
        const prevTransition = slidesWrap.style.transition;
        slidesWrap.style.transition = 'none';
        setTransform(offset);
        // 강제 리플로우로 transition 리셋
        void slidesWrap.offsetHeight;
        slidesWrap.style.transition = prevTransition;
      } else {
        setTransform(offset);
      }
      if (restart) restartAuto();
    };

    const next = () => goTo(activeIndex + 1);
    const prev = () => goTo(activeIndex - 1);

    const stopAuto = () => {
      if (timer) clearInterval(timer);
    };

    const onDragStart = (clientX) => {
      isDragging = true;
      startX = clientX;
      currentX = clientX;
      slidesWrap.classList.add('dragging');
      stopAuto();
    };

    const onDragMove = (clientX) => {
      if (!isDragging) return;
      currentX = clientX;
      const diff = currentX - startX;
      const baseOffset = -(slideSize() + gap()) * activeIndex + centerOffset();
      setTransform(baseOffset + diff);
    };

    const onDragEnd = () => {
      if (!isDragging) return;
      const diff = currentX - startX;
      isDragging = false;
      slidesWrap.classList.remove('dragging');

      if (Math.abs(diff) > threshold) {
        diff < 0 ? next() : prev();
      } else {
        goTo(activeIndex, { restart: false });
        restartAuto();
      }
    };

    // 끝에서 처음으로(또는 처음에서 끝으로) 자연스럽게 점프
    slidesWrap.addEventListener('transitionend', () => {
      const lastRealIndex = slideEls.length - 2; // 마지막 실제 슬라이드 인덱스
      if (activeIndex === slideEls.length - 1) {
        goTo(1, { restart: false, animate: false });
        restartAuto();
      } else if (activeIndex === 0) {
        goTo(lastRealIndex, { restart: false, animate: false });
        restartAuto();
      }
    });

    // mouse
    slidesWrap.addEventListener('mousedown', (e) => onDragStart(e.clientX));
    window.addEventListener('mousemove', (e) => onDragMove(e.clientX));
    window.addEventListener('mouseup', onDragEnd);

    // touch
    slidesWrap.addEventListener('touchstart', (e) => onDragStart(e.touches[0].clientX), { passive: true });
    window.addEventListener('touchmove', (e) => onDragMove(e.touches[0].clientX), { passive: true });
    window.addEventListener('touchend', onDragEnd);

    // nav buttons
    prevBtn?.addEventListener('click', () => {
      stopAuto();
      prev();
    });
    nextBtn?.addEventListener('click', () => {
      stopAuto();
      next();
    });

    // resize recalculation
    window.addEventListener('resize', () => goTo(activeIndex, { restart: false }));

    goTo(1, { restart: false, animate: false });
    restartAuto();
  };

  const initAll = () => {
    ensureInlineAutoplay();
    document.querySelectorAll('[data-carousel]').forEach((el) => initCarousel(el));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();

