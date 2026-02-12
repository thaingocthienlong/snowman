(function () {
    // 1. Inject CSS
    const style = document.createElement('style');
    style.innerHTML = `
    #lixi-container {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 9999;
        overflow: hidden;
    }
    .lixi {
        position: absolute;
        width: 14px;
        height: 20px;
        background: linear-gradient(180deg, #d63031, #c0392b);
        border-radius: 3px;
        box-shadow: 0 4px 10px rgba(214, 48, 49, 0.4);
        animation: lixi-fall linear infinite;
    }
    .lixi::after {
        content: "福";
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: #f1c40f;
    }
    @keyframes lixi-fall {
        from { transform: translateY(-10px) rotate(0deg); opacity: 0; }
        10% { opacity: 1; }
        to { transform: translateY(100vh) rotate(360deg); opacity: 0; }
    }
    `;
    document.head.appendChild(style);

    // 1.1 Inject Lottie Player Script
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.8.11/dist/dotlottie-wc.js';
    script.type = 'module';

    script.onload = () => {
        // 1.2 Inject Lottie Element after script loads
        const lottie = document.createElement('dotlottie-wc');
        lottie.setAttribute('src', 'https://lottie.host/ca3d6ffe-4ca3-43a9-9aa4-7c580d22f9ce/t5nofTbUxp.lottie');
        lottie.setAttribute('autoplay', '');
        lottie.setAttribute('loop', '');

        // Also set properties to be safe
        // lottie.src = ...; // Not needed if attributes work, but safe to trust attributes if element is upgraded

        lottie.style.position = 'fixed';
        lottie.style.top = '0';
        lottie.style.right = '0';
        lottie.style.width = '150px';
        lottie.style.height = '150px';
        lottie.style.zIndex = '9999';
        lottie.style.pointerEvents = 'none';
        document.body.appendChild(lottie);
    };

    document.head.appendChild(script);

    // 2. Inject HTML Container
    const container = document.createElement('div');
    container.id = 'lixi-container';
    document.body.appendChild(container);

    // 3. Animation Logic
    const lixiContainer = document.getElementById('lixi-container');

    function createLixi() {
        if (!lixiContainer) return;

        const lixi = document.createElement('div');
        lixi.className = 'lixi';
        const size = Math.random() * 6 + 12; // Size between 12px and 18px
        const duration = Math.random() * 3 + 4; // Duration between 4s and 7s

        lixi.style.left = Math.random() * 100 + '%';
        lixi.style.width = size + 'px';
        lixi.style.height = size * 1.4 + 'px';
        lixi.style.opacity = Math.random() * 0.4 + 0.5;
        lixi.style.animation = `lixi-fall ${duration}s linear infinite`;

        lixiContainer.appendChild(lixi);

        // Remove after animation completes
        setTimeout(() => {
            lixi.remove();
        }, (duration + 1) * 1000);
    }

    // Start the rain
    setInterval(createLixi, 260); // Create a new envelope every 260ms

    // Initial batch
    for (let i = 0; i < 12; i++) {
        setTimeout(createLixi, i * 120);
    }
})();

