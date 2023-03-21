// Handle requests from the renderer

const { ipcMain } = require("electron");
const { writeFile, readFile, mkdir } = require("fs/promises");

const ConnectionParamsSingleton = require("./ConnectionParamsSingleton.js");
const { getSession, createAccount } = require("./requests/accountRequests.js");
const { pingServer, fetchPosts, createPost, fetchCommunities } = require("./requests/communityRequests.js");

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

// Post handling
let activeCommunityAddress;
let activeCommunityName;

let oldestPostTimestamp;
let newestPostTimestamp;

let numPostsWithNewestTimestamp;
let numPostsWithOldestTimestamp;

let fetchTimer;

ipcMain.on("set-active-community", async (evt, communityAddress, communityName) => {
    // Clear existing timer if it is set
    clearInterval(fetchTimer);

    // Set activeCommunity to the address provided
    if (await pingServer(communityAddress)) {
        // Server is a Federnet community server
        activeCommunityAddress = communityAddress;
        activeCommunityName = communityName;
        oldestPostTimestamp = undefined;
        newestPostTimestamp = undefined;
        
        // Fetch the first x posts
        let posts = await fetchPosts(communityAddress);
    
        sendPostsToUI(evt, posts);

        // Fetch new posts every second
        fetchTimer = setInterval(async () => {
            let newPosts = await fetchPosts(communityAddress, newestPostTimestamp);
            sendPostsToUI(evt, newPosts);
        }, 1000);

    } else {
        // Server isn't a valid community server, or can't be reached.  Notify the UI of this
        evt.sender.send("error-info", "Server isn't a valid community server or can't be reached");
    }
});

ipcMain.on("fetch-older", async (evt) => {
    // Fetch older posts
    let posts = await fetchPosts(activeCommunityAddress, undefined, oldestPostTimestamp);
    sendPostsToUI(evt, posts);
});

ipcMain.handle("send-post", async (evt, postContent) => {
    // Send a new post to the community server
    if (await createPost(activeCommunityAddress, postContent) === "Success") {
        // Fetch new posts early to ensure the new message is displayed immediately
        let posts = await fetchPosts(activeCommunityAddress, newestPostTimestamp);
        sendPostsToUI(evt, posts);
        
        return "Success";
    } else {
        return "Unable to submit post to community";
    }
});

ipcMain.handle("log-out", (evt) => {
    // Clear active community info and destroy the session information
    clearActiveCommunity();
    ConnectionParamsSingleton.getInstance().clearParams();
});

function clearActiveCommunity() {
    // No community is active, stop checking for new posts and clear any active community info
    activeCommunityAddress = undefined;
    activeCommunityName = undefined;
    oldestPostTimestamp = undefined;
    newestPostTimestamp = undefined;
    numPostsWithNewestTimestamp = undefined;
    numPostsWithOldestTimestamp = undefined;

    clearInterval(fetchTimer);
}

/*
    As timestamp resolution is only 1 second, it is possible for multiple posts to share the same timestamp.  This means that we could end up refetching posts that are already displayed.
    However, it also means that we can't just add / subtract 1 to oldestTimestamp or newestTimestamp to avoid fetching posts that we already have - as this could mean ignoring some posts that we don't already have but which were sent in the same second as the oldest or newest that we do have
    
    To get around this, we count the number of posts that share the same timestamp as the oldest and newest posts.
    When fetching more posts, we discard this number of posts if they share the oldest or newest timestamp.
    This ensures that any posts that we don't have still get displayed, but no ones that we do have are repeated twice
*/
function sendPostsToUI(event, posts) {
    let channel;
    if (0 < posts.length) {
        // Remove any posts that we already have to avoid displaying them twice
        if (newestPostTimestamp !== undefined && posts[0].timestamp === newestPostTimestamp) {
            posts = removeXPostsWithTimestamp(posts, newestPostTimestamp, numPostsWithNewestTimestamp);
        }
        if (0 < posts.length && oldestPostTimestamp !== undefined && posts[posts.length - 1].timestamp === oldestPostTimestamp) {
            posts = removeXPostsWithTimestamp(posts, oldestPostTimestamp, numPostsWithOldestTimestamp, true);
        }

        if (0 < posts.length) {  // As we may have just removed some posts, length might not still be above 0
            // Update newest and oldest timestamps.  The timestamps of the oldest and newest posts that the UI has are recorded so we know from which point to start fetching more posts
            if (posts[0].timestamp < oldestPostTimestamp || oldestPostTimestamp === undefined) {
                oldestPostTimestamp = posts[0].timestamp;

                // Count number of posts that share this timestamp
                numPostsWithOldestTimestamp = countPostsWithTimestamp(posts, oldestPostTimestamp);

                // These posts are older than the ones the user can already see, so prepend them to the list displayed to the user rather than appending them
                channel = "old-posts";
            }
            if (newestPostTimestamp < posts[posts.length - 1].timestamp || newestPostTimestamp === undefined) {
                newestPostTimestamp = posts[posts.length - 1].timestamp;

                // Count number of posts that share this timestamp
                numPostsWithNewestTimestamp = countPostsWithTimestamp(posts, newestPostTimestamp, true);

                channel = "new-posts";
            }

            event.sender.send(channel, posts);
        }
    }
}

function countPostsWithTimestamp(posts, timestamp, fromBack=false) {
    // Count the number of posts in posts whose timestamp == timestamp.  If fromBack is set then count from the end of the array not the start
    let count = 0;
    if (fromBack) {
        for (let i = posts.length - 1; -1 < i; i--) {
            if (posts[i].timestamp === timestamp) count++;
            else break;  // The array is in-order, so we can stop counting once we reach a post that doesn't have that timestamp
        }
    } else {
        for (let p of posts) {
            if (p.timestamp === timestamp) count++;
            else break;
        }
    }

    return count;
}

function removeXPostsWithTimestamp(posts, timestamp, postsToRemove, fromBack=false) {
    // Remove the first or last postsToRemove posts where timestamp == timestamp
    let i = fromBack ? posts.length - 1 : 0;
    let leftToRemove = postsToRemove;

    while (posts[i] !== undefined && posts[i].timestamp === timestamp && 0 < leftToRemove) {
        leftToRemove--;

        if (fromBack) posts.pop();
        else posts.shift();
    }

    return posts;
}

// Pinned communities
let pinnedCommunities = {};  // Pinned communties stored as a dict in format {<community address>:<community name>}

ipcMain.on("toggle-community-pinned", async (evt) => {
    // Add the currently active community to the list of pinned communities, or remove it from the list if already present
    if (pinnedCommunities[activeCommunityAddress] === undefined) {
        // The community is not in the list already, so add it
        pinnedCommunities[activeCommunityAddress] = activeCommunityName;
    } else {
        // The community is already pinned so remove it
        delete pinnedCommunities[activeCommunityAddress];
    }

    // Save the list
    try {
        let pinnedCommunitiesJson = JSON.stringify(pinnedCommunities);
        await writeFile("./config/pinnedCommunities.json", pinnedCommunitiesJson, {
            encoding: "utf-8"
        });
    } catch (e) {
        console.log(e);
        evt.sender.send("Failed to update pinned communities");
    }
});

ipcMain.handle("get-pinned-communities", async (evt) => {
    try {
        let contents = await readFile("./config/pinnedCommunities.json", {
            encoding: "utf-8"
        });

        pinnedCommunities = JSON.parse(contents);
        return pinnedCommunities;
    } catch (e) {
        if (e.code !== undefined && e.code === "ENOENT") {
            // File doesn't exist, create an empty one
            pinnedCommunities = {};
            try {
                // Create the config directory is it doesn't exist
                await mkdir("./config/", {
                    recursive: true
                });

                await writeFile("./config/pinnedCommunities.json", JSON.stringify(pinnedCommunities), {
                    encoding: "utf-8"
                });
            } catch (e) {
                console.log(e);
            }
        }

        return pinnedCommunities;
    }
});

ipcMain.handle("fetch-communities", async evt => {
    // Fetch a list of communities from the Infrastructure Server and return it to the frontend
    return await fetchCommunities();
});

ipcMain.handle("check-community-exists", async (evt, communityAddress) => {
    // Check if there is a working community server at the given address
    return await pingServer(communityAddress);
});