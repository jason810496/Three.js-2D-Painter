<template>
  <div>
    <div id="three"></div>
  </div>
</template>

<style scoped>
#three {
  width: 100%;
  height: 100%;
  position: fixed;
  left: 0;
  top: 0;
}
</style>

<script>
import * as THREE from 'three';

// ====== three.js variables START ======

let camera;
let scene;
let renderer;

let plane;
let pointer;
let raycaster;

let rollOverGeo;
let rollOverMesh;
let rollOverMaterial;

let cubeGeo;
let cubeMaterial;



let objectWidth = 50;

let MeshList = [];
let objects = [];

// ====== three.js variables END ======



let zoomLevel = 1;
let panX = 0;
let panY = 0;
let isPanning = false;

let startX, startY;
let dragging = false;


let history = []; // only save real position
let historyIndex = -1;


let isPressed = false;
let previousVoxel = null;
let brushSize = 1;
let tool = 'brush'; // brush, eraser, line, rect, fill

init();
render();

function createButton(text, position, callback) {
  const button = document.createElement('button');
  button.innerText = text;
  button.style.position = 'absolute';
  button.style.left = position.x + 'px';
  button.style.top = position.y + 'px';
  button.className = 'btn';
  button.addEventListener('click', callback);
  document.body.appendChild(button);
}

function initSideBar() {
  // ====== sidebar btns init START ======

  createButton('填滿', { x: 54, y: window.innerHeight - 600 }, function () {
    tool = 'fill';
  });
  createButton('橡皮擦', { x: 54, y: window.innerHeight - 500 }, function () {
    tool = 'eraser';
  });
  createButton('筆刷', { x: 54, y: window.innerHeight - 550 }, function () {
    tool = 'brush';
  });
  createButton('線條', { x: 54, y: window.innerHeight - 450 }, function () {
    tool = 'line';
  });
  createButton('矩形', { x: 54, y: window.innerHeight - 400 }, function () {
    tool = 'rect';
  });
  createButton('清空', { x: 54, y: window.innerHeight - 350 }, function () {
    clearAllRealObjects();
  });
  createButton('Small Brush', { x: 54, y: window.innerHeight - 300 }, function () {
    brushSize = 1;
  });
  createButton('Medium Brush', { x: 54, y: window.innerHeight - 250 }, function () {
    brushSize = 2;
  });
  createButton('Large Brush', { x: 54, y: window.innerHeight - 200 }, function () {
    brushSize = 3;
  });
  createButton('redo', { x: 54, y: window.innerHeight - 150 }, function (event) {
    event.preventDefault();
    HistoryRedo();
  });
  createButton('undo', { x: 54, y: window.innerHeight - 100 }, function (event) {
    event.preventDefault();
    HistoryUndo();
  });
  // ====== sidebar btns init END ======
}

function initThreeJs() {
  // ====== three.js init ======
  // camera
  camera = new THREE.OrthographicCamera(window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, 1, 10000);
  camera.position.set(0, 800, 0);
  camera.lookAt(0, 0, 0);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  // roll-over helpers
  rollOverGeo = new THREE.BoxGeometry(objectWidth, objectWidth, objectWidth);
  rollOverMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.5, transparent: true });
  rollOverMesh = new THREE.Mesh(rollOverGeo, rollOverMaterial);

  // cubes

  // const map = new THREE.TextureLoader().load('textures/square-outline-textured.png');
  // map.colorSpace = THREE.SRGBColorSpace;
  cubeGeo = new THREE.BoxGeometry(objectWidth, objectWidth, objectWidth);
  cubeMaterial = new THREE.MeshLambertMaterial({ color: 0x4CB7FE, opacity: 0.1});

  // grid

  const gridHelper = new THREE.GridHelper(1000, 20);
  // 1000 is the size, 20 is how many grids
  scene.add(gridHelper);

  // raycaster

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  const geometry = new THREE.PlaneGeometry(1000, 1000);
  geometry.rotateX(- Math.PI / 2);

  plane = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ visible: false }));
  scene.add(plane);

  objects.push(plane);

  // lights

  const ambientLight = new THREE.AmbientLight(0x606060);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff);
  directionalLight.position.set(1, 0.75, 0.5).normalize();
  scene.add(directionalLight);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // ====== three.js init END ======
}

function init() {


  initSideBar();

  initThreeJs();
  HistorySave();

  // ====== three.js event listeners START ======

  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointerup', onPointerUp);
}

// ====== three.js event listeners function ======

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}

function getCurrentPointerCoordinate() { // retrun vector3
  pointer.set((event.clientX / window.innerWidth) * 2 - 1, - (event.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(objects);
  if (intersects.length > 0) {
    const intersect = intersects[0];
    return intersect.point.divideScalar(objectWidth).floor().multiplyScalar(objectWidth).addScalar(objectWidth/2);
  }
  return null;
}

function onPointerMove(event) {

  pointer.set((event.clientX / window.innerWidth) * 2 - 1, - (event.clientY / window.innerHeight) * 2 + 1);

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(objects);

  if (intersects.length > 0) {

    const intersect = intersects[0];

    const curVec = new THREE.Vector3();
    curVec.copy(intersect.point).add(intersect.face.normal);
    curVec.divideScalar(50).floor().multiplyScalar(50).addScalar(25);
    DrawMeshStroke(curVec.x, curVec.z);



    if (isPressed) {
      if (tool === 'eraser') {
        // remove voxel
        for (let i = 0; i < MeshList.length; i++) {
          for (let j = 0; j < objects.length; j++) {
            if (objects[j].position.x === MeshList[i].position.x && objects[j].position.z === MeshList[i].position.z) {
              scene.remove(objects[j]);
              objects.splice(j, 1);
              break;
            }
          }
        }

      } else if (tool === 'brush') {
        DrawRealStroke(curVec.x, curVec.z);
      } else if (tool === 'line') {

        let x1 = previousVoxel.position.x;
        let z1 = previousVoxel.position.z;

        let x2 = curVec.x;
        let z2 = curVec.z;

        DrawMeshLine(x1, z1, x2, z2);

        console.log("MeshList: ", MeshList);

      } else if (tool === 'rect') {
        let x1 = previousVoxel.position.x;
        let z1 = previousVoxel.position.z;

        let x2 = curVec.x;
        let z2 = curVec.z;

        DrawMeshRect(x1, z1, x2, z2);

        console.log("MeshList: ", MeshList);
      }
    }
  }

  render();

}

function clearMeshList() {
  while (MeshList.length > 0) {
    scene.remove(MeshList.pop());
  }
}

function DrawObjectsByMeshList(){
  while (MeshList.length > 0) {
    const rollOverMesh = MeshList.pop();

    const voxel = new THREE.Mesh(cubeGeo, cubeMaterial);
    voxel.position.copy(rollOverMesh.position);
    voxel.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);
    scene.add(voxel);
    objects.push(voxel);

    scene.remove(rollOverMesh);
  }
}

function ClearObjectsByMeshList(){
  // remove voxel
  for (let i = 0; i < MeshList.length; i++) {
    for (let j = 0; j < objects.length; j++) {
      if (objects[j].position.x === MeshList[i].position.x && objects[j].position.z === MeshList[i].position.z) {
        scene.remove(objects[j]);
        objects.splice(j, 1);
        break;
      }
    }
  }
}

function DrawMeshStroke(x, z) {
  clearMeshList();
  DrawMeshStrokeWithoutClear(x, z);
}

function DrawMeshStrokeWithoutClear(x, z) {
  for (let i = 0; i < brushSize; i++) {
    for (let j = 0; j < brushSize; j++) {
      DrawMeshPixel(x + i * objectWidth, z + j * objectWidth);
    }
  }
}

function DrawMeshPixel(x, z) {
  // check if already exist
  for (let i = 0; i < MeshList.length; i++) {
    if (MeshList[i].position.x === x && MeshList[i].position.z === z) {
      return;
    }
  }


  const rollOverMesh = new THREE.Mesh(rollOverGeo, rollOverMaterial);
  rollOverMesh.position.copy(new THREE.Vector3(x, 0, z));
  scene.add(rollOverMesh);
  MeshList.push(rollOverMesh);
}

function DrawRealStroke(x, z) {

  for (let i = 0; i < brushSize; i++) {
    for (let j = 0; j < brushSize; j++) {
      DrawRealPixel(x + i * objectWidth, z + j * objectWidth);
    }
  }
}

function DrawRealPixel(x, z) {
  // check if already exist
  for (let i = 0; i < objects.length; i++) {
    if (objects[i].position.x === x && objects[i].position.z === z) {
      return;
    }
  }


  const voxel = new THREE.Mesh(cubeGeo, cubeMaterial);
  voxel.position.copy(new THREE.Vector3(x, 0, z));
  scene.add(voxel);
  objects.push(voxel);
}



function DrawMeshLine(x1, z1, x2, z2) {

  clearMeshList();
  console.log(`x1: ${x1}, z1: ${z1}, x2: ${x2}, z2: ${z2}`);

  // Bresenham's line algorithm

  let dx = x2 - x1 >= 0 ? x2 - x1 : x1 - x2;
  let dy = z2 - z1 >= 0 ? z2 - z1 : z1 - z2;
  let sx = (x1 < x2) ? objectWidth : -objectWidth;
  let sy = (z1 < z2) ? objectWidth : -objectWidth;
  let err = dx - dy;

  while (x1 != x2 || z1 != z2) {
    console.log(`x1: ${x1}, z1: ${z1}`);

    DrawMeshStrokeWithoutClear(x1, z1);

    let err2 = err * 2;

    if (err2 > -dy) {
      err -= dy;
      x1 += sx;
    }

    if (err2 < dx) {
      err += dx;
      z1 += sy;
    }
  }
}

function FillRealObjects(){
  let curVec = getCurrentPointerCoordinate();
  console.log("curVec: ", curVec);
}


function DrawMeshRect(x1, z1, x2, z2) {

  clearMeshList();

  console.log(`x1: ${x1}, z1: ${z1}, x2: ${x2}, z2: ${z2}`);

  let sx = (x1 < x2) ? objectWidth : -objectWidth;
  let sz = (z1 < z2) ? objectWidth : -objectWidth;
  let dx = x2 - x1 >= 0 ? x2 - x1 : x1 - x2;
  let dz = z2 - z1 >= 0 ? z2 - z1 : z1 - z2;
  let cntX = dx / objectWidth;
  let cntZ = dz / objectWidth;

  for (let i = 0; i < cntX; i++) {
    for (let j = 0; j < cntZ; j++) {
      DrawMeshStrokeWithoutClear(x1 + i * sx, z1 + j * sz);
    }
  }

}

function onPointerDown(event) {
  if (tool === 'eraser') {
    ClearObjectsByMeshList();
  }

  console.log("onPointerDown");
  isPressed = true;

  pointer.set((event.clientX / window.innerWidth) * 2 - 1, - (event.clientY / window.innerHeight) * 2 + 1);

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(objects);

  if (intersects.length > 0) {
    const intersect = intersects[0];
    previousVoxel = new THREE.Mesh(cubeGeo, cubeMaterial);
    previousVoxel.position.copy(intersect.point).add(intersect.face.normal);
    previousVoxel.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);

    console.log("previousVoxel: ", previousVoxel);
  }

}



function onPointerUp() {
  isPressed = false;

  if (tool === 'line') {
    // add real line 
    previousVoxel = null;
    DrawObjectsByMeshList();
  }
  else if (tool === 'rect') {
    // add real line 
    previousVoxel = null;
    DrawObjectsByMeshList();
  }
  else if (tool === 'fill') {
    FillRealObjects();
  }

  // save history

  // if document is focus on redo undo button , do not save history
  if (document.activeElement.className === 'btn' ) {
    return;
  }

  HistorySave();
}

function mouseWheel(event) {
  console.log("mouseWheel");

  if (event.deltaY > 0) {
    zoomLevel = max(zoomLevel - 0.1, 0.1);
    camera.zoom = zoomLevel;
  } else {
    zoomLevel = min(zoomLevel + 0.1, 2);
    camera.zoom = zoomLevel;
  }

  render();
}

function clearAllRealObjects() {
  console.log("clearAllRealObjects" , objects);
  while (objects.length > 1) {
    const obj = objects.pop();
    if (obj != plane) {
      scene.remove(obj);
    }
  }

  render();
}


function render() {

  renderer.render(scene, camera);

}

function HistorySave() {
  if(historyIndex != history.length - 1){
    history.splice(historyIndex + 1, history.length - historyIndex - 1);
  }

  historyIndex++;
  const historyPositions = [];
  for (let i = 0; i < objects.length; i++) {
    if (objects[i] !== plane) {
      historyPositions.push({x: objects[i].position.x, z: objects[i].position.z});
    }
  }
  history.push(historyPositions);

  console.log("save history: ", history);
}

function HistoryRedo() {
  if (historyIndex == -1 || historyIndex == history.length - 1) {
    console.log("Unable to redo , idx:", historyIndex);
    return;
  }

  historyIndex++;
  const historyPositions = history[historyIndex];
  console.log("redo: ", historyPositions);

  clearAllRealObjects();

  for (let i = 0; i < historyPositions.length; i++) {
    DrawRealPixel(historyPositions[i].x, historyPositions[i].z);
  }

  render();
}


function HistoryUndo() {
  if (historyIndex == -1 || historyIndex == 0) {
    console.log("Unable to undo , idx:", historyIndex);
    return;
  }

  historyIndex = historyIndex - 1;
  const historyPositions = history[historyIndex];
  console.log("undo: " ,  historyIndex , historyPositions);

  clearAllRealObjects();

  for (let i = 0; i < historyPositions.length; i++) {
    DrawRealPixel(historyPositions[i].x, historyPositions[i].z);
  }

  render();
}

</script>