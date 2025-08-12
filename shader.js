window.addEventListener("load", setupWebGL, false);
let gl;
let sim_program;
let render_program;
let canvas = document.getElementById("output");
let status = document.getElementById("status");

let tex1;
let tex2;
let fb1;
let fb2;

let max_steps;
let frame_steps;
let current_steps;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

function getRenderingContext() {
	return canvas.getContext("webgl2");
}

async function createProgram(name) {
	gl.getExtension('OES_texture_float');
	gl.getExtension('WEBGL_color_buffer_float');
	gl.getExtension('EXT_color_buffer_float')
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	let vertex = document.querySelector("#vertex-shader").innerHTML;
	const vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, vertex);
	gl.compileShader(vertexShader);

	var r = await fetch(name + ".frag");
	source = await r.text();

	const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader, source);
	gl.compileShader(fragmentShader);
	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const linkErrLog = gl.getProgramInfoLog(program);
		document.getElementById("errortext").textContent =
			`Shader program did not link successfully. Error log: ${linkErrLog}`;
		return;
	}
	gl.useProgram(program);

	var verts = [
		1.0, 1.0,
		-1.0, 1.0,
		-1.0, -1.0,
		-1.0, -1.0,
		1.0, -1.0,
		1.0, 1.0
	];
	screenQuadVBO = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, screenQuadVBO);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	setUniformi(program, 'u_reset', 1);

	gl.drawArrays(gl.TRIANGLES, 0, 6);

	return program;
};

function textureFromFloats(gl, width, height, float32Array) {
	var oldActive = gl.getParameter(gl.ACTIVE_TEXTURE);
	gl.activeTexture(gl.TEXTURE15); // working register 31, thanks.

	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F,
		width, height, 0,
		gl.RGBA, gl.FLOAT, float32Array);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.bindTexture(gl.TEXTURE_2D, null);

	gl.activeTexture(oldActive);

	return texture;
}

function createTexture(gl, width, height, float32Array) {
	gl.activeTexture(gl.TEXTURE15);
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	gl.texImage2D(
		gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0,
		gl.RGBA, gl.FLOAT, float32Array
	);

	return texture;
}


function createFramebuffer(tex) {
	const fb = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
	gl.framebufferTexture2D(
		gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0
	);
	return fb;
}

var nextTextureUnit = 10;
function sendFloatArray(gl, prog, name, array, values) {
	var newArray = [];
	for (var i = 0; i < array.length; i++) {
		newArray.push(array[i]);
		if ((i - 1) % (4 - values) == 0) {
			for (var j = 0; j < values; j++) {
				newArray.push(0.0);
			}
		}
	}

	if (newArray.length % 4 != 0) console.error("BUG! sendFloatArray is not divisible by 4");
	texture = createTexture(gl, newArray.length / 4, 1, new Float32Array(newArray));

	textureUnit = nextTextureUnit;
	nextTextureUnit++;
	gl.activeTexture(gl.TEXTURE0 + textureUnit);
	gl.bindTexture(gl.TEXTURE_2D, texture);

	var z = gl.getUniformLocation(prog, name);
	gl.uniform1i(z, textureUnit);
}

function setUniformi(program, name, value) {
	var loc = gl.getUniformLocation(program, name);
	gl.uniform1i(loc, value);
}
function setUniformf(program, name, value) {
	var loc = gl.getUniformLocation(program, name);
	gl.uniform1f(loc, value);
}

function setupWebGL(evt) {
	window.removeEventListener(evt.type, setupWebGL, false);
	if (!(gl = getRenderingContext())) return;

	createProgram("simulate").then(program => {
		sim_program = program;
		
		createProgram("render").then(program => {
			render_program = program;
			gl.useProgram(sim_program);

			tex1 = createTexture(gl, window.innerWidth, window.innerHeight, null);
			tex2 = createTexture(gl, window.innerWidth, window.innerHeight, null);
			fb1 = createFramebuffer(tex1);
			fb2 = createFramebuffer(tex2);

			applySettings(gl, sim_program, { palette: [], points: [] });
			
			gl.useProgram(render_program)
			applySettings(gl, render_program, { palette: [], points: [] });
			loc = gl.getUniformLocation(render_program, 'u_resolution');
			gl.uniform2f(loc, window.innerWidth, window.innerHeight);
			

			drawFrame();

			gl.useProgram(sim_program);
			setUniformi(sim_program, 'u_reset', 0);

			['#ee1b24', '#a34aa3', '#3f47cd', '#24b14d', '#fef100', '#ff7326'].forEach((c, i) => {
				addPoint(
					(window.innerWidth / 2) + 400 * Math.cos(i * Math.PI/5),
					(window.innerHeight / 2) + 400 * Math.sin(i * Math.PI/5),
					c
				);
			});
			sendSettings();
		});
	});

}

function applySettings(gl, program, attributes) {
	nextTextureUnit = 10;
	gl.useProgram(program);

	setUniformi(program, "u_reset", 1);
	sendFloatArray(gl, program, "u_palette", attributes.palette, 4);
	setUniformi(program, "u_palette_size", attributes.palette.length / 4);

	sendFloatArray(gl, program, "u_points", attributes.points, 2);
	setUniformi(program, "u_num_points", attributes.points.length / 2);

	setUniformf(program, "u_gravity", attributes.gravity);
	setUniformf(program, "u_drag", attributes.drag);
	setUniformi(program, "u_maxSteps", attributes.steps);

	max_steps = attributes.maxsteps;
	frame_steps = attributes.steps;
	current_steps = 0;

	var loc = gl.getUniformLocation(program, "u_resolution");
	gl.uniform2f(loc, window.innerWidth, window.innerHeight);
}

let quadBuffer;

function drawFullScreenQuad(program, texture, uniformName) {
	gl.useProgram(program);

	const texLoc = gl.getUniformLocation(program, uniformName);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.uniform1i(texLoc, 0);

	gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function drawFrame() {
	if (current_steps >= max_steps) {
		status.innerText = "done!"
		return;
	};
	current_steps += frame_steps;
	status.innerText = `${current_steps}/${max_steps} | ${Math.round(current_steps / max_steps * 100)}%`

	gl.useProgram(sim_program);
	gl.bindFramebuffer(gl.FRAMEBUFFER, fb2);
	drawFullScreenQuad(sim_program, tex1, "u_sim_data");

	[tex1, tex2] = [tex2, tex1];
	[fb1, fb2] = [fb2, fb1];

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.useProgram(render_program);
	drawFullScreenQuad(render_program, tex1, "u_sim_data");

	requestAnimationFrame(drawFrame);
}
