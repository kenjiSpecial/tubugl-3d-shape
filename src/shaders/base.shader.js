export const baseShaderVertSrc = `
attribute vec4 position;
// attribute vec3 barycentricPosition;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;

varying vec3 vBarycentricPosition;

void main() {
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * position;
    gl_PointSize = 10.;
    // vBarycentricPosition = barycentricPosition;
}`;

export const baseShaderFragSrc = `
precision mediump float;

uniform bool uWireframe;

void main() {
    float colorR = gl_FrontFacing ? 1.0 : 0.0;
    float colorG = gl_FrontFacing ? 0.0 : 1.0;
    
    gl_FragColor = vec4(colorR, colorG, 0.0, 1.0);

}`;

export const wireFrameFragSrc = `
precision mediump float;

void main(){
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

export const base2ShaderVertSrc = `#version 300 es
in vec4 position;
in vec3 barycentricPosition;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;

out vec3 vBarycentricPosition;

void main() {
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * position;
    
    vBarycentricPosition = barycentricPosition; 
}
`;

export const base2ShaderFragSrc = `#version 300 es
precision mediump float;
in vec3 vBarycentricPosition;

uniform bool uWireframe;

out vec4 outColor;

void main() {

    if(uWireframe){
        float minBarycentricVal = min(min(vBarycentricPosition.x, vBarycentricPosition.y), vBarycentricPosition.z);
        if(minBarycentricVal > 0.01) discard;
    }
    
    outColor = vec4(1.0, 0.0, 0.0, 1.0);
}
`;

export const normalShaderVertSrc = `
attribute vec4 position;
attribute vec3 normal;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;

varying vec3 vBarycentricPosition;
varying vec3 vNormal;

void main() {
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * position;
    vNormal = normal;
}
`;

export const normalShaderFragSrc = `
precision mediump float;

varying vec3 vNormal;

void main() {
    vec3 faceColor = (vNormal + vec3(0.5))/2.0;
    gl_FragColor = vec4(faceColor, 1.0);
}`;
