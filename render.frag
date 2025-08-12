precision mediump float;

uniform vec2 u_resolution;

uniform sampler2D u_sim_data;

uniform sampler2D u_palette;
uniform int u_palette_size;

uniform sampler2D u_points;
uniform int u_num_points;

vec2 point(int i) {
    return texture2D(u_points, vec2(float(i) / float(u_num_points), 0.0)).xy;
}

vec3 color(int i) {
    return texture2D(u_palette, vec2(float(i) / float(u_palette_size), 0.0)).xyz;
}

vec3 render(vec4 particle) {
    vec2 screenSize = u_resolution;
    float longerSide = max(screenSize.x, screenSize.y);

    float particleX = particle.r;
    float particleY = particle.g;

    int collidedPointIndex = -1;
    for(int i = 0; i < 100; i++) {
        if (i >= u_num_points) break;

        float pointX = point(i).x;
        float pointY = point(i).y;

        float dx = (pointX - particleX) * (512.0 / longerSide);
        float dy = (pointY - particleY) * (512.0 / longerSide);
        float distanceSquared = dx * dx + dy * dy;

        float minDistance = 5.0 * (512.0 / longerSide);

        if(distanceSquared < (minDistance * minDistance)) {
            collidedPointIndex = i;
            break;
        }
    }

    if(collidedPointIndex == -1)
        return vec3(0);
    return color(collidedPointIndex);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;

    vec4 particle = texture2D(u_sim_data, uv);
    gl_FragColor = vec4(render(particle), 1.0);
}