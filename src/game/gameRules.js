import { rows, scene, initWorld, updateInfiniteWorld } from './sceneData.js';
import { resetPlayerAnimation, isPlayerInAir } from './gameLogic.js';

export const gameState = {
    status: 'playing', // playing, lost
    score: 0,
    bestLane: 0,
    lives: 3,
    highScore: 0,
    playTime: 0,
    respawnMessage: null,
    respawnMessageTimer: 0
};

export function checkCollision() {
    const player = scene.player.position;
    const halfPlayerX = 0.09;
    const halfCarX = 0.20;
    const halfPlayerZ = 0.09;
    const halfCarZ = 0.11;
    return scene.cars.some(car => {
        const dx = Math.abs(player[0] - car.position[0]);
        const dz = Math.abs(player[2] - car.position[2]);
        return dx < halfPlayerX + halfCarX &&
            dz < halfPlayerZ + halfCarZ;
    });
}

export function checkWaterDrowning() {
    // Gracz nie tonie w trakcie wyskoku w powietrzu
    if (isPlayerInAir()) return false;

    const player = scene.player.position;
    if (player[1] > 0.02) return false;

    const waterRow = rows.find(r => r.type === 'water' && Math.abs(r.z - player[2]) < 0.16);
    if (!waterRow) return false;

    // Pozycje mostków przypisane do danego pasma rzeki
    const bridgePositions = waterRow.bridges || [-0.75, 0.0, 0.75];
    const onBridge = bridgePositions.some(bx => Math.abs(player[0] - bx) < 0.16);
    return !onBridge;
}

export function updateGameState(dt = 0.016) {
    if (gameState.status !== 'playing') return null;

    gameState.playTime = (gameState.playTime || 0) + dt;

    const hitCar = checkCollision();
    const drowned = checkWaterDrowning();

    if (hitCar || drowned) {
        gameState.lives -= 1;
        gameState.lastHazard = drowned ? 'water' : 'car';
        gameState.bestLane = 0;
        gameState.playTime = 0; // zresetowanie przyspieszenia aut dla nowego podejścia
        scene.player.position[0] = 0.0;
        scene.player.position[1] = 0.0;
        scene.player.position[2] = 0.70; // powrót na pole startowe
        resetPlayerAnimation();

        if (gameState.lives <= 0) {
            gameState.status = 'lost';
            gameState.respawnMessage = null;
        } else {
            gameState.respawnMessage = drowned
                ? 'Wpadłeś do rzeki! Tracisz 1 życie!'
                : 'Zostałeś potrącony! Tracisz 1 życie!';
            gameState.respawnMessageTimer = 2.0;
        }

        return { died: true };
    }

    // Bezwzględne ustalanie postępu w świecie (odporne na usuwanie starych pasów z początku tablicy)
    const currentStep = Math.max(0, Math.round((0.70 - scene.player.position[2]) / 0.35));

    if (currentStep > gameState.bestLane) {
        gameState.score += (currentStep - gameState.bestLane) * 10;
        gameState.bestLane = currentStep;

        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
        }
    }

    // Zawsze dbamy o generowanie kolejnych pasów daleko w głąb mgły
    updateInfiniteWorld(scene.player.position[2]);
    return null;
}

export function restartGame() {
    initWorld(); // przywrócenie czystego świata początkowego
    scene.player.position = [0.0, 0.0, 0.70];
    gameState.status = 'playing';
    gameState.score = 0;
    gameState.bestLane = 0;
    gameState.lives = 3;
    gameState.lastHazard = null;
    gameState.playTime = 0;
    gameState.respawnMessage = null;
    gameState.respawnMessageTimer = 0;
}