import { mat4 } from 'gl-matrix';
export function drawMesh(gl, mesh, uniforms, object) {
    gl.bindVertexArray(mesh.vao);
    const model = mat4.create();
    mat4.translate(model, model, object.position);
    mat4.scale(model, model, object.scale);
    gl.uniformMatrix4fv(uniforms.model, false, model);
    const c = object.color;
    gl.uniform4f(uniforms.color, c[0], c[1], c[2], c[3] !== undefined ? c[3] : 1.0);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.vertexCount);
}