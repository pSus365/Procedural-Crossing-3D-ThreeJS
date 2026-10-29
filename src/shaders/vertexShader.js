// Kod GLSL jest tekstem, który WebGL przekazuje do kompilatora GPU.
export const vertexShaderSource = `#version 300 es
in vec3 aPosition;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
void main() {
gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
}`;
