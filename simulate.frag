precision mediump float;

uniform vec2 u_resolution;
uniform int u_reset;

uniform sampler2D u_sim_data;

uniform sampler2D u_palette;

uniform sampler2D u_points;
uniform int u_num_points;

uniform int u_maxSteps;
uniform float u_drag;
uniform float u_gravity;

vec2 point(int i) {
    return texture2D(u_points, vec2(float(i) / float(u_num_points), 0.0)).xy;
}

vec4 simulate(vec4 prev) {
    vec4 fragColor = vec4(0);

    float minD = 5.0;
    float particleX = prev.r; // Particle's position (X)
    float particleY = prev.g; // Particle's position (Y)

    float velocityX = prev.b; // Velocity in X

    float velocityY = prev.a; // Velocity in Y

    int collidedPointIndex = -1; // Will hold the index of the gravity point we collide with

    for(int stepCount = 0; stepCount < 10000; stepCount++) {
        if (stepCount > u_maxSteps) break;
        float accelerationX = 0.0;
        float accelerationY = 0.0;

        for(int i = 0; i < 100; i++) {
            if(i >= u_num_points)
                break;
            float pointX = point(i).x;
            float pointY = point(i).y;

            float dx = (pointX - particleX);
            float dy = (pointY - particleY);
            float distanceSquared = dx * dx + dy * dy;

            if(distanceSquared < (minD * minD)) {
                collidedPointIndex = i;
                break;
            }

            float gravityForce = u_gravity / distanceSquared;

            float distance = sqrt(distanceSquared);

            accelerationX += gravityForce * (dx / distance);
            accelerationY += gravityForce * (dy / distance);

        }

        if(collidedPointIndex >= 0) {
            break;
        }

        velocityX += accelerationX;
        velocityY += accelerationY;

        velocityX *= (1.0 - u_drag);
        velocityY *= (1.0 - u_drag);

        particleX += velocityX;
        particleY += velocityY;
    }

    return vec4(particleX, particleY, velocityX, velocityY);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;

    if(u_reset == 1) {
        gl_FragColor = vec4(gl_FragCoord.xy, 0.0, 0.0);
    } else {
        vec4 prev = texture2D(u_sim_data, uv);
        vec4 next = simulate(prev);
        gl_FragColor = next;
    }

}