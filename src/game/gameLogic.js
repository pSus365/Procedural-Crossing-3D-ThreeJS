import { rows, scene } from './sceneData.js';

export function updateCars(dt, playTime = 0) {
    const playerZ = scene.player?.position ? scene.player.position[2] : 0.70;
    const edge = 7.5;
    const minDistance = 0.85;

    // Współczynnik przyspieszenia z czasem rozgrywki (auta mocniej się rozpędzają z czasem)
    const timeFactor = 1.0 + Math.min(playTime * 0.02, 2.2);

    // 1. Ruch samochodów (animowane tylko auta przed graczem i w jego polu widzenia)
    for (const car of scene.cars) {
        // Pasy, które gracz już przeszedł (znajdujące się za plecami gracza: z > playerZ + 1.0),
        // nie mają już animacji samochodów
        if (car.position[2] > playerZ + 1.0) {
            continue;
        }

        const base = car.baseSpeed !== undefined ? car.baseSpeed : car.speed;
        car.speed = base * timeFactor;
        car.position[0] += car.speed * dt;
        if (car.speed > 0 && car.position[0] > edge) {
            car.position[0] = -edge;
        } else if (car.speed < 0 && car.position[0] < -edge) {
            car.position[0] = edge;
        }
    }

    // 2. Zapobieganie nachodzeniu na siebie samochodów na tym samym pasie (grupowanie per pas O(N))
    const lanes = new Map();
    for (let i = 0; i < scene.cars.length; i++) {
        const car = scene.cars[i];
        if (car.position[2] > playerZ + 1.0) continue; // pomijamy pasy za graczem
        const key = Math.round(car.position[2] * 100);
        let lane = lanes.get(key);
        if (!lane) {
            lane = [];
            lanes.set(key, lane);
        }
        lane.push(car);
    }

    for (const laneCars of lanes.values()) {
        const len = laneCars.length;
        if (len <= 1) continue;
        for (let i = 0; i < len; i++) {
            const carA = laneCars[i];
            for (let j = 0; j < len; j++) {
                if (i === j) continue;
                const carB = laneCars[j];
                const diffX = carB.position[0] - carA.position[0];

                // carA jedzie w prawo i najeżdża na carB z tyłu
                if (carA.speed > 0 && diffX > 0 && diffX < minDistance) {
                    carA.position[0] = carB.position[0] - minDistance;
                }
                // carA jedzie w lewo i najeżdża na carB z tyłu
                else if (carA.speed < 0 && diffX < 0 && Math.abs(diffX) < minDistance) {
                    carA.position[0] = carB.position[0] + minDistance;
                }
            }
        }
    }
}

export function getBaseY(x, z) {
    const waterRow = rows.find(r => r.type === 'water' && Math.abs(r.z - z) < 0.16);
    if (waterRow) {
        const bridges = waterRow.bridges || [];
        const onBridge = bridges.some(bx => Math.abs(x - bx) < 0.16);
        if (onBridge) {
            return 0.075; // Wysokość kładki mostku ponad poziomem wody
        }
        return -0.06; // Zanurzenie w wodzie po skoku do rzeki
    }
    return 0.0; // Poziom gruntu dla trawy i asfaltu
}

let jumpStart = [0, 0, 0.70];
let jumpTarget = [0, 0, 0.70];
let jumpProgress = 1.0;
const JUMP_DURATION = 0.16; // Czas trwania skoku w sekundach

export function isPlayerInAir() {
    return jumpProgress < 0.85;
}

export function updatePlayer(dt) {
    if (jumpProgress < 1.0) {
        jumpProgress += dt / JUMP_DURATION;
        if (jumpProgress >= 1.0) {
            jumpProgress = 1.0;
            scene.player.position[0] = jumpTarget[0];
            scene.player.position[1] = jumpTarget[1];
            scene.player.position[2] = jumpTarget[2];
        } else {
            const t = jumpProgress;
            // Płynna interpolacja wysokości podstawy (np. wskakiwanie na kładkę lub wpadnięcie do wody) + łuk skoku
            const startY = jumpStart[1];
            const targetY = jumpTarget[1];
            const currentBaseY = startY + (targetY - startY) * t;
            const jumpArc = 0.22 * 4 * t * (1 - t);
            scene.player.position[1] = currentBaseY + jumpArc;

            // Płynny ruch poziomy X i Z
            scene.player.position[0] = jumpStart[0] + (jumpTarget[0] - jumpStart[0]) * t;
            scene.player.position[2] = jumpStart[2] + (jumpTarget[2] - jumpStart[2]) * t;
        }
    }
}

export function resetPlayerAnimation() {
    jumpProgress = 1.0;
    jumpStart = [...scene.player.position];
    jumpTarget = [...scene.player.position];
}

export function movePlayer(key) {
    // Jeśli gracz szybko klika, natychmiast dokańczamy poprzedni skok
    if (jumpProgress < 1.0) {
        scene.player.position[0] = jumpTarget[0];
        scene.player.position[1] = jumpTarget[1];
        scene.player.position[2] = jumpTarget[2];
    }

    const p = scene.player.position;
    const stepX = 0.25;
    const limitX = 1.25; // pole gry w osi X
    let nextX = p[0];
    let nextZ = p[2];

    if (key === 'ArrowLeft') nextX = Math.max(-limitX, p[0] - stepX);
    if (key === 'ArrowRight') nextX = Math.min(limitX, p[0] + stepX);

    const index = rows.findIndex(row => Math.abs(row.z - p[2]) < 0.18);
    if (key === 'ArrowUp' && index >= 0 && index < rows.length - 1) {
        nextZ = rows[index + 1].z;
    }
    if (key === 'ArrowDown' && index > 0) {
        nextZ = rows[index - 1].z;
    }

    // Wykrywanie kolizji z przeszkodami (drzewa, pniaki; trawa, mostki i niskie kamienie nie blokują)
    const isBlockedByTree = scene.trees.some(tree => {
        if (tree.propType === 'grass' || tree.propType === 'bridge' || tree.propType === 'rock') return false;
        const dx = Math.abs(tree.position[0] - nextX);
        const dz = Math.abs(tree.position[2] - nextZ);
        return dx < 0.22 && dz < 0.20;
    });

    if (isBlockedByTree) {
        return; // Ruch zablokowany przez drzewo/pniak, gracz nie traci życia
    }

    // Inicjacja sprężystego skoku z dopasowaniem wysokości celu (w tym wskok do wody i utonięcie)
    if (nextX !== p[0] || nextZ !== p[2]) {
        const targetBaseY = getBaseY(nextX, nextZ);
        jumpStart = [p[0], p[1], p[2]];
        jumpTarget = [nextX, targetBaseY, nextZ];
        jumpProgress = 0.0;

        if (nextZ !== p[2]) {
            const targetRow = rows.find(r => Math.abs(r.z - nextZ) < 0.18);
            if (targetRow) {
                console.log(`[Ruch gracza] laneIndex: ${targetRow.laneIndex} | z: ${targetRow.z.toFixed(2)} (${targetRow.type}) | rows.indexOf: ${rows.indexOf(targetRow)}`);
            }
        }
    }
}