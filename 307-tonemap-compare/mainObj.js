var Window       = require('pex-sys/Window');
var Mat4         = require('pex-math/Mat4');
var Vec3         = require('pex-math/Vec3');
var MathUtils    = require('pex-math/Utils');
var GUI          = require('pex-gui');
var PerspCamera  = require('pex-cam/PerspCamera');
var Arcball      = require('pex-cam/Arcball');
var Draw         = require('pex-draw');
var glslify      = require('glslify-promise');
var createSphere = require('primitive-sphere');
var createCube   = require('primitive-cube');
var parseHdr     = require('../local_modules/parse-hdr');
var parseObj     = require('../local_modules/geom-parse-obj');
var isBrowser    = require('is-browser');

Window.create({
    settings: {
        width: 1200,
        height: 720,
        fullscreen: isBrowser
    },
    resources: {
        skyboxVert: { glsl: glslify(__dirname + '/SkyboxQuad.vert') },
        skyboxFrag: { glsl: glslify(__dirname + '/SkyboxQuad.frag') },
        reflectionVert: { glsl: glslify(__dirname + '/Reflection.vert') },
        reflectionFrag: { glsl: glslify(__dirname + '/Reflection.frag') },
        showColorsVert: { glsl: glslify(__dirname + '/../assets/glsl/ShowColors.vert') },
        showColorsFrag: { glsl: glslify(__dirname + '/../assets/glsl/ShowColors.frag') },
        reflectionMap: { binary: __dirname + '/../assets/envmaps/grace-new-128.hdr' },
        filmLut: { image: __dirname + '/../assets/textures/FilmLut.png' },
        obj: { text: __dirname + '/../assets/models/knot6.obj'}
    },
    exposure: 1,
    onMouseMove: function(e) {
        var w = this.getWidth();
        if (e.x < w/2) {
            this.exposure = MathUtils.clamp(MathUtils.map(e.x, 0, w/2, 0, 1), 0, 1);
        }
        else {
            this.exposure = MathUtils.clamp(MathUtils.map(e.x, w/2, w, 1, 5), 0, 5);
        }
    },
    init: function() {
        var ctx = this.getContext();

        this.debugDraw = new Draw(ctx);

        var w = this.getWidth();
        var h = this.getHeight();
        this.gui = new GUI(ctx, w, h);
        this.gui.addHeader('Gamma').setPosition(10, 10);
        this.gui.addHeader('Reinhard + Gamma').setPosition(w/2 + 10, 10);
        this.gui.addHeader('Filmic').setPosition(10, h/2 + 10);
        this.gui.addHeader('Uncharted + Gamma').setPosition(w/2 + 10, h/2 + 10);

        this.camera  = new PerspCamera(45,this.getAspectRatio(),0.001,20.0);
        this.camera.lookAt([2, 1, 2], [0, 0, 0]);

        ctx.setProjectionMatrix(this.camera.getProjectionMatrix());

        this.arcball = new Arcball(this.camera, this.getWidth(), this.getHeight());
        this.arcball.setDistance(3.0);
        this.addEventListener(this.arcball);

        this.model = Mat4.create();
        this.projection = Mat4.perspective(Mat4.create(), 60, this.getAspectRatio(), 0.001, 100.0);
        this.cameraPos = [3, -1, 2];
        this.view = Mat4.lookAt([], this.cameraPos, [0, 0, 0], [0, 1, 0]);
        this.invView = Mat4.create();
        Mat4.set(this.invView, this.view);
        Mat4.invert(this.invView);

        ctx.setProjectionMatrix(this.projection);
        ctx.setViewMatrix(this.view);
        ctx.setModelMatrix(this.model);

        var res = this.getResources();

        this.skyboxProgram = ctx.createProgram(res.skyboxVert, res.skyboxFrag);
        ctx.bindProgram(this.skyboxProgram);
        this.skyboxProgram.setUniform('uReflectionMap', 0);
        this.skyboxProgram.setUniform('uFilmLut', 1);
        this.skyboxProgram.setUniform('uExposure', this.exposure);

        this.reflectionProgram = ctx.createProgram(res.reflectionVert, res.reflectionFrag);
        ctx.bindProgram(this.reflectionProgram);
        this.reflectionProgram.setUniform('uReflectionMap', 0);
        this.reflectionProgram.setUniform('uFilmLut', 1);
        this.reflectionProgram.setUniform('uExposure', this.exposure);

        this.showColorsProgram = ctx.createProgram(res.showColorsVert, res.showColorsFrag);

        this.filmLutTexture = ctx.createTexture2D(res.filmLut);

        var hdrInfo = parseHdr(res.reflectionMap);
        this.reflectionMap = ctx.createTexture2D(hdrInfo.data, hdrInfo.width, hdrInfo.height, { type: ctx.UNSIGNED_BYTE });

        var skyboxPositions = [[-1,-1],[1,-1], [1,1],[-1,1]];
        var skyboxFaces = [ [0, 1, 2], [0, 2, 3]];
        var skyboxAttributes = [
            { data: skyboxPositions, location: ctx.ATTRIB_POSITION },
        ];
        var skyboxIndices = { data: skyboxFaces };
        this.skyboxMesh = ctx.createMesh(skyboxAttributes, skyboxIndices);

        var sphere = createSphere();
        sphere = parseObj(res.obj);
        var attributes = [
            { data: sphere.positions, location: ctx.ATTRIB_POSITION },
            { data: sphere.normals, location: ctx.ATTRIB_NORMAL },
            { data: sphere.uvs, location: ctx.ATTRIB_TEX_COORD_0 },
        ];
        var sphereIndices = { data: sphere.cells, usage: ctx.STATIC_DRAW };
        this.sphereMesh = ctx.createMesh(attributes, sphereIndices, ctx.TRIANGLES);
    },
    drawScene: function(tonemappingMethod) {
        var ctx = this.getContext();
        ctx.setDepthTest(false);
        ctx.bindProgram(this.skyboxProgram);
        this.skyboxProgram.setUniform('uExposure', this.exposure);
        this.skyboxProgram.setUniform('uTonemappingMethod', tonemappingMethod);
        ctx.bindMesh(this.skyboxMesh);
        ctx.drawMesh();

        ctx.setDepthTest(true);
        ctx.bindProgram(this.reflectionProgram);
        this.reflectionProgram.setUniform('uInvViewMatrix', this.invView);
        this.reflectionProgram.setUniform('uExposure', this.exposure);
        this.reflectionProgram.setUniform('uTonemappingMethod', tonemappingMethod);
        ctx.bindMesh(this.sphereMesh);
        ctx.drawMesh();

        ctx.bindProgram(this.showColorsProgram);
        this.debugDraw.drawPivotAxes(2);
    },
    draw: function() {
        var ctx = this.getContext();
        ctx.setClearColor(0.2, 0.2, 0.2, 1);
        ctx.clear(ctx.COLOR_BIT | ctx.DEPTH_BIT);
        ctx.setDepthTest(true);

        ctx.setViewMatrix(this.view);

        this.arcball.apply();
        ctx.setViewMatrix(this.camera.getViewMatrix());

        ctx.bindTexture(this.reflectionMap, 0);
        ctx.bindTexture(this.filmLutTexture, 1);

        var w = this.getWidth();
        var h = this.getHeight();

        //Viewport origin is at bottom left
        ctx.setViewport(0, h/2, w/2, h/2);
        this.drawScene(0);

        ctx.setViewport(w/2, h/2, w/2, h/2);
        this.drawScene(1);

        ctx.setViewport(0, 0, w/2, h/2);
        this.drawScene(2);

        ctx.setViewport(w/2, 0, w/2, h/2);
        this.drawScene(3);

        ctx.setViewport(0, 0, w, h);

        this.gui.draw();
    }
})
