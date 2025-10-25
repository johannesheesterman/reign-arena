import { Sprite, Texture } from 'pixi.js';
import { Terrain } from '../../../server/shared/terrain';

type TerrainTextures = {
  grass: Texture;
  sand: Texture;
  water: Texture;
};

type TerrainPixels = {
  grass: Uint8ClampedArray;
  sand: Uint8ClampedArray;
  water: Uint8ClampedArray;
};

export function buildTerrainBackground(
  terrain: Terrain,
  worldWidth: number,
  worldHeight: number,
  textures: TerrainTextures,
  pixels: TerrainPixels
): Sprite {
  const { grass: grassTexture, sand: sandTexture, water: waterTexture } = textures;
  const { grass: grassPixels, sand: sandPixels, water: waterPixels } = pixels;

  const backgroundCanvas = document.createElement('canvas');
  backgroundCanvas.width = worldWidth;
  backgroundCanvas.height = worldHeight;
  const backgroundCtx = backgroundCanvas.getContext('2d');
  if (!backgroundCtx) {
    throw new Error('Failed to get 2d context for terrain background');
  }

  const imageData = backgroundCtx.createImageData(worldWidth, worldHeight);

  for (let y = -(worldHeight / 2); y < worldHeight / 2; y++) {
    for (let x = -(worldWidth / 2); x < worldWidth / 2; x++) {
      const height = terrain.e(x, y);
      const ny = y + worldHeight / 2;
      const nx = x + worldWidth / 2;

      if (terrain.isGrass(height)) {
        const index = ((ny % grassTexture.height) * grassTexture.width + (nx % grassTexture.width)) * 4;
        copyPixel(imageData.data, index, ny, nx, worldWidth, grassPixels);
      } else if (height > terrain.SAND_HEIGHT) {
        const factor = smoothStep((height - terrain.SAND_HEIGHT) / (terrain.GRASS_HEIGHT - terrain.SAND_HEIGHT));
        const i = ((ny % sandTexture.height) * sandTexture.width + (nx % sandTexture.width)) * 4;
        mixPixels(imageData.data, ny, nx, worldWidth, grassPixels, sandPixels, i, factor);
      } else {
        const index = ((ny % waterTexture.height) * waterTexture.width + (nx % waterTexture.width)) * 4;
        copyPixel(imageData.data, index, ny, nx, worldWidth, waterPixels);
      }
    }
  }

  const backgroundTexture = Texture.from(backgroundCanvas);
  backgroundTexture.source.scaleMode = 'nearest';

  backgroundCtx.putImageData(imageData, 0, 0);
  backgroundTexture.update();

  const backgroundSprite = new Sprite(backgroundTexture);
  backgroundSprite.zIndex = -1;
  backgroundSprite.label = 'background';

  return backgroundSprite;
}

function smoothStep(value: number): number {
  return value * value * (3 - 2 * value);
}

function copyPixel(
  dest: Uint8ClampedArray,
  sourceIndex: number,
  y: number,
  x: number,
  width: number,
  sourcePixels: Uint8ClampedArray
) {
  const destIndex = (y * width + x) * 4;
  dest[destIndex] = sourcePixels[sourceIndex];
  dest[destIndex + 1] = sourcePixels[sourceIndex + 1];
  dest[destIndex + 2] = sourcePixels[sourceIndex + 2];
  dest[destIndex + 3] = sourcePixels[sourceIndex + 3];
}

function mixPixels(
  dest: Uint8ClampedArray,
  y: number,
  x: number,
  width: number,
  grassPixels: Uint8ClampedArray,
  sandPixels: Uint8ClampedArray,
  sourceIndex: number,
  factor: number
) {
  const destIndex = (y * width + x) * 4;
  const inverse = 1 - factor;
  dest[destIndex] = grassPixels[sourceIndex] * factor + sandPixels[sourceIndex] * inverse;
  dest[destIndex + 1] = grassPixels[sourceIndex + 1] * factor + sandPixels[sourceIndex + 1] * inverse;
  dest[destIndex + 2] = grassPixels[sourceIndex + 2] * factor + sandPixels[sourceIndex + 2] * inverse;
  dest[destIndex + 3] = grassPixels[sourceIndex + 3] * factor + sandPixels[sourceIndex + 3] * inverse;
}
