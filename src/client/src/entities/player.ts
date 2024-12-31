import { Graphics } from "pixi.js";
import { Entity } from "./entity";
import { GameObject } from "../../../shared/gameObject";

export class Player extends Entity {
    private healthBar: Graphics;


    constructor(gameObject: GameObject) {
        super(gameObject);

        const healthBarBackground = new Graphics()
            .rect(-11, -16, 22, 5)
            .fill(0x000000)
            .rect(-10, -15, 20, 3)
            .fill(0xff0000);
        this.addChild(healthBarBackground);

        this.healthBar = new Graphics()
            .rect(-10, -15, 20, 3)
            .fill(0x00ff00);
        this.addChild(this.healthBar);
    }

    setNextState(gameObject: GameObject): void {
        super.setNextState(gameObject);    
        this.healthBar
            .clear()
            .rect(-10, -15,  20 * (gameObject.health! / gameObject.maxHealth!), 3)
            .fill(0x00ff00);
    }
}