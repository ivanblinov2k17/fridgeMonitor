export default class RingBuffer<T> {
  private readonly buffer: (T | undefined)[];
  private readonly capacity: number;

  private start = 0;
  private count = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(item: T) {
    const index = (this.start + this.count) % this.capacity;

    this.buffer[index] = item;

    if (this.count < this.capacity) {
      this.count++;
    } else {
      this.start = (this.start + 1) % this.capacity;
    }
  }

  values(): T[] {
    const result: T[] = [];

    for (let i = 0; i < this.count; i++) {
      result.push(this.buffer[(this.start + i) % this.capacity]!);
    }

    return result;
  }

  clear() {
    this.start = 0;
    this.count = 0;
  }

  get size() {
    return this.count;
  }
}
