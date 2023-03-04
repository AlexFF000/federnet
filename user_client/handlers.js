// Handle requests from the renderer

const { ipcMain } = require("electron");

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