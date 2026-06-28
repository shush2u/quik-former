export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      if (import.meta.env.DEV) {
        console.error("Service worker registration failed", error);
      }
    });
  });
}
