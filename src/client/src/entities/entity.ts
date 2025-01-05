import { Container, Graphics, Sprite } from "pixi.js";
import Config from "../../../server/shared/config";
import Assets from "../assets";
import { GameObject } from "../../../server/shared/gameObject";


export class Entity extends Container {
    public state: GameObject;
    public nextState: GameObject | null = null;

    constructor(state: GameObject) {
        super();
        this.state = state;
        this.label = state.id;

        const sprite = new Sprite(Assets[state.texture]);
        sprite.anchor.set(0.5);
        this.addChild(sprite);

         // Draw collision box
         if (Config.debug.showCollisionBoxes && state.collisionSize) {
            const { width, height } = state.collisionSize;
            const collisionBox = new Graphics()
                .rect(-width / 2, -height / 2, width, height)
                .fill('ff000070');
            this.addChild(collisionBox);
        }
    }

    setNextState(state: GameObject): void {
        this.nextState = state;
        this.x = state.position.x;
        this.y = state.position.y;
        this.zIndex = state.position.z;

        const sprite = this.children[0] as Sprite;
        sprite.texture = Assets[state.texture];
        sprite.scale.x = state.scale.x;
        sprite.scale.y = state.scale.y;
        this.rotation = state.rotation;
    }
}