(() => {
  // Limite de mundo unico (P0-6): compacto = sangre completa + master 720x1280; amplio = apertura + HD.
  // Sincronizado con styles.css § "limite de mundo" y el media de los preload en index.html.
  const WORLD_COMPACT_MAX = 820;
  const compactWorld = window.matchMedia(`(max-width: ${WORLD_COMPACT_MAX}px)`);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Sistema de motion (P1-5): tiempos y umbrales viven UNA vez, en el :root de styles.css.
  // JS los lee, no los redeclara. El fallback cubre el caso de hoja no cargada, nada mas.
  const readToken = (name, fallback) => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const value = parseFloat(raw);
    return Number.isFinite(value) ? value : fallback;
  };
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  const shouldUseVideo = !reduceMotion && !saveData;
  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-nav]');

  document.documentElement.classList.add('js-ready');

  const closeMenu = () => {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
  };

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || toggle.getAttribute('aria-expanded') !== 'true') return;
      closeMenu();
      toggle.focus();
    });
  }

  const productWorld = document.querySelector('[data-product-world]');
  const productStage = document.querySelector('[data-product-stage]');
  const productVariants = [...document.querySelectorAll('[data-product-variant]')];
  const productSelectors = [...document.querySelectorAll('[data-product-select]')];
  const productCurrent = document.querySelector('[data-product-current]');
  const productLabel = document.querySelector('[data-product-label]');
  const productProgress = document.querySelector('[data-product-progress]');

  if (productWorld && productStage && productVariants.length === 2) {
    let productFramePending = false;
    let productActiveIndex = -1;
    // Timeline narrativa (P1-5): una sola definicion, en :root. Se relee en resize porque un
    // breakpoint puede recalibrar los umbrales igual que recalibra la escala tipografica.
    const th = {};
    const readThresholds = () => {
      th.switch = readToken('--th-switch', .58);
      th.ramp = readToken('--th-ramp', .3);
      th.seamIn = readToken('--th-seam-in', .48);
      th.seamBand = readToken('--th-seam-band', .1);
      th.seamFrom = readToken('--th-seam-from', .515);
      th.seamTo = readToken('--th-seam-to', .68);
      th.goto1 = readToken('--th-goto-1', .29);
      th.goto2 = readToken('--th-goto-2', .78);
    };
    readThresholds();
    const clampProduct = (value, min, max) => Math.min(max, Math.max(min, value));
    const smoothProduct = (value) => value * value * (3 - (2 * value));

    const setProductActive = (index) => {
      if (index === productActiveIndex) return;
      productActiveIndex = index;
      document.body.dataset.productVariant = index === 0 ? 'osobuco' : 'tres-quesos';
      productWorld.dataset.active = String(index);
      productVariants.forEach((variant, variantIndex) => variant.classList.toggle('is-active', variantIndex === index));
      productSelectors.forEach((selector, selectorIndex) => selector.setAttribute('aria-pressed', String(selectorIndex === index)));
      if (productCurrent) productCurrent.textContent = index === 0 ? '01' : '02';
      // Folio compartido con Eventos (P0-4): la etiqueta sale del titulo real de la variedad.
      if (productLabel) {
        const heading = productVariants[index].querySelector('h2');
        if (heading) productLabel.textContent = heading.textContent.trim();
      }
    };

    const updateProducts = () => {
      productFramePending = false;
      const range = Math.max(1, productWorld.offsetHeight - window.innerHeight);
      const rawProgress = clampProduct((window.scrollY - productWorld.offsetTop) / range, 0, 1);
      const state = smoothProduct(clampProduct((rawProgress - th.switch) / th.ramp, 0, 1));
      const seamIn = smoothProduct(clampProduct((rawProgress - th.seamIn) / th.seamBand, 0, 1));
      const seamOut = smoothProduct(clampProduct((rawProgress - th.switch) / th.seamBand, 0, 1));
      productStage.style.setProperty('--product-progress', rawProgress.toFixed(4));
      productStage.style.setProperty('--product-state', state.toFixed(4));
      productStage.style.setProperty('--seam-right', `${((1 - seamIn) * 100).toFixed(3)}%`);
      productStage.style.setProperty('--seam-left', `${(seamOut * 100).toFixed(3)}%`);
      const seamIsVisible = rawProgress >= th.seamFrom && rawProgress < th.seamTo;
      productWorld.classList.toggle('is-seaming', seamIsVisible);
      document.body.classList.toggle('is-product-seam', seamIsVisible);
      setProductActive(rawProgress >= th.switch ? 1 : 0);
      if (productProgress) productProgress.style.transform = `scaleX(${rawProgress.toFixed(4)})`;
      if (header) header.classList.toggle('is-scrolled', window.scrollY >= productWorld.offsetTop + productWorld.offsetHeight - window.innerHeight);
    };

    const requestProductUpdate = () => {
      if (productFramePending) return;
      productFramePending = true;
      window.requestAnimationFrame(updateProducts);
    };

    productSelectors.forEach((selector) => {
      selector.addEventListener('click', () => {
        const index = Number(selector.dataset.productSelect) || 0;
        const range = Math.max(1, productWorld.offsetHeight - window.innerHeight);
        const target = index === 0 ? th.goto1 : th.goto2;
        window.scrollTo({ top: productWorld.offsetTop + (range * target), behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    });

    setProductActive(0);
    updateProducts();
    window.addEventListener('scroll', requestProductUpdate, { passive: true });
    window.addEventListener('resize', () => { readThresholds(); requestProductUpdate(); }, { passive: true });
  }

  // Reveal unico (P0-4): antes habia dos observers identicos, uno por pagina, con umbrales
  // distintos (-10% en Eventos, -12% en Productos). Un solo disparador para las dos.
  const revealSections = [...document.querySelectorAll('[data-reveal]')];
  if (revealSections.length && !reduceMotion && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('reveal-ready');
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in-view');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '-10% 0px -10%', threshold: .08 });
    revealSections.forEach((section) => revealObserver.observe(section));
  } else {
    revealSections.forEach((section) => section.classList.add('is-in-view'));
  }

  const stockistMap = document.querySelector('[data-stockist-map]');
  const stockistMarkers = [...document.querySelectorAll('[data-stockist-marker]')];
  const stockistItems = [...document.querySelectorAll('[data-stockist-item]')];
  const stockistStatus = document.querySelector('[data-stockist-map-status]');

  if (stockistMap && stockistMarkers.length && stockistItems.length) {
    const stockistNames = {
      perales: 'Super Los Perales seleccionado.',
      polluk: 'Polluk seleccionado.',
      cordobes: 'Pronto Cucina seleccionado.',
    };
    // Resaltar y seleccionar son dos cosas distintas (P1-9). Recorrer con Tab o pasar el
    // mouse resalta: es una previsualizacion, no una eleccion. Solo el click elige, y solo
    // el click toca el estado que lee un lector de pantalla (aria-pressed y el aria-live).
    const highlightStockist = (id) => {
      stockistMarkers.forEach((marker) => {
        marker.classList.toggle('is-active', marker.dataset.stockistMarker === id);
      });
      stockistItems.forEach((item) => {
        item.classList.toggle('is-active', item.dataset.stockistItem === id);
      });
    };
    const selectStockist = (id) => {
      highlightStockist(id);
      stockistMarkers.forEach((marker) => {
        marker.setAttribute('aria-pressed', String(marker.dataset.stockistMarker === id));
      });
      stockistItems.forEach((item) => {
        const button = item.querySelector('[data-stockist-select]');
        if (button) button.setAttribute('aria-pressed', String(item.dataset.stockistItem === id));
      });
      if (stockistStatus) stockistStatus.textContent = stockistNames[id] || '';
    };

    stockistMarkers.forEach((marker) => {
      marker.addEventListener('click', () => selectStockist(marker.dataset.stockistMarker));
      marker.addEventListener('focus', () => highlightStockist(marker.dataset.stockistMarker));
    });
    stockistItems.forEach((item) => {
      const selector = item.querySelector('[data-stockist-select]');
      if (!selector) return;
      selector.addEventListener('click', () => selectStockist(selector.dataset.stockistSelect));
      selector.addEventListener('focus', () => highlightStockist(selector.dataset.stockistSelect));
      item.addEventListener('mouseenter', () => highlightStockist(item.dataset.stockistItem));
    });
  }

  const film = document.querySelector('[data-film]');
  const stage = document.querySelector('[data-stage]');
  const videos = [...document.querySelectorAll('[data-story-video]')];
  const steps = [...document.querySelectorAll('[data-story-step]')];
  const backdrops = [...document.querySelectorAll('[data-backdrop]')];
  const stills = [...document.querySelectorAll('[data-story-still]')];
  const coda = document.querySelector('[data-coda]');
  const label = document.querySelector('[data-scene-label]');
  const number = document.querySelector('[data-scene-number]');
  const folio = label ? label.closest('.folio') : null;
  const progress = document.querySelector('[data-progress]');
  const acto = document.querySelector('[data-acto]');
  const actoRail = document.querySelector('[data-acto-rail]');
  const actoLabel = document.querySelector('[data-acto-label]');
  const actoNumber = document.querySelector('[data-acto-number]');
  const actoProgress = document.querySelector('[data-acto-progress]');
  const actoCases = [...document.querySelectorAll('[data-case]')];
  const caseFrames = [...document.querySelectorAll('[data-case-frame]')];
  const caseBeats = [...document.querySelectorAll('[data-case-beat]')];
  const caseCaption = document.querySelector('[data-case-caption]');
  const canPlayVideo = Boolean(videos.length === 2 && videos[0].canPlayType('video/mp4; codecs="avc1.640028"'));

  if (!film || !stage || !steps.length) {
    if (header && !productWorld) header.classList.add('is-solid');
    return;
  }

  if (!shouldUseVideo || !canPlayVideo) document.documentElement.classList.add('video-fallback');

  const desktopStates = [
    { right: 14, left: 49, featherLeft: 15, featherRight: 12, scale: 1.02, x: 0, y: 0 },
    { right: 31, left: 31, featherLeft: 14, featherRight: 14, scale: 1.07, x: 0, y: -8 },
    { right: 49, left: 14, featherLeft: 12, featherRight: 14, scale: 1.05, x: -10, y: 0 },
    { right: 0, left: 0, featherLeft: 0, featherRight: 0, scale: 1.01, x: 0, y: 0 },
  ];

  const mobileStates = [
    { right: 0, left: 0, featherLeft: 0, featherRight: 0, scale: 1.03, x: 0, y: -4 },
    { right: 0, left: 0, featherLeft: 0, featherRight: 0, scale: 1.06, x: 0, y: -5 },
    { right: 0, left: 0, featherLeft: 0, featherRight: 0, scale: 1.05, x: -4, y: 0 },
    { right: 0, left: 0, featherLeft: 0, featherRight: 0, scale: 1.02, x: 0, y: 0 },
  ];

  let centers = [];
  let boundaries = [];
  let filmExitBoundary = 0;
  let folioBand = null;
  let folioObstaculos = [];
  let filmExit = false;
  let activeIndex = -1;
  let actoTop = 0;
  let actoHeight = 0;
  let caseCenters = [];
  let caseStart = 0;
  let beatCenters = [];
  let activeCase = -1;
  let activeBeat = 0;
  let framePending = false;
  let activeVideo = null;
  let mediaActivationToken = 0;
  let mediaLoadSequence = 0;
  let mediaPrimeSequence = 0;
  let mediaSettleTimer = 0;
  let mediaTransitioning = false;
  let filmVisible = true;
  let scrollDirection = 1;
  let lastCursor = 0;
  const MEDIA_CROSSFADE_MS = readToken('--d-scene', 900); // = var(--d-scene) de styles.css
  const FILM_EXIT_BAND = readToken('--film-exit-band', .28); // = var(--film-exit-band)
  const MEDIA_PREROLL_SECONDS = .12;
  const MEDIA_PREROLL_TIMEOUT_MS = 1400;
  const SCENE_HYSTERESIS = .03;
  const FOLIO_PAD = 28;  // 8 de aire + los 20px del reveal, que caen fuera de la caja del contenedor

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const mix = (start, end, amount) => start + (end - start) * amount;
  const smooth = (value) => value * value * (3 - 2 * value);
  const measure = () => {
    centers = steps.map((step) => step.offsetTop + (step.offsetHeight / 2));
    boundaries = centers.slice(0, -1).map((center, index) => (center + centers[index + 1]) / 2);
    // El mundo pasa a papel cuando las ultimas palabras del film salieron por arriba,
    // no cuando lo dice la altura de la coda: la que manda es la legibilidad, y una
    // altura en svh no sabe donde termina el texto.
    const ultimo = steps[steps.length - 1];
    const copia = ultimo ? ultimo.querySelector('.film-scene__copy') : null;
    const piso = copia ? copia.offsetTop + copia.offsetHeight : 0;
    // ...pero nunca despues de que el film empiece a soltarse: si el vuelco cae fuera de la
    // pista sticky, la coda nunca llega a verse en papel y el cambio pasa fuera de cuadro.
    const legible = ultimo ? ultimo.offsetTop + piso + (window.innerHeight * .5) : 0;
    const pista = film.offsetHeight - (window.innerHeight * .85);
    filmExitBoundary = coda && ultimo ? Math.min(legible, pista) : 0;
    if (folio) {
      // El folio vive en el stage sticky: su banda en viewport no cambia con el scroll.
      // Lo que cambia es que la copia pasa por debajo, y ahi las dos tipografias se ensucian.
      const marco = folio.getBoundingClientRect();
      folioBand = [marco.top - FOLIO_PAD, marco.bottom + FOLIO_PAD];
      // Por offsetTop y no por getBoundingClientRect: la escena inactiva esta corrida 20px
      // por su transform de reveal, y una banda medida con el transform puesto llega tarde.
      folioObstaculos = [...film.querySelectorAll('.film-scene__copy, .service-score, .scene-caption, .location-note')]
        .map((bloque) => {
          let alto = 0;
          for (let nodo = bloque; nodo; nodo = nodo.offsetParent) alto += nodo.offsetTop;
          return [alto, alto + bloque.offsetHeight];
        });
    }
    if (acto) {
      const actoRect = acto.getBoundingClientRect();
      actoTop = actoRect.top + window.scrollY;
      actoHeight = actoRect.height;
      caseCenters = actoCases.map((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top + window.scrollY + (rect.height / 2);
      });
      caseStart = actoCases.length ? actoCases[0].getBoundingClientRect().top + window.scrollY : 0;
      beatCenters = caseBeats.filter((beat) => beat.offsetHeight > 0).map((beat) => {
        const rect = beat.getBoundingClientRect();
        return rect.top + window.scrollY + (rect.height / 2);
      });
    }
  };

  const anchorNearest = (current, points, cursorAbs) => {
    if (!points.length) return -1;
    let nearest = 0;
    points.forEach((point, index) => {
      if (Math.abs(point - cursorAbs) < Math.abs(points[nearest] - cursorAbs)) nearest = index;
    });
    if (current < 0 || nearest === current) return nearest;
    const boundary = (points[current] + points[nearest]) / 2;
    const hysteresis = Math.min(window.innerHeight * .04, Math.abs(points[nearest] - points[current]) * SCENE_HYSTERESIS);
    return Math.abs(cursorAbs - boundary) >= hysteresis ? nearest : current;
  };

  const mediaSource = (index) => {
    const step = steps[index];
    if (!step) return '';
    return compactWorld.matches ? step.dataset.videoMobile : step.dataset.videoDesktop;
  };

  const layerForScene = (index) => videos.find((layer) => layer.dataset.sceneIndex === String(index) && layer.dataset.activeSource === mediaSource(index));

  const waitForPresentedFrame = (layer) => new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve();
    };
    const timeout = window.setTimeout(finish, 260);
    if ('requestVideoFrameCallback' in layer) layer.requestVideoFrameCallback(finish);
    else window.requestAnimationFrame(() => window.requestAnimationFrame(finish));
  });

  const loadMediaLayer = (layer, index) => {
    if (!layer || !steps[index]) return Promise.resolve(false);
    const source = mediaSource(index);
    if (layer.dataset.sceneIndex === String(index) && layer.dataset.activeSource === source && layer.readyState >= 2) return Promise.resolve(true);
    if (layer.dataset.sceneIndex === String(index) && layer.dataset.activeSource === source && layer.mediaLoadPromise) return layer.mediaLoadPromise;

    if (typeof layer.mediaLoadCancel === 'function') layer.mediaLoadCancel();
    if (typeof layer.mediaPrimeCancel === 'function') layer.mediaPrimeCancel();

    const loadToken = String(++mediaLoadSequence);
    layer.dataset.loadToken = loadToken;
    layer.dataset.sceneIndex = String(index);
    layer.dataset.activeSource = source;
    layer.poster = steps[index].dataset.poster || '';
    layer.preload = 'auto';
    layer.pause();
    delete layer.dataset.primedSource;
    delete layer.dataset.primedSceneIndex;
    layer.src = source;
    layer.mediaLoadPromise = new Promise((resolve) => {
      let settled = false;
      const finish = (ready) => {
        if (settled) return;
        settled = true;
        const isCurrentRequest = layer.dataset.loadToken === loadToken;
        layer.removeEventListener('loadeddata', onReady);
        layer.removeEventListener('error', onError);
        if (isCurrentRequest) {
          layer.mediaLoadPromise = null;
          layer.mediaLoadCancel = null;
        }
        resolve(ready && isCurrentRequest);
      };
      const onReady = () => finish(true);
      const onError = () => finish(false);
      layer.mediaLoadCancel = () => finish(false);
      layer.addEventListener('loadeddata', onReady, { once: true });
      layer.addEventListener('error', onError, { once: true });
    });
    layer.load();
    if (layer.readyState >= 2) queueMicrotask(() => layer.mediaLoadCancel ? layer.dispatchEvent(new Event('loadeddata')) : null);
    return layer.mediaLoadPromise;
  };

  const primeMediaLayer = (layer, index) => {
    if (!layer || !steps[index]) return Promise.resolve(false);
    const source = mediaSource(index);
    const alreadyPrimed = layer.dataset.primedSource === source
      && layer.dataset.primedSceneIndex === String(index)
      && layer.currentTime >= MEDIA_PREROLL_SECONDS * .85;
    if (alreadyPrimed) return Promise.resolve(true);
    if (layer.mediaPrimePromise) return layer.mediaPrimePromise;

    const primeToken = String(++mediaPrimeSequence);
    layer.dataset.primeToken = primeToken;
    layer.mediaPrimePromise = new Promise((resolve) => {
      let settled = false;
      let frame = 0;
      const isCurrentRequest = () => layer.dataset.primeToken === primeToken
        && layer.dataset.sceneIndex === String(index)
        && layer.dataset.activeSource === source;
      const finish = (primed) => {
        if (settled) return;
        settled = true;
        if (frame) window.cancelAnimationFrame(frame);
        window.clearTimeout(timeout);
        const currentRequest = isCurrentRequest();
        if (currentRequest && layer !== activeVideo) layer.pause();
        if (primed && currentRequest) {
          layer.dataset.primedSource = source;
          layer.dataset.primedSceneIndex = String(index);
        }
        if (currentRequest) {
          layer.mediaPrimePromise = null;
          layer.mediaPrimeCancel = null;
        }
        resolve(Boolean(primed && currentRequest));
      };
      const tick = () => {
        if (!isCurrentRequest()) {
          finish(false);
          return;
        }
        if (layer.currentTime >= MEDIA_PREROLL_SECONDS) {
          finish(true);
          return;
        }
        frame = window.requestAnimationFrame(tick);
      };
      const timeout = window.setTimeout(() => finish(false), MEDIA_PREROLL_TIMEOUT_MS);
      layer.mediaPrimeCancel = () => finish(false);
      layer.currentTime = .04;
      layer.play().then(() => tick()).catch(() => finish(false));
    });
    return layer.mediaPrimePromise;
  };

  const availableLayer = () => videos.find((layer) => layer !== activeVideo && !layer.mediaLoadPromise && layer.dataset.sceneIndex !== String(activeIndex)) || videos.find((layer) => layer !== activeVideo && !layer.mediaLoadPromise) || null;
  const reclaimableLayer = () => videos.find((layer) => layer !== activeVideo) || videos[0];

  const preloadScene = (index) => {
    if (!shouldUseVideo || !canPlayVideo || !steps[index] || layerForScene(index)) return;
    const target = availableLayer();
    if (!target || target.classList.contains('is-current')) return;
    loadMediaLayer(target, index)
      .then((ready) => ready ? primeMediaLayer(target, index) : false)
      .catch(() => {});
  };

  const scheduleMediaSettle = (index, activationToken) => {
    window.clearTimeout(mediaSettleTimer);
    mediaSettleTimer = window.setTimeout(() => {
      if (activationToken !== mediaActivationToken) return;
      videos.forEach((layer) => {
        if (layer !== activeVideo) layer.pause();
      });
      const directionalIndex = index + scrollDirection;
      const fallbackIndex = index - scrollDirection;
      preloadScene(steps[directionalIndex] ? directionalIndex : fallbackIndex);
    }, MEDIA_CROSSFADE_MS + 120);
  };

  const commitMediaLayer = (target, outgoing, index, activationToken) => {
    target.classList.add('is-current');
    if (outgoing) outgoing.classList.remove('is-current');
    activeVideo = target;
    mediaTransitioning = false;
    scheduleMediaSettle(index, activationToken);
  };

  const activateMedia = async (index) => {
    if (!shouldUseVideo || !canPlayVideo || !steps[index]) return;
    const activationToken = ++mediaActivationToken;
    const target = layerForScene(index) || availableLayer() || reclaimableLayer();
    if (target === activeVideo && target.dataset.activeSource === mediaSource(index) && target.readyState >= 2) {
      mediaTransitioning = false;
      if (target.paused && !document.hidden && filmVisible) target.play().catch(() => {});
      return;
    }
    mediaTransitioning = true;
    const ready = await loadMediaLayer(target, index);
    if (!ready || activationToken !== mediaActivationToken || activeIndex !== index) {
      if (activationToken === mediaActivationToken) mediaTransitioning = false;
      return;
    }
    const primed = await primeMediaLayer(target, index);
    if (activationToken !== mediaActivationToken || activeIndex !== index) {
      if (activationToken === mediaActivationToken) mediaTransitioning = false;
      return;
    }
    if (!primed) {
      // El preroll venció: mostrar la escena igual (poster/primer frame) en vez de dejar el plano anterior.
      target.play().catch(() => {});
      commitMediaLayer(target, activeVideo && activeVideo !== target ? activeVideo : null, index, activationToken);
      return;
    }

    const playing = await target.play().then(() => true).catch(() => false);
    if (!playing) {
      if (activationToken === mediaActivationToken) mediaTransitioning = false;
      return;
    }
    await waitForPresentedFrame(target);
    if (activationToken !== mediaActivationToken || activeIndex !== index) {
      target.pause();
      return;
    }

    const outgoing = activeVideo && activeVideo !== target ? activeVideo : null;
    commitMediaLayer(target, outgoing, index, activationToken);
  };

  const applyAperture = (fromIndex, toIndex, amount) => {
    const states = compactWorld.matches ? mobileStates : desktopStates;
    const from = states[fromIndex];
    const to = states[toIndex];
    const eased = smooth(amount);
    stage.style.setProperty('--ap-r', `${mix(from.right, to.right, eased).toFixed(3)}%`);
    stage.style.setProperty('--ap-l', `${mix(from.left, to.left, eased).toFixed(3)}%`);
    stage.style.setProperty('--ap-feather-l', `${mix(from.featherLeft, to.featherLeft, eased).toFixed(3)}%`);
    stage.style.setProperty('--ap-feather-r', `${mix(from.featherRight, to.featherRight, eased).toFixed(3)}%`);
    stage.style.setProperty('--media-scale', mix(from.scale, to.scale, eased).toFixed(4));
    stage.style.setProperty('--media-x', `${mix(from.x, to.x, eased).toFixed(2)}px`);
    stage.style.setProperty('--media-y', `${mix(from.y, to.y, eased).toFixed(2)}px`);
  };

  const setScene = (index, force = false) => {
    if (!steps[index] || (!force && index === activeIndex)) return;
    activeIndex = index;
    document.body.dataset.scene = String(index);
    steps.forEach((step, stepIndex) => step.classList.toggle('is-active', stepIndex === index));
    backdrops.forEach((backdrop, backdropIndex) => backdrop.classList.toggle('is-active', backdropIndex === index));
    stills.forEach((still, stillIndex) => still.classList.toggle('is-active', stillIndex === index));
    if (label) label.textContent = steps[index].dataset.sceneLabel || '';
    if (number) number.textContent = String(index + 1).padStart(2, '0');

    activateMedia(index).catch(() => document.documentElement.classList.add('video-fallback'));
  };

  const anchoredScene = (cursor, fromIndex, toIndex, amount) => {
    const nearest = amount >= .5 ? toIndex : fromIndex;
    if (activeIndex < 0 || fromIndex === toIndex) return nearest;
    if (activeIndex < fromIndex || activeIndex > toIndex) return nearest;
    const gap = Math.max(1, centers[toIndex] - centers[fromIndex]);
    const boundary = boundaries[fromIndex];
    const hysteresis = Math.min(window.innerHeight * .04, gap * SCENE_HYSTERESIS);
    if (activeIndex === fromIndex && cursor >= boundary + hysteresis) return toIndex;
    if (activeIndex === toIndex && cursor <= boundary - hysteresis) return fromIndex;
    return activeIndex;
  };

  const update = () => {
    framePending = false;
    if (!centers.length) measure();
    const cursor = window.scrollY + (window.innerHeight * .5) - film.offsetTop;
    if (cursor !== lastCursor) scrollDirection = cursor > lastCursor ? 1 : -1;
    lastCursor = cursor;
    let fromIndex = 0;
    let toIndex = 0;
    let amount = 0;

    if (cursor >= centers[centers.length - 1]) {
      fromIndex = centers.length - 1;
      toIndex = fromIndex;
    } else if (cursor > centers[0]) {
      for (let index = 0; index < centers.length - 1; index += 1) {
        if (cursor >= centers[index] && cursor < centers[index + 1]) {
          fromIndex = index;
          toIndex = index + 1;
          amount = clamp((cursor - centers[index]) / (centers[index + 1] - centers[index]), 0, 1);
          break;
        }
      }
    }

    const anchored = anchoredScene(cursor, fromIndex, toIndex, amount);
    setScene(anchored);

    if (filmExitBoundary) {
      // El mundo pasaba a papel de un cuadro al otro: 99.4% de la pantalla repintada,
      // 181.8 de delta contra 5.57 de mediana. El mismo cruce ahora publica una rampa
      // scrubbeada por scroll; el atributo sigue volcando en el borde de siempre, asi
      // que el clima, el header y la salida de la copia no cambian de momento.
      const exitBand = window.innerHeight * FILM_EXIT_BAND;
      const exitRamp = reduceMotion
        ? (cursor >= filmExitBoundary ? 1 : 0)
        : smooth(clamp((cursor - (filmExitBoundary - exitBand)) / (exitBand * 2), 0, 1));
      // Se publica en .film y no en .film-stage: .film-track es HERMANO del stage, no
      // descendiente, asi que ahi la propiedad no le llegaba a la copia. Las custom
      // properties heredan, de modo que el stage y sus capas la siguen leyendo igual.
      film.style.setProperty('--film-exit', exitRamp.toFixed(4));
      const exitHysteresis = window.innerHeight * .04;
      filmExit = filmExit ? cursor > filmExitBoundary - exitHysteresis : cursor >= filmExitBoundary + exitHysteresis;
      const sceneAttr = filmExit ? '4' : String(activeIndex);
      if (document.body.dataset.scene !== sceneAttr) document.body.dataset.scene = sceneAttr;
    }
    const adjacent = scrollDirection > 0 ? toIndex : fromIndex;
    if (adjacent !== anchored && amount > .02 && amount < .98) preloadScene(adjacent);
    applyAperture(reduceMotion ? anchored : fromIndex, reduceMotion ? anchored : toIndex, reduceMotion ? 0 : amount);

    if (progress) {
      const start = centers[0] - (window.innerHeight * .5);
      const end = centers[centers.length - 1] + (window.innerHeight * .5);
      progress.style.transform = `scaleX(${clamp((cursor - start) / (end - start), 0, 1)})`;
    }

    if (acto) {
      const pageCursor = window.scrollY + (window.innerHeight * .5);
      if (actoRail) actoRail.classList.toggle('is-live', window.scrollY >= actoTop - 2 && pageCursor < actoTop + actoHeight);
      if (actoProgress) actoProgress.style.transform = `scaleX(${clamp((window.scrollY - actoTop) / Math.max(1, actoHeight - window.innerHeight), 0, 1)})`;
      if (caseCenters.length && pageCursor >= caseStart) {
        const nextCase = anchorNearest(activeCase, caseCenters, pageCursor);
        if (nextCase !== activeCase && nextCase >= 0) {
          activeCase = nextCase;
          if (actoLabel) actoLabel.textContent = actoCases[activeCase].dataset.caseLabel || 'Casos';
          if (actoNumber) actoNumber.textContent = String(activeCase + 1).padStart(2, '0');
        }
      } else if (activeCase !== -1 && pageCursor < caseStart) {
        activeCase = -1;
        if (actoLabel) actoLabel.textContent = 'Casos';
        if (actoNumber) actoNumber.textContent = '01';
      }
      if (beatCenters.length && caseFrames.length) {
        const nextBeat = anchorNearest(activeBeat, beatCenters, pageCursor);
        if (nextBeat !== activeBeat && nextBeat >= 0) {
          activeBeat = nextBeat;
          caseFrames.forEach((frame, frameIndex) => frame.classList.toggle('is-active', frameIndex === activeBeat));
          if (caseCaption) caseCaption.textContent = caseBeats[activeBeat].dataset.caption || '';
        }
      }
    }
    if (folio && folioBand) {
      const desde = folioBand[0] + window.scrollY;
      const hasta = folioBand[1] + window.scrollY;
      folio.classList.toggle('is-shy', folioObstaculos.some(([alto, bajo]) => bajo > desde && alto < hasta));
    }
    if (header) {
      header.classList.toggle('is-scrolled', window.scrollY > 20);
      header.classList.toggle('is-solid', window.scrollY >= film.offsetTop + film.offsetHeight - (window.innerHeight * .14));
    }
  };

  const requestUpdate = () => {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(update);
  };

  if (videos.length && shouldUseVideo && canPlayVideo) {
    videos.forEach((layer) => {
      layer.loop = true;
      layer.addEventListener('error', () => {
        if (layer === activeVideo) document.documentElement.classList.add('video-fallback');
      });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        videos.forEach((layer) => layer.pause());
      } else if (filmVisible && activeVideo) {
        activeVideo.play().catch(() => {});
      }
    });
    if ('IntersectionObserver' in window) {
      const filmVisibilityObserver = new IntersectionObserver(([entry]) => {
        filmVisible = entry.isIntersecting;
        if (!filmVisible) {
          videos.forEach((layer) => layer.pause());
        } else if (!document.hidden && activeVideo) {
          activeVideo.play().catch(() => {});
        }
      }, { rootMargin: '80px 0px', threshold: 0 });
      filmVisibilityObserver.observe(film);
    }
  } else {
    videos.forEach((layer) => {
      layer.pause();
      layer.removeAttribute('src');
    });
  }

  setScene(0, true);
  preloadScene(1);
  measure();
  update();
  window.addEventListener('scroll', requestUpdate, { passive: true });
  // El master solo se recarga cuando el mundo cambia de lado, no en cada resize (evita la doble descarga).
  let compactNow = compactWorld.matches;
  window.addEventListener('resize', () => {
    measure();
    requestUpdate();
    if (compactWorld.matches === compactNow) return;
    compactNow = compactWorld.matches;
    if (activeIndex >= 0 && shouldUseVideo && canPlayVideo) activateMedia(activeIndex).catch(() => {});
  }, { passive: true });
  window.addEventListener('load', () => {
    measure();
    requestUpdate();
  }, { once: true });
})();
