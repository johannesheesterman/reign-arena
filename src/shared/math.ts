export class Vector2 {
  constructor(public x: number, public y: number) { }

  get length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  public normalized(): Vector2 {
    const length = this.length;
    if (length === 0) return new Vector2(0, 0);
    return new Vector2(this.x / length, this.y / length);
  }

  public scale(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }
}