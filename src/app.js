import * as CANNON from "cannon";
import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// import * as dat from 'dat.gui';

// const gui = new dat.GUI();

const sizes = {
    width: document.body.clientWidth,
    height: document.body.clientHeight,
}

class Bowling {
    constructor() {
        this.world = new CANNON.World();
        this.world.allowSleep = true;
        this.timeStep = 1 / 60;
        this.scene = new THREE.Scene();
        this.sceneObjects = [];

        this.pinOffset = 20;
        this.pinRows = 3;

        this.throwIndex = 0;

        const canvas = document.querySelector(".webgl")
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
        });

        this.renderer.setPixelRatio(window.devicePixelRatio ? window.devicePixelRatio : 1);

        this.loadTexture();

        const loaderBall = new THREE.TextureLoader();
        this.ballMaterial = loaderBall.load(
            './ball.jpg',
            (texture) => {
                return texture;
            }
        );
        this.ball = this.createSphere(this.ballMaterial);
        this.ballThrown = false;
        this.ballStrength = -80;
        this.ballRotation = 0;
        this.waitingThrow;
        this.chargeShot = false;

        this.camera = this.createCamera();

        this.UIHelper = this.createUIHelper();

        this.createBox(0, -0.4, -10, 1.28, 0.2, 22); // 1.28 official width
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

    createUIHelper() {
        const geometry = new THREE.BoxGeometry(.04, .01, 1.5);
        const material = new THREE.MeshBasicMaterial({ color: "#288bbd" });
        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.set(0, -.3, 0);
        mesh.geometry.translate(0, 0, -1);

        this.scene.add(mesh);
        this.sceneObjects.push({
            mesh: mesh,
            body: mesh,
            type: 'ui'
        });

        return {
            mesh: mesh,
            body: mesh,
            type: 'ui'
        };
    }

    createPins() {
        const rowGap = 0.24;
        const colGap = 0.16;

        this.createCylinder(0, -0.1, 0);
        this.createCylinder(-colGap, -0.1, -rowGap);
        this.createCylinder(colGap, -0.1, -rowGap);
        this.createCylinder(0, -0.1, -rowGap * 2);
        this.createCylinder(-colGap * 2, -0.1, -rowGap * 2);
        this.createCylinder(colGap * 2, -0.1, -rowGap * 2);
        this.createCylinder(-colGap * 1, -0.1, -rowGap * 3);
        this.createCylinder(colGap * 1, -0.1, -rowGap * 3);
        this.createCylinder(-colGap * 3, -0.1, -rowGap * 3);
        this.createCylinder(colGap * 3, -0.1, -rowGap * 3);
    }

    initControl(object) {
        let strengthMultiplier;

        document.addEventListener('click', () => {
            if (this.chargeShot === false) {
                this.powerStrength();
                this.chargeShot = true;
            } else {
                clearInterval(this.intervalStrength);
                strengthMultiplier = document.getElementById('barStrength').style.height;
                strengthMultiplier = -strengthMultiplier.substring(0, strengthMultiplier.length - 1);

                console.log(this.ballStrength + strengthMultiplier);
                object.body.applyImpulse(new CANNON.Vec3(0 + this.ballRotation, 0, this.ballStrength + strengthMultiplier), object.body.position);
                this.ballThrown = true;

                this.waitingThrow = setTimeout(() => {
                    this.checkPins();
                }, "8000")
            }
        });

        const onKeyDown = (event) => {
            // Reset
            if (event.keyCode === 82) { // r / Reset
                location.reload();
            }

            if (this.ballThrown === false) {
                switch (event.keyCode) {
                    // Throw ball
                    case 32: // space / Throw ball
                        if (this.chargeShot === false) {
                            this.powerStrength();
                            this.chargeShot = true;
                        } else {
                            clearInterval(this.intervalStrength);
                            strengthMultiplier = document.getElementById('barStrength').style.height;
                            strengthMultiplier = -strengthMultiplier.substring(0, strengthMultiplier.length - 1);

                            console.log(this.ballStrength + strengthMultiplier);
                            object.body.applyImpulse(new CANNON.Vec3(0 + this.ballRotation, 0, this.ballStrength + strengthMultiplier), object.body.position);
                            this.ballThrown = true;

                            this.waitingThrow = setTimeout(() => {
                                this.checkPins();
                            }, "8000")
                        }
                        break;

                    // Move
                    case 37: // left / Move left
                        if (this.chargeShot === false) {
                            if (object.body.position.x > -.5) {
                                object.body.position.set(object.body.position.x -= .08, object.body.position.y, object.body.position.z);
                                this.UIHelper.body.position.set(this.UIHelper.body.position.x -= .08, this.UIHelper.body.position.y, this.UIHelper.body.position.z);
                            }
                        }
                        break;
                    case 39: // right / Move right
                        if (this.chargeShot === false) {
                            if (object.body.position.x < .5) {
                                object.body.position.set(object.body.position.x += .08, object.body.position.y, object.body.position.z);
                                this.UIHelper.body.position.set(this.UIHelper.body.position.x += .08, this.UIHelper.body.position.y, this.UIHelper.body.position.z);
                            }
                        }
                        break;

                    // Rotation
                    case 38: // up / Increase rotation
                        if (this.chargeShot === false) {
                            if (this.ballRotation < 6) {
                                object.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, .25, 0), this.ballRotation += .75);
                                this.UIHelper.body.rotation.y -= .0075;
                            }
                        }
                        break;
                    case 40: // down / Decrease rotation
                        if (this.chargeShot === false) {
                            if (this.ballRotation > -6) {
                                object.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, -.25, 0), this.ballRotation -= .75);
                                this.UIHelper.body.rotation.y += .0075;
                            }
                        }
                        break;
                }
            };
        };

        document.addEventListener('keydown', onKeyDown, false);
    }

    powerStrength() {
        var countingUp = 1;
        var i = 0;

        function count() {
            i = i + (1 * countingUp);

            if (i == 100 || i == 0) {
                countingUp *= -1;
            }

            document.getElementById('barStrength').style.height = i + '%';
        }

        this.intervalStrength = window.setInterval(count, 10);
    }

    createBox(x, y, z, width, height, depth) {
        const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
        const body = new CANNON.Body({
            mass: 0,
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
        const topDiameter = 0.020;
        const bottomDiameter = 0.055;
        const shape = new CANNON.Cylinder(topDiameter, bottomDiameter, 0.38, 10);
        const body = new CANNON.Body({
            mass: 1.5,
            sleepSpeedLimit: 0.2,
            sleepTimeLimit: 0.1,
        });
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
        const texture = this.pinTexture.clone();

        this.scene.add(texture);

        this.sceneObjects.push({
            mesh: texture,
            body: body,
            type: 'pin'
        });

        return {
            mesh: texture,
            body: body,
            type: 'pin'
        };
    }

    createSphere(texture) {
        const shape = new CANNON.Sphere(0.11);
        const body = new CANNON.Body({
            mass: 12,
            allowSleep: false,
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
        camera.lookAt(this.ball.mesh.position);
        this.scene.add(camera);
        return camera;
    }

    updatePhysics() {
        // Step the physics world
        this.world.step(this.timeStep);

        this.camera.position.z = (this.ball.mesh.position.z + 4) * 0.7;

        // Remove pins that are below the ground
        this.sceneObjects.forEach((el) => {
            if (el.type === 'pin') {
                if (el.body.position.y < -0.15) {
                    setTimeout(() => {
                        // remove element from scene objects
                        this.sceneObjects = this.sceneObjects.filter((e) => e !== el);
                        this.scene.remove(el.mesh);
                        this.world.remove(el.body);
                    }, 1000);
                }
            }
        });

        if (this.ball.body.position.y < -2) {
            clearTimeout(this.waitingThrow);

            this.checkPins();
            setTimeout(() => {
                // Throw ball again
                this.ballThrown = false;
                const score = this.countPins();
                if (score === 10) {
                    this.throwIndex = 2;
                } else {
                    this.throwIndex++;
                }

                if (this.throwIndex === 2) {
                    this.throwIndex = 0;
                    setTimeout(() => {
                        this.deleteAllPins();
                        this.createPins();
                        console.log(score);
                    }, 500);
                }
            }, 500);
        }

        // Copy coordinates from Cannon.js to Three.js
        this.sceneObjects.forEach(sceneObject => {
            sceneObject.mesh.position.copy(sceneObject.body.position);
            sceneObject.mesh.quaternion.copy(sceneObject.body.quaternion);
        });
    }

    countPins() {
        let count = 0;
        this.sceneObjects.forEach((el) => {
            if (el.type === 'pin') {
                count++;
            }
        });
        return 10 - count;
    }

    deleteAllPins() {
        this.sceneObjects.forEach((el) => {
            if (el.type === 'pin') {
                // remove pin from scene objects
                this.sceneObjects = this.sceneObjects.filter((e) => e !== el);
                this.scene.remove(el.mesh);
                this.world.remove(el.body);
            }
        });
    }

    checkPins() {
        // Reset ball position
        this.ball.body.position.set(0, 0, 0);
        this.ball.body.velocity.set(0, 0, 0);
        this.ball.body.angularVelocity.set(0, 0, 0);

        // Reset value strength and rotation
        this.ballRotation = 0;
        this.chargeShot = false;
        this.UIHelper.body.rotation.y = 0;
        this.UIHelper.body.position.x = 0;
        document.getElementById('barStrength').style.height = '0%';
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
