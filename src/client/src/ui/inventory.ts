import { Application, Container, FederatedPointerEvent, Rectangle, Sprite, Text } from 'pixi.js';
import { CraftRecipe, Inventory } from '../../../server/shared/hotbar';
import Assets from '../assets';
import { DragManager } from './dragManager';

export class InventoryUI {
  private container: Container | null = null;
  private open = false;
  private inventoryData: Inventory = [];
  private craftRecipeData: CraftRecipe[] | undefined;

  constructor(
    private app: Application,
    private dragManager: DragManager,
    private onRecipeSelected: (itemId: string) => void
  ) {}

  isOpen(): boolean {
    return this.open;
  }

  containsPoint(globalX: number, globalY: number): boolean {
    if (!this.container) return false;
    const bounds = this.container.getBounds();
    return (
      globalX >= bounds.x &&
      globalX <= bounds.x + bounds.width &&
      globalY >= bounds.y &&
      globalY <= bounds.y + bounds.height
    );
  }

  toggle(inventoryData: Inventory, craftRecipes?: CraftRecipe[]) {
    if (this.open) {
      this.close();
      return;
    }

    this.inventoryData = this.cloneInventoryData(inventoryData);
    this.craftRecipeData = craftRecipes ? this.cloneCraftRecipes(craftRecipes) : undefined;
    this.openInventory();
  }

  update(inventoryData: Inventory, craftRecipes?: CraftRecipe[]) {
    this.inventoryData = this.cloneInventoryData(inventoryData);
    if (craftRecipes) {
      this.craftRecipeData = this.cloneCraftRecipes(craftRecipes);
    }
    if (this.open) {
      this.openInventory();
    }
  }

  close() {
    this.dragManager.cancel();
    this.destroyContainer();
    this.open = false;
  }

  private openInventory() {
    this.dragManager.cancel();
    this.destroyContainer();

    const inventory = new Container();
    inventory.label = 'inventory';
    inventory.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
    inventory.position.y -= 16;

    const inventorySprite = new Sprite(Assets['inventory']);
    inventorySprite.anchor.set(0.5, 0.5);
    inventorySprite.alpha = 0.8;
    inventory.addChild(inventorySprite);

    const slotWidth = 23;
    const slotHeight = 23;
    const inventoryWidth = 6;
    const inventoryHeight = 4;

    const items = this.inventoryData;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;

      const x = Math.floor((i % inventoryWidth) * slotWidth - (inventoryWidth * slotWidth / 2) + slotWidth / 2);
      const y = Math.floor(i / inventoryWidth) * slotHeight - (inventoryHeight * slotHeight / 2) + slotHeight / 2;

      const slot = new Container();
      slot.position.set(x, y);
      slot.label = i.toString();
      slot.name = i.toString();
      slot.hitArea = new Rectangle(-slotWidth / 2, -slotHeight / 2, slotWidth, slotHeight);
      slot.eventMode = 'static';
      slot.cursor = 'pointer';

      const sprite = new Sprite(Assets[item.item]);
      sprite.width = 16;
      sprite.height = 16;
      sprite.anchor.set(0.5, 0.5);
      slot.addChild(sprite);

      const quantityText = new Text({
        text: item.count.toString(),
        style: {
          fontSize: 6,
          fill: 0xffffff,
          stroke: 0x000000,
        }
      });

      quantityText.anchor.set(1, 1);
      quantityText.position.set(8, 8);
      slot.addChild(quantityText);

      slot.on('pointerdown', (event: FederatedPointerEvent) => {
        const slotIndex = i;
        this.dragManager.startDrag(event, item, {
          source: { type: 'inventory', index: slotIndex },
          onDropSuccess: () => this.removeSlot(slotIndex),
        });
      });

      inventory.addChild(slot);
    }

    this.addInventoryTitle(inventory, inventoryWidth, slotWidth, inventoryHeight, slotHeight);
    this.addCraftingRecipes(inventory, this.craftRecipeData, inventoryWidth, slotWidth, slotHeight, inventoryHeight);

    this.app.stage.addChild(inventory);
    this.container = inventory;
    this.open = true;
  }

  private destroyContainer() {
    if (!this.container) return;

    this.app.stage.removeChild(this.container);
    this.container.destroy({ children: true });
    this.container = null;
  }

  private addInventoryTitle(container: Container, inventoryWidth: number, slotWidth: number, inventoryHeight: number, slotHeight: number) {
    const titleText = new Text({
      text: 'Inventory',
      style: {
        fontSize: 10,
        fill: 0xffffff,
        stroke: {
          color: 0x000000,
          width: 1,
        }
      }
    });

    titleText.anchor.set(0.5, 0.5);
    titleText.position.set(-(inventoryWidth * slotWidth / 2) + 22, -(inventoryHeight * slotHeight / 2) - 10);
    container.addChild(titleText);
  }

  private addCraftingRecipes(
    container: Container,
    craftRecipes: CraftRecipe[] | undefined,
    inventoryWidth: number,
    slotWidth: number,
    slotHeight: number,
    inventoryHeight: number
  ) {
    if (!craftRecipes) return;

    const titleText = new Text({
      text: 'Crafting',
      style: {
        fontSize: 10,
        fill: 0xffffff,
        stroke: 0x000000,
      }
    });
    titleText.anchor.set(0.5, 0.5);
    titleText.position.set((inventoryWidth * slotWidth / 2) + 24, -(inventoryHeight * slotHeight / 2) - 10);
    container.addChild(titleText);

    for (let i = 0; i < craftRecipes.length; i++) {
      const recipe = craftRecipes[i];
      const x = (inventoryWidth * slotWidth / 2) + 16;
      const y = (i * slotHeight) - (craftRecipes.length * slotHeight / 2) + slotHeight / 2;
      const recipeContainer = new Container();
      recipeContainer.position.set(x, y);
      recipeContainer.label = `recipe-${i}`;
      recipeContainer.eventMode = 'static';
      recipeContainer.cursor = 'pointer';

      const resultSprite = new Sprite(Assets[recipe.item]);
      resultSprite.width = 16;
      resultSprite.height = 16;
      resultSprite.anchor.set(0.5, 0.5);
      recipeContainer.addChild(resultSprite);

      const recipeTitle = new Text({
        text: recipe.item,
        style: {
          fontSize: 10,
          fill: 0xffffff,
          stroke: 0x000000,
        }
      });
      recipeTitle.anchor.set(0, 0.5);
      recipeTitle.position.set(20, 0);
      recipeContainer.addChild(recipeTitle);

      recipeContainer.on('mouseover', () => {
        recipeContainer.children.forEach((child) => {
          if (child instanceof Sprite) {
            child.tint = 0xaaaaaa;
            child.width *= 1.1;
            child.height *= 1.1;
          }
          if (child instanceof Text) {
            child.style.fontSize = 12;
          }
        });
      });

      recipeContainer.on('mouseout', () => {
        recipeContainer.children.forEach((child) => {
          if (child instanceof Sprite) {
            child.tint = 0xffffff;
            child.width /= 1.1;
            child.height /= 1.1;
          }
          if (child instanceof Text) {
            child.style.fontSize = 10;
          }
        });
      });

      recipeContainer.on('pointerdown', (event: FederatedPointerEvent) => {
        if (event.button !== 0) return;
        this.onRecipeSelected(recipe.item);
      });

      container.addChild(recipeContainer);
    }
  }

  private removeSlot(index: number) {
    if (index < 0 || index >= this.inventoryData.length) return;

    this.inventoryData.splice(index, 1);

    if (this.open) {
      this.openInventory();
    }
  }

  private cloneInventoryData(data: Inventory): Inventory {
    return data.map((item) => ({ ...item }));
  }

  private cloneCraftRecipes(data: CraftRecipe[]): CraftRecipe[] {
    return data.map((recipe) => ({
      ...recipe,
      ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient })),
    }));
  }
}
