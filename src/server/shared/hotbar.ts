

export type Hotbar  = {[key: string]: {
    texture: string,
    selected: boolean,
    count?: number,
} | null};

export type Inventory = {item: string, count: number}[];

export type CraftRecipe = {item: string, time: number, ingredients: {item: string, count: number}[]};
