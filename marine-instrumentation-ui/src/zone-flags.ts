declare global {
  interface Window {
    __Zone_disable_requestAnimationFrame?: boolean;
  }
}

// MapLibre owns its render loop. Keeping requestAnimationFrame out of Zone.js
// prevents WebGL frames from triggering Angular task bookkeeping and console
// [Violation] stacks through zone.js.
window.__Zone_disable_requestAnimationFrame = true;

export {};
