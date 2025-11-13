(() => {
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

  // ===== Carrusel por páginas =====
  $$('.platform-col').forEach(col => {
    const pool = $$('.review-card', col);
    if (!pool.length) return;

    const PAGE = 6;
    const pages = Math.ceil(pool.length / PAGE);
    let p = 0, timer = null;
    const dots = $('.dots', col);

    const render = () => {
      pool.forEach((el, i) => {
        const show = (i >= p*PAGE) && (i < (p+1)*PAGE);
        el.hidden = !show;
      });
      if (dots) $$('.dot', dots).forEach((d, i) => d.classList.toggle('is-active', i === p));
    };

    // Dots = páginas
    if (dots) {
      for (let i=0;i<pages;i++){
        const b = document.createElement('button');
        b.className = 'dot';
        b.setAttribute('aria-label', `Ir a página ${i+1}`);
        b.addEventListener('click', () => { p = i; reset(); render(); });
        dots.appendChild(b);
      }
    }

    const next = () => { p = (p+1) % pages; render(); };
    const prev = () => { p = (p-1+pages) % pages; render(); };
    $('.next', col)?.addEventListener('click', () => { next(); reset(); });
    $('.prev', col)?.addEventListener('click', () => { prev(); reset(); });

    // Autoplay + pausa
    const delay = parseInt(col.dataset.autoplay||'0',10);
    const shouldPause = col.dataset.pause === 'true';
    const start = () => { if (delay>0) timer = setInterval(next, delay); };
    const stop  = () => { if (timer) clearInterval(timer); timer = null; };
    const reset = () => { stop(); start(); };
    if (shouldPause) { col.addEventListener('mouseenter', stop); col.addEventListener('mouseleave', start); }

    // Toggle traducción/original por tarjeta (igual que tenías)
    pool.forEach(sl => {
      const btn = $('.toggle-trans', sl);
      if (!btn) return;
      btn.addEventListener('click', () => {
        const tr = $('.rev-text.tr', sl);
        const orig = $('.rev-text.orig', sl);
        if (!tr || !orig) return;
        const showingOrig = !orig.hasAttribute('hidden');
        if (showingOrig) {
          orig.hidden = true; tr.hidden = false; btn.textContent = btn.dataset.on;
        } else {
          tr.hidden = true; orig.hidden = false; btn.textContent = btn.dataset.off;
        }
      });
    });

    render(); start();
  });

  // ===== Modal =====
  const modal = $('#reviewsModal');
  if (!modal) return;
  const openBtn = $('#open-all-reviews');
  const closeBtn = $('.rev-modal-close', modal);
  const list = $('.drawer-list', modal);

  const renderItem = (node) => {
    const stars = parseInt(node.dataset.stars||'0',10);
    const author = $('strong', node)?.textContent || 'Anónimo';
    const time = $('time', node)?.textContent || '';
    const tr = $('.rev-text.tr', node);
    const orig = $('.rev-text.orig', node);
    const text = tr && !tr.hasAttribute('hidden') ? tr.textContent : (orig && !orig.hasAttribute('hidden') ? orig.textContent : ($('.rev-text', node)?.textContent || ''));

    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.stars = stars;
    card.innerHTML = `
      <header style="display:flex;justify-content:space-between;align-items:center;gap:.5rem">
        <strong>${author}</strong>
        <div class="review-stars">${Array.from({length:5},(_,i)=>`<span class="${i<stars?'':'empty'}">★</span>`).join('')}</div>
      </header>
      ${time ? `<time style="color:#6b7280;font-size:.9rem">${time}</time>` : ''}
      <p style="margin:.3rem 0 0;line-height:1.55">${text}</p>
    `;
    return card;
  };

  const populate = () => {
    list.innerHTML = '';
    document.querySelectorAll('.platform-col .review-card').forEach(rc => list.appendChild(renderItem(rc)));
  };

  // Filtros por estrellas
  $$('.drawer-filters .chip', modal).forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.drawer-filters .chip', modal).forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const f = btn.dataset.filter;
      $$('.drawer-list .card', modal).forEach(c => {
        const s = parseInt(c.dataset.stars||'0',10);
        c.hidden = (f!=='all' && s !== parseInt(f,10));
      });
    });
  });

  openBtn?.addEventListener('click', () => { populate(); modal.hidden = false; modal.focus(); });
  closeBtn?.addEventListener('click', () => { modal.hidden = true; });
  modal?.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });
    // Cerrar con ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.hidden) {
      e.stopPropagation();
      e.preventDefault();
      modal.hidden = true;
    }
  });
})();
