import { Container, Sprite } from "pixi.js";
import Assets from "../assets";
import { GameObject } from "../../../shared/gameObject";


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