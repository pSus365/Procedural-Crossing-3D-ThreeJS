export function createMesh(gl, program, geometry) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.positions, gl.STATIC_DRAW);

    const location = gl.getAttribLocation(program, 'aPosition');
    if (location < 0) throw new Error('Nie znaleziono aPosition');
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    return { vao, vertexCount: geometry.positions.length / 3 };
}
