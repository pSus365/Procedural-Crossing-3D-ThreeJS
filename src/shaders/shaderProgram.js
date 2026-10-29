export function createProgram(gl, vertexSource, fragmentSource) {
    const vertex = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error('Błąd linkowania: ' + gl.getProgramInfoLog(program));
    }
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return program;
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error('Błąd kompilacji: ' + gl.getShaderInfoLog(shader));
    }
    return shader;
}
