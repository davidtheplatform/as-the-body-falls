var draggedPoint = null;
var lastMouseState = false;
var selectedPoint = null;

let point_container = document.getElementById("point-container");
let picker = document.getElementById("c");
let control_container = document.getElementById("control-container");
let gravity = document.getElementById("gravity");
let gravity_display = document.getElementById("gravity-display");
let drag = document.getElementById("drag");
let drag_display = document.getElementById("drag-display");
let steps = document.getElementById("steps");
let steps_display = document.getElementById("steps-display");
let maxsteps = document.getElementById("maxsteps");
let maxsteps_display = document.getElementById("maxsteps-display");
let settings = document.getElementById("settings-string");
let import_button = document.getElementById("import");
let add_button = document.getElementById("add-point");
let delete_button = document.getElementById("delete-point");
let points_display = document.getElementById("points-display");

point_container.onmousedown = event => {
    if (event.target == point_container) return;
    if (event.button != 0) return;
    if (draggedPoint == null && !lastMouseState) {
        draggedPoint = event.target;
        draggedPoint.style.left = event.clientX - 10 + "px";
        draggedPoint.style.top = event.clientY - 10 + "px";
    }

    lastMouseState = true;
};
point_container.onmousemove = event => {
    if (draggedPoint) {
        draggedPoint.style.left = event.clientX - 10 + "px";
        draggedPoint.style.top = event.clientY - 10 + "px";
    }
};
point_container.onmouseup = event => {
    if (draggedPoint != null) sendSettings();

    draggedPoint = null;
    lastMouseState = false;
};

function addPoint(x, y, color) {
    new_point = document.createElement("div");
    new_point.className = "point";
    new_point.style.left = x + "px";
    new_point.style.top = y + "px";
    new_point.style.backgroundColor = color;

    point_container.appendChild(new_point);
}

function sendSettings() {
    points = [];
    palette = [];
    Array.from(point_container.children).forEach(e => {
        points.push(parseInt(e.style.left.replace('px', '')) + 10);
        points.push(window.innerHeight - parseInt(e.style.top.replace('px', '')) - 10);

        color = window.getComputedStyle(e).backgroundColor;
        rgb = color.replace(/^(rgb|rgba)\(/, '').replace(/\)$/, '').replace(/\s/g, '').split(',');
        palette.push(parseInt(rgb[0]) / 255);
        palette.push(parseInt(rgb[1]) / 255);
        palette.push(parseInt(rgb[2]) / 255);
        palette.push(0.0);
    });

    attributes = {
        palette: palette,
        points: points,
        gravity: parseInt(gravity_display.innerText) / 10,
        drag: parseInt(drag_display.innerText) / 100000,
        steps: parseInt(steps_display.innerText),
        maxsteps: parseInt(maxsteps_display.innerText)
    }

    settings.value = btoa(JSON.stringify(attributes));

    applySettings(gl, sim_program, attributes);
    applySettings(gl, render_program, attributes);

    drawFrame();
    gl.useProgram(sim_program);
    setUniformi(sim_program, "u_reset", 0);
}

point_container.oncontextmenu = event => {
    if (event.target == point_container) return;
    selectedPoint = event.target;
    picker.click();

    return false;
}

picker.onchange = event => {
    if (selectedPoint == null) return;
    selectedPoint.style.backgroundColor = event.target.value;
    selectedPoint = null;

    sendSettings();
}

gravity.oninput = event => {
    gravity_display.innerText = Math.round(event.target.value);
    sendSettings();
}

drag.oninput = event => {
    drag_display.innerText = Math.round(event.target.value * event.target.value);
    sendSettings();
}

steps.oninput = event => {
    steps_display.innerText = Math.round(event.target.value);
    sendSettings();
}

maxsteps.oninput = event => {
    maxsteps_display.innerText = Math.round(event.target.value * event.target.value);
    sendSettings();
}

add_button.onclick = event => {
    addPoint(Math.random() * window.innerWidth, Math.random() * window.innerHeight, `hsl(${Math.random() * 360}, 100%, 50%)`);
    points_display.innerText = point_container.children.length;
    sendSettings();
}

delete_button.onclick = event => {
    point_container.children[point_container.children.length - 1].outerHTML = '';
    points_display.innerText = point_container.children.length;
    sendSettings();
}

import_button.onclick = event => {
    settings = JSON.parse(atob(settings.value));
    point_container.innerHTML = "";

    for (var i = 0; i < settings.points.length / 2; i++) {
        color = `rgb(${settings.palette[i * 4] * 255}, ${settings.palette[i * 4 + 1] * 255}, ${settings.palette[i * 4 + 2] * 255})`;
        addPoint(settings.points[i * 2] - 10, window.innerHeight - settings.points[i * 2 + 1] - 10, color);
    }

    gravity.value = settings.gravity * 10;
    gravity_display.innerText = settings.gravity * 10;

    drag.value = Math.sqrt(settings.drag * 100000);
    drag_display.innerText = settings.drag * 100000;

    steps.value = settings.steps;
    steps_display.innerText = settings.steps;

    maxsteps.value = Math.sqrt(settings.maxsteps);
    maxsteps_display.innerText = settings.maxsteps;

    sendSettings();
}