import * as THREE from 'three';

let camera, scene, renderer;
let plane;
let pointer, raycaster, isShiftDown = false;

let rollOverMesh, rollOverMaterial;
let cubeGeo, cubeMaterial;

let _meshObjectX = 50;
let _meshObjectY = 50;
let _meshObjectZ = 50;

const objects = [];

init();
render();

function init() {

  // camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
  camera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, 1, 10000 );
  camera.position.set( 0, 800, 0 );
  camera.lookAt( 0, 0, 0 );

  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0xf0f0f0 );

  // roll-over helpers

  const rollOverGeo = new THREE.BoxGeometry( _meshObjectX, _meshObjectY, _meshObjectZ );
  rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
  rollOverMesh = new THREE.Mesh( rollOverGeo, rollOverMaterial );
  scene.add( rollOverMesh );

  // cubes

  const map = new THREE.TextureLoader().load( 'textures/square-outline-textured.png' );
  map.colorSpace = THREE.SRGBColorSpace;
  cubeGeo = new THREE.BoxGeometry( _meshObjectX, _meshObjectY, _meshObjectZ );
  cubeMaterial = new THREE.MeshLambertMaterial( { color: 0xfeb74c, map: map } );

  // grid

  const gridHelper = new THREE.GridHelper( 1000, 20 );
  scene.add( gridHelper );

  // raycaster

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  const geometry = new THREE.PlaneGeometry( 1000, 1000 );
  geometry.rotateX( - Math.PI / 2 );

  plane = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { visible: false } ) );
  scene.add( plane );

  objects.push( plane );

  // lights

  const ambientLight = new THREE.AmbientLight( 0x606060 );
  scene.add( ambientLight );

  const directionalLight = new THREE.DirectionalLight( 0xffffff );
  directionalLight.position.set( 1, 0.75, 0.5 ).normalize();
  scene.add( directionalLight );

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );

  document.addEventListener( 'pointermove', onPointerMove );
  document.addEventListener( 'pointerdown', onPointerDown );
  document.addEventListener( 'keydown', onDocumentKeyDown );
  document.addEventListener( 'keyup', onDocumentKeyUp );

  //

  window.addEventListener( 'resize', onWindowResize );

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

  render();

}

function onPointerMove( event ) {

  pointer.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );

  raycaster.setFromCamera( pointer, camera );

  const intersects = raycaster.intersectObjects( objects, false );

  if ( intersects.length > 0 ) {

    const intersect = intersects[ 0 ];

    rollOverMesh.position.copy( intersect.point ).add( intersect.face.normal );
    rollOverMesh.position.divideScalar( 50 ).floor().multiplyScalar( 50 ).addScalar( 25 );

    render();

  }

}

function onPointerDown( event ) {

  pointer.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );

  let originalCameraPosition = camera.position.clone();
  camera.position.set(  pointer.x , 800, pointer.z );

  raycaster.setFromCamera( pointer, camera );

  camera.position.set( originalCameraPosition.x, originalCameraPosition.y, originalCameraPosition.z );

  const intersects = raycaster.intersectObjects( objects, false );

  if ( intersects.length > 0 ) {

    const intersect = intersects[ 0 ];

    // delete cube

    if ( isShiftDown ) {

      if ( intersect.object !== plane ) {

        scene.remove( intersect.object );

        objects.splice( objects.indexOf( intersect.object ), 1 );

      }

      // create cube

    } else {

      const voxel = new THREE.Mesh( cubeGeo, cubeMaterial );
      voxel.position.copy( intersect.point ).add( intersect.face.normal );
      voxel.position.divideScalar( 50 ).floor().multiplyScalar( 50 ).addScalar( 25 );
      scene.add( voxel );

      objects.push( voxel );

    }

    render();

  }

}

function onDocumentKeyDown( event ) {

  switch ( event.keyCode ) {

    case 16: isShiftDown = true; break;

  }

}

function onDocumentKeyUp( event ) {

  switch ( event.keyCode ) {

    case 16: isShiftDown = false; break;

  }

}

function render() {

  renderer.render( scene, camera );

}