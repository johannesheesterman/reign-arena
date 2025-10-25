import { Application, Container, FederatedPointerEvent, Graphics, Rectangle, Sprite, Text } from 'pixi.js';
import { CraftRecipe, Inventory } from '../../../server/shared/hotbar';
import Assets from '../assets';
import { DragManager } from './dragManager';

export class InventoryUI {
  private container: Container | null = null;
  private open = false;
  private inventoryData: Inventory = [];
  private craftRecipeData: CraftRecipe[] | undefined;
  private recipeContainers: Map<string, Container> = new Map();
  private craftingState: {
    recipeId: string;
    duration: number;
    startTime: number;
    progress: number;
    overlay?: Graphics;
  } | null = null;
  private craftingTickerActive = false;

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
    this.tryFinalizeCraftingProgress();
  }

  close() {
    this.dragManager.cancel();
    this.destroyContainer();
    this.open = false;
  }

  private openInventory() {
    this.dragManager.cancel();
    this.destroyContainer();
    this.recipeContainers.clear();

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
    this.refreshCraftingOverlay();

    this.app.stage.addChild(inventory);
    this.container = inventory;
    this.open = true;
  }

  private destroyContainer() {
    if (!this.container) return;

    this.app.stage.removeChild(this.container);
    this.container.destroy({ children: true });
    this.container = null;
    this.recipeContainers.clear();
    if (this.craftingState) {
      this.craftingState.overlay = undefined;
    }
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
      recipeContainer.sortableChildren = true;

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
        this.startCraftingProgress(recipe);
        this.onRecipeSelected(recipe.item);
      });

      this.recipeContainers.set(recipe.item, recipeContainer);
      this.refreshCraftingOverlay();

      container.addChild(recipeContainer);
    }
  }

  private startCraftingProgress(recipe: CraftRecipe) {
    if (!recipe) return;
    if (this.craftingState && this.craftingState.progress < 1) return;

    const duration = Math.max(recipe.time, 0);
    this.craftingState = {
      recipeId: recipe.item,
      duration,
      startTime: performance.now(),
      progress: duration === 0 ? 1 : 0,
      overlay: undefined,
    };

    this.refreshCraftingOverlay();

    if (duration === 0) {
      this.tryFinalizeCraftingProgress();
      return;
    }

    this.registerCraftingTicker();
  }

  private registerCraftingTicker() {
    if (this.craftingTickerActive) return;
    this.app.ticker.add(this.handleCraftingTick);
    this.craftingTickerActive = true;
  }

  private unregisterCraftingTicker() {
    if (!this.craftingTickerActive) return;
    this.app.ticker.remove(this.handleCraftingTick);
    this.craftingTickerActive = false;
  }

  private handleCraftingTick = () => {
    if (!this.craftingState) {
      this.unregisterCraftingTicker();
      return;
    }

    const progress = this.calculateCraftingProgress();
    if (progress === this.craftingState.progress) {
      if (progress >= 1) {
        this.unregisterCraftingTicker();
      }
      return;
    }

    this.craftingState.progress = progress;
    this.refreshCraftingOverlay();

    if (progress >= 1) {
      this.unregisterCraftingTicker();
    }
  };

  private calculateCraftingProgress(): number {
    if (!this.craftingState) return 0;
    const elapsedMs = performance.now() - this.craftingState.startTime;
    const durationMs = this.craftingState.duration * 1000;
    if (durationMs <= 0) return 1;
    return Math.min(elapsedMs / durationMs, 1);
  }

  private refreshCraftingOverlay() {
    if (!this.craftingState) return;

    const container = this.recipeContainers.get(this.craftingState.recipeId);
    if (!container) return;

    if (!this.craftingState.overlay || this.craftingState.overlay.destroyed) {
      const overlay = new Graphics();
      overlay.eventMode = 'none';
      overlay.cursor = 'auto';
      overlay.position.set(0, 0);
      overlay.zIndex = 10;
      container.addChild(overlay);
      this.craftingState.overlay = overlay;
    }

    const overlay = this.craftingState.overlay;
    if (!overlay) return;

    const progress = this.craftingState.progress;
    const radius = 12;

    overlay.clear();
    if (progress > 0) {
      overlay.beginFill(0x66ccff, 0.45);
      overlay.moveTo(0, 0);
      overlay.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      overlay.lineTo(0, 0);
      overlay.endFill();
    }

    overlay.lineStyle(1, 0xffffff, 0.85);
    overlay.drawCircle(0, 0, radius);
  }

  private tryFinalizeCraftingProgress() {
    if (!this.craftingState) return;
    const progress = this.craftingState.progress >= 1 ? this.craftingState.progress : this.calculateCraftingProgress();
    if (progress > this.craftingState.progress) {
      this.craftingState.progress = progress;
      this.refreshCraftingOverlay();
    }
    if (this.craftingState.progress < 1) return;
    this.clearCraftingState();
  }

  private clearCraftingState() {
    if (!this.craftingState) return;
    const overlay = this.craftingState.overlay;
    if (overlay) {
      overlay.parent?.removeChild(overlay);
      overlay.destroy();
    }
    this.craftingState = null;
    this.unregisterCraftingTicker();
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
