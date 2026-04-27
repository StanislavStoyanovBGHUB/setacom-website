document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrollTrigger);
    initLoader();
});

/* ─── LOADER ─── */
function initLoader() {
    const bar    = document.getElementById('loader-bar');
    const status = document.getElementById('loader-status');
    const loader = document.getElementById('loader');
    const steps  = [
        [20,  'ЗАРЕЖДАНЕ НА ШРИФТОВЕ...'],
        [45,  'ИНИЦИАЛИЗАЦИЯ НА СИСТЕМАТА...'],
        [70,  'КОНФИГУРИРАНЕ НА ПАРАМЕТРИ...'],
        [90,  'ПРОВЕРКА НА ДОПУСКИ...'],
        [100, 'SYS.READY'],
    ];
    let i = 0;
    const iv = setInterval(() => {
        if (i >= steps.length) {
            clearInterval(iv);
            gsap.to(loader, {
                opacity: 0, duration: 0.55, delay: 0.25,
                onComplete: () => { loader.style.display = 'none'; initAll(); }
            });
            return;
        }
        bar.style.width = steps[i][0] + '%';
        status.textContent = steps[i][1];
        i++;
    }, 280);
}

/* ─── INIT ALL ─── */
function initAll() {
    initLenis();
    initCursor();
    initHeroThree();
    initAboutThree();
    initHeroAnims();
    initCoords();
    initScrollAnims();
    initCounters();
    initNav();
    initMobileMenu();
    initProjectModal();
    initVideoScrub();
    initContactForm();
    initScrollTop();
}

/* ─── LENIS (smooth scroll) ─── */
function initLenis() {
    if (typeof Lenis === 'undefined') return;
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window._lenis = lenis;
}

/* ─── CURSOR — uses rAF, not gsap.ticker to avoid main-thread contention ─── */
function initCursor() {
    const el  = document.getElementById('cursor');
    const ring = el?.querySelector('.cursor-ring');
    const dot  = el?.querySelector('.cursor-dot');
    if (!el) return;

    let mx = -200, my = -200;
    let rx = -200, ry = -200;

    // raw mousemove — no interpolation on dot
    window.addEventListener('mousemove', e => {
        mx = e.clientX; my = e.clientY;
        dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
    }, { passive: true });

    // ring follows with lerp via rAF
    function tick() {
        rx += (mx - rx) * 0.1;
        ry += (my - ry) * 0.1;
        ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
        requestAnimationFrame(tick);
    }
    tick();

    // hover states via CSS class
    document.querySelectorAll('a, button').forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'), { passive: true });
        el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'), { passive: true });
    });
}

/* ─── THREE.JS HERO ─── */
function initHeroThree() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    const scene  = new THREE.Scene();

    let W = canvas.offsetWidth, H = canvas.offsetHeight;
    renderer.setSize(W, H);

    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 100);
    camera.position.set(0, 1.5, 7);
    camera.lookAt(0, 0, 0);

    /* grid floor */
    const grid = new THREE.GridHelper(30, 30, 0x1a2d50, 0x111a2d);
    grid.position.y = -3.5;
    scene.add(grid);

    /* rotating wireframe cylinder — "aluminum stock" */
    const cylGeo  = new THREE.CylinderGeometry(1.1, 1.1, 2.8, 36, 1, true);
    const wireGeo = new THREE.WireframeGeometry(cylGeo);
    const wireMat = new THREE.LineBasicMaterial({ color: 0x2d5fa0, transparent: true, opacity: 0.35 });
    const cyl = new THREE.LineSegments(wireGeo, wireMat);
    cyl.position.set(3.2, 0.2, -1.5);
    scene.add(cyl);

    /* machined ring details */
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x5B8FD4, transparent: true, opacity: 0.45, wireframe: false });
    const addRing = (y) => {
        const r = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.025, 8, 48), ringMat.clone());
        r.position.set(3.2, y, -1.5);
        r.rotation.x = Math.PI / 2;
        scene.add(r);
        return r;
    };
    const ring1 = addRing(0.9);
    const ring2 = addRing(-0.9);

    /* icosahedron — blueprint shape in background */
    const icoGeo = new THREE.IcosahedronGeometry(1.6, 1);
    const icoMat = new THREE.MeshBasicMaterial({ color: 0x1a3555, wireframe: true, transparent: true, opacity: 0.25 });
    const ico = new THREE.Mesh(icoGeo, icoMat);
    ico.position.set(-3.5, 0.5, -2);
    scene.add(ico);

    /* floating particles */
    const COUNT = 180;
    const pos   = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
        pos[i * 3]     = (Math.random() - 0.5) * 18;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
    }
    const ptGeo = new THREE.BufferGeometry();
    ptGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const ptMat = new THREE.PointsMaterial({ color: 0x2d5080, size: 0.045, transparent: true, opacity: 0.75 });
    const pts = new THREE.Points(ptGeo, ptMat);
    scene.add(pts);

    /* resize */
    window.addEventListener('resize', () => {
        W = canvas.offsetWidth; H = canvas.offsetHeight;
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
        renderer.setSize(W, H);
    }, { passive: true });

    /* throttled render loop — 30 fps cap to save main thread */
    let last = 0;
    const INTERVAL = 1000 / 30;
    function animate(now) {
        requestAnimationFrame(animate);
        if (now - last < INTERVAL) return;
        last = now;

        cyl.rotation.y  += 0.008;
        cyl.rotation.x  += 0.002;
        ring1.rotation.z += 0.012;
        ring2.rotation.z -= 0.012;
        ico.rotation.x  += 0.004;
        ico.rotation.y  += 0.006;
        pts.rotation.y  += 0.0008;

        renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
}

/* ─── THREE.JS ABOUT PANEL ─── */
function initAboutThree() {
    const canvas = document.getElementById('about-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    let W = canvas.offsetWidth, H = canvas.offsetHeight;
    renderer.setSize(W, H);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 0, 5.5);

    /* machined block */
    const boxGeo  = new THREE.BoxGeometry(2.4, 2.4, 2.4);
    const boxWire = new THREE.WireframeGeometry(boxGeo);
    const boxMat  = new THREE.LineBasicMaterial({ color: 0x2d5fa0, transparent: true, opacity: 0.3 });
    const box     = new THREE.LineSegments(boxWire, boxMat);
    scene.add(box);

    /* face highlights */
    const edgeMat  = new THREE.LineBasicMaterial({ color: 0x5B8FD4, transparent: true, opacity: 0.6 });
    const edges    = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), edgeMat);
    scene.add(edges);

    /* inner detail ring */
    const innerRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.7, 0.03, 8, 40),
        new THREE.MeshBasicMaterial({ color: 0x5B8FD4, transparent: true, opacity: 0.5 })
    );
    scene.add(innerRing);

    window.addEventListener('resize', () => {
        W = canvas.offsetWidth; H = canvas.offsetHeight;
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
        renderer.setSize(W, H);
    }, { passive: true });

    let last = 0;
    const INTERVAL = 1000 / 30;
    function animate(now) {
        requestAnimationFrame(animate);
        if (now - last < INTERVAL) return;
        last = now;
        box.rotation.x      += 0.005;
        box.rotation.y      += 0.008;
        edges.rotation.x     = box.rotation.x;
        edges.rotation.y     = box.rotation.y;
        innerRing.rotation.x += 0.01;
        innerRing.rotation.y += 0.007;
        renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
}

/* ─── HERO GSAP ANIMS ─── */
function initHeroAnims() {
    gsap.timeline({ delay: 0.15 })
        .to('.hero-eyebrow', { opacity: 1, duration: 0.8, ease: 'power2.out' })
        .to('.title-line',   { opacity: 1, y: 0, duration: 0.85, stagger: 0.14, ease: 'power3.out' }, '-=0.3')
        .to('#hero-sub',     { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, '-=0.35')
        .to(['#hero-meta','#hero-scroll'], { opacity: 1, duration: 0.6, stagger: 0.12, ease: 'power2.out' }, '-=0.25');
}

/* ─── CYCLING COORDS ─── */
function initCoords() {
    const cx = document.getElementById('cx');
    const cy = document.getElementById('cy');
    const cz = document.getElementById('cz');
    if (!cx) return;
    const r = (a, b) => (a + Math.random() * (b - a)).toFixed(3);
    setInterval(() => {
        cx.textContent = r(-300, 300);
        cy.textContent = r(-200, 200);
        cz.textContent = r(-80, 0);
    }, 1900);
}

/* ─── SCROLL ANIMATIONS ─── */
function initScrollAnims() {
    const ease = 'power2.out';

    gsap.from('.intro-text', {
        scrollTrigger: { trigger: '#intro', start: 'top 80%' },
        opacity: 0, y: 30, duration: 1, ease
    });

    gsap.from('.work-card', {
        scrollTrigger: { trigger: '#work', start: 'top 78%' },
        opacity: 0, y: 40, duration: 0.75, stagger: { amount: 0.55 }, ease
    });

    gsap.from('.service-item', {
        scrollTrigger: { trigger: '#services', start: 'top 78%' },
        opacity: 0, y: 30, duration: 0.7, stagger: 0.15, ease
    });

    gsap.from(['.process-title', '.process-intro'], {
        scrollTrigger: { trigger: '#process', start: 'top 78%' },
        opacity: 0, y: 25, duration: 0.8, stagger: 0.15, ease
    });

    gsap.from('.process-step', {
        scrollTrigger: { trigger: '.process-steps', start: 'top 82%' },
        opacity: 0, x: -18, duration: 0.5, stagger: 0.08, ease
    });

    gsap.from('.about-img', {
        scrollTrigger: { trigger: '#about', start: 'top 78%' },
        opacity: 0, x: -40, duration: 1, ease
    });

    gsap.from('.about-content > *', {
        scrollTrigger: { trigger: '#about', start: 'top 72%' },
        opacity: 0, y: 20, duration: 0.7, stagger: 0.1, ease
    });

    gsap.from('.cap-item', {
        scrollTrigger: { trigger: '#capabilities', start: 'top 78%' },
        opacity: 0, y: 30, duration: 0.7, stagger: 0.1, ease
    });

    gsap.from('.contact-info > *, .contact-form-wrap', {
        scrollTrigger: { trigger: '#contact', start: 'top 78%' },
        opacity: 0, y: 22, duration: 0.7, stagger: 0.08, ease
    });
}

/* ─── COUNTER ─── */
function initCounters() {
    document.querySelectorAll('[data-count-to]').forEach(el => {
        const target = parseInt(el.dataset.countTo);
        ScrollTrigger.create({
            trigger: el, start: 'top 80%', once: true,
            onEnter: () => gsap.fromTo({ v: 0 }, { v: target }, {
                duration: 1.6, ease: 'power2.out',
                onUpdate: function() { el.textContent = Math.round(this.targets()[0].v); }
            })
        });
    });
}

/* ─── NAV ─── */
function initNav() {
    const nav = document.getElementById('nav');
    ScrollTrigger.create({
        start: 'top -50',
        onUpdate: s => nav.classList.toggle('scrolled', s.progress > 0)
    });
}

/* ─── VIDEO SCRUB ─── */
function initVideoScrub() {
    const wrap   = document.getElementById('vscrub-wrap');
    const video  = document.getElementById('scrub-video');
    const canvas = document.getElementById('scrub-canvas');
    const fill   = document.getElementById('vscrub-bar-fill');
    const pctEl  = document.getElementById('vscrub-pct');
    const prog   = document.getElementById('vscrub-progress');
    if (!wrap || !video || !canvas) return;

    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function paint() {
        if (!video.videoWidth) return;
        const cw = canvas.width, ch = canvas.height;
        const vw = video.videoWidth, vh = video.videoHeight;
        const scale = Math.max(cw / vw, ch / vh);
        const dw = vw * scale, dh = vh * scale;
        ctx.drawImage(video, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    }

    /* continuous RAF loop — draws whatever frame the video is currently at,
       decoupled from seek events so rendering never stalls */
    (function drawLoop() { paint(); requestAnimationFrame(drawLoop); })();

    /* throttle seeks to one per animation frame — prevents saturating the
       seek queue on rapid scroll, and avoids the isSeeking-stuck bug on iOS */
    let targetTime  = 0;
    let seekPending = false;
    function scheduleSeek() {
        if (seekPending) return;
        seekPending = true;
        requestAnimationFrame(() => {
            seekPending = false;
            if (Math.abs(video.currentTime - targetTime) > 0.01) {
                video.currentTime = targetTime;
            }
        });
    }

    function setupST() {
        if (prog) prog.classList.add('ready');
        resize();
        window.addEventListener('resize', resize, { passive: true });

        ScrollTrigger.create({
            trigger: wrap,
            start:  'top top',
            end:    'bottom bottom',
            scrub:  0.8,
            onUpdate: self => {
                targetTime = self.progress * (video.duration || 0);
                scheduleSeek();
                const p = Math.round(self.progress * 100);
                if (fill)  fill.style.width = p + '%';
                if (pctEl) pctEl.textContent = p + '%';
            }
        });
    }

    function init() {
        /* play+pause primes the seek pipeline on iOS Safari (muted video,
           no user gesture required) — without this, currentTime assignment
           is silently ignored on first touch */
        video.play().then(() => { video.pause(); video.currentTime = 0; }).catch(() => {});
        requestAnimationFrame(setupST);
    }

    if (video.readyState >= 1) {
        init();
    } else {
        video.addEventListener('loadedmetadata', init, { once: true });
    }
}

/* ─── CONTACT FORM ─── */
function initContactForm() {
    const form    = document.getElementById('contact-form');
    const submit  = document.getElementById('cf-submit');
    const success = document.getElementById('form-success');
    const fileInput = document.getElementById('cf-file');
    const fileLabel = document.getElementById('cf-file-label');
    const fileText  = document.getElementById('cf-file-text');
    if (!form) return;

    // file label update
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) {
                fileText.textContent = fileInput.files[0].name;
                fileLabel.classList.add('has-file');
            } else {
                fileText.textContent = 'ИЗБЕРИ ФАЙЛ ИЛИ ПЛЪЗНИ ТУК';
                fileLabel.classList.remove('has-file');
            }
        });

        // drag & drop
        fileLabel.addEventListener('dragover', e => { e.preventDefault(); fileLabel.classList.add('has-file'); });
        fileLabel.addEventListener('dragleave', () => { if (!fileInput.files.length) fileLabel.classList.remove('has-file'); });
        fileLabel.addEventListener('drop', e => {
            e.preventDefault();
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                fileText.textContent = e.dataTransfer.files[0].name;
                fileLabel.classList.add('has-file');
            }
        });
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        submit.disabled = true;
        submit.querySelector('.submit-text').hidden = true;
        submit.querySelector('.submit-loading').hidden = false;

        try {
            const res = await fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: { 'Accept': 'application/json' }
            });
            if (res.ok) {
                form.hidden = true;
                success.hidden = false;
                gsap.from(success, { opacity: 0, y: 16, duration: 0.6, ease: 'power2.out' });
            } else {
                throw new Error('server');
            }
        } catch {
            // fallback: open mailto with form data
            const name = form.querySelector('#cf-name').value;
            const email = form.querySelector('#cf-email').value;
            const msg  = form.querySelector('#cf-message').value;
            window.location.href = `mailto:office@setacam.com?subject=Запитване от ${encodeURIComponent(name)}&body=${encodeURIComponent(msg + '\n\nОт: ' + name + '\nИмейл: ' + email)}`;
        } finally {
            submit.disabled = false;
            submit.querySelector('.submit-text').hidden = false;
            submit.querySelector('.submit-loading').hidden = true;
        }
    });
}

/* ─── SCROLL TO TOP ─── */
function initScrollTop() {
    const btn = document.getElementById('scroll-top');
    if (!btn) return;

    ScrollTrigger.create({
        start: 'top -400',
        onUpdate: s => btn.classList.toggle('visible', s.progress > 0)
    });

    btn.addEventListener('click', () => {
        if (window._lenis) {
            window._lenis.scrollTo(0, { duration: 1.2 });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
}

/* ─── PROJECT MODAL ─── */
function initProjectModal() {
    const projects = {
        1: {
            label: 'Авиационна екипировка · 2024',
            title: 'Авиационна монтажна скоба',
            desc: 'Прецизна монтажна скоба за авиационно приложение, изработена от 6061-T6. Детайлът изисква 4-осна контурна обработка и финишно твърдо анодиране клас III за максимална устойчивост на износване. Допуски по критични отвори ±0.008 мм.',
            bg: 'hero-bg.png',
            specs: [
                ['Материал', '6061-T6'],
                ['Процес', '4-осна фреза'],
                ['Финиш', 'Твърдо анодиране'],
                ['Допуск', '±0.008 мм'],
                ['Серия', '12 броя'],
                ['Срок', '6 работни дни'],
            ]
        },
        2: {
            label: 'Електроника · 2024',
            title: 'Корпус за електроника',
            desc: 'Фрезован корпус за вградена електроника с прецизни джобове, резбови отвори M3 и M4, и прозрачно анодиране за защита. Детайлът изисква пет установа за пълна обработка на всички повърхности.',
            bg: 'hero-bg.png',
            specs: [
                ['Материал', '6061'],
                ['Процес', '3-осна фреза'],
                ['Финиш', 'Прозрачно анодиране'],
                ['Допуск', '±0.01 мм'],
                ['Серия', '25 броя'],
                ['Срок', '8 работни дни'],
            ]
        },
        3: {
            label: 'Роботика · 2024',
            title: 'Прототипен корпус на задвижване',
            desc: 'Корпус за серводвигател на роботизиран манипулатор. Изработен от 7075-T6 за максимална якост при минимална маса. Прецизни отвори за лагери H7 с интерференция. Детайлът е прототип за валидация на кинематиката.',
            bg: 'hero-bg.png',
            specs: [
                ['Материал', '7075-T6'],
                ['Процес', '4-осна фреза'],
                ['Финиш', 'Сурово (без покритие)'],
                ['Допуск', '±0.005 мм на лагерни гнезда'],
                ['Серия', '2 броя'],
                ['Срок', '4 работни дни'],
            ]
        },
        4: {
            label: 'Автомобилна · 2024',
            title: 'Автомобилен педален комплект',
            desc: 'Комплект от три педала (газ, спирачка, съединител) за спортен автомобил. Естетично шлайфане и сатениран финиш. Ергономичен дизайн с фрезовани канали за сцепление. Монтажни отвори съвместими с ОЕМ позиции.',
            bg: 'hero-bg.png',
            specs: [
                ['Материал', '6061'],
                ['Процес', '3-осна фреза + шлайфане'],
                ['Финиш', 'Сатениран'],
                ['Допуск', '±0.02 мм'],
                ['Серия', '5 комплекта'],
                ['Срок', '7 работни дни'],
            ]
        },
        5: {
            label: 'Аерокосмически дронове · 2023',
            title: 'Плоча за рамка на дрон',
            desc: 'Лека рамкова плоча за FPV дрон с облекчителни джобове и контурно рязане. Оптимизирана за минимална маса при запазване на огъвна якост. Обработена от 2024-T4 за висока якост при ниско тегло.',
            bg: 'hero-bg.png',
            specs: [
                ['Материал', '2024-T4'],
                ['Процес', 'Контурно рязане + облекчаване'],
                ['Финиш', 'Дебурирано'],
                ['Допуск', '±0.05 мм'],
                ['Серия', '10 броя'],
                ['Срок', '5 работни дни'],
            ]
        },
        6: {
            label: 'Медицинска екипировка · 2023',
            title: 'Приспособление за медицински уред',
            desc: 'Точно приспособление за позициониране на медицинска сонда. Изисква Ra 0.4 финиш на всички контактни повърхности и прецизни отвори за повторяема позиция. Документиран контрол и протоколи от измерване включени.',
            bg: 'hero-bg.png',
            specs: [
                ['Материал', '6061'],
                ['Процес', '3-осна + ръчно шлайфане'],
                ['Финиш', 'Ra 0.4'],
                ['Допуск', '±0.005 мм'],
                ['Серия', '3 броя'],
                ['Срок', '10 работни дни'],
            ]
        },
        7: {
            label: 'Термомениджмънт · 2023',
            title: 'Масив от охладители',
            desc: 'Набраздени охладители за силови електронни модули. Профилиране на тънки ламели с висок аспектен съотношение. Естествен анодиран финиш за подобрена топлинна емисия. Конфигурируема геометрия на ламелите.',
            bg: 'hero-bg.png',
            specs: [
                ['Материал', '6063'],
                ['Процес', 'Профилиране на ламели'],
                ['Финиш', 'Естествено анодиране'],
                ['Допуск', '±0.05 мм'],
                ['Серия', '30 броя'],
                ['Срок', '7 работни дни'],
            ]
        },
    };

    const modal = document.getElementById('project-modal');
    if (!modal) return;

    const backdrop = modal.querySelector('.project-modal-backdrop');
    const closeBtn = document.getElementById('modal-close');

    function openModal(id) {
        const p = projects[id];
        if (!p) return;

        document.getElementById('modal-label').textContent = p.label;
        document.getElementById('modal-title').textContent = p.title;
        document.getElementById('modal-desc').textContent = p.desc;

        const img = document.getElementById('modal-img');
        img.style.backgroundImage = `url("${p.bg}")`;

        const specsEl = document.getElementById('modal-specs');
        specsEl.innerHTML = p.specs.map(([k, v]) =>
            `<div><dt>${k}</dt><dd>${v}</dd></div>`
        ).join('');

        modal.setAttribute('aria-hidden', 'false');
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
        if (window._lenis) window._lenis.stop();
    }

    function closeModal() {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (window._lenis) window._lenis.start();
    }

    document.querySelectorAll('.work-card[data-project]').forEach(card => {
        card.addEventListener('click', () => openModal(+card.dataset.project));
    });

    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

/* ─── MOBILE MENU ─── */
function initMobileMenu() {
    const toggle = document.getElementById('nav-toggle');
    const menu   = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;
    let open = false;
    toggle.addEventListener('click', () => {
        open = !open;
        menu.classList.toggle('open', open);
        const spans = toggle.querySelectorAll('span');
        gsap.to(spans[0], { rotate: open ?  45 : 0, y: open ?  6 : 0, duration: 0.3 });
        gsap.to(spans[1], { rotate: open ? -45 : 0, y: open ? -6 : 0, duration: 0.3 });
    });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        open = false; menu.classList.remove('open');
        gsap.to(toggle.querySelectorAll('span'), { rotate: 0, y: 0, duration: 0.3 });
    }));
}
