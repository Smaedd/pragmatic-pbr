var Window       = require('pex-sys/Window');
var Mat4         = require('pex-math/Mat4');
var Vec3         = require('pex-math/Vec3');
var glslify      = require('glslify-promise');
var createTorus  = require('primitive-torus');
var createSphere = require('primitive-sphere');
var isBrowser    = require('is-browser');

var ASSETS_DIR = isBrowser ? '../assets' :  __dirname + '/../assets';

Window.create({
    settings: {
        width: 1024,
        height: 576
    },
    resources: {
        vert: { glsl: glslify(__dirname + '/Material.vert') },
        frag: { glsl: glslify(__dirname + '/Material.frag') },
        texture: { image: ASSETS_DIR + '/textures/Pink_tile_pxr128.jpg'}
    },
    init: function() {
        var ctx = this.getContext();

        this.model = Mat4.create();
        this.projection = Mat4.perspective(Mat4.create(), 45, this.getAspectRatio(), 0.001, 10.0);
        this.view = Mat4.lookAt([], [0, 1, 5], [0, 0, 0], [0, 1, 0]);

        ctx.setProjectionMatrix(this.projection);
        ctx.setViewMatrix(this.view);
        ctx.setModelMatrix(this.model);

        var res = this.getResources();

        this.program = ctx.createProgram(res.vert, res.frag);

        this.texture = ctx.createTexture2D(res.texture, res.texture.width, res.texture.height, { repeat: true, format: ctx.SRGB });

        var g = createSphere();

        var attributes = [
            { data: g.positions, location: ctx.ATTRIB_POSITION },
            { data: g.normals, location: ctx.ATTRIB_NORMAL },
            { data: g.uvs, location: ctx.ATTRIB_TEX_COORD_0 },
        ];
        var indices = { data: g.cells, usage: ctx.STATIC_DRAW };
        this.mesh = ctx.createMesh(attributes, indices, ctx.TRIANGLES);
    },
    draw: function() {
        var ctx = this.getContext();
        ctx.setClearColor(0.2, 0.2, 0.2, 1);
        ctx.clear(ctx.COLOR_BIT | ctx.DEPTH_BIT);
        ctx.setDepthTest(true);

        ctx.bindProgram(this.program);
        this.program.setUniform('uLightPos', [10, 10, 10]);
        this.program.setUniform('uAlbedoTex', 0);
        ctx.bindTexture(this.texture, 0);

        ctx.bindMesh(this.mesh);
        ctx.drawMesh();
    }
})
