(function (root, factory) {
  const withButtonDisabled = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = withButtonDisabled;
  }
  if (root) root.withButtonDisabled = withButtonDisabled;
})(typeof window !== "undefined" ? window : globalThis, function () {
  return function withButtonDisabled(button, handler) {
    if (!button || typeof handler !== "function") {
      throw new TypeError("A button and handler are required");
    }

    let processing = false;
    return async function (...args) {
      if (processing || button.disabled) return;
      processing = true;
      const wasDisabled = button.disabled;
      button.disabled = true;
      try {
        return await handler.apply(this, args);
      } finally {
        processing = false;
        button.disabled = wasDisabled;
      }
    };
  };
});
