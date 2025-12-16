const NodeHelper = require("node_helper");
const fs = require("fs");
const path = require("path");

module.exports = NodeHelper.create({
    start() {
        // Use module directory for state file (ensure it persists across Docker restarts)
        // If Docker volume is mounted, this directory should be part of the volume
        this.stateFilePath = path.join(__dirname, "state.json");
        console.log("MMM-Adventskalender node_helper started");
        console.log("State file path:", this.stateFilePath);
        
        // Ensure directory exists and is writable
        try {
            const dir = path.dirname(this.stateFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // Test write permissions
            const testFile = path.join(dir, ".write-test");
            fs.writeFileSync(testFile, "test");
            fs.unlinkSync(testFile);
            console.log("State file directory is writable");
        } catch (e) {
            console.error("Warning: State file directory may not be writable:", e.message);
        }
    },

    socketNotificationReceived(notification, payload) {
        if (notification === "LOAD_DOOR_STATE") {
            this.loadDoorState();
        } else if (notification === "SAVE_DOOR_STATE") {
            this.saveDoorState(payload);
        }
    },

    loadDoorState() {
        try {
            const data = fs.readFileSync(this.stateFilePath, "utf8");
            if (!data || data.trim() === "") {
                throw new Error("State file is empty");
            }
            
            const parsedData = JSON.parse(data);
            console.log("State file loaded successfully from:", this.stateFilePath);
            console.log("Loaded state - opened doors:", parsedData.opened.filter(o => o).length);
            this.sendSocketNotification("DOOR_STATE_LOADED", parsedData);
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.warn("State file not found, creating a new one...");
            } else {
                console.warn("Error loading state file:", err.message, "- creating a new one...");
            }
            
            const initialState = {
                numbers: Array.from({ length: 24 }, (_, i) => i + 1).sort(() => Math.random() - 0.5),
                opened: Array(24).fill(false) // All doors closed initially
            };

            // Write initial state to the file
            try {
                const stateData = JSON.stringify(initialState, null, 2);
                fs.writeFileSync(this.stateFilePath, stateData, { encoding: 'utf8', mode: 0o644 });
                console.log("Initial state.json created at:", this.stateFilePath);
            } catch (writeErr) {
                console.error("Error creating state.json:", writeErr);
            }

            this.sendSocketNotification("DOOR_STATE_LOADED", initialState);
        }
    },

    saveDoorState(state) {
        try {
            // Ensure state is valid
            if (!state || !state.numbers || !state.opened) {
                console.error("Invalid state object provided for saving");
                return;
            }
            
            const stateData = JSON.stringify(state, null, 2);
            const openedCount = state.opened.filter(o => o).length;
            
            // Write to temporary file first, then rename (atomic write)
            const tempFilePath = this.stateFilePath + ".tmp";
            
            // Write to temp file
            fs.writeFileSync(tempFilePath, stateData, { encoding: 'utf8', mode: 0o644, flag: 'w' });
            
            // Sync to disk to ensure data is written
            const fd = fs.openSync(tempFilePath, 'r+');
            fs.fsyncSync(fd);
            fs.closeSync(fd);
            
            // Atomic rename
            fs.renameSync(tempFilePath, this.stateFilePath);
            
            // Verify the file was written correctly
            const verifyData = fs.readFileSync(this.stateFilePath, "utf8");
            const verifyState = JSON.parse(verifyData);
            if (verifyState.opened.length === state.opened.length) {
                console.log(`Door state saved successfully to: ${this.stateFilePath} (${openedCount} doors opened)`);
            } else {
                console.error("State file verification failed - file may be corrupted");
            }
        } catch (err) {
            console.error("Error saving door state:", err);
            console.error("State file path:", this.stateFilePath);
            console.error("Error details:", err.message, err.code);
            if (err.stack) {
                console.error("Stack:", err.stack);
            }
            
            // Try to clean up temp file if it exists
            try {
                const tempFilePath = this.stateFilePath + ".tmp";
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
            } catch (cleanupErr) {
                // Ignore cleanup errors
            }
        }
    }
});
