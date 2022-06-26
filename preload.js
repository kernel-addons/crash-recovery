const {contextBridge} = require("electron");
const fs = require("fs");
const path = require("path");

contextBridge.exposeInMainWorld("CrashRecovery", {
    async loadCSS() {
        const css = await fs.promises.readFile(path.resolve(__dirname, "style.css"), "utf8");

        document.head.appendChild(
            Object.assign(document.createElement("style"), {
                id: "crash-recovery",
                textContent: css
            })
        );
    }
});
