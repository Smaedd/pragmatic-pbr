var glslify        = require('glslify-sync');
var isBrowser      = require('is-browser');
var fs             = require('fs');
var Texture2D      = require('pex-context/Texture2D');

var Vert = glslify(__dirname + '/PBR.vert');
var Frag = glslify(__dirname + '/PBR.frag');

function PBRMaterial(ctx, uniforms, watch) {
    console.log('uAlbedoColor' + uniforms.uAlbedoColor)
    this.ctx = ctx;
    this.uniforms = Object.assign({
        uRoughness: 0.5,
        uMetalness: 0.0,
        uExposure: 0.5,
        uLightPos: [10, 10, 0],
        uReflectionMap: null,
        uIrradianceMap: null,
        uHammersleyPointSetMap: null,
        uAlbedoColor: [0,0,0,1],
        uLightColor: [1,1,1,1],
        uIor: 1.4
    }, uniforms || {})

    this.name = uniforms.name || 'PBRIBL';

    this.compile();

    if (!isBrowser && watch) {
        this.watch();
    }
}

PBRMaterial.prototype.watch = function() {
    fs.watchFile(__dirname + '/glsl/PBRMaterial.frag', function() {
        this.reload();
    }.bind(this));
}

PBRMaterial.prototype.reload = function() {
    console.log('reloading');
    Vert = glslify(__dirname + '/PBR.vert');
    Frag = glslify(__dirname + '/PBR.frag');
    this.compile();
}

PBRMaterial.prototype.compile = function() {
    var ctx = this.ctx;

    var uniforms = this.uniforms;

    var flags = [];

    if (uniforms.uAlbedoColor instanceof Texture2D) {
        console.log('Albedo texture')
        flags.push('#define USE_ALBEDO_MAP');
    }
    if (uniforms.uRoughness instanceof Texture2D) {
        flags.push('#define USE_ROUGHNESS_MAP');
    }
    if (uniforms.uMetalness instanceof Texture2D) {
        flags.push('#define USE_METALNESS_MAP');
    }
    if (uniforms.useTonemap) {
        flags.push('#define USE_TONEMAP');
    }
    if (uniforms.showNormals) {
        flags.push('#define SHOW_NORMALS');
    }
    if (uniforms.showTexCoords) {
        flags.push('#define SHOW_TEX_COORDS');
    }
    if (uniforms.showFresnel) {
        flags.push('#define SHOW_FRESNEL');
    }
    if (uniforms.showIrradiance) {
        flags.push('#define SHOW_IRRADIANCE');
    }
    if (uniforms.showIndirectSpecular) {
        flags.push('#define SHOW_INDIRECT_SPECULAR');
    }
    flags = flags.join('\n') + '\n';

    try {
        this.program = ctx.createProgram(Vert, flags + Frag);
    }
    catch(e) {
        console.log(e);
    }
}

module.exports = PBRMaterial;
