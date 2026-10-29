import { drawMesh } from './renderer.js';

const GROUND_Y = -0.45;

// Ta sama płaszczyzna przedstawia drogę lub trawę.
export function drawRow(gl, planeMesh, uniforms, row) {
    // 1. Sprawdzamy domyślny kolor na podstawie typu
    const defaultColor = row.type === 'road'
        ? [0.19, 0.19, 0.42]
        : [0.17, 0.64, 0.25];

    // 2. Jeśli podano 'other_color', używamy go. Jeśli nie, używamy domyślnego
    const finalColor = row.other_color ?? defaultColor;

    drawMesh(gl, planeMesh, uniforms, {
        position: [0.0, GROUND_Y, row.z],
        scale: row.scale ?? [1.8, 1.0, 0.65],
        color: finalColor
    });
}

// Przerywana linia rozdzielająca pasy ruchu
export function drawRoadDashes(gl, planeMesh, uniforms, z = 0.0) {
    const dashCount = 13;
    const startX = -1.20;
    const endX = 1.20;
    const step = (endX - startX) / (dashCount - 1);
    for (let i = 0; i < dashCount; i++) {
        const x = startX + i * step;
        drawMesh(gl, planeMesh, uniforms, {
            position: [x, GROUND_Y + 0.002, z],
            scale: [0.11, 1.0, 0.025],
            color: [0.95, 0.95, 0.95]
        });
    }
}

// Gracz: cień na ziemi + ciało + głowa (ze sprężystą animacją skoku).
export function drawPlayer(gl, cubeMesh, planeMesh, uniforms, player) {
    const [x, y, z] = player.position;
    const py = y || 0.0;

    // Półprzezroczysty, miękki cień: kurczy się i blednie proporcjonalnie do wysokości skoku
    const shadowFactor = Math.max(0.35, 1.0 - py * 2.0);
    const shadowAlpha = Math.max(0.08, 0.28 - py * 0.65);
    drawMesh(gl, planeMesh, uniforms, {
        position: [x, GROUND_Y + 0.0025, z],
        scale: [0.20 * shadowFactor, 1.0, 0.20 * shadowFactor],
        color: [0.0, 0.0, 0.0, shadowAlpha]
    });

    // Subtelny efekt squash & stretch (rozciągnięcie w locie, powrót przy lądowaniu)
    const stretchY = 1.0 + py * 0.45;
    const squashXZ = 1.0 - py * 0.22;

    drawMesh(gl, cubeMesh, uniforms, {
        position: [x, GROUND_Y + 0.12 + py, z],
        scale: [0.18 * squashXZ, 0.24 * stretchY, 0.18 * squashXZ],
        color: [1.0, 0.72, 0.10]
    });
    drawMesh(gl, cubeMesh, uniforms, {
        position: [x, GROUND_Y + (0.24 * stretchY) + 0.06 + py, z],
        scale: [0.13 * squashXZ, 0.13 * stretchY, 0.13 * squashXZ],
        color: [1.0, 0.85, 0.25]
    });
}

// Samochód: cień pod spodem + nadwozie + dach.
export function drawCar(gl, cubeMesh, planeMesh, uniforms, car) {
    const [x, , z] = car.position;

    // Półprzezroczysty cień pod samochodem na nawierzchni
    drawMesh(gl, planeMesh, uniforms, {
        position: [x, GROUND_Y + 0.0025, z],
        scale: [0.58, 1.0, 0.25],
        color: [0.0, 0.0, 0.0, 0.28]
    });

    drawMesh(gl, cubeMesh, uniforms, {
        position: [x, GROUND_Y + 0.11, z],
        scale: [0.55, 0.20, 0.22],
        color: car.color
    });
    drawMesh(gl, cubeMesh, uniforms, {
        position: [x, GROUND_Y + 0.24, z],
        scale: [0.22, 0.10, 0.18],
        color: car.color
    });
}

// Drzewo: cień + pień + korona.
export function drawTree(gl, cubeMesh, planeMesh, uniforms, tree) {
    const [x, , z] = tree.position;

    const trunkHeight = tree.trunkHeight ?? 0.34;
    const color = tree.color ?? [0.10, 0.54, 0.18];

    // Półprzezroczysty cień pod koroną drzewa
    drawMesh(gl, planeMesh, uniforms, {
        position: [x, GROUND_Y + 0.0025, z],
        scale: [0.36, 1.0, 0.36],
        color: [0.0, 0.0, 0.0, 0.24]
    });

    drawMesh(gl, cubeMesh, uniforms, {
        position: [x, GROUND_Y + (trunkHeight / 2), z],
        scale: [0.10, trunkHeight, 0.10],
        color: [0.43, 0.23, 0.09]
    });
    drawMesh(gl, cubeMesh, uniforms, {
        position: [x, GROUND_Y + (trunkHeight + 0.12), z],
        scale: [0.34, 0.34, 0.34],
        color: color
    });
}
