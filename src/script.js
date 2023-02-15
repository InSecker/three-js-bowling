import * as THREE from 'three'
import { OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'


// Scene 
const scene = new THREE.Scene(); 

// // Cube 
// const geometry = new THREE.BoxGeometry(1, 1, 1)
// const material = new THREE.MeshBasicMaterial( {color: 0xff0000} )
// const cube = new THREE.Mesh(geometry, material)
// scene.add(cube)

// Light 
const light = new THREE.AmbientLight( 0xececec ); 
scene.add( light );

// Model
const loader = new GLTFLoader()
loader.load( './helico.glb', function ( gltf ) {

    const model = gltf.scene; 
					
	// Scale
	model.scale.multiplyScalar(0.07)
	
	scene.add( model );

}, undefined, function ( error ) {

    console.error( error );

} );

// Sizes
const sizes = {
    width: 600, 
    height: 400
}

// Camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height); 
camera.position.set(0, 0, 4)
scene.add(camera); 

// Renderer
const canvas = document.querySelector(".webgl")

const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})

renderer.setSize(sizes.width, sizes.height)


// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

// Animation
const tick = () => {
    controls.update(); 
    
    renderer.render(scene, camera)

    window.requestAnimationFrame(tick)
}

tick()