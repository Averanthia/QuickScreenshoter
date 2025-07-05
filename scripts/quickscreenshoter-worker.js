// Runs when the extension is installed or reloaded
chrome.runtime.onInstalled.addListener(() => {
  // Create a custom context menu item named "Quick Screenshot"
  chrome.contextMenus.create({
    id: "quick_screenshoter", // unique ID for this menu item
    title: "Quick Screenshot", // label shown in the context menu
    contexts: ["all"], // show it everywhere (page, links, images, etc.)
  });
});

// Listen for clicks on our context menu item
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Check if the clicked menu item is ours
  if (info.menuItemId === "quick_screenshoter" && tab.id) {
    // Inject and run the selection function in the active tab
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        if (typeof startNodeScreenshotSelection === "function") {
          startNodeScreenshotSelection();
        }
      }, // Calls function defined in quickscreenshoter script
    });
  }
});

// Listen for messages coming from quickscreenshoter script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // quickscreenshoter  script says it has selected an element & sends its bounding rect
  if (message.type === "captured_section" && sender.tab) {
    // Capture visible part of the active tab as data URL
    chrome.tabs.captureVisibleTab(
      sender.tab.windowId,
      { format: "png" },
      (dataUrl) => {
        // Crop captured image to the selected rect & then download
        cropAndDownload(dataUrl, message.rect, sender.tab.id);
      },
    );
  }
});

// Function to crop captured screenshot & trigger download
function cropAndDownload(dataUrl, rect, tabId) {
  // Inject code into the page to process the captured image
  chrome.scripting.executeScript({
    target: { tabId },
    args: [dataUrl, rect], // Pass captured data & rect to injected code
    func: (dataUrl, rect) => {
      const img = new Image();
      img.onload = () => {
        // Create a canvas with same size as selection
        const canvas = document.createElement("canvas");
        canvas.width = rect.width;
        canvas.height = rect.height;
        // Draw cropped area from captured image onto the canvas
        const ctx = canvas.getContext("2d");
        ctx.drawImage(
          img,
          rect.x,
          rect.y,
          rect.width,
          rect.height,
          0,
          0,
          rect.width,
          rect.height,
        );
        // Convert canvas to Blob & create blob URL
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          // Send blob URL back to quickscreenshoter-worker script to download
          chrome.runtime.sendMessage({ type: "download_image", blobUrl: url });
        }, "image/png");
      };
      img.src = dataUrl; // Start loading captured data
    },
  });
}

// Listen for message to download the blob URL & show toast
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "download_image") {
    // Build filename with prefix and timestamp
    const now = new Date();
    const prefix = "screenshot";
    const pad = (n) => n.toString().padStart(2, "0");
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const filename = `${prefix}-${dateStr}.png`;

    // Start download of the blob URL
    chrome.downloads.download(
      {
        url: message.blobUrl,
        filename, // this creates Downloads/screenshot-YYYY-MM-DD_HH-MM-SS.png
        saveAs: false,
      },
      () => {
        // Notify content script to show toast
        if (sender.tab && sender.tab.id) {
          chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            func: () => {
              chrome.runtime.sendMessage({ type: "show_toast" });
            },
          });
        }
      },
    );
  }
});
