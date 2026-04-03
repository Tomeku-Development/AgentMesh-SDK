import { describe, it, expect, vi } from "vitest";
import { TypedEmitter } from "../src/events.js";

interface TestEvents {
  greeting: { name: string };
  count: number;
  empty: void;
}

class TestEmitter extends TypedEmitter<TestEvents> {
  // Expose emit for testing
  public fire<K extends keyof TestEvents>(event: K, data: TestEvents[K]) {
    this.emit(event, data);
  }
}

describe("TypedEmitter", () => {
  it("calls registered listeners", () => {
    const emitter = new TestEmitter();
    const fn = vi.fn();
    emitter.on("greeting", fn);
    emitter.fire("greeting", { name: "mesh" });
    expect(fn).toHaveBeenCalledWith({ name: "mesh" });
  });

  it("supports multiple listeners", () => {
    const emitter = new TestEmitter();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    emitter.on("count", fn1);
    emitter.on("count", fn2);
    emitter.fire("count", 42);
    expect(fn1).toHaveBeenCalledWith(42);
    expect(fn2).toHaveBeenCalledWith(42);
  });

  it("removes listener with off()", () => {
    const emitter = new TestEmitter();
    const fn = vi.fn();
    emitter.on("count", fn);
    emitter.off("count", fn);
    emitter.fire("count", 1);
    expect(fn).not.toHaveBeenCalled();
  });

  it("once() fires only once", () => {
    const emitter = new TestEmitter();
    const fn = vi.fn();
    emitter.once("count", fn);
    emitter.fire("count", 1);
    emitter.fire("count", 2);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);
  });

  it("removeAllListeners clears specific event", () => {
    const emitter = new TestEmitter();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    emitter.on("count", fn1);
    emitter.on("greeting", fn2);
    emitter.removeAllListeners("count");
    emitter.fire("count", 1);
    emitter.fire("greeting", { name: "test" });
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalled();
  });

  it("removeAllListeners() clears all events", () => {
    const emitter = new TestEmitter();
    const fn = vi.fn();
    emitter.on("count", fn);
    emitter.on("greeting", fn);
    emitter.removeAllListeners();
    emitter.fire("count", 1);
    emitter.fire("greeting", { name: "test" });
    expect(fn).not.toHaveBeenCalled();
  });

  it("listenerCount returns correct count", () => {
    const emitter = new TestEmitter();
    expect(emitter.listenerCount("count")).toBe(0);
    const fn = vi.fn();
    emitter.on("count", fn);
    expect(emitter.listenerCount("count")).toBe(1);
    emitter.off("count", fn);
    expect(emitter.listenerCount("count")).toBe(0);
  });

  it("listener errors do not crash other listeners", () => {
    const emitter = new TestEmitter();
    emitter.on("count", () => { throw new Error("boom"); });
    const fn2 = vi.fn();
    emitter.on("count", fn2);
    emitter.fire("count", 1);
    expect(fn2).toHaveBeenCalledWith(1);
  });
});
