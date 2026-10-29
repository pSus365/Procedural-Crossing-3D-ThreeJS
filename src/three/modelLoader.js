import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();

export async function loadTemplate(path) {
    if (path.toLowerCase().endsWith('.fbx')) {
        const obj = await fbxLoader.loadAsync(path);
        obj.traverse(child => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material = child.material.map(m => {
                        const mat = new THREE.MeshStandardMaterial({
                            color: m.color || new THREE.Color(0x888888),
                            roughness: 0.5,
                            metalness: 0.1
                        });
                        // Szczegóły modelu TruckTank:
                        if (m.name && m.name.includes('007')) {
                            // Szyby / kabina
                            mat.roughness = 0.15;
                            mat.metalness = 0.15;
                        } else if (m.name && m.name.includes('002')) {
                            // Opony / guma
                            mat.roughness = 0.9;
                            mat.metalness = 0.0;
                        } else if (m.name && m.name.includes('006')) {
                            // Zbiornik cysterny / stal
                            mat.metalness = 0.65;
                            mat.roughness = 0.3;
                        }
                        return mat;
                    });
                } else {
                    child.material = new THREE.MeshStandardMaterial({
                        color: child.material.color || new THREE.Color(0x888888),
                        roughness: 0.5,
                        metalness: 0.15
                    });
                }
            }
        });
        return obj;
    }
    const gltf = await gltfLoader.loadAsync(path);
    return gltf.scene;
}

export function makeInstance(template, targetSize, castShadow = true, receiveShadow = true) {
    const model = SkeletonUtils.clone(template);
    model.traverse(child => {
        if (child.isMesh) {
            child.castShadow = castShadow;
            child.receiveShadow = receiveShadow;
        }
    });
    model.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const largest = Math.max(size.x, size.y, size.z);
    if (largest <= 0) throw new Error('Pusty model 3D');
    model.scale.multiplyScalar(targetSize / largest);
    model.updateMatrixWorld(true);

    box = new THREE.Box3().setFromObject(model);
    model.position.x -= (box.min.x + box.max.x) / 2;
    model.position.y -= box.min.y;
    model.position.z -= (box.min.z + box.max.z) / 2;
    const root = new THREE.Group();
    root.add(model);
    return root; // zwrócenie punktu odniesienia hierarchii całej grupy
}

export function countTriangles(model) {
    let triangles = 0;
    model.traverse(part => {
        if (!part.isMesh) return;
        const g = part.geometry;
        triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
    });
    return triangles;
}
