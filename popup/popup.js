document.addEventListener("DOMContentLoaded", () => {
  const captureBtn = document.getElementById("captureBtn");
  const status = document.getElementById("status");
  const darkToggle = document.getElementById("darkToggle");

  // Start Screenshot Mode button
  captureBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            function: () => {
              if (typeof startNodeScreenshotSelection === "function") {
                startNodeScreenshotSelection();
              }
            },
          },
          () => {
            status.style.display = "block";
            setTimeout(() => {
              status.style.display = "none";
            }, 2000);
          },
        );
      }
    });
  });

  // Dark mode toggle
  darkToggle.addEventListener("change", () => {
    if (darkToggle.checked) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  });
});
