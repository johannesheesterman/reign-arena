import { Assets } from "pixi.js";
import centurionPng from '/centurion.png?url';
import hoodedPng from '/hooded.png?url';
import sandPng from '/sand.png?url';
import waterPng from '/water.png?url';
import grassPng from '/grass.png?url';
import swordPng from '/sword.png?url';
import bowPng from '/bow.png?url';
import swordProjectilePng from '/sword-projectile.png?url';
import arrowPng from '/arrow.png?url';
import cratePng from '/crate.png?url';
import chestPng from '/chest.png?url';
import woodWallPng from '/wood-wall.png?url';
import treePng from '/tree.png?url';
import hero32 from '/hero32.png?url';
import hotbar from '/hotbar.png?url';

var assets: { [key: string]: any } = {
    'centurion': await Assets.load(centurionPng),
    'hooded': await Assets.load(hoodedPng),
    'sand': await Assets.load(sandPng),
    'water': await Assets.load(waterPng),
    'grass': await Assets.load(grassPng),
    'sword': await Assets.load(swordPng),
    'sword-projectile': await Assets.load(swordProjectilePng),
    'arrow': await Assets.load(arrowPng),
    'bow': await Assets.load(bowPng),
    'crate': await Assets.load(cratePng),
    'chest': await Assets.load(chestPng),
    'wood-wall': await Assets.load(woodWallPng),
    'tree': await Assets.load(treePng),
    'hero32': await Assets.load(hero32),
    'hotbar': await Assets.load(hotbar),
};

export default assets;