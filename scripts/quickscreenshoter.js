// Define globally available function to start the node screenshot selection overlay
window.startNodeScreenshotSelection = () => {
  let overlay = null; // semi-transparent highlight box
  let tooltip = null; // text tooltip to guide the user
  let lastElement = null; // element currently hovered by mouse

  // Create and style the overlay element
  const createOverlay = () => {
    overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "absolute",
      background: "rgba(0,123,255,0.2)",
      border: "2px solid #007bff",
      borderRadius: "4px",
      boxShadow: "0 0 8px rgba(0,123,255,0.6)",
      zIndex: 9999999,
      pointerEvents: "none",
      transition: "all 0.1s ease",
    });
    document.body.appendChild(overlay);
  };

  // Create and style tooltip that follows the mouse
  const createTooltip = () => {
    tooltip = document.createElement("div");
    tooltip.textContent = "Click to capture, ESC to cancel";
    Object.assign(tooltip.style, {
      position: "fixed",
      background: "rgba(0,0,0,0.75)",
      color: "#fff",
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      fontFamily: "sans-serif",
      zIndex: 9999999,
      pointerEvents: "none",
      top: "0px",
      left: "0px",
      whiteSpace: "nowrap",
    });
    document.body.appendChild(tooltip);
  };

  // Update overlay to match current hovered element's position & size
  const updateOverlay = (el) => {
    if (!el || el === document.body) return;
    const rect = el.getBoundingClientRect();
    Object.assign(overlay.style, {
      top: rect.top + window.scrollY + "px",
      left: rect.left + window.scrollX + "px",
      width: rect.width + "px",
      height: rect.height + "px",
      display: "block",
    });
  };

  // Move tooltip near the mouse cursor
  const updateTooltip = (e) => {
    const offset = 12; // distance from cursor
    tooltip.style.top = e.clientY + offset + "px";
    tooltip.style.left = e.clientX + offset + "px";
  };

  // Remove overlay, tooltip, and event listeners to clean up
  const cleanup = () => {
    overlay && overlay.remove();
    tooltip && tooltip.remove();
    overlay = null;
    tooltip = null;
    document.removeEventListener("mousemove", mousemoveHandler);
    document.removeEventListener("click", clickHandler, true);
    document.removeEventListener("keydown", keydownHandler, true);
  };

  // On mouse move, update last hovered element and move overlay & tooltip
  const mousemoveHandler = (e) => {
    lastElement = document.elementFromPoint(e.clientX, e.clientY);
    if (lastElement) updateOverlay(lastElement);
    updateTooltip(e);
  };

  // On click: prevent default, stop event bubbling, capture element rect & send message
  const clickHandler = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (lastElement) {
      const rect = lastElement.getBoundingClientRect();
      const captureRect = {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      };

      // Tell background script to capture the selected area
      chrome.runtime.sendMessage({
        type: "captured_section",
        rect: captureRect,
      });

      cleanup();
    }
  };

  // On Escape key press: cancel selection & clean up
  const keydownHandler = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cleanup();
    }
  };

  // Initialize everything
  createOverlay();
  createTooltip();
  document.addEventListener("mousemove", mousemoveHandler);
  document.addEventListener("click", clickHandler, true);
  document.addEventListener("keydown", keydownHandler, true);
};

// Listen for message from background script to show toast
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "show_toast") {
    showScreenshotToast();
  }
});

// Create & show small toast notification in bottom-right corner
function showScreenshotToast() {
  const toast = document.createElement("div");
  toast.textContent = "✅ Screenshot saved!";
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: "rgba(0,0,0,0.8)",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "4px",
    fontSize: "14px",
    fontFamily: "sans-serif",
    zIndex: 9999999,
    opacity: "0",
    transition: "opacity 0.3s ease",
  });
  document.body.appendChild(toast);

  // Trigger fade in

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
  });

  // After 2 seconds, fade out & remove from DOM
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.addEventListener("transitionend", () => toast.remove());
  }, 2000);
}
