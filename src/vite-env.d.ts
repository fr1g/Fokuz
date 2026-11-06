/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  /** Set by an inline script in index.html when the static splash first paints. */
  __splashStart?: number;
}
