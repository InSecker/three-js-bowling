import * as CANNON from "cannon";
import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// import * as dat from 'dat.gui';

// const gui = new dat.GUI();

const sizes = {
    width: document.body.clientWidth,
    height: document.body.clientHeight,
}

class Bowling {
    constructor() {
        this.world = new CANNON.World();
        this.timeStep = 1 / 60;
        this.scene = new THREE.Scene();
        this.sceneObjects = [];

        this.pinOffset = 10;
        this.pinRows = 3;

        const canvas = document.querySelector(".webgl")
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true
        });

        this.camera = this.createCamera();
        this.loadTexture();

        const controls = new OrbitControls(this.camera, canvas)
        controls.enableDamping = true

        const loaderBall = new THREE.TextureLoader();
        this.ballMaterial = loaderBall.load(
            './ball.jpg',
            (texture) => {
                return texture;
            }
        );
        this.ball = this.createSphere(this.ballMaterial);
        this.ballThrown = false;

        this.createBox(0, -0.4, -12, 3, 0.2, 25); // 1.28 official width
        this.light1 = this.createDirectionalLight(20, 20, -50);
        this.light2 = this.createDirectionalLight(-20, 20, -50);
        this.light3 = this.createAmbiantLight();

        this.initControl(this.ball);

        this.initCannon();
        this.initThree();
    }

    loadTexture() {
        // instantiate a loader
        const loader = new OBJLoader();

        // load a resource
        return loader.load(
            // resource URL
            './model.obj',
            // called when resource is loaded
            (object) => {
                object.scale.multiplyScalar(0.2);
                this.pinTexture = object;

                this.createPins(this.pinRows);
            },
            // called when loading is in progresses
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            // called when loading has errors
            function (error) {
                console.log('An error happened', error);
            }
        );
    }

    createPins(numberOfRows) {
        const rowGap = 0.2;
        const colGap = 0.15;

        for (let i = 0; i < numberOfRows; i++) {
            for (let j = 0; j < i + 1; j++) {
                this.createCylinder(colGap * j, -0.1, -rowGap * i);
                if (j > 0) {
                    this.createCylinder(-colGap * j, -0.1, -rowGap * i);
                }
            }
        }
    }

    initControl(object) {
        let strength = -160;
        let rotation = 0;

        const onKeyDown = (event) => {
            // Reset
            if(event.keyCode === 82) { // r / Reset
                location.reload();
            }

            if(this.ballThrown === false) {
                switch (event.keyCode) {
                    // Throw ball
                    case 32: // space / Throw ball
                        object.body.applyImpulse(new CANNON.Vec3(0+rotation, 0, strength), object.body.position);
                        this.ballThrown = true;
                        break;

                    // Move
                    case 37: // left / Move left
                        if(object.body.position.x > -.5) {
                            object.body.position.set(object.body.position.x -= .08, object.body.position.y, object.body.position.z);
                        }
                        break;
                    case 39: // right / Move right
                        if(object.body.position.x < .5) {
                            object.body.position.set(object.body.position.x += .08, object.body.position.y, object.body.position.z);
                        }
                        break;

                    // Rotation
                    case 38: // up / Increase rotation
                        if(rotation < 6) {
                            object.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, .25, 0), rotation += .75);
                        }
                        break;
                    case 40: // down / Decrease rotation
                        if(rotation > -6) {
                            object.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, -.25, 0), rotation -= .75);
                        }
                        break;

                    // Strength    
                    case 49: // 1 / Strength 1
                        strength = -120;
                        break;
                    case 50: // 2 / Strength 2
                        strength = -140;
                        break;
                    case 51: // 3 / Strength 3
                        strength = -160;
                        break;
                    case 52: // 4 / Strength 4
                        strength = -180;
                        break;
                    case 53: // 5 / Strength 5
                        strength = -200;
                        break;
                }
            };
        };

        document.addEventListener('keydown', onKeyDown, false);
    }

    createBox(x, y, z, width, height, depth) {
        const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
        const body = new CANNON.Body({
            mass: 0
        });
        body.addShape(shape);
        body.position.set(x, y, z);
        this.world.addBody(body);

        const geometry = new THREE.BoxGeometry(width, height, depth);
        // const material = new THREE.MeshPhongMaterial({ color: 0xffffff });

        const loader = new THREE.TextureLoader();

        // load a resource
        loader.load(
            './floor.jpg',
            (texture) => {
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                });

                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(3, 0.5);
                texture.rotation = Math.PI / 2;


                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                this.scene.add(mesh);
                this.sceneObjects.push({
                    mesh: mesh,
                    body: body,
                    type: 'ground'
                });
            },

            // onProgress callback currently not supported
            undefined,

            // onError callback
            function (err) {
                console.error('An error happened.');
            }
        );
    }

    createCylinder(x, y, z) {
        const topDiameter = 0.055;
        const bottomDiameter = 0.055;
        const shape = new CANNON.Cylinder(topDiameter, bottomDiameter, 0.38, 10);
        const body = new CANNON.Body({
            mass: 1.5,
        });
        body.sleep = true;
        body.addShape(shape);
        body.position.set(x, y, z - this.pinOffset);

        // Match orientation of the cylinder with three.js
        const quat = new CANNON.Quaternion();
        quat.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        const translation = new CANNON.Vec3(0, 0, 0);
        shape.transformAllPoints(translation, quat);

        this.world.addBody(body);

        const geometry = new THREE.CylinderGeometry(topDiameter, bottomDiameter, 0.38, 10);
        const material = new THREE.MeshPhongMaterial({ color: 0xffffff, wireframe: true });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // const texture = this.pinTexture.clone();

        this.scene.add(mesh);

        this.sceneObjects.push({
            mesh: mesh,
            body: body,
            type: 'pin'
        });

        return {
            mesh: mesh,
            body: body,
            type: 'pin'
        };
    }

    createSphere(texture) {
        const shape = new CANNON.Sphere(0.11);
        const body = new CANNON.Body({
            mass: 12
        });
        body.addShape(shape);
        this.world.addBody(body);

        const geometry = new THREE.SphereGeometry(0.11, 20, 20);

        const material = new THREE.MeshBasicMaterial({
            map: texture,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        this.scene.add(mesh);
        this.sceneObjects.push({
            mesh: mesh,
            body: body,
            type: 'ball'
        });

        return {
            mesh: mesh,
            body: body,
            type: 'ball'
        };
    }

    createDirectionalLight(x, y, z) {
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(x, y, z);
        light.castShadow = true;
        this.scene.add(light);
        light.target = this.ball.mesh;
        return light;
    }

    createAmbiantLight() {
        const light = new THREE.AmbientLight(0xaeaeae, 0.5);
        this.scene.add(light);
        return light;
    }

    createCamera() {
        const camera = new THREE.PerspectiveCamera(30, sizes.width / sizes.height, 1, 100);
        camera.position.z = 6;
        camera.position.x = 0.2;
        camera.position.y = 0.5;
        this.scene.add(camera);
        return camera;
    }

    updatePhysics() {
        // Step the physics world
        this.world.step(this.timeStep);

        this.camera.position.z = (this.ball.mesh.position.z + 4) * 0.7;

        if (this.ball.body.position.y < -2) {
            this.ball.body.position.set(0, 0, 0);
            this.ball.body.velocity.set(0, 0, 0);
            this.ball.body.angularVelocity.set(0, 0, 0);

            // Remove pins that are below the ground
            this.sceneObjects.forEach((el) => {
                if(el.type === 'pin') {
                    if(el.body.position.y < -0.15) {
                        this.scene.remove(el.mesh);
                        this.world.remove(el.body);
                    }
                }  
            });

            // Throw ball again
            this.ballThrown = false;
        }

        // Copy coordinates from Cannon.js to Three.js
        this.sceneObjects.forEach(sceneObject => {
            sceneObject.mesh.position.copy(sceneObject.body.position);
            sceneObject.mesh.quaternion.copy(sceneObject.body.quaternion);
        });
    }

    initCannon() {
        this.world.gravity.set(0, -9, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;
    }

    initThree() {
        this.renderer.setSize(sizes.width, sizes.height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
    }
}

const bowling = new Bowling();
function animate() {
    requestAnimationFrame(animate);
    bowling.updatePhysics();
    bowling.renderer.render(bowling.scene, bowling.camera);
}
animate();
