
import { createNoise2D } from './simplex-noise.ts';
import config from './config.ts';


export class Terrain {
    private noiseGen: (x: number, y: number) => number;

    public GRASS_HEIGHT = 0.8;
    public SAND_HEIGHT = 0.75;
    public WATER_HEIGHT = 0.5;

    constructor(private seed: number) {
        this.noiseGen = createNoise2D(this.randomFn.bind(this));
    }

    private randomFn(): number {
        let x = Math.sin(this.seed) * 10000;
        return x - Math.floor(x);
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

        e = this.lerp(e, 1-d, 0.7);
        return e;
    }

    isGrass(e: number) {
        return e > this.GRASS_HEIGHT;
    }

    isSand(e: number) {
        return e > this.SAND_HEIGHT;
    }

    isWater(e: number) {
        return e < this.SAND_HEIGHT;
    }

    private lerp(a: number, b: number, t: number) {
        return a + t * (b - a);
    }
}


