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
                status.textContent = 'Loading city scene...';
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

                        const positionsArray = [];
                        const colorsArray = [];
                        const normalsArray = [];
                        const indicesArray = [];
                        let vertexOffset = 0;

                        const addFace = (a, b, c, d, normal, color) => {
                            positionsArray.push(...a, ...b, ...c, ...d);
                            for (let i = 0; i < 4; i += 1) {
                                normalsArray.push(...normal);
                                colorsArray.push(...color);
                            }
                            indicesArray.push(
                                vertexOffset,
                                vertexOffset + 1,
                                vertexOffset + 2,
                                vertexOffset,
                                vertexOffset + 2,
                                vertexOffset + 3
                            );
                            vertexOffset += 4;
                        };

                        const addGround = (size, y, color) => {
                            const half = size / 2;
                            addFace(
                                [-half, y, -half],
                                [-half, y, half],
                                [half, y, half],
                                [half, y, -half],
                                [0, 1, 0],
                                color
                            );
                        };

                        const addBuilding = ({
                            x,
                            z,
                            width,
                            depth,
                            height,
                            baseHeight = 0,
                            sideColor,
                            roofColor,
                            baseColor = sideColor,
                            includeBottom = true,
                        }) => {
                            const halfWidth = width / 2;
                            const halfDepth = depth / 2;
                            const bottom = baseHeight;
                            const top = baseHeight + height;

                            const frontLeftBottom = [x - halfWidth, bottom, z + halfDepth];
                            const frontRightBottom = [x + halfWidth, bottom, z + halfDepth];
                            const backRightBottom = [x + halfWidth, bottom, z - halfDepth];
                            const backLeftBottom = [x - halfWidth, bottom, z - halfDepth];

                            const frontLeftTop = [x - halfWidth, top, z + halfDepth];
                            const frontRightTop = [x + halfWidth, top, z + halfDepth];
                            const backRightTop = [x + halfWidth, top, z - halfDepth];
                            const backLeftTop = [x - halfWidth, top, z - halfDepth];

                            addFace(
                                frontLeftBottom,
                                frontRightBottom,
                                frontRightTop,
                                frontLeftTop,
                                [0, 0, 1],
                                sideColor
                            );
                            addFace(
                                backLeftBottom,
                                backLeftTop,
                                backRightTop,
                                backRightBottom,
                                [0, 0, -1],
                                sideColor
                            );
                            addFace(
                                backRightBottom,
                                backRightTop,
                                frontRightTop,
                                frontRightBottom,
                                [1, 0, 0],
                                sideColor
                            );
                            addFace(
                                backLeftBottom,
                                frontLeftBottom,
                                frontLeftTop,
                                backLeftTop,
                                [-1, 0, 0],
                                sideColor
                            );
                            addFace(
                                backLeftTop,
                                frontLeftTop,
                                frontRightTop,
                                backRightTop,
                                [0, 1, 0],
                                roofColor
                            );

                            if (includeBottom) {
                                addFace(
                                    backLeftBottom,
                                    backRightBottom,
                                    frontRightBottom,
                                    frontLeftBottom,
                                    [0, -1, 0],
                                    baseColor
                                );
                            }
                        };

                const addFacadeGrid = ({
                    orientation,
                    x,
                    z,
                    width,
                    depth,
                    baseHeight = 0,
                    height,
                    rows,
                    columns,
                    insetRatio = 0.12,
                    verticalInsetRatio = insetRatio,
                    gapRatio = 0.12,
                    color,
                    depthOffset = 0.003,
                }) => {
                    const safeRows = Math.max(1, Math.floor(rows || 0));
                    const safeColumns = Math.max(1, Math.floor(columns || 0));

                    if (!height || !width || !depth) {
                        return;
                    }

                    const verticalInset = Math.max(0, height * verticalInsetRatio);
                    const verticalSpan = height - verticalInset * 2;
                    if (verticalSpan <= 0) {
                        return;
                    }

                    const verticalGap =
                        safeRows > 1 ? Math.max(0, verticalSpan * gapRatio) / (safeRows - 1) : 0;
                    const panelHeight =
                        (verticalSpan - verticalGap * (safeRows - 1)) / safeRows;
                    if (panelHeight <= 0) {
                        return;
                    }

                    const halfWidth = width / 2;
                    const halfDepth = depth / 2;
                    const startY = baseHeight + verticalInset;

                    const addPanels = (orientationName) => {
                        const orientationLower = String(orientationName || '').toLowerCase();

                        if (orientationLower === 'front' || orientationLower === 'back') {
                            const horizontalInset = Math.max(0, width * insetRatio);
                            const horizontalSpan = width - horizontalInset * 2;
                            if (horizontalSpan <= 0) {
                                return;
                            }

                            const horizontalGap =
                                safeColumns > 1
                                    ? Math.max(0, horizontalSpan * gapRatio) / (safeColumns - 1)
                                    : 0;
                            const panelWidth =
                                (horizontalSpan - horizontalGap * (safeColumns - 1)) / safeColumns;
                            if (panelWidth <= 0) {
                                return;
                            }

                            const startX = x - halfWidth + horizontalInset;
                            const zPlane =
                                z + (orientationLower === 'front' ? halfDepth + depthOffset : -halfDepth - depthOffset);
                            const normal = orientationLower === 'front' ? [0, 0, 1] : [0, 0, -1];
                            const order = orientationLower === 'front' ? [0, 1, 2, 3] : [0, 3, 2, 1];

                            for (let row = 0; row < safeRows; row += 1) {
                                const y0 = startY + row * (panelHeight + verticalGap);
                                const y1 = y0 + panelHeight;
                                for (let column = 0; column < safeColumns; column += 1) {
                                    const x0 = startX + column * (panelWidth + horizontalGap);
                                    const x1 = x0 + panelWidth;
                                    const vertices = [
                                        [x0, y0, zPlane],
                                        [x1, y0, zPlane],
                                        [x1, y1, zPlane],
                                        [x0, y1, zPlane],
                                    ];

                                    addFace(
                                        vertices[order[0]],
                                        vertices[order[1]],
                                        vertices[order[2]],
                                        vertices[order[3]],
                                        normal,
                                        color
                                    );
                                }
                            }
                        } else if (orientationLower === 'left' || orientationLower === 'right') {
                            const horizontalInset = Math.max(0, depth * insetRatio);
                            const horizontalSpan = depth - horizontalInset * 2;
                            if (horizontalSpan <= 0) {
                                return;
                            }

                            const horizontalGap =
                                safeColumns > 1
                                    ? Math.max(0, horizontalSpan * gapRatio) / (safeColumns - 1)
                                    : 0;
                            const panelDepth =
                                (horizontalSpan - horizontalGap * (safeColumns - 1)) / safeColumns;
                            if (panelDepth <= 0) {
                                return;
                            }

                            const startZ = z - halfDepth + horizontalInset;
                            const xPlane =
                                x + (orientationLower === 'right' ? halfWidth + depthOffset : -halfWidth - depthOffset);
                            const normal = orientationLower === 'right' ? [1, 0, 0] : [-1, 0, 0];
                            const order = orientationLower === 'right' ? [0, 1, 2, 3] : [0, 3, 2, 1];

                            for (let row = 0; row < safeRows; row += 1) {
                                const y0 = startY + row * (panelHeight + verticalGap);
                                const y1 = y0 + panelHeight;
                                for (let column = 0; column < safeColumns; column += 1) {
                                    const z0 = startZ + column * (panelDepth + horizontalGap);
                                    const z1 = z0 + panelDepth;
                                    const vertices = [
                                        [xPlane, y0, z0],
                                        [xPlane, y0, z1],
                                        [xPlane, y1, z1],
                                        [xPlane, y1, z0],
                                    ];

                                    addFace(
                                        vertices[order[0]],
                                        vertices[order[1]],
                                        vertices[order[2]],
                                        vertices[order[3]],
                                        normal,
                                        color
                                    );
                                }
                            }
                        }
                    };

                    addPanels(orientation);
                };

                const applyFacades = (buildingConfig, facades = []) => {
                    facades.forEach((facade) => {
                        addFacadeGrid({
                            orientation: facade.orientation,
                            x: buildingConfig.x,
                            z: buildingConfig.z,
                            width: buildingConfig.width,
                            depth: buildingConfig.depth,
                            baseHeight: facade.baseHeight ?? buildingConfig.baseHeight ?? 0,
                            height: facade.height ?? buildingConfig.height,
                            rows: facade.rows,
                            columns: facade.columns,
                            insetRatio: facade.insetRatio ?? 0.12,
                            verticalInsetRatio: facade.verticalInsetRatio ?? facade.insetRatio ?? 0.12,
                            gapRatio: facade.gapRatio ?? 0.12,
                            color: facade.color,
                            depthOffset: facade.depthOffset ?? 0.003,
                        });
                    });
                };

                        addGround(8, -0.05, [0.18, 0.22, 0.28]);

                        const centralFoundation = {
                            x: 0,
                            z: 0,
                            width: 1.4,
                            depth: 1.4,
                            height: 0.3,
                            sideColor: [0.36, 0.46, 0.64],
                            roofColor: [0.48, 0.58, 0.72],
                            baseColor: [0.28, 0.36, 0.52],
                        };
                        addBuilding(centralFoundation);

                        const centralMain = {
                            x: 0,
                            z: 0,
                            width: 1.1,
                            depth: 1.1,
                            baseHeight: 0.3,
                            height: 2.3,
                            sideColor: [0.52, 0.67, 0.88],
                            roofColor: [0.74, 0.82, 0.94],
                            baseColor: [0.41, 0.54, 0.73],
                        };
                        addBuilding(centralMain);
                        applyFacades(centralMain, [
                            {
                                orientation: 'front',
                                rows: 5,
                                columns: 3,
                                color: [0.82, 0.89, 0.98],
                                insetRatio: 0.14,
                                verticalInsetRatio: 0.12,
                                gapRatio: 0.12,
                            },
                            {
                                orientation: 'back',
                                rows: 5,
                                columns: 3,
                                color: [0.82, 0.89, 0.98],
                                insetRatio: 0.14,
                                verticalInsetRatio: 0.12,
                                gapRatio: 0.12,
                            },
                            {
                                orientation: 'left',
                                rows: 5,
                                columns: 2,
                                color: [0.8, 0.88, 0.97],
                                insetRatio: 0.16,
                                verticalInsetRatio: 0.12,
                                gapRatio: 0.12,
                            },
                            {
                                orientation: 'right',
                                rows: 5,
                                columns: 2,
                                color: [0.8, 0.88, 0.97],
                                insetRatio: 0.16,
                                verticalInsetRatio: 0.12,
                                gapRatio: 0.12,
                            },
                        ]);


                        const centralTerrace = {
                            x: 0,
                            z: 0,
                            width: 0.94,
                            depth: 0.94,
                            baseHeight: centralMain.baseHeight + centralMain.height,
                            height: 0.2,
                            sideColor: [0.66, 0.79, 0.94],
                            roofColor: [0.82, 0.89, 0.97],
                            baseColor: [0.56, 0.69, 0.89],
                        };
                        addBuilding(centralTerrace);

                        const centralUpper = {
                            x: 0,
                            z: 0,
                            width: 0.55,
                            depth: 0.55,
                            baseHeight: centralTerrace.baseHeight + centralTerrace.height,
                            height: 0.95,
                            sideColor: [0.66, 0.79, 0.94],
                            roofColor: [0.85, 0.91, 0.98],
                            includeBottom: false,
                        };
                        addBuilding(centralUpper);
                        applyFacades(centralUpper, [
                            {
                                orientation: 'front',
                                rows: 3,
                                columns: 2,
                                color: [0.88, 0.93, 0.99],
                                insetRatio: 0.18,
                                verticalInsetRatio: 0.18,
                                gapRatio: 0.12,
                            },
                            {
                                orientation: 'back',
                                rows: 3,
                                columns: 2,
                                color: [0.88, 0.93, 0.99],
                                insetRatio: 0.18,
                                verticalInsetRatio: 0.18,
                                gapRatio: 0.12,
                            },
                        ]);

                        const centralSpire = {
                            x: 0,
                            z: 0,
                            width: 0.14,
                            depth: 0.14,
                            baseHeight: centralUpper.baseHeight + centralUpper.height,
                            height: 0.38,
                            sideColor: [0.92, 0.95, 0.99],
                            roofColor: [0.97, 0.98, 1.0],
                            includeBottom: false,
                        };
                        addBuilding(centralSpire);

                        const rooftopUnits = [
                            { x: -0.3, z: 0.22, width: 0.26, depth: 0.3 },
                            { x: 0.32, z: -0.18, width: 0.28, depth: 0.24 },
                        ];
                        rooftopUnits.forEach((unit) => {
                            addBuilding({
                                ...unit,
                                baseHeight: centralTerrace.baseHeight + centralTerrace.height,
                                height: 0.16,
                                sideColor: [0.41, 0.49, 0.58],
                                roofColor: [0.55, 0.62, 0.7],
                                baseColor: [0.35, 0.42, 0.52],
                                includeBottom: false,
                            });
                        });


                        const westBlockBase = {
                            x: -1.7,
                            z: 0.3,
                            width: 1.0,
                            depth: 1.05,
                            height: 0.22,
                            sideColor: [0.32, 0.45, 0.64],
                            roofColor: [0.45, 0.56, 0.72],
                            baseColor: [0.25, 0.35, 0.52],
                        };
                        addBuilding(westBlockBase);

                        const westBlockMain = {
                            x: -1.7,
                            z: 0.3,
                            width: 0.82,
                            depth: 0.85,
                            baseHeight: westBlockBase.height,
                            height: 1.55,
                            sideColor: [0.44, 0.58, 0.78],
                            roofColor: [0.62, 0.72, 0.86],
                            baseColor: [0.34, 0.47, 0.66],
                        };
                        addBuilding(westBlockMain);
                        applyFacades(westBlockMain, [
                            {
                                orientation: 'front',
                                rows: 4,
                                columns: 2,
                                color: [0.78, 0.86, 0.96],
                                insetRatio: 0.18,
                                verticalInsetRatio: 0.16,
                                gapRatio: 0.14,
                            },
                            {
                                orientation: 'back',
                                rows: 4,
                                columns: 2,
                                color: [0.78, 0.86, 0.96],
                                insetRatio: 0.18,
                                verticalInsetRatio: 0.16,
                                gapRatio: 0.14,
                            },
                            {
                                orientation: 'left',
                                rows: 4,
                                columns: 2,
                                color: [0.76, 0.84, 0.94],
                                insetRatio: 0.2,
                                verticalInsetRatio: 0.16,
                                gapRatio: 0.14,
                            },
                        ]);

                        const westBlockTerrace = {
                            x: -1.7,
                            z: 0.3,
                            width: 0.68,
                            depth: 0.7,
                            baseHeight: westBlockMain.baseHeight + westBlockMain.height,
                            height: 0.2,
                            sideColor: [0.55, 0.67, 0.84],
                            roofColor: [0.71, 0.79, 0.9],
                            baseColor: [0.45, 0.57, 0.76],
                        };
                        addBuilding(westBlockTerrace);

                        [
                            { x: -1.92, z: 0.32, width: 0.2, depth: 0.34 },
                            { x: -1.48, z: 0.46, width: 0.22, depth: 0.22 },
                        ].forEach((unit) => {
                            addBuilding({
                                ...unit,
                                baseHeight: westBlockTerrace.baseHeight + westBlockTerrace.height,
                                height: 0.16,
                                sideColor: [0.39, 0.47, 0.56],
                                roofColor: [0.52, 0.6, 0.68],
                                baseColor: [0.32, 0.4, 0.49],
                                includeBottom: false,
                            });
                        });


                        const eastBlockBase = {
                            x: 1.8,
                            z: -0.4,
                            width: 1.3,
                            depth: 0.95,
                            height: 0.25,
                            sideColor: [0.38, 0.48, 0.64],
                            roofColor: [0.5, 0.6, 0.74],
                            baseColor: [0.3, 0.38, 0.52],
                        };
                        addBuilding(eastBlockBase);

                        const eastBlockMain = {
                            x: 1.8,
                            z: -0.4,
                            width: 1.05,
                            depth: 0.72,
                            baseHeight: eastBlockBase.height,
                            height: 1.25,
                            sideColor: [0.57, 0.69, 0.85],
                            roofColor: [0.74, 0.82, 0.93],
                            baseColor: [0.46, 0.59, 0.78],
                        };
                        addBuilding(eastBlockMain);
                        applyFacades(eastBlockMain, [
                            {
                                orientation: 'front',
                                rows: 3,
                                columns: 3,
                                color: [0.81, 0.88, 0.97],
                                insetRatio: 0.14,
                                verticalInsetRatio: 0.16,
                                gapRatio: 0.14,
                            },
                            {
                                orientation: 'back',
                                rows: 3,
                                columns: 3,
                                color: [0.81, 0.88, 0.97],
                                insetRatio: 0.14,
                                verticalInsetRatio: 0.16,
                                gapRatio: 0.14,
                            },
                            {
                                orientation: 'right',
                                rows: 3,
                                columns: 2,
                                color: [0.78, 0.86, 0.96],
                                insetRatio: 0.18,
                                verticalInsetRatio: 0.16,
                                gapRatio: 0.14,
                            },
                            {
                                orientation: 'left',
                                rows: 3,
                                columns: 2,
                                color: [0.78, 0.86, 0.96],
                                insetRatio: 0.18,
                                verticalInsetRatio: 0.16,
                                gapRatio: 0.14,
                            },
                        ]);

                        const eastBlockTier = {
                            x: 1.8,
                            z: -0.4,
                            width: 0.78,
                            depth: 0.58,
                            baseHeight: eastBlockMain.baseHeight + eastBlockMain.height,
                            height: 0.28,
                            sideColor: [0.63, 0.75, 0.9],
                            roofColor: [0.8, 0.87, 0.96],
                            baseColor: [0.54, 0.66, 0.84],
                        };
                        addBuilding(eastBlockTier);

                        addBuilding({
                            x: 1.52,
                            z: -0.35,
                            width: 0.3,
                            depth: 0.4,
                            baseHeight: eastBlockTier.baseHeight + eastBlockTier.height,
                            height: 0.22,
                            sideColor: [0.45, 0.55, 0.68],
                            roofColor: [0.6, 0.68, 0.78],
                            baseColor: [0.38, 0.47, 0.58],
                            includeBottom: false,
                        });
                        addBuilding({
                            x: 2.06,
                            z: -0.46,
                            width: 0.26,
                            depth: 0.36,
                            baseHeight: eastBlockTier.baseHeight + eastBlockTier.height,
                            height: 0.18,
                            sideColor: [0.47, 0.57, 0.7],
                            roofColor: [0.62, 0.7, 0.8],
                            baseColor: [0.4, 0.48, 0.6],
                            includeBottom: false,
                        });


                        const northBlockBase = {
                            x: -0.6,
                            z: 1.9,
                            width: 0.92,
                            depth: 1.4,
                            height: 0.22,
                            sideColor: [0.38, 0.5, 0.68],
                            roofColor: [0.5, 0.6, 0.74],
                            baseColor: [0.3, 0.4, 0.56],
                        };
                        addBuilding(northBlockBase);

                        const northBlockMain = {
                            x: -0.6,
                            z: 1.9,
                            width: 0.78,
                            depth: 1.18,
                            baseHeight: northBlockBase.height,
                            height: 1.05,
                            sideColor: [0.54, 0.66, 0.82],
                            roofColor: [0.7, 0.79, 0.9],
                            baseColor: [0.42, 0.53, 0.7],
                        };
                        addBuilding(northBlockMain);
                        applyFacades(northBlockMain, [
                            {
                                orientation: 'front',
                                rows: 3,
                                columns: 3,
                                color: [0.8, 0.87, 0.96],
                                insetRatio: 0.16,
                                verticalInsetRatio: 0.18,
                                gapRatio: 0.14,
                            },
                            {
                                orientation: 'back',
                                rows: 3,
                                columns: 3,
                                color: [0.8, 0.87, 0.96],
                                insetRatio: 0.16,
                                verticalInsetRatio: 0.18,
                                gapRatio: 0.14,
                            },
                            {
                                orientation: 'left',
                                rows: 3,
                                columns: 2,
                                color: [0.78, 0.85, 0.94],
                                insetRatio: 0.18,
                                verticalInsetRatio: 0.18,
                                gapRatio: 0.14,
                            },
                        ]);

                        const northRoof = {
                            x: -0.6,
                            z: 1.9,
                            width: 0.84,
                            depth: 1.24,
                            baseHeight: northBlockMain.baseHeight + northBlockMain.height,
                            height: 0.18,
                            sideColor: [0.62, 0.74, 0.88],
                            roofColor: [0.76, 0.83, 0.92],
                            baseColor: [0.5, 0.62, 0.8],
                        };
                        addBuilding(northRoof);

                        [
                            { x: -0.84, z: 1.78, width: 0.28, depth: 0.3 },
                            { x: -0.36, z: 2.04, width: 0.26, depth: 0.32 },
                        ].forEach((green) => {
                            addBuilding({
                                ...green,
                                baseHeight: northRoof.baseHeight + northRoof.height,
                                height: 0.12,
                                sideColor: [0.33, 0.46, 0.42],
                                roofColor: [0.42, 0.56, 0.5],
                                baseColor: [0.28, 0.38, 0.35],
                                includeBottom: false,
                            });
                        });


                        const northeastBase = {
                            x: 1.2,
                            z: 1.6,
                            width: 0.82,
                            depth: 0.82,
                            height: 0.24,
                            sideColor: [0.42, 0.55, 0.74],
                            roofColor: [0.55, 0.66, 0.82],
                            baseColor: [0.34, 0.45, 0.62],
                        };
                        addBuilding(northeastBase);

                        const northeastMain = {
                            x: 1.2,
                            z: 1.6,
                            width: 0.68,
                            depth: 0.68,
                            baseHeight: northeastBase.height,
                            height: 1.7,
                            sideColor: [0.6, 0.72, 0.9],
                            roofColor: [0.76, 0.84, 0.95],
                            baseColor: [0.48, 0.59, 0.78],
                        };
                        addBuilding(northeastMain);
                        applyFacades(northeastMain, [
                            {
                                orientation: 'front',
                                rows: 5,
                                columns: 2,
                                color: [0.84, 0.9, 0.98],
                                insetRatio: 0.18,
                                verticalInsetRatio: 0.12,
                                gapRatio: 0.12,
                            },
                            {
                                orientation: 'back',
                                rows: 5,
                                columns: 2,
                                color: [0.84, 0.9, 0.98],
                                insetRatio: 0.18,
                                verticalInsetRatio: 0.12,
                                gapRatio: 0.12,
                            },
                        ]);

                        const northeastCrown = {
                            x: 1.2,
                            z: 1.6,
                            width: 0.5,
                            depth: 0.5,
                            baseHeight: northeastMain.baseHeight + northeastMain.height,
                            height: 0.22,
                            sideColor: [0.68, 0.79, 0.92],
                            roofColor: [0.82, 0.88, 0.96],
                            baseColor: [0.56, 0.68, 0.84],
                        };
                        addBuilding(northeastCrown);

                        addBuilding({
                            x: 1.2,
                            z: 1.6,
                            width: 0.18,
                            depth: 0.18,
                            baseHeight: northeastCrown.baseHeight + northeastCrown.height,
                            height: 0.32,
                            sideColor: [0.9, 0.94, 0.99],
                            roofColor: [0.97, 0.98, 1.0],
                            includeBottom: false,
                        });


                        const southwestBase = {
                            x: -1.1,
                            z: -1.6,
                            width: 0.72,
                            depth: 1.18,
                            height: 0.22,
                            sideColor: [0.34, 0.46, 0.62],
                            roofColor: [0.46, 0.56, 0.72],
                            baseColor: [0.26, 0.36, 0.52],
                        };
                        addBuilding(southwestBase);

                        const southwestMain = {
                            x: -1.1,
                            z: -1.6,
                            width: 0.6,
                            depth: 1.0,
                            baseHeight: southwestBase.height,
                            height: 0.95,
                            sideColor: [0.47, 0.6, 0.78],
                            roofColor: [0.66, 0.76, 0.88],
                            baseColor: [0.35, 0.48, 0.66],
                        };
                        addBuilding(southwestMain);
                        applyFacades(southwestMain, [
                            {
                                orientation: 'front',
                                rows: 3,
                                columns: 2,
                                color: [0.78, 0.86, 0.95],
                                insetRatio: 0.18,
                                verticalInsetRatio: 0.18,
                                gapRatio: 0.15,
                            },
                            {
                                orientation: 'back',
                                rows: 3,
                                columns: 2,
                                color: [0.78, 0.86, 0.95],
                                insetRatio: 0.18,
                                verticalInsetRatio: 0.18,
                                gapRatio: 0.15,
                            },
                        ]);

                        addBuilding({
                            x: -1.1,
                            z: -1.6,
                            width: 0.66,
                            depth: 1.06,
                            baseHeight: southwestMain.baseHeight + southwestMain.height,
                            height: 0.14,
                            sideColor: [0.56, 0.68, 0.84],
                            roofColor: [0.7, 0.79, 0.9],
                            baseColor: [0.44, 0.56, 0.74],
                        });


                        const southPromenade = {
                            x: 0.9,
                            z: -1.8,
                            width: 2.4,
                            depth: 0.5,
                            height: 0.18,
                            sideColor: [0.33, 0.38, 0.45],
                            roofColor: [0.46, 0.5, 0.56],
                            baseColor: [0.26, 0.3, 0.36],
                        };
                        addBuilding(southPromenade);

                        addBuilding({
                            x: 0.9,
                            z: -1.8,
                            width: 2.4,
                            depth: 0.5,
                            baseHeight: southPromenade.height,
                            height: 0.08,
                            sideColor: [0.4, 0.45, 0.52],
                            roofColor: [0.52, 0.57, 0.62],
                            baseColor: [0.32, 0.36, 0.43],
                        });

                        [
                            { x: 0.15, z: -1.8, width: 0.18, depth: 0.18 },
                            { x: 1.65, z: -1.8, width: 0.18, depth: 0.18 },
                        ].forEach((lamp) => {
                            addBuilding({
                                ...lamp,
                                baseHeight: southPromenade.height + 0.08,
                                height: 0.3,
                                sideColor: [0.62, 0.72, 0.86],
                                roofColor: [0.78, 0.84, 0.92],
                                baseColor: [0.5, 0.6, 0.74],
                                includeBottom: false,
                            });
                        });


                        const farWestBase = {
                            x: -2.2,
                            z: -0.8,
                            width: 0.6,
                            depth: 0.6,
                            height: 0.22,
                            sideColor: [0.42, 0.54, 0.72],
                            roofColor: [0.55, 0.66, 0.82],
                            baseColor: [0.34, 0.45, 0.64],
                        };
                        addBuilding(farWestBase);

                        const farWestTower = {
                            x: -2.2,
                            z: -0.8,
                            width: 0.5,
                            depth: 0.5,
                            baseHeight: farWestBase.height,
                            height: 1.4,
                            sideColor: [0.62, 0.74, 0.9],
                            roofColor: [0.78, 0.86, 0.96],
                            baseColor: [0.5, 0.62, 0.78],
                        };
                        addBuilding(farWestTower);
                        applyFacades(farWestTower, [
                            {
                                orientation: 'front',
                                rows: 4,
                                columns: 2,
                                color: [0.88, 0.93, 0.99],
                                insetRatio: 0.18,
                                verticalInsetRatio: 0.14,
                                gapRatio: 0.12,
                            },
                        ]);

                        addBuilding({
                            x: -2.2,
                            z: -0.8,
                            width: 0.32,
                            depth: 0.32,
                            baseHeight: farWestTower.baseHeight + farWestTower.height,
                            height: 0.24,
                            sideColor: [0.74, 0.83, 0.95],
                            roofColor: [0.86, 0.91, 0.98],
                            baseColor: [0.63, 0.74, 0.9],
                        });


                        const eastParkBase = {
                            x: 2.1,
                            z: 1.1,
                            width: 1.05,
                            depth: 0.7,
                            height: 0.24,
                            sideColor: [0.36, 0.48, 0.66],
                            roofColor: [0.48, 0.58, 0.74],
                            baseColor: [0.28, 0.38, 0.56],
                        };
                        addBuilding(eastParkBase);

                        const eastParkMain = {
                            x: 2.1,
                            z: 1.1,
                            width: 0.92,
                            depth: 0.58,
                            baseHeight: eastParkBase.height,
                            height: 1.08,
                            sideColor: [0.49, 0.63, 0.82],
                            roofColor: [0.68, 0.78, 0.9],
                            baseColor: [0.36, 0.49, 0.68],
                        };
                        addBuilding(eastParkMain);
                        applyFacades(eastParkMain, [
                            {
                                orientation: 'front',
                                rows: 4,
                                columns: 2,
                                color: [0.79, 0.87, 0.96],
                                insetRatio: 0.16,
                                verticalInsetRatio: 0.16,
                                gapRatio: 0.14,
                            },
                            {
                                orientation: 'back',
                                rows: 4,
                                columns: 2,
                                color: [0.79, 0.87, 0.96],
                                insetRatio: 0.16,
                                verticalInsetRatio: 0.16,
                                gapRatio: 0.14,
                            },
                        ]);

                        const eastParkRoof = {
                            x: 2.1,
                            z: 1.1,
                            width: 0.98,
                            depth: 0.64,
                            baseHeight: eastParkMain.baseHeight + eastParkMain.height,
                            height: 0.16,
                            sideColor: [0.56, 0.68, 0.84],
                            roofColor: [0.72, 0.8, 0.9],
                            baseColor: [0.44, 0.56, 0.74],
                        };
                        addBuilding(eastParkRoof);

                        addBuilding({
                            x: 2.1,
                            z: 1.1,
                            width: 0.58,
                            depth: 0.34,
                            baseHeight: eastParkRoof.baseHeight + eastParkRoof.height,
                            height: 0.14,
                            sideColor: [0.4, 0.52, 0.68],
                            roofColor: [0.54, 0.64, 0.78],
                            baseColor: [0.32, 0.42, 0.58],
                            includeBottom: false,
                        });

                        const positions = new Float32Array(positionsArray);
                        const colors = new Float32Array(colorsArray);
                        const normals = new Float32Array(normalsArray);
                        const indices = new Uint16Array(indicesArray);

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

                        const staticRotation = {
                            x: (28 * Math.PI) / 180,
                            y: (32 * Math.PI) / 180,
                        };

                        const drawScene = () => {
                            const aspect = canvas.width / canvas.height || 1;

                            perspectiveMatrix(
                                projection,
                                (45 * Math.PI) / 180,
                                aspect,
                                0.1,
                                100
                            );

                            rotateXMatrix(rotationX, staticRotation.x);
                            rotateYMatrix(rotationY, staticRotation.y);

                            multiplyMatrices(model, rotationY, rotationX);
                            multiplyMatrices(modelView, view, model);
                            multiplyMatrices(modelViewProjection, projection, modelView);

                            gl.uniformMatrix4fv(matrixLocation, false, modelViewProjection);
                            gl.uniformMatrix4fv(modelMatrixLocation, false, model);

                            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                            gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
                        };

                        const scheduleDraw = () => {
                            if (animationFrameId !== null) {
                                cancelAnimationFrame(animationFrameId);
                            }
                            animationFrameId = requestAnimationFrame(() => {
                                animationFrameId = null;
                                resizeCanvas();
                                drawScene();
                            });
                        };

                        resizeCanvas();
                        scheduleDraw();
                        window.addEventListener('resize', scheduleDraw);

                        if (status) {
                            status.textContent = '';
                            status.classList.remove('error');
                            status.classList.add('hidden');
                        }

                        resolve({
                            stop: () => {
                                if (animationFrameId !== null) {
                                    cancelAnimationFrame(animationFrameId);
                                    animationFrameId = null;
                                }
                                window.removeEventListener('resize', scheduleDraw);
                            },
                        });
                    } catch (error) {
                        console.error('Failed to initialize 3D scene', error);
                        if (status) {
                            status.textContent =
                                'The skyline view could not be loaded. Please ensure your browser supports WebGL.';
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
    
