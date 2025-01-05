
import { createNoise2D } from './simplex-noise';
import config from './config';


export class Terrain {
    private noiseGen: (x: number, y: number) => number;

    constructor(private seed: number) {
        this.noiseGen = createNoise2D();
    }

    private noise(nx: number, ny: number) {
        return this.noiseGen(nx, ny) / 2 + 0.5;
    }

    public e(x: number, y: number) {
        const worldWidth = config.window.width * config.worldScale;
        const worldHeight = config.window.height * config.worldScale;


        const nx = x / worldWidth;
        const ny = y / worldHeight;

        let d = 1 - (1 - nx * nx) * (1 - ny * ny);

        let e = 1 * this.noise(1 * nx, 1 * ny)
                + 0.5 * this.noise(2 * nx, 2 * ny)
                + 0.25 * this.noise(4 * nx, 4 * ny);
         e = e / (1 + 0.5 + 0.25);

        e = this.lerp(e, 1-d, 0.8);


        return e;
    }

    private lerp(a: number, b: number, t: number) {
        return a + t * (b - a);
    }
}