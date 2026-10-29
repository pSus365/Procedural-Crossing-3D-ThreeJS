import { rows, scene, initWorld } from './game/sceneData.js';
import { prepareWorld } from './three/world.js';
import * as THREE from 'three';
import { loadTemplate, makeInstance, countTriangles } from './three/modelLoader.js';
import { createBasicObjects, addModels, syncObjects, setPlayerModel, resetWorldMeshes, objects, initClouds, updateClouds, GROUND_Y } from './three/objects.js';
import { updateCars, movePlayer, updatePlayer, resetPlayerAnimation } from './game/gameLogic.js';
import {
    gameState, updateGameState, restartGame
} from './game/gameRules.js';

const canvas = document.querySelector('#gameCanvas');
const scoreLabel = document.querySelector('#score');
const highscoreLabel = document.querySelector('#highscore');
const livesLabel = document.querySelector('#lives');
const complexityLabel = document.querySelector('#complexity');
const statusLabel = document.querySelector('#status');

const GAME_MODE = 'endless';

function createSunsetSkyTexture() {
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 2;
    skyCanvas.height = 512;
    const ctx = skyCanvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    // Malowniczy gradient zachodu słońca
    gradient.addColorStop(0.00, '#121026'); // głęboki zmierzchowy fiolet u góry
    gradient.addColorStop(0.25, '#2e183c'); // fiolet wieczornego nieba
    gradient.addColorStop(0.50, '#662243'); // purpura / karmazyn
    gradient.addColorStop(0.70, '#b83b2e'); // ciepły szkarłat
    gradient.addColorStop(0.85, '#e86a2f'); // płomienny pomarańcz
    gradient.addColorStop(0.95, '#faa83e'); // złocisty blask słońca
    gradient.addColorStop(1.00, '#fed16a'); // jasny ciepły horyzont
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(skyCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

const scene3D = new THREE.Scene();
scene3D.background = createSunsetSkyTexture();
// Delikatna mgła w odcieniu zachodu słońca (5.5 do 13.0 - wąski, klimatyczny render distance chroniący sprzęt przed przegrzaniem)
scene3D.fog = new THREE.Fog(0xb8422e, 5.5, 13.0);

const renderer3D = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'default' });
// Ograniczenie pixelRatio do 1.0 zapobiega 4-krotnemu overdraw na ekranach Retina i przegrzewaniu laptopa
renderer3D.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.0));
renderer3D.toneMapping = THREE.ACESFilmicToneMapping;
renderer3D.toneMappingExposure = 1.08;
renderer3D.shadowMap.enabled = true;
renderer3D.shadowMap.type = THREE.PCFShadowMap;

// Kamera perspektywiczna 3D umieszczona za plecami postaci z ograniczonym zasięgiem (25)
const camera3D = new THREE.PerspectiveCamera(50, 1, 0.1, 25);

// Oświetlenie zachodu słońca (Sunset Lighting):
// 1. Światło otoczenia nieba i odbicia od ziemi
const hemiLight = new THREE.HemisphereLight(0xff8866, 0x361e30, 1.35);
scene3D.add(hemiLight);

// 2. Główne światło słoneczne (złoto-pomarańczowe rzucające długie, klimatyczne cienie)
const sunLight = new THREE.DirectionalLight(0xffa24c, 2.9);
sunLight.position.set(-3.5, 5.0, 2.5);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 512;
sunLight.shadow.mapSize.height = 512;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 20;
sunLight.shadow.bias = -0.0006;
sunLight.shadow.normalBias = 0.02;

const shadowSpan = 5.5;
sunLight.shadow.camera.left = -shadowSpan;
sunLight.shadow.camera.right = shadowSpan;
sunLight.shadow.camera.top = 7.5;
sunLight.shadow.camera.bottom = -7.5;

scene3D.add(sunLight);
scene3D.add(sunLight.target);

// 3. Konturowe doświetlenie z chłodnym akcentem wieczornym
const rimLight = new THREE.DirectionalLight(0x7c54a8, 1.2);
rimLight.position.set(3, 3, -4);
scene3D.add(rimLight);

// Ozdobna tarcza zachodzącego słońca na horyzoncie
const sunGroup = new THREE.Group();
const sunCore = new THREE.Mesh(
    new THREE.CircleGeometry(1.9, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff2b2, depthWrite: false })
);
const sunGlow = new THREE.Mesh(
    new THREE.CircleGeometry(3.6, 32),
    new THREE.MeshBasicMaterial({
        color: 0xff5e20,
        transparent: true,
        opacity: 0.40,
        depthWrite: false
    })
);
sunGroup.add(sunGlow, sunCore);
scene3D.add(sunGroup);

createBasicObjects(scene3D);

// Pozycje kamery (na sprężynie)
let isPaused = false;
let previousTime = null;
let currentDt = 0.016;
let camX = 0.0;
let camY = 0.45;
let camZ = 0.70 + 1.40;
let camLookX = 0.0;
let camLookY = -0.10;
let camLookZ = 0.70 - 1.50;

function render() {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    renderer3D.setSize(w, h, false);
    camera3D.aspect = w / h;
    camera3D.updateProjectionMatrix();

    // Płynne podążanie kamery 3D za plecami gracza (sprężysta animacja na gumce)
    const p = scene.player.position;
    const targetCamX = p[0] * 0.40;
    const targetCamY = 0.45 + (p[1] || 0) * 0.35;
    const targetCamZ = p[2] + 1.40;

    const targetLookX = p[0] * 0.40;
    const targetLookY = -0.10;
    const targetLookZ = p[2] - 1.50;

    const springSpeed = 9.0;
    if (Math.abs(camZ - targetCamZ) > 3.0) {
        camX = targetCamX;
        camY = targetCamY;
        camZ = targetCamZ;
        camLookX = targetLookX;
        camLookY = targetLookY;
        camLookZ = targetLookZ;
    } else {
        const factor = Math.min(1.0, currentDt * springSpeed);
        camX += (targetCamX - camX) * factor;
        camY += (targetCamY - camY) * factor;
        camZ += (targetCamZ - camZ) * factor;
        camLookX += (targetLookX - camLookX) * factor;
        camLookY += (targetLookY - camLookY) * factor;
        camLookZ += (targetLookZ - camLookZ) * factor;
    }

    camera3D.position.set(camX, camY, camZ);
    camera3D.lookAt(camLookX, camLookY, camLookZ);

    // Oświetlenie i tarcza słońca podążają za graczem w nieskończoność
    sunLight.position.set(camX - 3.5, 5.0, camZ + 2.5);
    sunLight.target.position.set(camX, -0.45, camZ - 2.5);
    sunLight.target.updateMatrixWorld();
    rimLight.position.set(camX + 2.5, 2.5, camZ - 3.5);
    sunGroup.position.set(0, 0.9, camZ - 12.0);
    sunGroup.lookAt(camera3D.position);

    syncObjects(scene3D);
    updateClouds(currentDt, camZ);
    renderer3D.render(scene3D, camera3D);
}

function updateHud() {
    scoreLabel.textContent = `Punkty: ${gameState.score}`;
    highscoreLabel.textContent = `Rekord: ${gameState.highScore}`;
    livesLabel.textContent = `Życia: ${gameState.lives}`;
    if (complexityLabel) {
        complexityLabel.textContent = `Aktywne pasy: ${rows.length} | Samochody: ${scene.cars.length}`;
    }
    if (gameState.status === 'lost') {
        statusLabel.textContent = gameState.lastHazard === 'water'
            ? 'Utonąłeś w rzece! Koniec żyć! Naciśnij R.'
            : 'Potrącił cię samochód! Koniec żyć! Naciśnij R.';
    } else if (gameState.respawnMessage) {
        statusLabel.textContent = gameState.respawnMessage;
    } else {
        statusLabel.textContent = 'Biegnij przed siebie! Pamiętaj, aby przechodzić przez rzekę tylko po mostkach!';
    }
}

function frame(time) {
    const dt = previousTime === null
        ? 0
        : Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    currentDt = dt || 0.016;

    if (gameState.respawnMessageTimer > 0) {
        gameState.respawnMessageTimer -= currentDt;
        if (gameState.respawnMessageTimer <= 0) {
            gameState.respawnMessage = null;
        }
    }

    if (gameState.status === 'playing' && !isPaused) {
        updateCars(dt, gameState.playTime);
        updatePlayer(dt);
        const stateResult = updateGameState(dt);
        // Gdy gracz zostanie potrącony lub wpadnie do wody - świat z głębi przestaje istnieć,
        // plansza i obiekty 3D są natychmiast czyszczone i generowane od nowa na pasie startowym
        if (stateResult && stateResult.died) {
            initWorld();
            resetWorldMeshes(scene3D);
            if (typeof cloudTemplate !== 'undefined' && cloudTemplate) {
                initClouds(scene3D, cloudTemplate);
            }
            if (objects.playerRoot) {
                objects.playerRoot.rotation.y = 0;
                objects.playerRoot.position.set(0, GROUND_Y, 0.70);
            }
            camX = 0.0;
            camY = 0.45;
            camZ = 0.70 + 1.40;
            camLookX = 0.0;
            camLookY = -0.10;
            camLookZ = 0.70 - 1.50;
        }
    }
    render();
    updateHud();

    requestAnimationFrame(frame);
}

// Inicjalizacja wszystkich modeli 3D
const playerTemplate = await loadTemplate('/models/Guy.glb');

// 1. Samochody (4 modele)
const carTemplate = await loadTemplate('/models/car.glb');
const policeTemplate = await loadTemplate('/models/Police Car by Quaternius - BwwnUrWGmV.glb');
const suvTemplate = await loadTemplate('/models/SUV by Quaternius - xsMtZhBkxL.glb');
const truckTemplate = await loadTemplate('/models/TruckTank.fbx');
truckTemplate.rotation.y = Math.PI / 2; // dopasowanie osi podłużnej do osi Z

// 2. Roślinność, kamienie, mosty i elementy otoczenia
const pineTemplate = await loadTemplate('/models/tree.glb');
const stumpTemplate = await loadTemplate('/models/Tree stump by Poly by Google - 7etYPFVlpgm.glb');
const rockTemplate = await loadTemplate('/models/Rocks by Quaternius - OQvi8PIZ40.glb');
const grassTemplate = await loadTemplate('/models/Tall Grass by Quaternius - JSIYtscPmP.glb');
const bridgeTemplate = await loadTemplate('/models/Small Bridge by Quaternius - j4KsIuJYnq.glb');
bridgeTemplate.traverse(child => {
    if (child.isMesh && child.material) {
        child.material.metalness = 0.0;
        child.material.roughness = 0.85;
    }
});
const cloudTemplate = await loadTemplate('/models/Cloud by Quaternius - F6DzCxDz6I.glb');

// Drzewa klonowe - wyodrębnienie 5 zróżnicowanych wariantów koron
const mapleScene = await loadTemplate('/models/maple_trees.glb');
mapleScene.traverse(child => {
    if (child.isMesh && child.material) {
        // Matowe liście i kora bez sztucznego błyszczenia
        child.material.metalness = 0.0;
        child.material.roughness = 0.98;
    }
});
const mapleTemplates = [];
for (let i = 1; i <= 5; i++) {
    const treeNode = mapleScene.getObjectByName(`MapleTree_${i}`);
    if (treeNode) {
        const t = treeNode.clone(true);
        t.position.set(0, 0, 0);
        mapleTemplates.push(t);
    }
}
if (mapleTemplates.length === 0) mapleTemplates.push(mapleScene);

const allTemplates = {
    cars: {
        car: carTemplate,
        police: policeTemplate,
        suv: suvTemplate,
        truck: truckTemplate
    },
    props: {
        pine: pineTemplate,
        maple: mapleTemplates[0],
        maples: mapleTemplates,
        stump: stumpTemplate,
        rock: rockTemplate,
        grass: grassTemplate,
        bridge: bridgeTemplate
    }
};

// Rejestracja szablonów i modelu gracza
objects.templates = allTemplates;
objects.carTemplate = carTemplate;
objects.treeTemplate = pineTemplate;
setPlayerModel(playerTemplate);
initClouds(scene3D, cloudTemplate);

// Ustawienie gracza na pozycji startowej z=0.70 i pełna synchronizacja planszy
restartGame();
resetWorldMeshes(scene3D);
resetPlayerAnimation();
if (objects.playerRoot) objects.playerRoot.rotation.y = 0;

// Eksperyment 2 - Wypisanie w konsoli par row.laneIndex i row.z
export function logExperiment2() {
    prepareWorld();
    console.log('%c=== Eksperyment 2: Identyfikacja pasów (row.laneIndex i row.z) ===', 'color: #00e5ff; font-weight: bold; font-size: 14px;');
    console.log('%cPasy uszeregowane w kierunku ruchu gracza (ujemna oś Z):', 'color: #ffffff; font-weight: bold;');
    console.table(rows.slice(0, 12).map(r => ({
        'row.laneIndex': r.laneIndex,
        'row.z': Number(r.z.toFixed(2)),
        'typ pasa': r.type,
        'rows.indexOf(row)': rows.indexOf(r)
    })));
    rows.slice(0, 8).forEach(r => {
        console.log(`row.laneIndex: ${r.laneIndex} | row.z: ${r.z.toFixed(2)} | typ: ${r.type}`);
    });
    console.log('%cWniosek do sprawozdania: Numery laneIndex rosną monotonicznie (0, 1, 2, 3...) w kierunku ujemnej osi Z (kierunku ruchu postaci). Samo rows.indexOf(row) nie wystarcza po usunięciu starych pasów za graczem, ponieważ indeksy tablicy ulegają przesunięciu w lewo.', 'color: #a7ffeb; font-style: italic;');
}
logExperiment2();

requestAnimationFrame(frame);

window.addEventListener('keydown', event => {
    // Restart gry klawiszem R
    if (event.key.toLowerCase() === 'r') {
        restartGame();
        resetPlayerAnimation();
        resetWorldMeshes(scene3D);
        initClouds(scene3D, cloudTemplate);
        if (objects.playerRoot) objects.playerRoot.rotation.y = 0;
        camX = 0;
        camY = 0.45;
        camZ = scene.player.position[2] + 1.40;
        camLookX = 0;
        camLookY = -0.10;
        camLookZ = scene.player.position[2] - 1.50;
        previousTime = null;
        logExperiment2();
        return;
    }

    // Obrót wszystkich samochodów na klawisz O
    if (event.key.toLowerCase() === 'o') {
        for (const carMesh of objects.cars) {
            carMesh.rotation.y += Math.PI / 2;
        }
        return;
    }

    if (event.code === 'Space' || event.key.toLowerCase() === 'p') {
        event.preventDefault();
        isPaused = !isPaused;
        if (!isPaused) previousTime = null;
        return;
    }

    // Blokada sterowania podczas pauzy lub po przegranej/wygranej
    if (isPaused || gameState.status !== 'playing') return;

    if (!event.key.startsWith('Arrow')) return;
    event.preventDefault();
    if (event.repeat) return;

    if (objects.playerRoot) {
        if (event.key === 'ArrowUp') objects.playerRoot.rotation.y = 0;
        if (event.key === 'ArrowDown') objects.playerRoot.rotation.y = Math.PI;
        if (event.key === 'ArrowLeft') objects.playerRoot.rotation.y = Math.PI / 2;
        if (event.key === 'ArrowRight') objects.playerRoot.rotation.y = -Math.PI / 2;
    }

    movePlayer(event.key);
});

window.addEventListener('resize', render);
