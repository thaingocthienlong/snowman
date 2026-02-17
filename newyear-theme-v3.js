(function () {
    console.log('🎉 Fireworks Theme: Phase 02 - Implementation Started');

    // 1. Cleanup and Setup (Phase 01 Re-applied/Ensured)
    const existingContainer = document.getElementById('fireworks-container');
    if (existingContainer) existingContainer.remove();
    const lixiContainer = document.getElementById('lixi-container');
    if (lixiContainer) lixiContainer.remove();

    const style = document.createElement('style');
    style.id = 'fireworks-style';
    style.innerHTML = `
    #fireworks-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 9999;
        pointer-events: none;
        overflow: hidden;
        background: transparent; /* Was rgba(0, 0, 0, 0.15) */
        transition: background 0.5s;
    }
    #fireworks-canvas {
        display: block;
        width: 100%;
        height: 100%;
    }
    #trails-canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        mix-blend-mode: lighten;
    }
    `;
    if (!document.getElementById('fireworks-style')) document.head.appendChild(style);

    const container = document.createElement('div');
    container.id = 'fireworks-container';

    // We need two canvases: one for trails, one for main sparks, as per original
    const trailsCanvas = document.createElement('canvas');
    trailsCanvas.id = 'trails-canvas';
    const mainCanvas = document.createElement('canvas');
    mainCanvas.id = 'fireworks-canvas'; // acts as main-canvas

    container.appendChild(trailsCanvas);
    container.appendChild(mainCanvas);
    document.body.appendChild(container);

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    const CDN_STAGE = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/329180/Stage%400.1.4.js';
    const CDN_MATH = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/329180/MyMath.js';

    Promise.all([
        loadScript(CDN_STAGE),
        loadScript(CDN_MATH)
    ]).then(() => {
        if (typeof Stage === 'function' && typeof MyMath === 'object') {
            initFireworks();
        } else {
            console.error('Failed to load Stage or MyMath');
        }
    }).catch(console.error);

    // --- FIREWORKS ENGINE ---
    function initFireworks() {
        console.log('🚀 Launching Fireworks Engine');

        // --- CONSTANTS & SYSTEM CONFIG ---
        const IS_MOBILE = window.innerWidth <= 640;
        const GRAVITY = 0.9;
        let simSpeed = 1;

        const COLOR = {
            Red: '#ff0043',
            Green: '#14fc56',
            Blue: '#1e7fff',
            Purple: '#e60aff',
            Gold: '#ffbf36',
            White: '#ffffff'
        };
        const INVISIBLE = '_INVISIBLE_';
        const PI_2 = Math.PI * 2;
        const PI_HALF = Math.PI * 0.5;

        // Mock Sound Manager (Silent)
        const soundManager = {
            playSound: () => { }
        };

        // --- STAGE SETUP ---
        const trailsStage = new Stage('trails-canvas');
        const mainStage = new Stage('fireworks-canvas');
        const stages = [trailsStage, mainStage];

        // --- STATE & UTILS ---
        // Hardcoded Config
        const config = {
            quality: IS_MOBILE ? 1 : 2, // Low for mobile, Normal for desktop
            shellSize: IS_MOBILE ? '1' : '2', // Smaller shells on mobile
            autoLaunch: true,
            finale: false,
            skyLighting: 2, // Normal
            scaleFactor: IS_MOBILE ? 0.9 : 1
        };

        let stageW, stageH;

        function handleResize() {
            const w = window.innerWidth;
            const h = window.innerHeight;
            stages.forEach(stage => stage.resize(w, h));
            stageW = w / config.scaleFactor;
            stageH = h / config.scaleFactor;
        }
        window.addEventListener('resize', handleResize);
        handleResize();

        // --- PARTICLES & CLASSES ---
        const COLOR_NAMES = Object.keys(COLOR);
        const COLOR_CODES = COLOR_NAMES.map(name => COLOR[name]);
        const COLOR_CODES_W_INVIS = [...COLOR_CODES, INVISIBLE];
        const COLOR_TUPLES = {};
        COLOR_CODES.forEach(hex => {
            COLOR_TUPLES[hex] = {
                r: parseInt(hex.substr(1, 2), 16),
                g: parseInt(hex.substr(3, 2), 16),
                b: parseInt(hex.substr(5, 2), 16),
            };
        });

        function createParticleCollection() {
            const collection = {};
            COLOR_CODES_W_INVIS.forEach(color => {
                collection[color] = [];
            });
            return collection;
        }

        const BurstFlash = {
            active: [],
            _pool: [],
            _new() { return {} },
            add(x, y, radius) {
                const instance = this._pool.pop() || this._new();
                instance.x = x; instance.y = y; instance.radius = radius;
                this.active.push(instance);
                return instance;
            },
            returnInstance(instance) { this._pool.push(instance); }
        };

        const Star = {
            drawWidth: 3,
            airDrag: 0.98,
            airDragHeavy: 0.992,
            active: createParticleCollection(),
            _pool: [],
            _new() { return {}; },
            add(x, y, color, angle, speed, life, speedOffX, speedOffY) {
                const instance = this._pool.pop() || this._new();
                instance.visible = true;
                instance.heavy = false;
                instance.x = x; instance.y = y;
                instance.prevX = x; instance.prevY = y;
                instance.color = color;
                instance.speedX = Math.sin(angle) * speed + (speedOffX || 0);
                instance.speedY = Math.cos(angle) * speed + (speedOffY || 0);
                instance.life = life; instance.fullLife = life;
                instance.spinAngle = Math.random() * PI_2;
                instance.spinSpeed = 0.8;
                instance.spinRadius = 0;
                instance.sparkFreq = 0; instance.sparkSpeed = 1;
                instance.sparkTimer = 0; instance.sparkColor = color;
                instance.sparkLife = 750; instance.sparkLifeVariation = 0.25;
                instance.strobe = false;
                this.active[color].push(instance);
                return instance;
            },
            returnInstance(instance) {
                instance.onDeath && instance.onDeath(instance);
                instance.onDeath = null;
                instance.secondColor = null;
                instance.transitionTime = 0;
                instance.colorChanged = false;
                this._pool.push(instance);
            }
        };

        const Spark = {
            drawWidth: 0,
            airDrag: 0.9,
            active: createParticleCollection(),
            _pool: [],
            _new() { return {}; },
            add(x, y, color, angle, speed, life) {
                const instance = this._pool.pop() || this._new();
                instance.x = x; instance.y = y;
                instance.prevX = x; instance.prevY = y;
                instance.color = color;
                instance.speedX = Math.sin(angle) * speed;
                instance.speedY = Math.cos(angle) * speed;
                instance.life = life;
                this.active[color].push(instance);
                return instance;
            },
            returnInstance(instance) { this._pool.push(instance); }
        };

        // --- EFFECTS & HELPERS ---
        function randomColorSimple() { return COLOR_CODES[Math.random() * COLOR_CODES.length | 0]; }
        function randomColor(options) {
            let color = randomColorSimple();
            if (options && options.limitWhite && color === COLOR.White && Math.random() < 0.6) color = randomColorSimple();
            return color;
        }
        function whiteOrGold() { return Math.random() < 0.5 ? COLOR.Gold : COLOR.White; }
        function makePistilColor(shellColor) {
            return (shellColor === COLOR.White || shellColor === COLOR.Gold) ? randomColor({ notColor: shellColor }) : whiteOrGold();
        }

        function createParticleArc(start, arcLength, count, randomness, particleFactory) {
            const angleDelta = arcLength / count;
            const end = start + arcLength - (angleDelta * 0.5);
            if (end > start) {
                for (let angle = start; angle < end; angle = angle + angleDelta) particleFactory(angle + Math.random() * angleDelta * randomness);
            } else {
                for (let angle = start; angle > end; angle = angle + angleDelta) particleFactory(angle + Math.random() * angleDelta * randomness);
            }
        }
        function createBurst(count, particleFactory, startAngle = 0, arcLength = PI_2) {
            const R = 0.5 * Math.sqrt(count / Math.PI);
            const C = 2 * R * Math.PI;
            const C_HALF = C / 2;
            for (let i = 0; i <= C_HALF; i++) {
                const ringAngle = i / C_HALF * PI_HALF;
                const ringSize = Math.cos(ringAngle);
                const partsPerFullRing = C * ringSize;
                const partsPerArc = partsPerFullRing * (arcLength / PI_2);
                const angleInc = PI_2 / partsPerFullRing;
                const angleOffset = Math.random() * angleInc + startAngle;
                const maxRandomAngleOffset = angleInc * 0.33;
                for (let i = 0; i < partsPerArc; i++) {
                    const randomAngleOffset = Math.random() * maxRandomAngleOffset;
                    let angle = angleInc * i + angleOffset + randomAngleOffset;
                    particleFactory(angle, ringSize);
                }
            }
        }

        function crossetteEffect(star) {
            const startAngle = Math.random() * PI_HALF;
            createParticleArc(startAngle, PI_2, 4, 0.5, (angle) => {
                Star.add(star.x, star.y, star.color, angle, Math.random() * 0.6 + 0.75, 600);
            });
        }
        function floralEffect(star) {
            const count = 12 + 6 * config.quality;
            createBurst(count, (angle, speedMult) => {
                Star.add(star.x, star.y, star.color, angle, speedMult * 2.4, 1000 + Math.random() * 300, star.speedX, star.speedY);
            });
            BurstFlash.add(star.x, star.y, 46);
        }
        function fallingLeavesEffect(star) {
            createBurst(7, (angle, speedMult) => {
                const newStar = Star.add(star.x, star.y, INVISIBLE, angle, speedMult * 2.4, 2400 + Math.random() * 600, star.speedX, star.speedY);
                newStar.sparkColor = COLOR.Gold; newStar.sparkFreq = 144 / config.quality; newStar.sparkSpeed = 0.28;
                newStar.sparkLife = 750; newStar.sparkLifeVariation = 3.2;
            });
            BurstFlash.add(star.x, star.y, 46);
        }
        function crackleEffect(star) {
            const count = config.quality === 3 ? 32 : 16;
            createParticleArc(0, PI_2, count, 1.8, (angle) => {
                Spark.add(star.x, star.y, COLOR.Gold, angle, Math.pow(Math.random(), 0.45) * 2.4, 300 + Math.random() * 200);
            });
        }

        // --- SHELL TYPES (Simplified) ---
        const crysanthemumShell = (size = 1) => {
            const glitter = Math.random() < 0.25;
            const singleColor = Math.random() < 0.72;
            const color = singleColor ? randomColor({ limitWhite: true }) : [randomColor(), randomColor({ notSame: true })];
            const pistil = singleColor && Math.random() < 0.42;
            const pistilColor = pistil && makePistilColor(color);
            const secondColor = singleColor && (Math.random() < 0.2 || color === COLOR.White) ? pistilColor || randomColor({ notColor: color, limitWhite: true }) : null;
            const streamers = !pistil && color !== COLOR.White && Math.random() < 0.42;
            let starDensity = glitter ? 1.1 : 1.25;
            return {
                shellSize: size, spreadSize: 300 + size * 100, starLife: 900 + size * 200,
                starDensity, color, secondColor, glitter: glitter ? 'light' : '',
                glitterColor: whiteOrGold(), pistil, pistilColor, streamers
            };
        };

        const palmShell = (size = 1) => {
            const color = randomColor();
            const thick = Math.random() < 0.5;
            return {
                shellSize: size, color, spreadSize: 250 + size * 75,
                starDensity: thick ? 0.15 : 0.4, starLife: 1800 + size * 200,
                glitter: thick ? 'thick' : 'heavy'
            };
        };

        const ringShell = (size = 1) => {
            const color = randomColor();
            const pistil = Math.random() < 0.75;
            return {
                shellSize: size, ring: true, color, spreadSize: 300 + size * 100,
                starLife: 900 + size * 200, starCount: 2.2 * PI_2 * (size + 1),
                pistil, pistilColor: makePistilColor(color),
                glitter: !pistil ? 'light' : '', glitterColor: color === COLOR.Gold ? COLOR.Gold : COLOR.White,
                streamers: Math.random() < 0.3
            };
        };

        // ... include other types if needed, but these 3 are good for a mix

        const shellTypes = {
            'Crysanthemum': crysanthemumShell,
            'Palm': palmShell,
            'Ring': ringShell,
            'Random': (size) => Math.random() < 0.5 ? crysanthemumShell(size) : (Math.random() < 0.5 ? palmShell(size) : ringShell(size))
        };

        class Shell {
            constructor(options) {
                Object.assign(this, options);
                this.starLifeVariation = options.starLifeVariation || 0.125;
                this.color = options.color || randomColor();
                this.glitterColor = options.glitterColor || this.color;
                if (!this.starCount) {
                    const density = options.starDensity || 1;
                    const scaledSize = this.spreadSize / 54;
                    this.starCount = Math.max(6, scaledSize * scaledSize * density);
                }
            }
            launch(position, launchHeight) {
                const width = stageW;
                const height = stageH;
                const hpad = 60;
                const vpad = 50;
                const minHeightPercent = 0.45;
                const minHeight = height - height * minHeightPercent;

                const launchX = position * (width - hpad * 2) + hpad;
                const launchY = height;
                const burstY = minHeight - (launchHeight * (minHeight - vpad));
                const launchDistance = launchY - burstY;
                const launchVelocity = Math.pow(launchDistance * 0.04, 0.64);

                const comet = this.comet = Star.add(
                    launchX, launchY,
                    typeof this.color === 'string' && this.color !== 'random' ? this.color : COLOR.White,
                    Math.PI,
                    launchVelocity * (this.horsetail ? 1.2 : 1),
                    launchVelocity * (this.horsetail ? 100 : 400)
                );

                comet.heavy = true;
                comet.spinRadius = MyMath.random(0.32, 0.85);
                comet.sparkFreq = 32 / config.quality;
                comet.sparkLife = 320;
                comet.sparkLifeVariation = 3;
                if (this.glitter === 'willow' || this.fallingLeaves) {
                    comet.sparkFreq = 20 / config.quality; comet.sparkSpeed = 0.5; comet.sparkLife = 500;
                }
                if (this.color === INVISIBLE) comet.sparkColor = COLOR.Gold;

                comet.onDeath = comet => this.burst(comet.x, comet.y);
            }
            burst(x, y) {
                const speed = this.spreadSize / 96;
                let color, onDeath, sparkFreq, sparkSpeed, sparkLife;
                let sparkLifeVariation = 0.25;

                if (this.crossette) onDeath = crossetteEffect;
                if (this.crackle) onDeath = crackleEffect;
                if (this.floral) onDeath = floralEffect;
                if (this.fallingLeaves) onDeath = fallingLeavesEffect;

                if (this.glitter === 'light') { sparkFreq = 400; sparkSpeed = 0.3; sparkLife = 300; sparkLifeVariation = 2; }
                else if (this.glitter === 'medium') { sparkFreq = 200; sparkSpeed = 0.44; sparkLife = 700; sparkLifeVariation = 2; }
                else if (this.glitter === 'heavy') { sparkFreq = 80; sparkSpeed = 0.8; sparkLife = 1400; sparkLifeVariation = 2; }

                sparkFreq = sparkFreq / config.quality;

                const starFactory = (angle, speedMult) => {
                    const star = Star.add(
                        x, y, color || randomColor(), angle, speedMult * speed,
                        this.starLife + Math.random() * this.starLife * this.starLifeVariation,
                        this.horsetail ? this.comet && this.comet.speedX : 0,
                        this.horsetail ? this.comet && this.comet.speedY : -this.spreadSize / 1800
                    );
                    if (this.secondColor) { star.transitionTime = this.starLife * (Math.random() * 0.05 + 0.32); star.secondColor = this.secondColor; }
                    if (this.strobe) { star.transitionTime = this.starLife * (Math.random() * 0.08 + 0.46); star.strobe = true; star.strobeFreq = Math.random() * 20 + 40; if (this.strobeColor) star.secondColor = this.strobeColor; }
                    star.onDeath = onDeath;
                    if (this.glitter) {
                        star.sparkFreq = sparkFreq; star.sparkSpeed = sparkSpeed; star.sparkLife = sparkLife;
                        star.sparkLifeVariation = sparkLifeVariation; star.sparkColor = this.glitterColor;
                        star.sparkTimer = Math.random() * star.sparkFreq;
                    }
                };

                if (typeof this.color === 'string') {
                    if (this.color === 'random') color = null; else color = this.color;
                    if (this.ring) {
                        createParticleArc(0, PI_2, this.starCount, 0, angle => {
                            const initSpeedX = Math.sin(angle) * speed * (Math.pow(Math.random(), 2) * 0.85 + 0.15);
                            const initSpeedY = Math.cos(angle) * speed;
                            const newSpeed = MyMath.pointDist(0, 0, initSpeedX, initSpeedY);
                            const newAngle = MyMath.pointAngle(0, 0, initSpeedX, initSpeedY) + Math.random() * Math.PI;
                            const star = Star.add(x, y, color, newAngle, newSpeed, this.starLife + Math.random() * this.starLife * this.starLifeVariation);
                            if (this.glitter) {
                                star.sparkFreq = sparkFreq; star.sparkSpeed = sparkSpeed; star.sparkLife = sparkLife;
                                star.sparkLifeVariation = sparkLifeVariation; star.sparkColor = this.glitterColor;
                                star.sparkTimer = Math.random() * star.sparkFreq;
                            }
                        });
                    } else {
                        createBurst(this.starCount, starFactory);
                    }
                } else if (Array.isArray(this.color)) {
                    if (Math.random() < 0.5) {
                        const start = Math.random() * Math.PI;
                        color = this.color[0]; createBurst(this.starCount, starFactory, start, Math.PI);
                        color = this.color[1]; createBurst(this.starCount, starFactory, start + Math.PI, Math.PI);
                    } else {
                        color = this.color[0]; createBurst(this.starCount / 2, starFactory);
                        color = this.color[1]; createBurst(this.starCount / 2, starFactory);
                    }
                }

                if (this.pistil) {
                    const innerShell = new Shell({
                        spreadSize: this.spreadSize * 0.5, starLife: this.starLife * 0.6,
                        starLifeVariation: this.starLifeVariation, starDensity: 1.4, color: this.pistilColor,
                        glitter: 'light', glitterColor: this.pistilColor === COLOR.Gold ? COLOR.Gold : COLOR.White
                    });
                    innerShell.burst(x, y);
                }
                BurstFlash.add(x, y, this.spreadSize / 4);
            }
        }

        // --- LAUNCH SEQUENCES ---
        function launchShellFromConfig(event) {
            const shell = new Shell(shellTypes.Random(config.shellSize));
            const w = mainStage.width;
            const h = mainStage.height;
            shell.launch(event ? event.x / w : Math.random(), event ? 1 - event.y / h : Math.random() * 0.75);
        }

        function seqRandomShell() {
            const size = Math.random() < 0.5 ? config.shellSize : Math.max(0, config.shellSize - 1);
            const shell = new Shell(shellTypes.Random(size));
            shell.launch(Math.random(), Math.random() * 0.75);
            return 900 + Math.random() * 600;
        }

        function seqTwoRandom() {
            const size = config.shellSize;
            const shell1 = new Shell(shellTypes.Random(size));
            const shell2 = new Shell(shellTypes.Random(size));
            const leftOffset = Math.random() * 0.2 - 0.1;
            const rightOffset = Math.random() * 0.2 - 0.1;
            shell1.launch(0.3 + leftOffset, Math.random() * 0.75);
            setTimeout(() => { shell2.launch(0.7 + rightOffset, Math.random() * 0.75); }, 100);
            return 900 + Math.random() * 600;
        }

        // --- UPDATE & RENDER LOOP ---
        let currentFrame = 0;
        let autoLaunchTime = 0;

        function updateGlobals(timeStep, lag) {
            currentFrame++;
            if (config.autoLaunch) {
                autoLaunchTime -= timeStep;
                if (autoLaunchTime <= 0) {
                    autoLaunchTime = (Math.random() < 0.7 ? seqRandomShell : seqTwoRandom)() * 1.25;
                }
            }
        }

        function update(frameTime, lag) {
            const width = stageW;
            const height = stageH;
            const timeStep = frameTime * simSpeed;
            const speed = simSpeed * lag;

            updateGlobals(timeStep, lag);

            const starDrag = 1 - (1 - Star.airDrag) * speed;
            const starDragHeavy = 1 - (1 - Star.airDragHeavy) * speed;
            const sparkDrag = 1 - (1 - Spark.airDrag) * speed;
            const gAcc = timeStep / 1000 * GRAVITY;

            COLOR_CODES_W_INVIS.forEach(color => {
                const stars = Star.active[color];
                for (let i = stars.length - 1; i >= 0; i = i - 1) {
                    const star = stars[i];
                    if (star.updateFrame === currentFrame) continue;
                    star.updateFrame = currentFrame;
                    star.life -= timeStep;
                    if (star.life <= 0) {
                        stars.splice(i, 1);
                        Star.returnInstance(star);
                    } else {
                        const burnRate = Math.pow(star.life / star.fullLife, 0.5);
                        const burnRateInverse = 1 - burnRate;
                        star.prevX = star.x; star.prevY = star.y;
                        star.x += star.speedX * speed; star.y += star.speedY * speed;
                        if (!star.heavy) { star.speedX *= starDrag; star.speedY *= starDrag; }
                        else { star.speedX *= starDragHeavy; star.speedY *= starDragHeavy; }
                        star.speedY += gAcc;
                        if (star.sparkFreq) {
                            star.sparkTimer -= timeStep;
                            while (star.sparkTimer < 0) {
                                star.sparkTimer += star.sparkFreq * 0.75 + star.sparkFreq * burnRateInverse * 4;
                                Spark.add(star.x, star.y, star.sparkColor, Math.random() * PI_2, Math.random() * star.sparkSpeed * burnRate, star.sparkLife * 0.8 + Math.random() * star.sparkLifeVariation * star.sparkLife);
                            }
                        }
                        if (star.life < star.transitionTime) {
                            if (star.secondColor && !star.colorChanged) {
                                star.colorChanged = true; star.color = star.secondColor;
                                stars.splice(i, 1); Star.active[star.secondColor].push(star);
                                if (star.secondColor === INVISIBLE) star.sparkFreq = 0;
                            }
                            if (star.strobe) star.visible = Math.floor(star.life / star.strobeFreq) % 3 === 0;
                        }
                    }
                }
                const sparks = Spark.active[color];
                for (let i = sparks.length - 1; i >= 0; i = i - 1) {
                    const spark = sparks[i];
                    spark.life -= timeStep;
                    if (spark.life <= 0) { sparks.splice(i, 1); Spark.returnInstance(spark); }
                    else {
                        spark.prevX = spark.x; spark.prevY = spark.y;
                        spark.x += spark.speedX * speed; spark.y += spark.speedY * speed;
                        spark.speedX *= sparkDrag; spark.speedY *= sparkDrag; spark.speedY += gAcc;
                    }
                }
            });
            render(speed);
        }

        function render(speed) {
            const { dpr } = mainStage;
            const width = stageW;
            const height = stageH;
            const trailsCtx = trailsStage.ctx;
            const mainCtx = mainStage.ctx;

            // Sky Color
            const currentSkyColor = { r: 0, g: 0, b: 0 }; // Simplified to black for now
            // if (config.skyLighting) ... (omitted for performance/simplicity, using CSS background mostly)

            const scaleFactor = config.scaleFactor;
            trailsCtx.scale(dpr * scaleFactor, dpr * scaleFactor);
            mainCtx.scale(dpr * scaleFactor, dpr * scaleFactor);

            trailsCtx.globalCompositeOperation = 'destination-out';
            trailsCtx.fillStyle = `rgba(0, 0, 0, ${0.1})`; // Fade out trails to transparent
            trailsCtx.fillRect(0, 0, width, height);

            mainCtx.clearRect(0, 0, width, height);

            // Re-enable source-over for drawing new things
            trailsCtx.globalCompositeOperation = 'source-over';

            while (BurstFlash.active.length) {
                const bf = BurstFlash.active.pop();
                const burstGradient = trailsCtx.createRadialGradient(bf.x, bf.y, 0, bf.x, bf.y, bf.radius);
                burstGradient.addColorStop(0.024, 'rgba(255, 255, 255, 1)');
                burstGradient.addColorStop(0.125, 'rgba(255, 160, 20, 0.2)');
                burstGradient.addColorStop(0.32, 'rgba(255, 140, 20, 0.11)');
                burstGradient.addColorStop(1, 'rgba(255, 120, 20, 0)');
                trailsCtx.fillStyle = burstGradient;
                trailsCtx.fillRect(bf.x - bf.radius, bf.y - bf.radius, bf.radius * 2, bf.radius * 2);
                BurstFlash.returnInstance(bf);
            }

            trailsCtx.globalCompositeOperation = 'lighten';
            trailsCtx.lineWidth = Star.drawWidth;
            trailsCtx.lineCap = config.quality === 1 ? 'square' : 'round';
            mainCtx.strokeStyle = '#fff';
            mainCtx.lineWidth = 1;
            mainCtx.beginPath();

            COLOR_CODES.forEach(color => {
                const stars = Star.active[color];
                trailsCtx.strokeStyle = color;
                trailsCtx.beginPath();
                stars.forEach(star => {
                    if (star.visible) {
                        trailsCtx.moveTo(star.x, star.y); trailsCtx.lineTo(star.prevX, star.prevY);
                        mainCtx.moveTo(star.x, star.y); mainCtx.lineTo(star.x - star.speedX * 1.6, star.y - star.speedY * 1.6);
                    }
                });
                trailsCtx.stroke();
            });
            mainCtx.stroke();

            trailsCtx.lineWidth = Spark.drawWidth;
            trailsCtx.lineCap = 'butt';
            COLOR_CODES.forEach(color => {
                const sparks = Spark.active[color];
                trailsCtx.strokeStyle = color;
                trailsCtx.beginPath();
                sparks.forEach(spark => {
                    trailsCtx.moveTo(spark.x, spark.y); trailsCtx.lineTo(spark.prevX, spark.prevY);
                });
                trailsCtx.stroke();
            });

            trailsCtx.setTransform(1, 0, 0, 1, 0, 0);
            mainCtx.setTransform(1, 0, 0, 1, 0, 0);
        }

        // --- LOTTIE INTEGRATION (Restored) ---
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.8.11/dist/dotlottie-wc.js';
        script.type = 'module';
        script.onload = () => {
            const lottie = document.createElement('dotlottie-wc');
            lottie.setAttribute('src', 'https://lottie.host/1ed884c2-a5cb-4e6c-8ae4-51b4d9b1919d/Z811RwMv35.lottie');
            lottie.setAttribute('autoplay', '');
            lottie.setAttribute('loop', '');
            Object.assign(lottie.style, {
                position: 'fixed', top: '0', right: '-4px',
                width: '150px', height: '150px', zIndex: '9999', pointerEvents: 'none'
            });
            document.body.appendChild(lottie);
        };
        document.head.appendChild(script);

        // --- START ---
        mainStage.addEventListener('ticker', update);

    }
})();
