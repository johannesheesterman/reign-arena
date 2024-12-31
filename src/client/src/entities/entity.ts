import { Container, Sprite } from "pixi.js";
import Assets from "../assets";
import { GameObject } from "../../../shared/gameObject";


export class Entity extends Container {

    constructor(private gameObject: GameObject) {
        super();
        this.label = this.gameObject.id;

        const sprite = new Sprite(Assets[gameObject.texture]);
        sprite.anchor.set(0.5);
        this.addChild(sprite);
    }

    update(gameObject: GameObject): void {
        this.x = gameObject.position.x;
        this.y = gameObject.position.y;
        this.zIndex = gameObject.position.z;

        const sprite = this.children[0] as Sprite;
        sprite.texture = Assets[gameObject.texture];
        sprite.scale.x = gameObject.scale.x;
        sprite.scale.y = gameObject.scale.y;
        this.rotation = gameObject.rotation;
    }
}