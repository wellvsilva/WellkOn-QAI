// ===============================
// GOOGLE ANALYTICS EVENT TRACKING
// ===============================
function trackEvent(eventName, parameters = {}) {
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, parameters);
        console.log('Event tracked:', eventName, parameters);
    }
}

// ===============================
// NEURAL NETWORK CLASS - Desktop Only
// ===============================
class NeuralNetwork {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');
        this.nodes  = [];
        this.pulses = [];
        this.animationId = null;
        this.isRunning   = false;

        if (window.innerWidth <= 768) return;

        // Logo colors: deep indigo-blue → bright sky-blue + white accents
        // Matching the atom orbital gradient in the logo
        this.BLUE  = { r: 58,  g: 90,  b: 220 }; // #3A5ADC  (logo deep blue)
        this.CYAN  = { r: 60,  g: 185, b: 245 }; // #3CB9F5  (logo bright blue)
        this.WHITE = { r: 255, g: 255, b: 255 }; // #FFFFFF

        this.CFG = {
            count:      70,       // number of nodes
            dist:       200,      // max connection distance (px)
            speed:      0.45,     // node movement speed — clearly visible
            pulseFreq:  0.06,     // chance per frame to emit a pulse
            pulseSpd:   0.8,      // pulse travel speed
        };

        this.resize();
        this.init();
        this.start();
    }

    // Interpolate between logo deep-blue and bright-blue
    blueShade(t) {
        const { BLUE: A, CYAN: B } = this;
        return {
            r: Math.round(A.r + (B.r - A.r) * t),
            g: Math.round(A.g + (B.g - A.g) * t),
            b: Math.round(A.b + (B.b - A.b) * t),
        };
    }

    resize() {
        if (window.innerWidth <= 768) return;
        const dpr = window.devicePixelRatio || 1;
        this.W = window.innerWidth;
        this.H = window.innerHeight;
        this.canvas.width  = this.W * dpr;
        this.canvas.height = this.H * dpr;
        this.canvas.style.width  = this.W + 'px';
        this.canvas.style.height = this.H + 'px';
        this.ctx.scale(dpr, dpr);
    }

    init() {
        if (window.innerWidth <= 768) return;
        this.nodes  = [];
        this.pulses = [];
        const { W, H, CFG } = this;

        for (let i = 0; i < CFG.count; i++) {
            // Give each node a random angle and speed so movement is clearly visible
            const angle = Math.random() * Math.PI * 2;
            const spd   = CFG.speed * (0.5 + Math.random() * 0.8);
            this.nodes.push({
                x:      Math.random() * W,
                y:      Math.random() * H,
                vx:     Math.cos(angle) * spd,
                vy:     Math.sin(angle) * spd,
                phase:  Math.random() * Math.PI * 2,
                pSpd:   0.025 + Math.random() * 0.02,
                r:      2 + Math.random() * 2,   // base radius
                act:    0,                         // activation flash level
            });
        }
    }

    // Fire a node: it lights up and emits pulses on all its edges
    fireNode(nIdx, connections) {
        this.nodes[nIdx].act = 1.2;
        connections.forEach(([i, j]) => {
            if (i !== nIdx && j !== nIdx) return;
            this.pulses.push({
                from: i, to: j,
                t:    i === nIdx ? 0 : 1,
                dir:  i === nIdx ? 1 : -1,
                spd:  this.CFG.pulseSpd * (0.7 + Math.random() * 0.6),
                r:    3 + Math.random() * 3,
                life: 1,
            });
        });
    }

    update() {
        if (window.innerWidth <= 768) return;
        const { W, H, CFG, nodes } = this;

        // Move nodes — speed is high enough to be clearly seen
        nodes.forEach(n => {
            n.x += n.vx;
            n.y += n.vy;
            n.phase += n.pSpd;
            if (n.act > 0) n.act -= 0.03;

            // Bounce off edges
            if (n.x < 0)  { n.x = 0;  n.vx =  Math.abs(n.vx); }
            if (n.x > W)  { n.x = W;  n.vx = -Math.abs(n.vx); }
            if (n.y < 0)  { n.y = 0;  n.vy =  Math.abs(n.vy); }
            if (n.y > H)  { n.y = H;  n.vy = -Math.abs(n.vy); }
        });

        // Build connection list (computed fresh each frame since nodes move)
        this._conns = [];
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const d  = Math.sqrt(dx * dx + dy * dy);
                if (d < CFG.dist) this._conns.push([i, j, 1 - d / CFG.dist]);
            }
        }

        // Random neuron burst
        if (Math.random() < 0.006) {
            this.fireNode(Math.floor(Math.random() * nodes.length), this._conns.map(c => [c[0], c[1]]));
        }

        // Regular pulses
        if (Math.random() < CFG.pulseFreq && this._conns.length > 0) {
            const c = this._conns[Math.floor(Math.random() * this._conns.length)];
            this.pulses.push({
                from: c[0], to: c[1],
                t: 0, dir: 1,
                spd: CFG.pulseSpd * (0.7 + Math.random() * 0.5),
                r: 2.5 + Math.random() * 2,
                life: 1,
            });
        }

        // Advance & cull pulses
        this.pulses = this.pulses.filter(p => {
            p.t    += (p.spd * p.dir) / 100;
            p.life -= 0.016;
            return p.t >= 0 && p.t <= 1 && p.life > 0;
        });
    }

    draw() {
        if (window.innerWidth <= 768) return;
        const { ctx, W, H, nodes, _conns = [], pulses } = this;

        // Dark trail (motion blur effect)
        ctx.fillStyle = 'rgba(8, 8, 14, 0.22)';
        ctx.fillRect(0, 0, W, H);

        // ── Connections ────────────────────────────────────────────
        _conns.forEach(([i, j, str]) => {
            const A = nodes[i], B = nodes[j];
            const alpha = str * 0.45;

            const grad = ctx.createLinearGradient(A.x, A.y, B.x, B.y);
            const cA   = this.blueShade(A.y / H);
            const cB   = this.blueShade(B.y / H);
            grad.addColorStop(0, `rgba(${cA.r},${cA.g},${cA.b},${alpha})`);
            grad.addColorStop(1, `rgba(${cB.r},${cB.g},${cB.b},${alpha})`);

            ctx.save();
            ctx.strokeStyle = grad;
            ctx.lineWidth   = 0.6 + str * 1.1;
            ctx.shadowBlur  = 6;
            ctx.shadowColor = `rgba(60,185,245,${alpha * 0.6})`;
            ctx.beginPath();
            ctx.moveTo(A.x, A.y);
            ctx.lineTo(B.x, B.y);
            ctx.stroke();
            ctx.restore();
        });

        // ── Pulses (white bullets travelling along connections) ─────
        pulses.forEach(p => {
            const A = nodes[p.from], B = nodes[p.to];
            const x = A.x + (B.x - A.x) * p.t;
            const y = A.y + (B.y - A.y) * p.t;
            const a = p.life;

            ctx.save();
            // Outer blue glow
            ctx.shadowBlur  = 18;
            ctx.shadowColor = `rgba(60,185,245,${a})`;
            ctx.fillStyle   = `rgba(100,200,255,${a * 0.75})`;
            ctx.beginPath();
            ctx.arc(x, y, p.r, 0, Math.PI * 2);
            ctx.fill();
            // White hot core
            ctx.shadowBlur  = 8;
            ctx.shadowColor = 'rgba(255,255,255,1)';
            ctx.fillStyle   = `rgba(255,255,255,${a})`;
            ctx.beginPath();
            ctx.arc(x, y, p.r * 0.42, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // ── Nodes ──────────────────────────────────────────────────
        nodes.forEach(n => {
            const beat  = (Math.sin(n.phase) + 1) * 0.5;   // 0..1
            const flash = Math.max(beat * 0.3, n.act);
            const size  = n.r + beat * 1.4 + n.act * 3.5;
            const c     = this.blueShade(n.y / H);
            const alpha = 0.55 + flash * 0.4;
            const glow  = 8 + flash * 25;

            ctx.save();
            // Outer halo (blue)
            ctx.shadowBlur  = glow;
            ctx.shadowColor = `rgba(${c.r},${c.g},${c.b},0.95)`;
            ctx.fillStyle   = `rgba(${c.r},${c.g},${c.b},${alpha})`;
            ctx.beginPath();
            ctx.arc(n.x, n.y, size, 0, Math.PI * 2);
            ctx.fill();
            // White centre
            ctx.shadowBlur  = glow * 0.4;
            ctx.shadowColor = 'rgba(255,255,255,1)';
            ctx.fillStyle   = `rgba(255,255,255,${0.3 + flash * 0.65})`;
            ctx.beginPath();
            ctx.arc(n.x, n.y, size * 0.38, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    animate() {
        if (!this.isRunning || window.innerWidth <= 768) return;
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    start() {
        if (this.isRunning || window.innerWidth <= 768) return;
        this.isRunning = true;
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
}

// ===============================
// TRANSLATION SYSTEM
// ===============================
const translations = {
    en: {
        'nav-home': 'Home',
        'nav-about': 'About Us',
        'nav-research': 'Research',
        'nav-differential': 'Differentials',
        'nav-contact': 'Contact',
        'hero-badge': 'Quantum Artificial Intelligence',
        'hero-title-2': 'Quantum Artificial Intelligence',
        'hero-vision': '"At the frontier between science and innovation, WellkOn develops quantum technologies and artificial intelligence to solve the most complex challenges of the contemporary world."',
        'hstat-areas': 'Research Areas',
        'hstat-tech': 'Tech Startup',
        'hstat-quantum': 'Quantum AI',
        'hero-cta1': 'Our Research',
        'hero-cta2': 'Contact Us',
        'about-label': 'About WellkOn QAI',
        'about-title': 'Quantum Technology and AI',
        'about-description1': 'WellkOn QAI is a deep tech startup dedicated to research and development of technologies that challenge conventional paradigms. Founded by specialists in computer science and artificial intelligence, we are developing innovative solutions in the technological field.',
        'about-description2': 'Our mission is to develop quantum computational systems and advanced AI algorithms that can solve complex problems in areas such as health, energy, logistics and materials science, creating solutions that until recently were considered impossible.',
        'about-cta': 'Learn About Our Research',
        'research-label': 'Core Technologies',
        'research-title': 'Research Areas',
        'research-description': 'Our research spans multiple cutting-edge fields, creating synergies that drive breakthrough innovations.',
        'research-quantum-title': 'Quantum Computing',
        'research-quantum-description': 'We develop quantum and hybrid algorithms specialized for exponentially faster processing than classical systems, enabling the solution of previously intractable problems in optimization, cryptography and molecular simulation.',
        'research-ai-title': 'Advanced Artificial Intelligence',
        'research-ai-description': 'Our AI research includes deep learning, natural language processing and symbolic reasoning systems, creating algorithms that can analyze complex patterns and extract meaningful insights from large volumes of data.',
        'research-vr-title': 'Virtual and Augmented Reality',
        'research-vr-description': 'We explore new frontiers in immersive experiences, developing interfaces that allow intuitive visualization and manipulation of complex data, with applications in training, education and scientific simulation.',
        'differential-label': 'Our Advantages',
        'differential-title': 'Our Differential',
        'differential-research-title': 'Multidisciplinary Research',
        'differential-research-description': 'Our multidisciplinary research spans quantum computing, artificial intelligence, virtual reality (VR), augmented reality (AR) and holograms, creating a unique environment where revolutionary ideas emerge from collaboration between different fields of knowledge, enabling the development of technological solutions that transcend conventional approaches.',
        'differential-results-title': 'Results-Centered Approach',
        'differential-results-description': 'Our commitment is to transform cutting-edge research into practical solutions for real problems, accelerating the transition between scientific discoveries and applications that benefit various sectors of society and industry. We constantly seek excellence in innovative technologies that solve current challenges and anticipate future needs, generating sustainable value for our partners and clients.',
        'cta-title': 'Let\'s Build the Future',
        'cta-description': 'Contact us to learn how WellkOn QAI technologies can boost your business or to explore collaboration possibilities in innovative projects.',
        'cta-button1': 'Schedule Meeting',
        'cta-button2': 'Request Information',
        'footer-description': 'Exploring the frontiers of science and technology through research in Quantum Computing, Artificial Intelligence and Extended Reality.',
        'footer-nav-title': 'Navigation',
        'footer-research-title': 'Research',
        'footer-quantum': 'Quantum Computing',
        'footer-ai': 'Artificial Intelligence',
        'footer-vr': 'Virtual Reality',
        'footer-publications': 'Scientific Publications',
        'footer-partnerships': 'Academic Partnerships',
        'footer-contact-title': 'Contact',
        'footer-location': 'Teresina - Piauí, Brazil',
        'footer-copyright': '© 2025 WellkOn QAI. All rights reserved.'
    },
    pt: {
        'nav-home': 'Início',
        'nav-about': 'Sobre Nós',
        'nav-research': 'Pesquisa',
        'nav-differential': 'Diferenciais',
        'nav-contact': 'Contato',
        'hero-badge': 'Inteligência Artificial Quântica',
        'hero-title-2': 'Inteligência Artificial Quântica',
        'hero-vision': '"Na fronteira entre ciência e inovação, a WellkOn desenvolve tecnologias quânticas e inteligência artificial para resolver os desafios mais complexos do mundo contemporâneo."',
        'hstat-areas': 'Áreas de Pesquisa',
        'hstat-tech': 'Tech Startup',
        'hstat-quantum': 'IA Quântica',
        'hero-cta1': 'Nossa Pesquisa',
        'hero-cta2': 'Entre em Contato',
        'about-label': 'Sobre a WellkOn QAI',
        'about-title': 'Tecnologia Quântica e IA',
        'about-description1': 'A WellkOn QAI é uma startup de deep tech dedicada à pesquisa e desenvolvimento de tecnologias que desafiam paradigmas convencionais. Fundada por especialistas em ciência da computação e inteligência artificial, estamos desenvolvendo soluções inovadoras no campo tecnológico.',
        'about-description2': 'Nossa missão é desenvolver sistemas computacionais quânticos e algoritmos de IA avançados que possam resolver problemas complexos em áreas como saúde, energia, logística e ciência dos materiais, criando soluções que até recentemente eram consideradas impossíveis.',
        'about-cta': 'Saiba Mais Sobre Nossa Pesquisa',
        'research-label': 'Tecnologias Principais',
        'research-title': 'Áreas de Pesquisa',
        'research-description': 'Nossa pesquisa abrange múltiplos campos de ponta, criando sinergias que impulsionam inovações revolucionárias.',
        'research-quantum-title': 'Computação Quântica',
        'research-quantum-description': 'Desenvolvemos algoritmos quânticos e híbridos especializados para processamento exponencialmente mais rápido que sistemas clássicos, possibilitando a solução de problemas anteriormente intratáveis em otimização, criptografia e simulação molecular.',
        'research-ai-title': 'Inteligência Artificial Avançada',
        'research-ai-description': 'Nossa pesquisa em IA inclui deep learning, processamento de linguagem natural e sistemas de raciocínio simbólico, criando algoritmos que podem analisar padrões complexos e extrair insights significativos de grandes volumes de dados.',
        'research-vr-title': 'Realidade Virtual e Aumentada',
        'research-vr-description': 'Exploramos novas fronteiras em experiências imersivas, desenvolvendo interfaces que permitem visualização e manipulação intuitiva de dados complexos, com aplicações em treinamento, educação e simulação científica.',
        'differential-label': 'Nossas Vantagens',
        'differential-title': 'Nossos Diferenciais',
        'differential-research-title': 'Pesquisa Multidisciplinar',
        'differential-research-description': 'Nossa pesquisa multidisciplinar abrange computação quântica, inteligência artificial, realidade virtual (VR), realidade aumentada (AR) e hologramas, criando um ambiente único onde ideias revolucionárias emergem da colaboração entre diferentes campos do conhecimento, possibilitando o desenvolvimento de soluções tecnológicas que transcendem abordagens convencionais.',
        'differential-results-title': 'Abordagem Centrada em Resultados',
        'differential-results-description': 'Nosso compromisso é transformar pesquisa de ponta em soluções práticas para problemas reais, acelerando a transição entre descobertas científicas e aplicações que beneficiam diversos setores da sociedade e indústria. Buscamos constantemente a excelência em tecnologias inovadoras que resolvem desafios atuais e antecipam necessidades futuras, gerando valor sustentável para nossos parceiros e clientes.',
        'cta-title': 'Vamos Construir o Futuro',
        'cta-description': 'Entre em contato conosco para saber como as tecnologias da WellkOn QAI podem impulsionar seu negócio ou para explorar possibilidades de colaboração em projetos inovadores.',
        'cta-button1': 'Agendar Reunião',
        'cta-button2': 'Solicitar Informações',
        'footer-description': 'Explorando as fronteiras da ciência e tecnologia através de pesquisa em Computação Quântica, Inteligência Artificial e Realidade Estendida.',
        'footer-nav-title': 'Navegação',
        'footer-research-title': 'Pesquisa',
        'footer-quantum': 'Computação Quântica',
        'footer-ai': 'Inteligência Artificial',
        'footer-vr': 'Realidade Virtual',
        'footer-publications': 'Publicações Científicas',
        'footer-partnerships': 'Parcerias Acadêmicas',
        'footer-contact-title': 'Contato',
        'footer-location': 'Teresina - Piauí, Brasil',
        'footer-copyright': '© 2025 WellkOn QAI. Todos os direitos reservados.'
    }
};

let currentLanguage = 'en';

function switchLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'pt' : 'en';
    updateLanguageDisplay();
    translatePage();
    
    // Track language change event
    trackEvent('language_change', {
        new_language: currentLanguage,
        previous_language: currentLanguage === 'en' ? 'pt' : 'en'
    });
}

function updateLanguageDisplay() {
    const langDisplay = document.getElementById('current-language');
    if (langDisplay) {
        langDisplay.textContent = currentLanguage.toUpperCase();
    }
}

function translatePage() {
    const elements = document.querySelectorAll('[data-translate]');
    elements.forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            element.textContent = translations[currentLanguage][key];
        }
    });
}

// ===============================
// PARTICLES CONFIGURATION - Desktop Only
// ===============================
function initParticles() {
    if (typeof particlesJS === 'undefined' || window.innerWidth <= 768) {
        return;
    }
    
    particlesJS('particles-js', {
        particles: {
            number: { 
                value: 15,
                density: {
                    enable: true,
                    value_area: 1200
                }
            },
            color: { value: ["#0066FF", "#00D4FF"] },
            shape: { 
                type: "circle",
                stroke: {
                    width: 0,
                    color: "#000000"
                }
            },
            opacity: { 
                value: 0.15,
                random: true,
                anim: {
                    enable: true,
                    speed: 0.2,
                    opacity_min: 0.02,
                    sync: false
                }
            },
            size: { 
                value: 1.5,
                random: true,
                anim: {
                    enable: true,
                    speed: 0.4,
                    size_min: 0.2,
                    sync: false
                }
            },
            line_linked: {
                enable: true,
                distance: 180,
                color: "#0066FF",
                opacity: 0.08,
                width: 0.5
            },
            move: { 
                enable: true,
                speed: 0.3,
                direction: "none",
                random: true,
                straight: false,
                out_mode: "out",
                bounce: false
            }
        },
        interactivity: {
            detect_on: "canvas",
            events: { 
                onhover: { 
                    enable: false,
                    mode: "grab" 
                },
                onclick: {
                    enable: false,
                    mode: "push"
                },
                resize: true
            }
        },
        retina_detect: true
    });
}

// ===============================
// INTERSECTION OBSERVER FOR ANIMATIONS
// ===============================
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ===============================
// HEADER SCROLL EFFECT
// ===============================
let lastScrollY = window.scrollY;
const header = document.getElementById('header');

window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// ===============================
// MOBILE NAVIGATION
// ===============================
const mobileToggle  = document.getElementById('mobile-toggle');
const navMenu       = document.getElementById('nav-menu');
const navOverlay    = document.getElementById('nav-overlay');
const languageToggle = document.getElementById('language-toggle');

function toggleMobileMenu() {
    const isOpen = navMenu.classList.toggle('active');
    navOverlay.classList.toggle('active', isOpen);
    mobileToggle.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
    trackEvent('mobile_menu_toggle', { action: isOpen ? 'open' : 'close' });
}

function closeMobileMenu() {
    navMenu.classList.remove('active');
    navOverlay.classList.remove('active');
    mobileToggle.classList.remove('open');
    document.body.style.overflow = '';
}

window.closeMobileMenu = closeMobileMenu;

mobileToggle.addEventListener('click', toggleMobileMenu);
navOverlay.addEventListener('click', closeMobileMenu);
languageToggle.addEventListener('click', switchLanguage);

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', closeMobileMenu);
});

// ===============================
// QUANTUM PARTICLES ANIMATION - Desktop Only
// ===============================
function createParticles() {
    const container = document.getElementById('particles');
    if (!container || window.innerWidth <= 768) return;
    
    const particleCount = 8;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random position
        const angle = (i / particleCount) * 2 * Math.PI;
        const radius = 150 + Math.random() * 50;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        particle.style.left = `calc(50% + ${x}px)`;
        particle.style.top = `calc(50% + ${y}px)`;
        
        // Random animation delay
        particle.style.animationDelay = `${Math.random() * 2}s`;
        particle.style.animation = `float ${3 + Math.random() * 2}s ease-in-out infinite`;
        
        container.appendChild(particle);
    }
}

// ===============================
// SMOOTH SCROLLING
// ===============================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        
        // Track navigation clicks
        trackEvent('navigation_click', {
            target_section: href,
            link_text: this.textContent.trim(),
            link_type: this.classList.contains('cta-button') ? 'cta' : 'nav'
        });
        
        // Special case for home - scroll to top
        if (href === '#home') {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            return;
        }
        
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ===============================
// INITIALIZATION
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    // Track page load
    trackEvent('page_view', {
        page_title: document.title,
        page_language: currentLanguage,
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`
    });

    // Initialize Neural Network only on desktop
    const canvas = document.getElementById('neural-network');
    if (canvas && window.innerWidth > 768) {
        window.neuralNetwork = new NeuralNetwork(canvas);
    }
    
    // Initialize language system
    updateLanguageDisplay();
    translatePage();
    
    // Add loaded class for final animations
    document.body.classList.add('loaded');
    
    // Track CTA button clicks
    document.querySelectorAll('.cta-button').forEach(button => {
        button.addEventListener('click', (e) => {
            trackEvent('cta_click', {
                button_text: button.textContent.trim(),
                button_location: button.closest('section')?.id || 'unknown',
                target_url: button.href || button.getAttribute('href') || 'unknown'
            });
        });
    });

    // Track secondary button clicks
    document.querySelectorAll('.secondary-button').forEach(button => {
        button.addEventListener('click', (e) => {
            trackEvent('secondary_button_click', {
                button_text: button.textContent.trim(),
                button_location: button.closest('section')?.id || 'unknown',
                target_url: button.href || button.getAttribute('href') || 'unknown'
            });
        });
    });

    // Track footer link clicks
    document.querySelectorAll('.footer-links a').forEach(link => {
        link.addEventListener('click', () => {
            trackEvent('footer_link_click', {
                link_text: link.textContent.trim(),
                link_url: link.href || link.getAttribute('href') || 'unknown'
            });
        });
    });

    // Track social media clicks
    document.querySelectorAll('.social-icon').forEach(icon => {
        icon.addEventListener('click', () => {
            trackEvent('social_media_click', {
                platform: icon.getAttribute('data-label') || 'unknown',
                icon_location: 'footer'
            });
        });
    });

    // Social icon label interactions
    document.querySelectorAll('.social-icon').forEach(icon => {
        const label = icon.querySelector('.label');
        if (label) {
            icon.addEventListener('mouseenter', () => {
                label.style.opacity = '1';
                label.style.bottom = '-30px';
            });
            icon.addEventListener('mouseleave', () => {
                label.style.opacity = '0';
                label.style.bottom = '-25px';
            });
        }
    });

    // Track email and phone clicks
    document.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]').forEach(link => {
        link.addEventListener('click', () => {
            const isEmail = link.href.startsWith('mailto:');
            trackEvent('contact_click', {
                contact_type: isEmail ? 'email' : 'phone',
                contact_value: link.href.replace(isEmail ? 'mailto:' : 'tel:', ''),
                source_location: link.closest('section')?.id || 'unknown'
            });
        });
    });

    // Track scroll depth
    let maxScrollDepth = 0;
    window.addEventListener('scroll', () => {
        const scrollDepth = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
        if (scrollDepth > maxScrollDepth && scrollDepth % 25 === 0) {
            maxScrollDepth = scrollDepth;
            trackEvent('scroll_depth', {
                depth_percentage: scrollDepth
            });
        }
    });

    // Track time on page
    const startTime = Date.now();
    window.addEventListener('beforeunload', () => {
        const timeOnPage = Math.round((Date.now() - startTime) / 1000);
        trackEvent('time_on_page', {
            seconds: timeOnPage,
            minutes: Math.round(timeOnPage / 60)
        });
    });
    
    console.log('WellkOn QAI - Google Analytics Integrated Successfully! ID: G-7LYT6LVWN9');
});

// Resize handling
window.addEventListener('resize', () => {
    // Reinitialize effects only on desktop
    if (window.innerWidth > 768) {
        if (window.neuralNetwork) {
            window.neuralNetwork.resize();
            window.neuralNetwork.init();
        }
    } else {
        // Stop effects on mobile
        if (window.neuralNetwork) {
            window.neuralNetwork.stop();
        }
    }

    // Close mobile menu on resize to desktop
    if (window.innerWidth > 768 && window.closeMobileMenu) {
        window.closeMobileMenu();
    }
});

// Handle orientation change
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        if (window.innerWidth > 768 && window.neuralNetwork) {
            window.neuralNetwork.resize();
            window.neuralNetwork.init();
        }
    }, 500);
});

// Reduced motion support
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.style.setProperty('--animation-duration', '0.01ms');
}
