type Callback<T> = (data: T) => void;

export default class EventBus<T> {
  private listeners = new Set<Callback<T>>();

  subscribe(callback: Callback<T>) {
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
    };
  }

  emit(value: T) {
    for (const listener of this.listeners) {
      listener(value);
    }
  }
}
