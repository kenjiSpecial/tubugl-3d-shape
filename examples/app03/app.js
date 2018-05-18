/**
 * make demo with rendering of plane(webgl)
 */

const dat = require('../vendor/dat.gui.min');
const TweenLite = require('gsap/TweenLite');
const Stats = require('../vendor/stats.min');
import { TextureCube } from '../../src/textureCube';
import { GridHelper } from 'tubugl-helper';
import { PerspectiveCamera, CameraController } from 'tubugl-camera';

import { Texture } from 'tubugl-core/src/texture';

import texture0Url from '../assets/texture00.jpg';
import texture1Url from '../assets/texture01.jpg';
import texture2Url from '../assets/texture02.jpg';
import texture3Url from '../assets/texture03.jpg';
import texture4Url from '../assets/texture04.jpg';
import textureUVUrl from '../assets/uv.jpg';

export default class App {
    constructor(params = {}) {
        this._isMouseDown = false;
        this._isPlaneAnimation = false;
        this._width = params.width ? params.width : window.innerWidth;
        this._height = params.height ? params.height : window.innerHeight;

        this.canvas = document.createElement('canvas');
        this.gl = this.canvas.getContext('webgl');

        this._setClear();
        // this._makeBox();
        this._makeCamera();
        this._makeCameraController();

        this._isDebug = params.isDebug;
        if (this._isDebug) {
            this.stats = new Stats();
            document.body.appendChild(this.stats.dom);
        }
    }

    animateIn() {
        this.isLoop = true;
        TweenLite.ticker.addEventListener('tick', this.loop, this);
    }

    startLoad() {
        this._textures = [];
        this._loadedCnt = 0;
        [
            { src: texture0Url, name: 'texture0' },
            { src: texture1Url, name: 'texture1' },
            { src: texture2Url, name: 'texture2' },
            { src: texture3Url, name: 'texture3' },
            { src: texture4Url, name: 'texture4' },
            { src: textureUVUrl, name: 'textureUV' }
        ].forEach(val => {
            let image = new Image();
            image.onload = () => {
                this._loadedCnt++;

                if (this._loadedCnt === 6) this._loaded();
            };
            image.src = val.src;
            this._textures.push({ image: image, name: val.name, texture: null });
        });
    }

    loop() {
        if (this.stats) this.stats.update();

        let gl = this.gl;
        gl.viewport(0, 0, this._width, this._height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this._camera.update();

        for (let ii = 0; ii < this._boxes.length; ii++) {
            this._boxes[ii].render(this._camera);
        }

        this._gridHelper.render(this._camera);
    }

    animateOut() {
        TweenLite.ticker.removeEventListener('tick', this.loop, this);
    }

    onKeyDown(ev) {
        switch (ev.which) {
            case 27:
                this._playAndStop();
                break;
        }
    }

    _playAndStop() {
        this.isLoop = !this.isLoop;
        if (this.isLoop) {
            TweenLite.ticker.addEventListener('tick', this.loop, this);
            this.playAndStopGui.name('pause');
        } else {
            TweenLite.ticker.removeEventListener('tick', this.loop, this);
            this.playAndStopGui.name('play');
        }
    }

    resize(width, height) {
        this._width = width;
        this._height = height;

        this.canvas.width = this._width;
        this.canvas.height = this._height;
        this.gl.viewport(0, 0, this._width, this._height);

        this._boxes.forEach(box => {
            box.resize(this._width, this._height);
        });
        this._camera.updateSize(this._width, this._height);
    }

    destroy() {}
    _loaded() {
        this._textures.forEach(obj => {
            let image = obj.image;
            let texture = new Texture(this.gl);
            texture
                .bind()
                .fromImage(image, image.width, image.height)
                .generateMipmap();
            obj.texture = texture;
        });

        this._makeBoxes();
        this._makeHelper();
        this.animateIn();
        if (this._isDebug) this._addGui();
        this.resize(this._width, this._height);
    }
    _setClear() {
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
    }

    _makeBoxes() {
        this._boxes = [];
        let side = 80;

        this._textures.forEach((texture, index) => {
            let box = new TextureCube(this.gl, side, side, side, 1, 1, 1, {
                isWire: true,
                texture: { value: this._textures[index].texture, name: 'uTexture' }
            });
            box.position.y = side / 2;

            box.position.x = -150 * 2.5 + 150 * index;

            this._boxes.push(box);
        });
    }

    _makeHelper() {
        this._gridHelper = new GridHelper(this.gl, {}, 1000, 1000, 20, 20);
    }

    _makeCamera() {
        this._camera = new PerspectiveCamera(window.innerWidth, window.innerHeight, 60, 1, 2000);
        this._camera.position.z = 700;
        this._camera.position.y = 80;
        this._camera.lookAt([0, 0, 0]);
    }

    _makeCameraController() {
        this._cameraController = new CameraController(this._camera, this.canvas);
        this._cameraController.minDistance = 300;
        this._cameraController.maxDistance = 1000;
    }

    _addGui() {
        this.gui = new dat.GUI();
        this.playAndStopGui = this.gui.add(this, '_playAndStop').name('pause');
        // this._boxGUIFolder = this.gui.addFolder('rounding  cube');
        // this._box.addGui(this._boxGUIFolder);
        // this._boxGUIFolder.open();
    }
}