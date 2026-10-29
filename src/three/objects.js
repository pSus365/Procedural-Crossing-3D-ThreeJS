import * as THREE from 'three';
import { rows, scene as gameScene } from '../game/sceneData.js';
import { makeInstance } from './modelLoader.js';

export const GROUND_Y = -0.45;

export const objects = {
    playerRoot: null,
    cars: [],
    trees: [],
    rowMeshes: [],
    carTemplate: null,
    treeTemplate: null,
    templates: {
        cars: {},
        props: {}
    }
};

const rowGeometry = new THREE.BoxGeometry(26.0, 0.04, 0.35);
const roadMaterial = new THREE.MeshStandardMaterial({
    color: 0x32343e,
    roughness: 0.82,
    metalness: 0.1
});
const grassMaterial = new THREE.MeshStandardMaterial({
    color: 0x368538,
    roughness: 0.88,
    metalness: 0.05
});
const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a6599,
    roughness: 0.12,
    metalness: 0.35,
    transparent: true,
    opacity: 0.92
});
const dashGeometry = new THREE.BoxGeometry(0.14, 0.005, 0.025);
const dashMaterial = new THREE.MeshStandardMaterial({
    color: 0xffedd0,
    roughness: 0.4
});

function getRowMaterial(type) {
    if (type === 'road') return roadMaterial;
    if (type === 'water') return waterMaterial;
    return grassMaterial;
}

let headlightBeamTexture = null;

function getHeadlightBeamTexture() {
    if (!headlightBeamTexture) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Ciepły, miękki, retro-pomarańczowy snop światła na asfalcie
        const grad = ctx.createRadialGradient(64, 16, 4, 64, 130, 115);
        grad.addColorStop(0.00, 'rgba(255, 150, 35, 0.55)'); // ciepły bursztynowy początek
        grad.addColorStop(0.20, 'rgba(255, 120, 20, 0.38)'); // łagodna pomarańczowa poświata
        grad.addColorStop(0.55, 'rgba(220, 85, 10, 0.14)');  // miękkie przejście
        grad.addColorStop(0.85, 'rgba(180, 55, 5, 0.03)');   // delikatny zanik bez ostrych krawędzi
        grad.addColorStop(1.00, 'rgba(0, 0, 0, 0.00)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(52, 10);
        ctx.lineTo(76, 10);
        ctx.lineTo(124, 244);
        ctx.quadraticCurveTo(64, 256, 4, 244);
        ctx.closePath();
        ctx.fill();

        headlightBeamTexture = new THREE.CanvasTexture(canvas);
    }
    return headlightBeamTexture;
}

let taillightGlowTexture = null;

function getTaillightGlowTexture() {
    if (!taillightGlowTexture) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Miękki, okrągły gradient czerwonej poświaty tylnych świateł (bez kwadratowych krawędzi!)
        const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 58);
        grad.addColorStop(0.00, 'rgba(230, 25, 10, 0.45)'); // soczysty rubinowy środek
        grad.addColorStop(0.35, 'rgba(200, 15, 5, 0.25)');  // miękka czerwona poświata
        grad.addColorStop(0.70, 'rgba(140, 10, 5, 0.06)');  // łagodne rozproszenie
        grad.addColorStop(1.00, 'rgba(0, 0, 0, 0.00)');     // całkowicie przezroczysty brzeg

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);

        taillightGlowTexture = new THREE.CanvasTexture(canvas);
    }
    return taillightGlowTexture;
}

const bulbGeom = new THREE.SphereGeometry(0.010, 8, 8);
const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffa433 }); // ciepły retro pomarańcz/bursztyn

const haloGeom = new THREE.CircleGeometry(0.024, 10);
const haloMat = new THREE.MeshBasicMaterial({
    color: 0xff9020,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const tailGeom = new THREE.SphereGeometry(0.009, 8, 8);
const tailMat = new THREE.MeshBasicMaterial({ color: 0xff1e0c });

// Stożek światła: wąski przy zderzaku (rNear=0.016) i rozszerzający się ku przodowi (rFar=0.13)
const volumetricConeGeom = new THREE.CylinderGeometry(0.13, 0.016, 1.05, 10, 1, true);
volumetricConeGeom.translate(0, 1.05 / 2, 0);
volumetricConeGeom.rotateX(Math.PI / 2 + 0.05);

const volumetricConeMat = new THREE.MeshBasicMaterial({
    color: 0xff8811, // ciepły retro pomarańcz
    transparent: true,
    opacity: 0.045, // bardzo lekka, subtelna mgiełka zamiast mocnego białego plastiku
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
});

const redPoolGeom = new THREE.PlaneGeometry(0.30, 0.30);
redPoolGeom.rotateX(-Math.PI / 2);
redPoolGeom.translate(0, 0, -0.09);
const redPoolMat = new THREE.MeshBasicMaterial({
    map: getTaillightGlowTexture(),
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

function attachCarLights(root, scale) {
    const lightsGroup = new THREE.Group();

    // Dopasowanie rozstawu świateł do obrysu nadwozia samochodu (nie wystają poza błotniki)
    const xOffset = scale * 0.105;
    const yFront = 0.076;
    const zFront = scale * 0.455;

    // 1. Dwie małe, ciepłe retro żarówki reflektorów (pomarańczowo-bursztynowe)
    const leftBulb = new THREE.Mesh(bulbGeom, bulbMat);
    leftBulb.position.set(xOffset, yFront, zFront);
    const rightBulb = new THREE.Mesh(bulbGeom, bulbMat);
    rightBulb.position.set(-xOffset, yFront, zFront);

    // Dyskretna poświata soczewki
    const leftHalo = new THREE.Mesh(haloGeom, haloMat);
    leftHalo.position.set(xOffset, yFront, zFront + 0.003);
    const rightHalo = new THREE.Mesh(haloGeom, haloMat);
    rightHalo.position.set(-xOffset, yFront, zFront + 0.003);

    // 2. Wąskie przy zderzaku i rozszerzające się w przód stożki w powietrzu (efekt mgły)
    const leftCone = new THREE.Mesh(volumetricConeGeom, volumetricConeMat);
    leftCone.position.set(xOffset, yFront, zFront);
    const rightCone = new THREE.Mesh(volumetricConeGeom, volumetricConeMat);
    rightCone.position.set(-xOffset, yFront, zFront);

    // 3. Łagodna, bursztynowa plama światła rzucana na asfalt przed maską
    const beamPlaneGeom = new THREE.PlaneGeometry(scale * 0.85, 1.25);
    beamPlaneGeom.rotateX(-Math.PI / 2);
    beamPlaneGeom.translate(0, 0, 0.62);
    const beamPlaneMat = new THREE.MeshBasicMaterial({
        map: getHeadlightBeamTexture(),
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const beamPlane = new THREE.Mesh(beamPlaneGeom, beamPlaneMat);
    beamPlane.position.set(0, 0.003, scale * 0.44);

    // 4. Tylne małe rubinowe światła pozycyjne (nie wystają poza obrys karoserii)
    const yBack = 0.080;
    const zBack = -scale * 0.455;
    const leftTail = new THREE.Mesh(tailGeom, tailMat);
    leftTail.position.set(xOffset, yBack, zBack);
    const rightTail = new THREE.Mesh(tailGeom, tailMat);
    rightTail.position.set(-xOffset, yBack, zBack);

    // 5. Miękka, okrągła poświata gradientowa na asfalcie za autem (zamiast czerwonego kwadratu)
    const redPool = new THREE.Mesh(redPoolGeom, redPoolMat);
    redPool.position.set(0, 0.003, zBack);

    lightsGroup.add(
        leftBulb, rightBulb,
        leftHalo, rightHalo,
        leftCone, rightCone,
        beamPlane,
        leftTail, rightTail,
        redPool
    );
    root.add(lightsGroup);
}

export function createBasicObjects(scene3D) {
    if (scene3D) {
        for (const m of objects.rowMeshes) scene3D.remove(m);
    }
    objects.rowMeshes = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const mat = getRowMaterial(row.type);
        const rowMesh = new THREE.Mesh(rowGeometry, mat);
        rowMesh.receiveShadow = true;
        const yPos = row.type === 'water' ? GROUND_Y - 0.035 : GROUND_Y - 0.02;
        rowMesh.position.set(0, yPos, row.z);
        scene3D.add(rowMesh);
        objects.rowMeshes.push(rowMesh);
        row._mesh = rowMesh;
        row._dashes = [];

        // Przerywana linia rozdzielająca dwa pasy drogi tylko w obrębie jezdni (x od -4.2 do 4.2)
        if (i < rows.length - 1 && rows[i].type === 'road' && rows[i + 1].type === 'road') {
            const midZ = (rows[i].z + rows[i + 1].z) / 2;
            for (let x = -4.2; x <= 4.2; x += 0.6) {
                const dash = new THREE.Mesh(dashGeometry, dashMaterial);
                dash.receiveShadow = false;
                dash.position.set(x, GROUND_Y + 0.001, midZ);
                scene3D.add(dash);
                objects.rowMeshes.push(dash);
                row._dashes.push(dash);
            }
        }
    }

    if (!objects.playerRoot) {
        const playerRoot = new THREE.Group();
        const yellow = new THREE.MeshBasicMaterial({ color: 0xffbf20 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.18), yellow);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.13), yellow);
        body.castShadow = true;
        head.castShadow = true;
        body.position.y = 0.12;
        head.position.y = 0.30;
        playerRoot.add(body, head);
        scene3D.add(playerRoot);
        objects.playerRoot = playerRoot;
    }
}

export function setPlayerModel(playerTemplate) {
    if (!objects.playerRoot) return;
    while (objects.playerRoot.children.length > 0) {
        objects.playerRoot.remove(objects.playerRoot.children[0]);
    }
    // Zmniejszony model postaci (rozmiar 0.28), rzucający cień na ziemię
    const playerInstance = makeInstance(playerTemplate, 0.28, true, false);
    // Odwrócony plecami do kamery (twarzą w głąb drogi ku -Z)
    playerInstance.rotation.y = Math.PI;
    objects.playerRoot.add(playerInstance);
    objects.playerRoot.rotation.y = 0;
}

export function createCarMesh(car) {
    const tMap = objects.templates?.cars || {};
    const template = (car.modelType && tMap[car.modelType]) || tMap.car || objects.carTemplate;
    if (!template) return new THREE.Group();

    let scale = 0.40;
    if (car.modelType === 'truck') scale = 0.48;
    else if (car.modelType === 'suv') scale = 0.44;
    else if (car.modelType === 'police') scale = 0.42;

    const root = makeInstance(template, scale, true, true);
    root.rotation.y = car.speed > 0 ? Math.PI / 2 : -Math.PI / 2;

    // Dodanie retro klimatycznych świateł
    attachCarLights(root, scale);

    return root;
}

export function createPropMesh(prop) {
    const pMap = objects.templates?.props || {};
    let template;
    let scale = prop.scale || 0.70;
    let rotY = prop.rotationY !== undefined ? prop.rotationY : 0;

    if (prop.propType === 'bridge') {
        template = pMap.bridge;
        scale = prop.scale || 0.48;
        rotY = Math.PI / 2; // kładka wzdłuż osi Z przez rzekę
    } else if (prop.propType === 'maple') {
        const variants = pMap.maples && pMap.maples.length > 0 ? pMap.maples : [pMap.maple];
        const idx = prop.variant !== undefined ? prop.variant % variants.length : Math.floor(Math.random() * variants.length);
        template = variants[idx] || pMap.maple || pMap.pine || objects.treeTemplate;
    } else if (prop.propType === 'stump') {
        template = pMap.stump || objects.treeTemplate;
        scale = prop.scale ? Math.min(prop.scale, 0.18) : 0.17;
    } else if (prop.propType === 'rock') {
        template = pMap.rock || objects.treeTemplate;
    } else if (prop.propType === 'grass') {
        template = pMap.grass || objects.treeTemplate;
    } else {
        template = pMap.pine || objects.treeTemplate;
    }

    if (!template) return new THREE.Group();

    // Drzewa, pnie i mostki rzucają cienie, natomiast trawa i drobne kamienie tylko odbierają cienie
    const castShadow = prop.propType !== 'grass' && prop.propType !== 'rock';
    const root = makeInstance(template, scale, castShadow, true);
    root.rotation.y = rotY;
    return root;
}

export const clouds = [];

export function initClouds(scene3D, cloudTemplate) {
    if (!scene3D || !cloudTemplate) return;
    for (const c of clouds) scene3D.remove(c);
    clouds.length = 0;

    for (let i = 0; i < 7; i++) {
        const cloud = makeInstance(cloudTemplate, 1.2 + Math.random() * 1.4, false, false);
        cloud.traverse(child => {
            if (child.isMesh && child.material) {
                child.material = new THREE.MeshStandardMaterial({
                    color: 0xffebd9,
                    roughness: 0.95,
                    metalness: 0.0,
                    flatShading: true
                });
            }
        });
        const x = -10 + Math.random() * 20;
        const y = 0.85 + Math.random() * 1.2;
        const z = 1.0 - Math.random() * 14;
        cloud.position.set(x, y, z);
        cloud.userData = {
            speed: 0.12 + Math.random() * 0.18,
            baseY: y
        };
        scene3D.add(cloud);
        clouds.push(cloud);
    }
}

export function updateClouds(dt, camZ) {
    for (const cloud of clouds) {
        cloud.position.x += cloud.userData.speed * dt;
        if (cloud.position.x > 12) {
            cloud.position.x = -12;
            cloud.position.y = 0.85 + Math.random() * 1.2;
        }
        if (cloud.position.z > camZ + 3) {
            cloud.position.z = camZ - 10 - Math.random() * 4;
            cloud.position.x = -10 + Math.random() * 20;
            cloud.position.y = 0.85 + Math.random() * 1.2;
        } else if (cloud.position.z < camZ - 18) {
            cloud.position.z = camZ - 3 - Math.random() * 6;
            cloud.position.x = -10 + Math.random() * 20;
            cloud.position.y = 0.85 + Math.random() * 1.2;
        }
    }
}

export function addModels(scene3D, carTemplate, treeTemplate, allTemplates = null) {
    if (allTemplates) {
        objects.templates = allTemplates;
    }
    if (carTemplate) objects.carTemplate = carTemplate;
    if (treeTemplate) objects.treeTemplate = treeTemplate;

    for (const c of objects.cars) scene3D.remove(c);
    for (const t of objects.trees) scene3D.remove(t);
    objects.cars = [];
    objects.trees = [];

    for (const car of gameScene.cars) {
        const root = createCarMesh(car);
        car._mesh = root;
        scene3D.add(root);
        objects.cars.push(root);
    }
    for (const tree of gameScene.trees) {
        const root = createPropMesh(tree);
        tree._mesh = root;
        const v = tree.position;
        root.position.set(v[0], GROUND_Y + (v[1] || 0), v[2]);
        scene3D.add(root);
        objects.trees.push(root);
    }
}

export function resetWorldMeshes(scene3D) {
    if (!scene3D) return;
    createBasicObjects(scene3D);
    addModels(scene3D, objects.carTemplate, objects.treeTemplate, objects.templates);
}

export function syncObjects(scene3D) {
    if (!scene3D) return;
    const p = gameScene.player.position;

    // 1. USUWANIE (PRUNING) PASÓW, SAMOCHODÓW I DRZEW ZA PLECAMI GRACZA
    // Pozostawiamy bezpieczny bufor 2.2 jednostki za graczem (~6 pasów wstecz),
    // a wszystko co dalej bezpowrotnie usuwamy z pamięci i sceny 3D
    const cutoffZ = p[2] + 2.2;
    while (rows.length > 0 && rows[0].z > cutoffZ) {
        const oldRow = rows.shift();
        console.log(`%c[Usuwanie pasa] Usunięto pas o laneIndex: ${oldRow.laneIndex} (z: ${oldRow.z.toFixed(2)}). Pierwszy pas w rows[] ma teraz indexOf: 0, lecz jego stały laneIndex to ${rows[0]?.laneIndex}.`, 'color: #ff9800');
        if (oldRow._mesh) {
            scene3D.remove(oldRow._mesh);
            const rIdx = objects.rowMeshes.indexOf(oldRow._mesh);
            if (rIdx !== -1) objects.rowMeshes.splice(rIdx, 1);
        }
        if (oldRow._dashes) {
            for (const d of oldRow._dashes) {
                scene3D.remove(d);
                const dIdx = objects.rowMeshes.indexOf(d);
                if (dIdx !== -1) objects.rowMeshes.splice(dIdx, 1);
            }
        }

        // Usuwanie samochodów na starym pasie
        for (let i = gameScene.cars.length - 1; i >= 0; i--) {
            const car = gameScene.cars[i];
            if (Math.abs(car.position[2] - oldRow.z) < 0.05) {
                if (car._mesh) {
                    scene3D.remove(car._mesh);
                    const cIdx = objects.cars.indexOf(car._mesh);
                    if (cIdx !== -1) objects.cars.splice(cIdx, 1);
                }
                gameScene.cars.splice(i, 1);
            }
        }

        // Usuwanie drzew i dekoracji na starym pasie
        for (let i = gameScene.trees.length - 1; i >= 0; i--) {
            const prop = gameScene.trees[i];
            if (Math.abs(prop.position[2] - oldRow.z) < 0.05) {
                if (prop._mesh) {
                    scene3D.remove(prop._mesh);
                    const tIdx = objects.trees.indexOf(prop._mesh);
                    if (tIdx !== -1) objects.trees.splice(tIdx, 1);
                }
                gameScene.trees.splice(i, 1);
            }
        }
    }

    // 2. DOCIĄGANIE NOWYCH PASÓW JEZDNI
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row._mesh) continue;
        const mat = getRowMaterial(row.type);
        const rowMesh = new THREE.Mesh(rowGeometry, mat);
        rowMesh.receiveShadow = true;
        const yPos = row.type === 'water' ? GROUND_Y - 0.035 : GROUND_Y - 0.02;
        rowMesh.position.set(0, yPos, row.z);
        scene3D.add(rowMesh);
        objects.rowMeshes.push(rowMesh);
        row._mesh = rowMesh;
        row._dashes = [];

        if (i > 0 && rows[i - 1].type === 'road' && row.type === 'road') {
            const midZ = (rows[i - 1].z + row.z) / 2;
            for (let x = -4.2; x <= 4.2; x += 0.6) {
                const dash = new THREE.Mesh(dashGeometry, dashMaterial);
                dash.receiveShadow = false;
                dash.position.set(x, GROUND_Y + 0.001, midZ);
                scene3D.add(dash);
                objects.rowMeshes.push(dash);
                row._dashes.push(dash);
            }
        }
    }

    // 3. DOCIĄGANIE NOWYCH SAMOCHODÓW
    for (const car of gameScene.cars) {
        if (car._mesh) continue;
        const root = createCarMesh(car);
        car._mesh = root;
        scene3D.add(root);
        objects.cars.push(root);
    }

    // 4. DOCIĄGANIE NOWYCH DRZEW (pozycjonowanych tylko raz przy stworzeniu)
    for (const prop of gameScene.trees) {
        if (prop._mesh) continue;
        const root = createPropMesh(prop);
        prop._mesh = root;
        const v = prop.position;
        root.position.set(v[0], GROUND_Y + (v[1] || 0), v[2]);
        scene3D.add(root);
        objects.trees.push(root);
    }

    // 5. POZYCJA GRACZA
    if (objects.playerRoot) {
        objects.playerRoot.position.set(p[0], GROUND_Y + (p[1] || 0), p[2]);
    }

    // 6. AKTUALIZACJA POZYCJI TYLKO AKTYWNYCH SAMOCHODÓW
    for (const car of gameScene.cars) {
        if (!car._mesh) continue;
        const v = car.position;
        car._mesh.position.set(v[0], GROUND_Y + (v[1] || 0), v[2]);
    }
}
