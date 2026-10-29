import { rows, scene as gameScene } from '../game/sceneData.js';
import { objects } from './objects.js';
import { gameState } from '../game/gameRules.js';

export const STEP = 0.35;
export const AHEAD = 5;
export const BEHIND = 3;
export const INITIAL_ROWS = rows.length;
export const FIRST_Z = rows.length > 0 ? Math.max(...rows.map(row => row.z)) : 0.70;
export let nextIndex = INITIAL_ROWS;

export function prepareWorld() {
    rows.sort((a, b) => b.z - a.z);
    rows.forEach((row, index) => {
        row.laneIndex = index;
    });
}

export function playerLane() {
    const row = rows.find(r =>
        Math.abs(r.z - gameScene.player.position[2]) < 0.001);
    return row?.laneIndex ?? 0;
}

export function removeGeneratedRow(scene3D, row) {
    for (let i = gameScene.cars.length - 1; i >= 0; i--) {
        if (gameScene.cars[i].laneIndex !== row.laneIndex && Math.abs(gameScene.cars[i].position[2] - row.z) >= 0.05) continue;
        if (objects.cars[i]) scene3D.remove(objects.cars[i]);
        objects.cars.splice(i, 1);
        gameScene.cars.splice(i, 1);
    }

    for (let i = gameScene.trees.length - 1; i >= 0; i--) {
        if (gameScene.trees[i].laneIndex !== row.laneIndex && Math.abs(gameScene.trees[i].position[2] - row.z) >= 0.05) continue;
        if (objects.trees[i]) scene3D.remove(objects.trees[i]);
        objects.trees.splice(i, 1);
        gameScene.trees.splice(i, 1);
    }

    if (objects.rows && objects.rows.has(row.laneIndex)) {
        scene3D.remove(objects.rows.get(row.laneIndex));
        objects.rows.delete(row.laneIndex);
    }
    const rIdx = rows.indexOf(row);
    if (rIdx !== -1) rows.splice(rIdx, 1);
}

export function resetWorld(scene3D, carTemplate, treeTemplate) {
    for (const row of [...rows]) {
        if (row.laneIndex >= INITIAL_ROWS) {
            removeGeneratedRow(scene3D, row);
        }
    }
    nextIndex = INITIAL_ROWS;
}
