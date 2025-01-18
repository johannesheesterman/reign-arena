

export class GameObject {
    id: string = '';
    position: { x: number, y: number, z: number } = { x: 0, y: 0, z: 0 };
    collisionSize?: { width: number, height: number } | undefined = undefined;
    collisionOffset? : { x: number, y: number } | undefined = undefined;
    scale: { x: number, y: number } = { x: 1, y: 1 };
    rotation: number = 0;
    texture: string = '';
    health?: number | undefined;
    maxHealth?: number | undefined;
    type: GameObjectType = GameObjectType.Player;
}



export enum GameObjectType {
    Player = 'player',
    Projectile = 'projectile',
    Weapon = 'weapon',
    Obstacle = 'asset'
}

export class PlayerInput {
    keys: { [key: string]: boolean } = {};
    rotation: number = 0;
}