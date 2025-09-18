document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    const activateTab = (name) => {
        tabButtons.forEach((button) => {
            button.classList.toggle('active', button.dataset.tab === name);
        });

        tabContents.forEach((content) => {
            content.classList.toggle('active', content.id === `tab-${name}`);
        });
    };

    const loadThreeScene = (() => {
        let initPromise = null;
        let animationFrameId = null;

        const setIdentityMatrix = (out) => {
            out[0] = 1;
            out[1] = 0;
            out[2] = 0;
            out[3] = 0;
            out[4] = 0;
            out[5] = 1;
            out[6] = 0;
            out[7] = 0;
            out[8] = 0;
            out[9] = 0;
            out[10] = 1;
            out[11] = 0;
            out[12] = 0;
            out[13] = 0;
            out[14] = 0;
            out[15] = 1;
            return out;
        };

        const multiplyMatrices = (out, a, b) => {
            const a00 = a[0];
            const a01 = a[1];
            const a02 = a[2];
            const a03 = a[3];
            const a10 = a[4];
            const a11 = a[5];
            const a12 = a[6];
            const a13 = a[7];
            const a20 = a[8];
            const a21 = a[9];
            const a22 = a[10];
            const a23 = a[11];
            const a30 = a[12];
            const a31 = a[13];
            const a32 = a[14];
            const a33 = a[15];

            const b00 = b[0];
            const b01 = b[1];
            const b02 = b[2];
            const b03 = b[3];
            const b10 = b[4];
            const b11 = b[5];
            const b12 = b[6];
            const b13 = b[7];
            const b20 = b[8];
            const b21 = b[9];
            const b22 = b[10];
            const b23 = b[11];
            const b30 = b[12];
            const b31 = b[13];
            const b32 = b[14];
            const b33 = b[15];

            out[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
            out[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
            out[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
            out[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;
            out[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
            out[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
            out[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
            out[7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;
            out[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
            out[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
            out[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
            out[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;
            out[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
            out[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
            out[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
            out[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;
            return out;
        };

        const perspectiveMatrix = (out, fovy, aspect, near, far) => {
            const f = 1 / Math.tan(fovy / 2);
            out[0] = f / aspect;
            out[1] = 0;
            out[2] = 0;
            out[3] = 0;
            out[4] = 0;
            out[5] = f;
            out[6] = 0;
            out[7] = 0;
            out[8] = 0;
            out[9] = 0;
            out[10] = (far + near) / (near - far);
            out[11] = -1;
            out[12] = 0;
            out[13] = 0;
            out[14] = (2 * far * near) / (near - far);
            out[15] = 0;
            return out;
        };

        const rotateXMatrix = (out, rad) => {
            const s = Math.sin(rad);
            const c = Math.cos(rad);
            out[0] = 1;
            out[1] = 0;
            out[2] = 0;
            out[3] = 0;
            out[4] = 0;
            out[5] = c;
            out[6] = s;
            out[7] = 0;
            out[8] = 0;
            out[9] = -s;
            out[10] = c;
            out[11] = 0;
            out[12] = 0;
            out[13] = 0;
            out[14] = 0;
            out[15] = 1;
            return out;
        };

        const rotateYMatrix = (out, rad) => {
            const s = Math.sin(rad);
            const c = Math.cos(rad);
            out[0] = c;
            out[1] = 0;
            out[2] = -s;
            out[3] = 0;
            out[4] = 0;
            out[5] = 1;
            out[6] = 0;
            out[7] = 0;
            out[8] = s;
            out[9] = 0;
            out[10] = c;
            out[11] = 0;
            out[12] = 0;
            out[13] = 0;
            out[14] = 0;
            out[15] = 1;
            return out;
        };

        return () => {
            const wrapper = document.getElementById('threeWrapper');
            const status = document.getElementById('threeStatus');
            const canvas = document.getElementById('threeCanvas');

            if (!wrapper || !canvas) {
                return Promise.resolve();
            }

            if (initPromise) {
                return initPromise;
            }

            if (status) {
                status.textContent = 'Loading 3D scene...';
                status.classList.remove('error');
                status.classList.remove('hidden');
            }

            initPromise = new Promise((resolve) => {
                const start = () => {
                    try {
                        const gl = canvas.getContext('webgl', { antialias: true, alpha: true });
                        if (!gl) {
                            throw new Error('WebGL context could not be created.');
                        }

                        canvas.classList.add('is-visible');

                        const createShader = (type, source) => {
                            const shader = gl.createShader(type);
                            if (!shader) {
                                throw new Error('Unable to create shader.');
                            }
                            gl.shaderSource(shader, source);
                            gl.compileShader(shader);
                            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                                const info = gl.getShaderInfoLog(shader) || 'Unknown shader error.';
                                gl.deleteShader(shader);
                                throw new Error(info);
                            }
                            return shader;
                        };

                        const vertexShaderSource = `
                            attribute vec3 aPosition;
                            attribute vec3 aColor;
                            attribute vec3 aNormal;

                            uniform mat4 uMatrix;
                            uniform mat4 uModelMatrix;

                            varying vec3 vColor;
                            varying vec3 vNormal;

                            void main() {
                                vColor = aColor;
                                vNormal = mat3(uModelMatrix) * aNormal;
                                gl_Position = uMatrix * vec4(aPosition, 1.0);
                            }
                        `;

                        const fragmentShaderSource = `
                            precision mediump float;

                            varying vec3 vColor;
                            varying vec3 vNormal;

                            uniform vec3 uLightDirection;

                            void main() {
                                vec3 normal = normalize(vNormal);
                                float light = max(dot(normal, uLightDirection), 0.0);
                                float ambient = 0.35;
                                float intensity = ambient + light * 0.65;
                                gl_FragColor = vec4(vColor * intensity, 1.0);
                            }
                        `;

                        const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
                        const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

                        const program = gl.createProgram();
                        if (!program) {
                            throw new Error('Unable to create WebGL program.');
                        }

                        gl.attachShader(program, vertexShader);
                        gl.attachShader(program, fragmentShader);
                        gl.linkProgram(program);

                        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                            const info = gl.getProgramInfoLog(program) || 'Program failed to link.';
                            throw new Error(info);
                        }

                        gl.useProgram(program);

                        const positions = new Float32Array([
                            // Front
                            -1, -1, 1,
                            1, -1, 1,
                            1, 1, 1,
                            -1, 1, 1,
                            // Back
                            -1, -1, -1,
                            -1, 1, -1,
                            1, 1, -1,
                            1, -1, -1,
                            // Top
                            -1, 1, -1,
                            -1, 1, 1,
                            1, 1, 1,
                            1, 1, -1,
                            // Bottom
                            -1, -1, -1,
                            1, -1, -1,
                            1, -1, 1,
                            -1, -1, 1,
                            // Right
                            1, -1, -1,
                            1, 1, -1,
                            1, 1, 1,
                            1, -1, 1,
                            // Left
                            -1, -1, -1,
                            -1, -1, 1,
                            -1, 1, 1,
                            -1, 1, -1,
                        ]);

                        const faceColors = [
                            [0.45, 0.64, 0.98],
                            [0.34, 0.53, 0.92],
                            [0.58, 0.77, 1.0],
                            [0.32, 0.49, 0.9],
                            [0.5, 0.7, 0.99],
                            [0.4, 0.6, 0.94],
                        ];

                        const colors = new Float32Array(
                            faceColors.flatMap((color) => [...color, ...color, ...color, ...color])
                        );

                        const normals = new Float32Array([
                            // Front
                            0, 0, 1,
                            0, 0, 1,
                            0, 0, 1,
                            0, 0, 1,
                            // Back
                            0, 0, -1,
                            0, 0, -1,
                            0, 0, -1,
                            0, 0, -1,
                            // Top
                            0, 1, 0,
                            0, 1, 0,
                            0, 1, 0,
                            0, 1, 0,
                            // Bottom
                            0, -1, 0,
                            0, -1, 0,
                            0, -1, 0,
                            0, -1, 0,
                            // Right
                            1, 0, 0,
                            1, 0, 0,
                            1, 0, 0,
                            1, 0, 0,
                            // Left
                            -1, 0, 0,
                            -1, 0, 0,
                            -1, 0, 0,
                            -1, 0, 0,
                        ]);

                        const indices = new Uint16Array([
                            0, 1, 2, 0, 2, 3,
                            4, 5, 6, 4, 6, 7,
                            8, 9, 10, 8, 10, 11,
                            12, 13, 14, 12, 14, 15,
                            16, 17, 18, 16, 18, 19,
                            20, 21, 22, 20, 22, 23,
                        ]);

                        const positionBuffer = gl.createBuffer();
                        const colorBuffer = gl.createBuffer();
                        const normalBuffer = gl.createBuffer();
                        const indexBuffer = gl.createBuffer();

                        if (!positionBuffer || !colorBuffer || !normalBuffer || !indexBuffer) {
                            throw new Error('Unable to allocate WebGL buffers.');
                        }

                        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

                        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
                        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

                        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
                        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
                        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

                        const positionLocation = gl.getAttribLocation(program, 'aPosition');
                        const colorLocation = gl.getAttribLocation(program, 'aColor');
                        const normalLocation = gl.getAttribLocation(program, 'aNormal');

                        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                        gl.enableVertexAttribArray(positionLocation);
                        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

                        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
                        gl.enableVertexAttribArray(colorLocation);
                        gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

                        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
                        gl.enableVertexAttribArray(normalLocation);
                        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);

                        const matrixLocation = gl.getUniformLocation(program, 'uMatrix');
                        const modelMatrixLocation = gl.getUniformLocation(program, 'uModelMatrix');
                        const lightDirectionLocation = gl.getUniformLocation(program, 'uLightDirection');

                        const lightDirection = new Float32Array([0.55, 0.75, 0.85]);
                        const lightLength = Math.hypot(
                            lightDirection[0],
                            lightDirection[1],
                            lightDirection[2]
                        ) || 1;
                        lightDirection[0] /= lightLength;
                        lightDirection[1] /= lightLength;
                        lightDirection[2] /= lightLength;
                        gl.uniform3fv(lightDirectionLocation, lightDirection);

                        gl.enable(gl.DEPTH_TEST);
                        gl.enable(gl.CULL_FACE);
                        gl.cullFace(gl.BACK);
                        gl.clearColor(0, 0, 0, 0);

                        const projection = new Float32Array(16);
                        const view = new Float32Array(16);
                        const rotationX = new Float32Array(16);
                        const rotationY = new Float32Array(16);
                        const model = new Float32Array(16);
                        const modelView = new Float32Array(16);
                        const modelViewProjection = new Float32Array(16);

                        setIdentityMatrix(view);
                        view[14] = -5.5;

                        const resizeCanvas = () => {
                            const { clientWidth, clientHeight } = wrapper;
                            if (!clientWidth || !clientHeight) {
                                return;
                            }

                            const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
                            const displayWidth = Math.floor(clientWidth * devicePixelRatio);
                            const displayHeight = Math.floor(clientHeight * devicePixelRatio);

                            if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
                                canvas.width = displayWidth;
                                canvas.height = displayHeight;
                            }

                            gl.viewport(0, 0, canvas.width, canvas.height);
                        };

                        const render = (time) => {
                            resizeCanvas();

                            const seconds = time * 0.001;
                            const aspect = canvas.width / canvas.height || 1;

                            perspectiveMatrix(
                                projection,
                                (45 * Math.PI) / 180,
                                aspect,
                                0.1,
                                100
                            );

                            rotateXMatrix(rotationX, seconds * 0.85);
                            rotateYMatrix(rotationY, seconds * 0.6);

                            multiplyMatrices(model, rotationY, rotationX);
                            multiplyMatrices(modelView, view, model);
                            multiplyMatrices(modelViewProjection, projection, modelView);

                            gl.uniformMatrix4fv(matrixLocation, false, modelViewProjection);
                            gl.uniformMatrix4fv(modelMatrixLocation, false, model);

                            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                            gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

                            animationFrameId = requestAnimationFrame(render);
                        };

                        resizeCanvas();
                        window.addEventListener('resize', resizeCanvas);
                        animationFrameId = requestAnimationFrame(render);

                        if (status) {
                            status.textContent = '';
                            status.classList.remove('error');
                            status.classList.add('hidden');
                        }

                        resolve({
                            stop: () => {
                                if (animationFrameId !== null) {
                                    cancelAnimationFrame(animationFrameId);
                                }
                            },
                        });
                    } catch (error) {
                        console.error('Failed to initialize 3D scene', error);
                        if (status) {
                            status.textContent =
                                '3D view could not be loaded. Please ensure your browser supports WebGL.';
                            status.classList.add('error');
                            status.classList.remove('hidden');
                        }
                        canvas.classList.remove('is-visible');
                        initPromise = null;
                        resolve();
                    }
                };

                requestAnimationFrame(start);
            });

            return initPromise;
        };
    })();

    const showTab = (name) => {
        activateTab(name);
        if (name === '3d') {
            loadThreeScene();
        }
    };

    tabButtons.forEach((button) => {
        button.addEventListener('click', () => showTab(button.dataset.tab));
    });

    showTab('overview');

    const ctx = document.getElementById('normalDistributionChart');
    if (!ctx) {
        return;
    }

    const meanInput = document.getElementById('meanInput');
    const stdDevInput = document.getElementById('stdDevInput');
    const meanValueDisplay = document.getElementById('meanValue');
    const stdDevValueDisplay = document.getElementById('stdDevValue');

    if (!meanInput || !stdDevInput || !meanValueDisplay || !stdDevValueDisplay) {
        return;
    }

    const formatValue = (value) => Number(value).toFixed(2);

    const sanitizeParameters = () => {
        let mean = parseFloat(meanInput.value);
        if (!Number.isFinite(mean)) {
            mean = 0;
        }
        mean = Number(mean.toFixed(1));

        let stdDev = parseFloat(stdDevInput.value);
        const minStdDev = parseFloat(stdDevInput.min) || 0.1;
        if (!Number.isFinite(stdDev) || stdDev <= 0) {
            stdDev = minStdDev;
        } else if (stdDev < minStdDev) {
            stdDev = minStdDev;
        }
        stdDev = Number(stdDev.toFixed(1));

        meanInput.value = mean.toFixed(1);
        stdDevInput.value = stdDev.toFixed(1);

        meanValueDisplay.textContent = formatValue(mean);
        stdDevValueDisplay.textContent = formatValue(stdDev);

        return { mean, stdDev };
    };

    const generateNormalDistribution = (mean, stdDev) => {
        const data = [];
        const min = mean - 4 * stdDev;
        const max = mean + 4 * stdDev;

        for (let z = -4; z <= 4.000001; z += 0.1) {
            const x = mean + z * stdDev;
            const exponent = -0.5 * z * z;
            const density = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
            data.push({ x, y: density });
        }

        return { data, min, max };
    };

    const { mean: initialMean, stdDev: initialStdDev } = sanitizeParameters();
    const {
        data: initialData,
        min: initialMin,
        max: initialMax,
    } = generateNormalDistribution(initialMean, initialStdDev);

    const normalChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: `Normal Distribution (μ = ${formatValue(initialMean)}, σ = ${formatValue(initialStdDev)})`,
                    data: initialData,
                    borderColor: 'rgba(106, 156, 245, 1)',
                    backgroundColor: 'rgba(138, 182, 255, 0.25)',
                    borderWidth: 2,
                    fill: true,
                    pointRadius: 0,
                    tension: 0.35,
                    parsing: false,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                },
                tooltip: {
                    callbacks: {
                        label: (context) =>
                            `x = ${context.parsed.x.toFixed(2)}, f(x) = ${context.parsed.y.toFixed(4)}`,
                    },
                },
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Value',
                    },
                    ticks: {
                        maxTicksLimit: 9,
                        callback: (value) => Number(value).toFixed(1),
                    },
                    min: initialMin,
                    max: initialMax,
                },
                y: {
                    title: {
                        display: true,
                        text: 'Probability Density',
                    },
                    beginAtZero: true,
                },
            },
        },
    });

    const updateChart = () => {
        const { mean, stdDev } = sanitizeParameters();
        const { data, min, max } = generateNormalDistribution(mean, stdDev);

        normalChart.data.datasets[0].data = data;
        normalChart.data.datasets[0].label = `Normal Distribution (μ = ${formatValue(mean)}, σ = ${formatValue(stdDev)})`;
        normalChart.options.scales.x.min = min;
        normalChart.options.scales.x.max = max;
        normalChart.update();
    };

    meanInput.addEventListener('input', updateChart);
    stdDevInput.addEventListener('input', updateChart);
});
    
