/**
 * Typed event emitter for MeshClient and Agent.
 */

type Listener<T = unknown> = (data: T) => void;

export class TypedEmitter<Events> {
  private _listeners = new Map<keyof Events, Set<Listener<any>>>();

  on<K extends keyof Events>(event: K, fn: Listener<Events[K]>): this {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(fn);
    return this;
  }

  off<K extends keyof Events>(event: K, fn: Listener<Events[K]>): this {
    this._listeners.get(event)?.delete(fn);
    return this;
  }

  once<K extends keyof Events>(event: K, fn: Listener<Events[K]>): this {
    const wrapper: Listener<Events[K]> = (data) => {
      this.off(event, wrapper);
      fn(data);
    };
    return this.on(event, wrapper);
  }

  protected emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const fns = this._listeners.get(event);
    if (fns) {
      for (const fn of fns) {
        try {
          fn(data);
        } catch {
          // Don't let one listener crash others
        }
      }
    }
  }

  removeAllListeners(event?: keyof Events): this {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
    return this;
  }

  listenerCount(event: keyof Events): number {
    return this._listeners.get(event)?.size ?? 0;
  }
}
