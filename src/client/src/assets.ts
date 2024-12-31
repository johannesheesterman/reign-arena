import { Assets } from "pixi.js";
import centurionPng from '/centurion.png?url';
import sandPng from '/sand.png?url';
import swordPng from '/sword.png?url';
import bowPng from '/bow.png?url';
import swordProjectilePng from '/sword-projectile.png?url';
import arrowPng from '/arrow.png?url';
import cratePng from '/crate.png?url';
import chestPng from '/chest.png?url';

var assets: { [key: string]: any } = {
    'centurion': await Assets.load(centurionPng),
    'sand': await Assets.load(sandPng),
    'sword': await Assets.load(swordPng),
    'sword-projectile': await Assets.load(swordProjectilePng),
    'arrow': await Assets.load(arrowPng),
    'bow': await Assets.load(bowPng),
    'crate': await Assets.load(cratePng),
    'chest': await Assets.load(chestPng)
};

export default assets;