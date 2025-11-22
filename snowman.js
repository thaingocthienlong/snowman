(function () {
    // --- 1. Define the CSS ---
    const cssStyles = `
        /* Scoped reset to prevent breaking the host website */
        .stage * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        /* Fixed Positioning */
        .stage {
            position: fixed;
            bottom: 0;
            right: 30px;
            margin-right: 20px;
            transform: scale(0.2);
            transform-origin: bottom right;
            display: flex;
            flex-direction: column;
            align-items: center;
            pointer-events: none;
            z-index: 99999;
        }

        /* --- Animations --- */
        @keyframes realistic-hop {
            0% { transform: translateY(0) scale(1, 1); }
            10% { transform: translateY(0) scale(1.05, 0.95); }
            15% { transform: translateY(-10px) scale(0.95, 1.05); }
            40% { transform: translateY(-70px) scale(1, 1); }
            60% { transform: translateY(0) scale(1.05, 0.95); }
            70% { transform: translateY(0) scale(1, 1); }
            100% { transform: translateY(0) scale(1, 1); }
        }

        @keyframes realistic-shadow {
            0% { transform: scale(1); opacity: 0.3; }
            10% { transform: scale(1.1); opacity: 0.35; }
            40% { transform: scale(0.5); opacity: 0.1; }
            60% { transform: scale(1.1); opacity: 0.35; }
            70% { transform: scale(1); opacity: 0.3; }
            100% { transform: scale(1); opacity: 0.3; }
        }

        /* --- Snowman Parts --- */
        .snow-man {
            width: 280px;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            z-index: 2;
            animation: realistic-hop 1.5s infinite linear;
            transform-origin: bottom center;
        }

        .snow-man .hat {
            width: 65px;
            height: 80px;
            background-color: #363636;
            box-shadow: inset -1rem 0 0.75rem #111;
            border-radius: 0.5rem 0.5rem 0 0;
            transform-origin: bottom;
            transform: translateY(0.5rem);
            position: relative;
            z-index: 1;
        }
        .snow-man .hat::before {
            content: "";
            background-color: #ff6a6a;
            box-shadow: inset -1rem 0 0.75rem #1119;
            top: 2.5rem;
            height: 1rem;
            width: 100%;
            position: absolute;
        }
        .snow-man .hat::after {
            content: "";
            background-color: #363636;
            box-shadow: inset -1rem 0 0.75rem #111, 0 -0.2rem 0.2rem -0.1rem #fffa;
            bottom: -0.5rem;
            width: 180%;
            height: 0.75rem;
            left: -40%;
            position: absolute;
            border-radius: 0.5rem;
        }

        .snow-man .head {
            --cut-point: 88px;
            position: relative;
            width: 120px;
            height: 120px;
            background-color: white;
            border-radius: 50%;
            box-shadow: inset -1rem 0 2rem #0007;
            clip-path: polygon(0% 0%, 100% 0%, 100% var(--cut-point), 0% var(--cut-point));
        }
        .snow-man .head::before, .snow-man .head::after {
            --pos-x: 1.8rem;
            content: "";
            width: 1rem;
            height: 1rem;
            background-color: #242424;
            position: absolute;
            top: 2.75rem;
            border-radius: 50%;
        }
        .snow-man .head::before { left: var(--pos-x); }
        .snow-man .head::after { right: var(--pos-x); }

        .snow-man .scarp {
            width: 128px;
            height: 1.25rem;
            background-color: #ff6a6a;
            border-radius: 1rem;
            position: absolute;
            top: 164px;
            z-index: 2;
            box-shadow: inset -1rem 0 1rem #0007, 0 0 0.5rem #fff8;
        }

        .snow-man .body {
            --cut-point: 20px;
            position: relative;
            width: 200px;
            height: 200px;
            background-color: white;
            border-radius: 50%;
            clip-path: polygon(0% var(--cut-point), 100% var(--cut-point), 100% 100%, 0% 100%);
            transform: translateY(-36px);
            box-shadow: inset -2rem 0 3rem #0007;
        }
        .snow-man .body::before, .snow-man .body::after {
            content: "";
            position: absolute;
            left: 95px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: #000;
            box-shadow: 0 30px 0 #000;
        }
        .snow-man .body::before { top: 50px; }
        .snow-man .body::after { top: 110px; }

        .shadow {
            width: 180px;
            height: 30px;
            background: black;
            border-radius: 50%;
            margin-top: -60px;
            z-index: 1;
            filter: blur(5px);
            animation: realistic-shadow 1.5s infinite linear;
        }
    `;

    // --- 2. Function to Inject Code ---
    function initSnowman() {
        // Create Style Tag
        const styleSheet = document.createElement("style");
        styleSheet.innerText = cssStyles;
        document.head.appendChild(styleSheet);

        // Create Container
        const stage = document.createElement("div");
        stage.classList.add("stage");

        // Create Inner HTML
        stage.innerHTML = `
            <div class="snow-man">
                <div class="hat"></div>
                <div class="head"></div>
                <div class="scarp"></div>
                <div class="body"></div>
            </div>
            <div class="shadow"></div>
        `;

        // Append to Body
        document.body.appendChild(stage);
    }

    // --- 3. Run logic safely ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSnowman);
    } else {
        initSnowman();
    }
})();
