// Generator nieskończonej trasy z losowymi pasami drogi, autami i wysepkami trawy.
export const rows = [];
export const scene = {
    player: { position: [0.0, 0.0, 0.70] },
    cars: [],
    trees: []
};

const CAR_COLORS = [
    [0.90, 0.22, 0.22], // czerwony
    [0.15, 0.70, 0.90], // błękitny
    [0.95, 0.85, 0.15], // żółty
    [0.65, 0.20, 0.90], // fioletowy
    [0.20, 0.85, 0.40], // zielony
    [0.95, 0.50, 0.10], // pomarańczowy
    [0.85, 0.20, 0.60]  // różowy
];

const CAR_MODELS = ['car', 'police', 'suv', 'truck'];

let lastZ = 0.70;
let roadDir = 1;

function generateBridgePositions() {
    // Losujemy 3 różne, rozstawione pozycje mostków z siatki gracza:
    // Strefa lewa: [-1.0, -0.75, -0.5]
    // Strefa środkowa: [-0.25, 0.0, 0.25]
    // Strefa prawa: [0.5, 0.75, 1.0]
    const leftPool = [-1.0, -0.75, -0.5];
    const centerPool = [-0.25, 0.0, 0.25];
    const rightPool = [0.5, 0.75, 1.0];

    const b1 = leftPool[Math.floor(Math.random() * leftPool.length)];
    const b2 = centerPool[Math.floor(Math.random() * centerPool.length)];
    const b3 = rightPool[Math.floor(Math.random() * rightPool.length)];

    return [b1, b2, b3].sort((a, b) => a - b);
}

export let currentLaneIndex = 0;

function addLane(type, fixedDir = null, isRiverBank = false) {
    lastZ = Math.round((lastZ - 0.35) * 1000) / 1000;
    const laneIndex = currentLaneIndex++;

    if (type === 'road') {
        rows.push({ type: 'road', z: lastZ, scale: [26.0, 1.0, 0.35], laneIndex });

        // Zadanie 3: Samochody na pasie (kierunek: +1 w prawo, -1 w lewo)
        const dir = fixedDir !== null ? fixedDir : 1;
        // Obliczenie głębokości pasa w stosunku do startu (z = 0.70)
        const depth = Math.max(0, Math.round((0.70 - lastZ) / 0.35));
        // Pas 1 i 2 jadą spokojną prędkością początkową. Im głębiej w mapę, tym auta jadą dynamicznie szybciej.
        const depthMultiplier = 1.0 + Math.min(depth * 0.09, 5.0);
        const baseSpeed = (0.58 + Math.random() * 0.22) * dir;
        const laneSpeed = baseSpeed * depthMultiplier;
        // Zadanie 2: Od 1 do 3 pojazdów na pasie ze zróżnicowanymi prędkościami i wspólnym kierunkiem jazdy
        const carCount = Math.floor(Math.random() * 3) + 1; // 1 do 3 aut
        const spacing = 14.0 / Math.max(1, carCount); // odpowiednie odstępy między autami

        // Losowa różnorodność modeli samochodów na danym pasie
        const typesPool = [...CAR_MODELS].sort(() => Math.random() - 0.5);

        for (let c = 0; c < carCount; c++) {
            const col = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
            const startX = -6.8 + c * spacing + (Math.random() * 0.5 - 0.25);
            const modelType = typesPool[c % typesPool.length];
            // Zróżnicowane prędkości w obrębie tego samego pasa (np. 0.85x - 1.25x)
            const speedVar = 0.85 + Math.random() * 0.40;
            const indSpeed = laneSpeed * speedVar;
            scene.cars.push({
                position: [startX, 0.0, lastZ],
                color: col,
                speed: indSpeed,
                baseSpeed: indSpeed,
                modelType: modelType,
                laneIndex
            });
        }
    } else if (type === 'water') {
        // Losowo rozstawione 3 mostki dla każdego pasma rzeki w różnych miejscach
        const bridgePositions = generateBridgePositions();
        rows.push({
            type: 'water',
            z: lastZ,
            scale: [26.0, 1.0, 0.35],
            bridges: bridgePositions,
            laneIndex
        });

        // Tworzenie 3 modeli drewnianych mostków na wylosowanych pozycjach X
        for (const bx of bridgePositions) {
            scene.trees.push({
                position: [bx, 0.0, lastZ],
                propType: 'bridge',
                scale: 0.48,
                laneIndex
            });
        }

        // Dzika roślinność i kamienie na brzegach rzeki po bokach
        const riverBanksX = [-5.0, -3.2, -1.8, 1.8, 3.2, 5.0];
        for (const rx of riverBanksX) {
            if (Math.random() < 0.65) {
                scene.trees.push({
                    position: [rx + (Math.random() * 0.3 - 0.15), 0.0, lastZ],
                    propType: Math.random() < 0.7 ? 'grass' : 'rock',
                    scale: 0.26,
                    rotationY: Math.random() * Math.PI * 2,
                    laneIndex
                });
            }
        }
    } else {
        rows.push({ type: 'grass', z: lastZ, scale: [26.0, 1.0, 0.35], laneIndex });

        // Punkty X na pasach zieleni po bokach drogi
        const leftSideX = [-6.2, -4.6, -3.2, -2.1, -1.6];
        const rightSideX = [1.6, 2.1, 3.2, 4.6, 6.2];

        function createRandomProp(xPos) {
            const rand = Math.random();
            let propType = 'pine';
            let scale = 0.70;
            let variant = 0;

            if (rand < 0.35) {
                propType = 'maple';
                scale = 0.65 + Math.random() * 0.18;
                variant = Math.floor(Math.random() * 5);
            } else if (rand < 0.60) {
                propType = 'pine';
                scale = 0.60 + Math.random() * 0.20;
            } else if (rand < 0.75) {
                propType = 'rock';
                scale = 0.26 + Math.random() * 0.10;
            } else if (rand < 0.88) {
                propType = 'grass';
                scale = 0.25 + Math.random() * 0.10;
            } else {
                propType = 'stump';
                scale = 0.16 + Math.random() * 0.03;
            }

            return {
                position: [xPos + (Math.random() * 0.3 - 0.15), 0.0, lastZ],
                propType,
                scale,
                variant,
                rotationY: Math.random() * Math.PI * 2,
                laneIndex
            };
        }

        // Drzewa i dekoracje po bokach drogi
        for (const x of leftSideX) {
            scene.trees.push(createRandomProp(x));
        }
        for (const x of rightSideX) {
            scene.trees.push(createRandomProp(x));
        }

        // Zadanie 1: Losowa liczba drzew (od 1 do 3) na pasie trawy, z zachowaniem wolnego przejścia
        if (!isRiverBank) {
            const treeCount = Math.floor(Math.random() * 3) + 1; // 1 do 3 drzew
            // Pełna siatka gracza od lewej do prawej krawędzi (-1.25 do 1.25)
            const availableSlots = [-1.25, -1.0, -0.75, -0.50, -0.25, 0.0, 0.25, 0.50, 0.75, 1.0, 1.25].sort(() => Math.random() - 0.5);
            const selectedSlots = availableSlots.slice(0, treeCount);

            for (const treeX of selectedSlots) {
                const obsRand = Math.random();
                const obsType = obsRand < 0.45 ? 'pine' : (obsRand < 0.85 ? 'maple' : (obsRand < 0.95 ? 'rock' : 'stump'));
                scene.trees.push({
                    position: [treeX + (Math.random() * 0.08 - 0.04), 0.0, lastZ],
                    propType: obsType,
                    scale: obsType === 'rock' ? 0.24 : (obsType === 'stump' ? 0.17 : (0.62 + Math.random() * 0.15)),
                    variant: Math.floor(Math.random() * 5),
                    rotationY: Math.random() * Math.PI * 2,
                    laneIndex
                });
            }
        } else {
            // Na brzegach rzeki: do 2 drzew omijających wejścia na mostki (pełen zakres od lewej do prawej)
            const nearbyWater = rows.find(r => r.type === 'water' && Math.abs(r.z - lastZ) < 0.45);
            const bridges = nearbyWater?.bridges || [-0.75, 0.0, 0.75];
            const candidatePool = [-1.25, -1.0, -0.75, -0.50, -0.25, 0.0, 0.25, 0.50, 0.75, 1.0, 1.25].filter(cx =>
                !bridges.some(bx => Math.abs(cx - bx) < 0.22)
            ).sort(() => Math.random() - 0.5);
            const count = Math.min(candidatePool.length, Math.floor(Math.random() * 2) + 1);
            for (let i = 0; i < count; i++) {
                const obsRand = Math.random();
                const obsType = obsRand < 0.45 ? 'pine' : (obsRand < 0.80 ? 'maple' : 'stump');
                scene.trees.push({
                    position: [candidatePool[i], 0.0, lastZ],
                    propType: obsType,
                    scale: obsType === 'stump' ? 0.17 : (0.62 + Math.random() * 0.15),
                    variant: Math.floor(Math.random() * 5),
                    rotationY: Math.random() * Math.PI * 2,
                    laneIndex
                });
            }
        }

        // Dekoracyjne kępki trawy i drobne kamyczki na trawniku w środku
        if (Math.random() < 0.50) {
            const decoX = (Math.random() * 1.8 - 0.9);
            const isGrass = Math.random() < 0.7;
            scene.trees.push({
                position: [decoX, 0.0, lastZ],
                propType: isGrass ? 'grass' : 'rock',
                scale: isGrass ? 0.24 : 0.20,
                rotationY: Math.random() * Math.PI * 2,
                laneIndex
            });
        }
    }
}

function generateChunk() {
    addLane('road', 1);
    addLane('road', -1);

    // 40% szansy na rzekę z mostkami między pasami zieleni
    if (Math.random() < 0.40) {
        addLane('grass', null, true); // brzeg rzeki przed wodą (czysty korytarz)
        addLane('water');
        addLane('grass', null, true); // brzeg rzeki za wodą (czysty korytarz)
    } else {
        const grassCount = 1 + (Math.random() < 0.3 ? 1 : 0);
        for (let i = 0; i < grassCount; i++) {
            addLane('grass');
        }
    }
}

export function updateInfiniteWorld(playerZ) {
    // Generujemy kolejne pasy 14 jednostek naprzód (tuż za zasięgiem mgły 13.0), redukując obciążenie procesora i karty graficznej
    while (playerZ < lastZ + 14.0) {
        generateChunk();
    }
}

export function initWorld() {
    rows.length = 0;
    scene.cars.length = 0;
    scene.trees.length = 0;
    lastZ = 0.70;
    roadDir = 1;
    currentLaneIndex = 0;

    // Pas startowy (bezpieczna trawa z powitalnym lasem i kępkami trawy)
    const startLaneIndex = currentLaneIndex++;
    rows.push({ type: 'grass', z: 0.70, scale: [26.0, 1.0, 0.40], laneIndex: startLaneIndex });

    const startXPositions = [-6.2, -4.6, -3.2, -2.1, -1.6, 1.6, 2.1, 3.2, 4.6, 6.2];
    for (let i = 0; i < startXPositions.length; i++) {
        const x = startXPositions[i];
        const isMaple = i % 2 === 0;
        scene.trees.push({
            position: [x, 0.0, 0.70],
            propType: isMaple ? 'maple' : 'pine',
            scale: 0.70,
            variant: i % 5,
            rotationY: (i * 1.3) % (Math.PI * 2),
            laneIndex: startLaneIndex
        });
    }

    // Dodatkowe dekoracje na pasie startowym (kępki trawy i kamienie)
    scene.trees.push(
        { position: [-0.75, 0.0, 0.70], propType: 'grass', scale: 0.25, rotationY: 0.4, laneIndex: startLaneIndex },
        { position: [0.75, 0.0, 0.70], propType: 'grass', scale: 0.25, rotationY: 1.8, laneIndex: startLaneIndex },
        { position: [-1.05, 0.0, 0.70], propType: 'rock', scale: 0.22, rotationY: 0.9, laneIndex: startLaneIndex },
        { position: [1.05, 0.0, 0.70], propType: 'stump', scale: 0.17, rotationY: 2.1, laneIndex: startLaneIndex }
    );

    // Generujemy 22 początkowe pasy do granicy mgły (idealne dopasowanie do render distance)
    while (rows.length < 22) {
        generateChunk();
    }
}

// Inicjalizacja przy ładowaniu pliku
initWorld();
