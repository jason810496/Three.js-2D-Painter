<template>
  <div>
    <canvas id="three"></canvas>
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

let rollOverMesh;
let rollOverMaterial;

let cubeGeo;
let cubeMaterial;

let objects = [];

let _meshObjectX = 50;
let _meshObjectY = 50;
let _meshObjectZ = 50;

let MeshList = [];

// ====== three.js variables END ======

let gridSize = 64;
let cellSize = 10;
let brushSize = 1;
let zoomLevel = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let grid = [];
let tool = 'brush'; // brush, eraser, line, rect
let startX, startY;
let dragging = false;


let history = [];
let isPressed = false;
let previousVoxel = null;

init();
render();

function createButton(text, position, callback) {
  const button = document.createElement('button');
  button.innerText = text;
  button.style.position = 'absolute';
  button.style.left = position.x + 'px';
  button.style.top = position.y + 'px';
  button.addEventListener('click', callback);
  document.body.appendChild(button);
}

function init() {
  // ====== sidebar btns init START ======

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
    clearGrid();
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
  createButton('redo', { x: 54, y: window.innerHeight - 150 }, function () {

  });
  createButton('undo', { x: 54, y: window.innerHeight - 100 }, function () {

  });
  // ====== sidebar btns init END ======



  // ====== three.js init ======
  // camera
  camera = new THREE.OrthographicCamera(window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, 1, 10000);
  camera.position.set(0, 800, 0);
  camera.lookAt(0, 0, 0);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  // roll-over helpers
  const rollOverGeo = new THREE.BoxGeometry(_meshObjectX, _meshObjectY, _meshObjectZ);
  rollOverMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.5, transparent: true });
  rollOverMesh = new THREE.Mesh(rollOverGeo, rollOverMaterial);
  scene.add(rollOverMesh);

  // cubes

  const map = new THREE.TextureLoader().load('textures/square-outline-textured.png');
  map.colorSpace = THREE.SRGBColorSpace;
  cubeGeo = new THREE.BoxGeometry(_meshObjectX, _meshObjectY, _meshObjectZ);
  cubeMaterial = new THREE.MeshLambertMaterial({ color: 0xfeb74c, map: map });

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


  // ====== three.js event listeners START ======

  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointerup', onPointerUp);
  // document.addEventListener('keydown', onDocumentKeyDown);
  // document.addEventListener('keyup', onDocumentKeyUp);

  // //

  // window.addEventListener( 'resize', onWindowResize );
}

// ====== three.js event listeners function ======

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}

function onPointerMove(event) {

  pointer.set((event.clientX / window.innerWidth) * 2 - 1, - (event.clientY / window.innerHeight) * 2 + 1);

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(objects);

  if (intersects.length > 0) {

    const intersect = intersects[0];

    rollOverMesh.position.copy(intersect.point).add(intersect.face.normal);
    rollOverMesh.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);


    if (isPressed) {
      if (tool === 'eraser') {
        if (intersect.object !== plane) {
          scene.remove(intersect.object);
          objects.splice(objects.indexOf(intersect.object), 1);
        }
      } else if (tool === 'brush') {
        const voxel = new THREE.Mesh(cubeGeo, cubeMaterial);
        voxel.position.copy(intersect.point).add(intersect.face.normal);
        voxel.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);
        scene.add(voxel);
        objects.push(voxel);
      } else if (tool === 'line') {

        let x1 = previousVoxel.position.x;
        let z1 = previousVoxel.position.z;

        const currentPosition = new THREE.Mesh(cubeGeo, cubeMaterial);
        currentPosition.position.copy(intersect.point).add(intersect.face.normal);
        currentPosition.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);

        let x2 = currentPosition.position.x;
        let z2 = currentPosition.position.z;

        DrawMeshLine(x1, z1, x2, z2);

        console.log("MeshList: ", MeshList);

      } else if( tool === 'rect' ){
        let x1 = previousVoxel.position.x;
        let z1 = previousVoxel.position.z;

        const currentPosition = new THREE.Mesh(cubeGeo, cubeMaterial);
        currentPosition.position.copy(intersect.point).add(intersect.face.normal);
        currentPosition.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);

        let x2 = currentPosition.position.x;
        let z2 = currentPosition.position.z;

        DrawMeshRect(x1, z1, x2, z2);

        console.log("MeshList: ", MeshList);
      }
    }
  }

  render();

}

function DrawMeshLine(x1, z1, x2, z2) {

  // clear previouse line ( MeshList )
  while (MeshList.length > 0) {
    scene.remove(MeshList.pop());
  }

  console.log(`x1: ${x1}, z1: ${z1}, x2: ${x2}, z2: ${z2}`);

  let dx = x2-x1>=0 ? x2-x1:x1-x2;
  let dy = z2-z1>=0 ? z2-z1:z1-z2;
  let sx = (x1 < x2) ? _meshObjectX : -_meshObjectX;
  let sy = (z1 < z2) ? _meshObjectZ : -_meshObjectZ;
  let err = dx - dy;

  while (x1 != x2 || z1 != z2) {
    console.log(`x1: ${x1}, z1: ${z1}`);

    // const curMesh = new THREE.Mesh(cubeGeo, cubeMaterial);
    // curMesh.position.copy(new THREE.Vector3(x1, 0 , z1));

    const rollOverGeo = new THREE.BoxGeometry(_meshObjectX, _meshObjectY, _meshObjectZ);
    const rollOverMesh = new THREE.Mesh(rollOverGeo, rollOverMaterial);
    rollOverMesh.position.copy(new THREE.Vector3(x1, 0 , z1));
    scene.add(rollOverMesh);
    MeshList.push(rollOverMesh);

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


function DrawMeshRect(x1, z1, x2, z2) {

  // clear previouse line ( MeshList )
  while (MeshList.length > 0) {
    scene.remove(MeshList.pop());
  }

  console.log(`x1: ${x1}, z1: ${z1}, x2: ${x2}, z2: ${z2}`);

  let sx = (x1 < x2) ? _meshObjectX : -_meshObjectX;
  let sz = (z1 < z2) ? _meshObjectZ : -_meshObjectZ;
  let dx = x2-x1>=0 ? x2-x1:x1-x2;
  let dz = z2-z1>=0 ? z2-z1:z1-z2;
  let cntX = dx/_meshObjectX;
  let cntZ = dz/_meshObjectZ;
  
  for(let i=0;i<cntX;i++){
    for(let j=0;j<cntZ;j++){
      const rollOverGeo = new THREE.BoxGeometry(_meshObjectX, _meshObjectY, _meshObjectZ);
      const rollOverMesh = new THREE.Mesh(rollOverGeo, rollOverMaterial);
      rollOverMesh.position.copy(new THREE.Vector3(x1+i*sx, 0 , z1+j*sz));
      scene.add(rollOverMesh);
      MeshList.push(rollOverMesh);
    }
  }
  
}

function onPointerDown(event) {
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


  // if ( intersects.length > 0 ) {

  //   const intersect = intersects[ 0 ];

  // delete cube

  //   if ( tool === 'eraser' ) {

  //     if ( intersect.object !== plane ) {

  //       scene.remove( intersect.object );

  //       objects.splice( objects.indexOf( intersect.object ), 1 );

  //     }

  //     // create cube

  //   } else {

  //     console.log("create cube");
  //     const voxel = new THREE.Mesh( cubeGeo, cubeMaterial );
  //     voxel.position.copy( intersect.point ).add( intersect.face.normal );
  //     voxel.position.divideScalar( 50 ).floor().multiplyScalar( 50 ).addScalar( 25 );
  //     scene.add( voxel );

  //     objects.push( voxel );

  //   }

  //   render();

  // }

}

function onPointerUp() {
  isPressed = false;

  if( tool === 'line' ) {
    // add real line 
    previousVoxel = null;

    // clear previouse line ( MeshList )
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
  else if( tool === 'rect' ) {
    // add real line 
    previousVoxel = null;

    // clear previouse line ( MeshList )
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
}

function draw() {

  let zoomedWidth = gridSize * cellSize * zoomLevel + 100;
  let zoomedHeight = gridSize * cellSize * zoomLevel;

  scale(zoomLevel);
  translate(panX, panY);

  background(255);

  if (mouseButton === LEFT) {
    noFill();
    stroke(0);
    strokeWeight(1);
    if (brushSize === 1) {
      rect(mouseX / zoomLevel, mouseY / zoomLevel, cellSize, cellSize);
    } else if (brushSize === 2) {
      rect((mouseX - cellSize) / zoomLevel, (mouseY - cellSize) / zoomLevel, cellSize * 2, cellSize * 2);
    } else if (brushSize === 3) {
      rect((mouseX - cellSize) / zoomLevel, (mouseY - cellSize) / zoomLevel, cellSize * 3, cellSize * 3);
    }
  }

  stroke(200);
  for (let i = 0; i <= gridSize; i++) {
    line(i * cellSize, 0, i * cellSize, height);
    line(0, i * cellSize, width - 100, i * cellSize);
  }

  if (mouseIsPressed && mouseButton === LEFT) {
    if (tool === 'brush') { } else if (tool === 'line' && startX != null && startY != null) {
      noStroke();
      fill(200);

      let x1 = round(startX / cellSize / zoomLevel);
      let z1 = round(startY / cellSize / zoomLevel);
      let x2 = round(mouseX / cellSize / zoomLevel);
      let z2 = round(mouseY / cellSize / zoomLevel);
      let dx = abs(x2 - x1);
      let dy = abs(z2 - z1);
      let sx = x1 < x2 ? 1 : -1;
      let sy = z1 < z2 ? 1 : -1;
      let err = dx - dy;
      let curX = x1;
      let curY = z1;
      while (true) {
        for (let offsetX = 0; offsetX < brushSize; offsetX++) {
          for (let offsetY = 0; offsetY < brushSize; offsetY++) {
            rect((curX + 0.5 + offsetX) * cellSize * zoomLevel / zoomLevel, (curY + 0.5 + offsetY) * cellSize * zoomLevel / zoomLevel, cellSize * zoomLevel / zoomLevel, cellSize * zoomLevel / zoomLevel);

          }
        }
        if (curX === x2 && curY === z2) {
          break;
        }
        let e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          curX += sx;
        }
        if (e2 < dx) {
          err += dx;
          curY += sy;
        }
      }
    } else if (tool === 'rect' && startX != null && startY != null) {
      // 瀏覽矩形
      noStroke();
      fill(200);
      let x1 = round(startX / cellSize / zoomLevel);
      let z1 = round(startY / cellSize / zoomLevel);
      let x2 = round(mouseX / cellSize / zoomLevel);
      let z2 = round(mouseY / cellSize / zoomLevel);
      let xMin = min(x1, x2);
      let yMin = min(z1, z2);
      let xMax = max(x1, x2);
      let yMax = max(z1, z2);
      for (let i = xMin; i <= xMax; i++) {
        for (let j = yMin; j <= yMax; j++) {
          for (let offsetX = 0; offsetX < brushSize; offsetX++) {
            for (let offsetY = 0; offsetY < brushSize; offsetY++) {
              rect((i + 0.5 + offsetX) * cellSize, (j + 0.5 + offsetY) * cellSize, cellSize, cellSize);
            }
          }
        }
      }
    }
  }

  // 像素
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      if (grid[i][j] === 1) {
        noStroke();
        fill(0);
        rect(i * cellSize, j * cellSize, cellSize, cellSize);
      }
    }
  }

  if (mouseIsPressed) {
    let i = floor(mouseX / (cellSize * zoomLevel));
    let j = floor(mouseY / (cellSize * zoomLevel));

    if (i >= 0 && i < gridSize && j >= 0 && j < gridSize) {
      if (tool === 'brush' && mouseButton === LEFT) {
        drawPixels(i, j);
      } else if (tool === 'eraser' && mouseButton === LEFT) {
        erasePixels(i, j);
      }
    }
  }

  function clearGrid() {
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        grid[i][j] = 0;
      }
    }
  }
  scale(1 / zoomLevel);
}

function drawPixels(i, j) {

  let startI = i - floor(brushSize / 2);
  let startJ = j - floor(brushSize / 2);
  let endI = startI + brushSize;
  let endJ = startJ + brushSize;
  for (let x = startI; x < endI; x++) {
    for (let y = startJ; y < endJ; y++) {
      if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
        grid[x][y] = 1;
      }
    }
  }
}

function erasePixels(i, j) {
  let startI = i - floor(brushSize / 2);
  let startJ = j - floor(brushSize / 2);
  let endI = startI + brushSize;
  let endJ = startJ + brushSize;
  for (let x = startI; x < endI; x++) {
    for (let y = startJ; y < endJ; y++) {
      if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
        grid[x][y] = 0;
      }
    }
  }
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

function keyPressed() {
  if (key === ' ') {
    clearGrid();
  }
}

function mousePressed() {
  console.log("mousePressed");
  if (mouseButton === RIGHT) {
    dragging = true;
  }
  if (tool === 'line') {
    startX = round(mouseX / cellSize / zoomLevel) * cellSize * zoomLevel + cellSize / 2;
    startY = round(mouseY / cellSize / zoomLevel) * cellSize * zoomLevel + cellSize / 2;


  } else if (tool === 'rect') {
    startX = mouseX;
    startY = mouseY;
  }
  if (mouseButton === RIGHT) {
    isPanning = true;
  }
}

function mouseReleased() {
  console.log("mouseReleased");
  isPanning = false;
  let i = floor(mouseX / cellSize / zoomLevel);
  let j = floor(mouseY / cellSize / zoomLevel);
  if (tool === 'line') {
    stroke(0);
    strokeWeight(1);
    let x1 = round((startX - cellSize / 2) / cellSize / zoomLevel);
    let z1 = round((startY - cellSize / 2) / cellSize / zoomLevel);
    let x2 = round((mouseX - cellSize / 2) / cellSize / zoomLevel);
    let z2 = round((mouseY - cellSize / 2) / cellSize / zoomLevel);
    drawThickLine(x1, z1, x2, z2, brushSize);
    startX = null;
    startY = null;

  } else if (tool === 'rect') {
    stroke(0);
    strokeWeight(1);
    let x1 = round(startX / cellSize / zoomLevel);
    let z1 = round(startY / cellSize / zoomLevel);
    let x2 = round(mouseX / cellSize / zoomLevel);
    let z2 = round(mouseY / cellSize / zoomLevel);
    startX = min(x1, x2) * cellSize * zoomLevel;
    startY = min(z1, z2) * cellSize * zoomLevel;
    let endX = max(x1, x2) * cellSize * zoomLevel;
    let endY = max(z1, z2) * cellSize * zoomLevel;
    for (let i = startX; i <= endX; i += cellSize * zoomLevel) {
      for (let j = startY; j <= endY; j += cellSize * zoomLevel) {
        drawPixels(round(i / cellSize / zoomLevel), round(j / cellSize / zoomLevel));
      }
    }
    startX = null;
    startY = null;
  }
}


function drawThickLine(x1, z1, x2, z2, thickness) {
  let dx = abs(x2 - x1);
  let dy = abs(z2 - z1);
  let sx = x1 < x2 ? 1 : -1;
  let sy = z1 < z2 ? 1 : -1;
  let err = dx - dy;
  while (true) {

    drawPixels(x1, z1);
    if (x1 === x2 && z1 === z2) {
      break;
    }
    let e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x1 += sx;
    }
    if (e2 < dx) {
      err += dx;
      z1 += sy;
    }
  }
}

function clearGrid() {
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      grid[i][j] = 0;
    }
  }
}

function mouseDragged() {
  if (isPanning) {
    panX += (mouseX - pmouseX) / zoomLevel;
    panY += (mouseY - pmouseY) / zoomLevel;
  }
}

function render() {

  renderer.render(scene, camera);

}
</script>