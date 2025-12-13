Module.register("MMM-Adventskalender", {
    defaults: {
        backgroundImage: null,
        doorMargin: 20,
        moduleWidth: 600,
        moduleHeight: 1000,
        columns: 4,
        rows: 6,
        maxDoorSize: 0.9, // Max door size as fraction of cell (0.9 = 90%)
        autopen: true,
        autoopenat: "00:00",
        snowEffect: true // Enable/disable snow effect
    },

    start() {
        Log.info("Starting module: " + this.name);
        this.doorState = null;
        document.documentElement.style.setProperty("--animation-time", this.config.OpenAnimationTime);
        this.loadDoorState();
        if (this.config.autopen) {
            this.scheduleAutoOpen();
        }
    },

    getStyles() {
        return ["MMM-Adventskalender.css"];
    },

    getDom() {
        const wrapper = document.createElement("div");
        
        // Make module responsive to screen width
        const moduleWidth = Math.min(window.innerWidth || this.config.moduleWidth, this.config.moduleWidth);
        wrapper.style.width = `${moduleWidth}px`;
        wrapper.style.maxWidth = "100%";
        wrapper.style.margin = "0 auto"; // Center horizontally
        wrapper.style.position = "relative";
        wrapper.style.overflow = "hidden";
        wrapper.style.boxShadow = "4px 8px 16px rgba(0, 0, 0, 0.5)";
        wrapper.className = "advent-calendar";

        if (this.config.backgroundImage) {
            const background = document.createElement("img");
            background.src = this.config.backgroundImage;
            background.style.width = "100%";
            background.style.height = "100%";
            background.style.minWidth = "100%";
            background.style.minHeight = "100%";
            background.style.objectFit = "cover";
            background.style.objectPosition = "center center";
            background.style.position = "absolute";
            background.style.left = "0";
            background.style.top = "0";
            background.style.right = "0";
            background.style.bottom = "0";
            background.style.zIndex = "0";
            background.style.boxShadow = "4px 8px 16px rgba(0, 0, 0, 0.5)";
            
            // Calculate module height based on background image aspect ratio
            background.onload = () => {
                if (background.naturalWidth > 0 && background.naturalHeight > 0) {
                    const bgAspectRatio = background.naturalHeight / background.naturalWidth;
                    const calculatedHeight = moduleWidth * bgAspectRatio;
                    wrapper.style.height = `${calculatedHeight}px`;
                    // Store calculated height for door positioning
                    this.calculatedHeight = calculatedHeight;
                }
            };
            
            // Set initial height based on config, will update when image loads
            wrapper.style.height = `${this.config.moduleHeight}px`;
            wrapper.appendChild(background);
        } else {
            // No background - use configured height
            wrapper.style.height = `${this.config.moduleHeight}px`;
        }

        const doors = this.createDoors();
        wrapper.appendChild(doors);
        
        // Add snow effect layer if enabled
        if (this.config.snowEffect) {
            const snowContainer = this.createSnowEffect();
            wrapper.appendChild(snowContainer);
        }
        
        return wrapper;
    },
    
    createSnowEffect() {
        const snowContainer = document.createElement("div");
        snowContainer.className = "snow-container";
        snowContainer.style.position = "absolute";
        snowContainer.style.top = "0";
        snowContainer.style.left = "0";
        snowContainer.style.width = "100%";
        snowContainer.style.height = "100%";
        snowContainer.style.pointerEvents = "none";
        snowContainer.style.zIndex = "100";
        snowContainer.style.overflow = "hidden";
        
        // Create multiple snowflakes
        const snowflakeCount = 50;
        for (let i = 0; i < snowflakeCount; i++) {
            const snowflake = document.createElement("div");
            snowflake.className = "snowflake";
            snowflake.textContent = "❄";
            
            // Randomize position and animation delay
            const left = Math.random() * 100;
            const animationDelay = Math.random() * 5;
            const animationDuration = 10 + Math.random() * 10; // 10-20 seconds
            const fontSize = 10 + Math.random() * 15; // 10-25px
            
            snowflake.style.left = `${left}%`;
            snowflake.style.animationDelay = `${animationDelay}s`;
            snowflake.style.animationDuration = `${animationDuration}s`;
            snowflake.style.fontSize = `${fontSize}px`;
            snowflake.style.opacity = 0.7 + Math.random() * 0.3; // 0.7-1.0
            
            snowContainer.appendChild(snowflake);
        }
        
        return snowContainer;
    },

    createDoors() {
        const doorsContainer = document.createElement("div");
        doorsContainer.style.position = "relative";
        doorsContainer.style.zIndex = "1";
        doorsContainer.style.width = "100%";
        doorsContainer.style.height = "100%";

        // Return empty container if doorState not loaded yet
        if (!this.doorState || !this.doorState.numbers) {
            return doorsContainer;
        }

        // Get actual module width (responsive)
        const moduleWidth = Math.min(window.innerWidth || this.config.moduleWidth, this.config.moduleWidth);
        const moduleHeight = this.calculatedHeight || this.config.moduleHeight || 1000;
        
        // Calculate cell size (available space per door)
        const cellWidth = (moduleWidth - (this.config.doorMargin * (this.config.columns + 1))) / this.config.columns;
        const cellHeight = (moduleHeight - (this.config.doorMargin * (this.config.rows + 1))) / this.config.rows;

        const today = new Date().getDate();
        const [hours, minutes] = this.config.autoopenat.split(":").map(Number);
        const autoopenTime = new Date();
        autoopenTime.setHours(hours, minutes, 0);
        
        let stateNeedsSaving = false;

        for (let i = 0; i < 24; i++) {
            const door = document.createElement("div");
            door.className = "door";

            const col = i % this.config.columns;
            const row = Math.floor(i / this.config.columns);

            // Calculate cell position
            const cellLeft = col * (cellWidth + this.config.doorMargin) + this.config.doorMargin;
            const cellTop = row * (cellHeight + this.config.doorMargin) + this.config.doorMargin;

            // Set initial door size and position (will be updated when image loads)
            door.style.width = `${cellWidth}px`;
            door.style.height = `${cellHeight}px`;
            door.style.left = `${cellLeft}px`;
            door.style.top = `${cellTop}px`;
            door.style.position = "absolute";

            // Create door panel for opened state (thin panel on the right)
            const doorPanel = document.createElement("div");
            doorPanel.className = "door-panel";
            doorPanel.style.display = "none"; // Hidden by default
            
            const number = document.createElement("span");
            number.textContent = this.doorState.numbers[i];
	    number.classname = "number";
            number.style.position = "absolute";
            number.style.top = "50%";
            number.style.left = "50%";
            number.style.transform = "translate(-50%, -50%)";
            number.style.fontSize = "1.2rem";
            number.style.color = "#000";
            door.appendChild(number);
            
            // Add number to door panel for opened state
            const panelNumber = document.createElement("span");
            panelNumber.textContent = this.doorState.numbers[i];
            panelNumber.className = "panel-number";
            doorPanel.appendChild(panelNumber);
            door.appendChild(doorPanel);

            const img = document.createElement("img");
            const doorNumber = this.doorState.numbers[i];
            const doorNumberStr = String(doorNumber).padStart(2, "0");
            // Try .jpg first, then .jpeg if .jpg doesn't exist
            const imgPathJpg = `${this.file("images")}/${doorNumberStr}.jpg`;
            const imgPathJpeg = `${this.file("images")}/${doorNumberStr}.jpeg`;
            
            // Function to resize door based on image dimensions
            const resizeDoor = () => {
                if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                    const imgAspectRatio = img.naturalWidth / img.naturalHeight;
                    const cellAspectRatio = cellWidth / cellHeight;
                    
                    // Calculate max dimensions based on config
                    const maxWidth = cellWidth * (this.config.maxDoorSize || 0.9);
                    const maxHeight = cellHeight * (this.config.maxDoorSize || 0.9);
                    
                    let doorWidth, doorHeight;
                    
                    // Size door to fit image aspect ratio within max size
                    if (imgAspectRatio > cellAspectRatio) {
                        // Image is wider - fit to max width
                        doorWidth = maxWidth;
                        doorHeight = maxWidth / imgAspectRatio;
                        // Ensure height doesn't exceed max
                        if (doorHeight > maxHeight) {
                            doorHeight = maxHeight;
                            doorWidth = maxHeight * imgAspectRatio;
                        }
                    } else {
                        // Image is taller - fit to max height
                        doorHeight = maxHeight;
                        doorWidth = maxHeight * imgAspectRatio;
                        // Ensure width doesn't exceed max
                        if (doorWidth > maxWidth) {
                            doorWidth = maxWidth;
                            doorHeight = maxWidth / imgAspectRatio;
                        }
                    }
                    
                    // Center door within cell
                    const doorLeft = cellLeft + (cellWidth - doorWidth) / 2;
                    const doorTop = cellTop + (cellHeight - doorHeight) / 2;
                    
                    door.style.width = `${doorWidth}px`;
                    door.style.height = `${doorHeight}px`;
                    door.style.left = `${doorLeft}px`;
                    door.style.top = `${doorTop}px`;
                }
            };
            
            // Track which extension we've tried to prevent infinite loops
            let triedJpg = false;
            let triedJpeg = false;
            
            // Load image to get its natural dimensions and size door accordingly
            img.onload = resizeDoor;
            
            img.onerror = () => {
                // Prevent infinite loops - only try each extension once
                if (triedJpg && triedJpeg) {
                    // Both extensions failed - image doesn't exist
                    console.warn(`Image not found for door ${doorNumber}: tried both .jpg and .jpeg`);
                    // Keep default door size (already set earlier)
                    return;
                }
                
                // If jpg failed, try jpeg
                if (triedJpg && !triedJpeg) {
                    triedJpeg = true;
                    img.src = imgPathJpeg;
                }
                // If we get here and jpg hasn't been tried, it means jpeg failed first, so try jpg
                else if (triedJpeg && !triedJpg) {
                    triedJpg = true;
                    img.src = imgPathJpg;
                }
            };
            
            // Start by trying jpg first
            triedJpg = true;
            img.src = imgPathJpg;
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "contain";
            img.style.display = "none";
            door.appendChild(img);

        // Open only if autopen is enabled and conditions are met
        if (
            this.config.autopen && 
            (doorNumber < today || 
            (doorNumber === today && new Date() >= autoopenTime))
        ) {
            if (!this.doorState.opened[i]) {
                this.doorState.opened[i] = true;
                stateNeedsSaving = true;
            }
        }

            if (this.doorState.opened[i]) {
                door.classList.add("opened");
                img.style.display = "block";
                // Show door panel with number
                doorPanel.style.display = "flex";
                doorPanel.style.visibility = "visible";
                number.style.visibility = "hidden";
            } else if (doorNumber > today) {
                door.style.pointerEvents = "none";
            }

            door.addEventListener("click", () => {
                if (door.classList.contains("opened")) {
                    // Close the door manually
                    door.classList.remove("opened");
                    door.classList.add("closing");
                    doorPanel.style.display = "none"; // Hide door panel
                    number.style.visibility = "visible"; // Show the centered number again
                    img.style.display = "none"; // Hide the image when closing
                } else if (!door.classList.contains("opening")) {
                    // Open the door if not opening
                    door.classList.add("opening");
                    number.style.visibility = "hidden"; // Hide centered number
                    doorPanel.style.display = "flex"; // Show door panel
                    doorPanel.style.visibility = "visible";
                    img.style.display = "none"; // Show the image during opening
                }
                // Update door state and save
                this.doorState.opened[i] = door.classList.contains("opened");
                this.sendSocketNotification("SAVE_DOOR_STATE", this.doorState);
            });



            door.addEventListener("animationend", (event) => {
                if (event.animationName === "rotate-door") {
                    if (door.classList.contains("opening")) {
                        img.style.display = "block"; // Show the image
                        number.style.visibility = "hidden"; // Hide centered number
                        doorPanel.style.display = "flex"; // Show door panel
                        doorPanel.style.visibility = "visible";
                        door.classList.remove("opening");
                        door.classList.add("opened");
                    } else if (door.classList.contains("closing")) {
                        img.style.display = "none"; // Hide the image
                        doorPanel.style.display = "none"; // Hide door panel
                        number.style.visibility = "visible"; // Show the number centered
                        door.classList.remove("closing");
                        door.classList.remove("opened"); // Fully reset to closed state
                        this.doorState.opened[doorNumber - 1] = false; // Reset opened state
                        this.sendSocketNotification("SAVE_DOOR_STATE", this.doorState); // Save state
                    }
                }
            });

            doorsContainer.appendChild(door);
        }
        
        // Save state if any doors were auto-opened on load
        if (stateNeedsSaving) {
            setTimeout(() => {
                this.sendSocketNotification("SAVE_DOOR_STATE", this.doorState);
            }, 500);
        }

        return doorsContainer;
    },

    scheduleAutoOpen() {
        if (!this.config.autopen) return; // Stop if autopen is disabled

        const [hours, minutes] = this.config.autoopenat.split(":").map(Number);
        const now = new Date();
        const targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);

        if (now >= targetTime) {
            targetTime.setDate(targetTime.getDate() + 1);
        }

        const timeUntilAutoOpen = targetTime - now;

        setTimeout(() => {
            this.autoOpenDoor();
            this.scheduleAutoOpen();
        }, timeUntilAutoOpen);
    },

autoOpenDoor() {
    if (!this.config.autopen) return; // Ensure autopen is respected

    const today = new Date().getDate();
    const doorIndex = this.doorState.numbers.indexOf(today);

    if (doorIndex !== -1 && !this.doorState.opened[doorIndex]) {
        this.doorState.opened[doorIndex] = true; // Mark the door as opened
        this.sendSocketNotification("SAVE_DOOR_STATE", this.doorState); // Save state

        const door = document.querySelectorAll(".door")[doorIndex];
        if (door) {
            const number = door.querySelector("span");
            const img = door.querySelector("img");
            const doorPanel = door.querySelector(".door-panel");

            door.classList.add("opened");
            door.classList.add("opening");

            // Hide centered number and show door panel
            if (number) {
                number.style.visibility = "hidden";
            }
            if (doorPanel) {
                doorPanel.style.display = "flex";
                doorPanel.style.visibility = "visible";
            }
            if (img) img.style.display = "block"; // Show the image
        }
    }
},


    loadDoorState() {
        this.sendSocketNotification("LOAD_DOOR_STATE");
    },

    socketNotificationReceived(notification, payload) {
        if (notification === "DOOR_STATE_LOADED") {
            this.doorState = payload;
            this.updateDom();
        }
    }
});
