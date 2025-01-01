import { Graphics } from "pixi.js";
import { Entity } from "./entity";
import { GameObject } from "../../../shared/gameObject";

export class Player extends Entity {
    private healthBar: Graphics;


    constructor(state: GameObject) {
        super(state);

        const healthBarBackground = new Graphics()
            .rect(-11, -16, 22, 5)
            .fill(0x090a14)
            .rect(-10, -15, 20, 3)
            .fill(0xa53030);
        this.addChild(healthBarBackground);

        this.healthBar = new Graphics()
            .rect(-10, -15, 20, 3)
            .fill(0x75a743);
        this.addChild(this.healthBar);


       
    }

    setNextState(state: GameObject): void {
        super.setNextState(state);    
        this.healthBar
            .clear()
            .rect(-10, -15,  20 * (state.health! / state.maxHealth!), 3)
            .fill(0x75a743);
    }
}