// Handle requests from the renderer

const { ipcMain } = require("electron");
const { writeFile, readFile, mkdir } = require("fs/promises");

const ConnectionParamsSingleton = require("./ConnectionParamsSingleton.js");
const { getSession, createAccount } = require("./requests/accountRequests.js");

ipcMain.handle("log-in", async (evt, infrastructureServer, username, password) => {
    // Place credentials in ConnectionParamsSingleton
    let connectionParamsSingleton = ConnectionParamsSingleton.getInstance();
    connectionParamsSingleton.setInfrastructureServerUrl(infrastructureServer);
    connectionParamsSingleton.setUsername(username);
    connectionParamsSingleton.setPassword(password);

    // Send GetSession request
    let result = await getSession();

    if (result === "Success") {
        return "Success";
    } else if (result === "Incorrect username or password") {
        return "Incorrect username or password";
    } else if (result === "ECONNREFUSED") {
        return "No Federnet infrastructure server found at that address";
    }
    else {
        return "An error occurred";
    }
});

ipcMain.handle("create-account", async (evt, infrastructureServer, username, password) => {
    // Place credentials in ConnectionParamsSingleton
    let connectionParamsSingleton = ConnectionParamsSingleton.getInstance();
    connectionParamsSingleton.setInfrastructureServerUrl(infrastructureServer);
    connectionParamsSingleton.setUsername(username);
    connectionParamsSingleton.setPassword(password);

    // Send CreateAccount request
    let createAccountResult = await createAccount();

    if (createAccountResult === "Success") {
        // If account created successfully then log in
        let loginResult = await getSession();
        if (loginResult === "Success") {
            return "Success";
        } else {
            // Account was created successfully, but we were unable to log in to it.  This is most likely a connection issue
            return "AccountCreatedLoginFailed";
        }
    } else if (createAccountResult === "ECONNREFUSED") {
        return "No Federnet infrastructure server found at that address";
    } else {
        return createAccountResult;
    }
});

ipcMain.on("update-settings", async (evt, newSettings) => {
    // Save the new settings.  send / on is used for this rather than invoke / handle because no response is required afterwards
    try {
        let settingsJson = JSON.stringify(newSettings);
        await writeFile("./config/uiSettings.json", settingsJson, {
            encoding: "utf-8"
        });
    } catch (e) {
        console.log(e);
    }
});

ipcMain.handle("fetch-settings", async () => {
    // Read the UI settings from file and send them to the frontend
    try {
        let contents = await readFile("./config/uiSettings.json", {
            encoding: "utf-8"
        });
        let settings = JSON.parse(contents);
        return settings;
    } catch (e) {
        let defaultSettings = {
            "backgroundPrimary": "#121212",
            "backgroundSecondary": "#2F2F2F",
            "backgroundTertiary": "#464646",

            "buttonBackgroundPrimary": "#00FFFF",
            "buttonBackgroundSecondary": "#cdf4c8",
            "buttonTextPrimary": "#872626",
            "buttonTextSecondary": "#7b065a",
                
            "textPrimary": "#ededed",
            "textSecondary": "#bbbbbb"
        };

        if (e instanceof SyntaxError || (e.code !== undefined && e.code === "ENOENT")) {
            // Settings file doesn't exist or the contents were unparsable.  Recreate it with default values
            try {
                // Create the config directory is it doesn't exist
                await mkdir("./config/", {
                    recursive: true
                });

                await writeFile("./config/uiSettings.json", JSON.stringify(defaultSettings), {
                    encoding: "utf-8"
                });

            } catch (e) {
                console.log(e);
            }
        } else {
            console.log(e);
        }

        return defaultSettings;
    }
});