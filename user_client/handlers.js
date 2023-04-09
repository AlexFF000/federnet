// Handle requests from the renderer

const { ipcMain } = require("electron");
const { writeFile, readFile, mkdir } = require("fs/promises");
const { generateKeyPair, createPrivateKey, createPublicKey, publicEncrypt, privateDecrypt } = require("crypto");
const { promisify } = require("util");

const ConnectionParamsSingleton = require("./ConnectionParamsSingleton.js");
const { getSession, createAccount, setPublicKey, getPublicKey, sendDirectMessage, fetchDirectMessages } = require("./requests/accountRequests.js");
const { pingServer, fetchPosts, createPost, fetchCommunities } = require("./requests/communityRequests.js");

let generateKeyPairPromise = promisify(generateKeyPair);

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

let fetchPostsTimer;

ipcMain.on("set-active-community", async (evt, communityAddress, communityName) => {
    // Clear existing timer if it is set
    clearInterval(fetchPostsTimer);

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
        fetchPostsTimer = setInterval(async () => {
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
    // Clear active community info, stop listening for DMs, and destroy the session information
    clearActiveCommunity();
    stopPollingDMs();
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

    clearInterval(fetchPostsTimer);
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

// Direct Message handling
let conversations = {};  // Dict of users that the user has had conversations with in the past.
let activeConversation;  // Username of the user who's DMs are currently displayed

let oldestMessageTimestamp;
let newestMessageTimestamp;

let numMessagesWithOldestTimestamp;
let numMessagesWithNewestTimestamp;

let fetchDirectMessagesTimer;

let keypair = null;

ipcMain.on("start-dm-polling", async evt => {
    // As this will be called whenever the user opens the posts or DM's pages, make sure there is no active conversation already
    clearActiveConversation();

    // Prepare the conversations dict as it is needed in fetchMessages()
    await getConversations();

    // If the local keypair is setup (so the user is capable of receiving them) begin polling for new direct messages every second
    if (await localKeypairIsSetup() && fetchDirectMessagesTimer === undefined) { // Only start the timer if it isn't already running
        keypair = await getLocalKeypair();  // Fetch keypair once here, else it will be read from disk repeatedly
        fetchDirectMessagesTimer = setInterval(async () => {
            // Fetch new messages from Infrastructure Server
            if (await fetchMessages(false)) {
                // Notify the UI if there are new messages
                evt.sender.send("new-messages");
            }
        }, 1000);
    }
});

ipcMain.handle("needs-keypair-setup", async evt => {
    // Return true if the user does NOT already have a keypair stored locally
    return !await localKeypairIsSetup();
});

ipcMain.handle("generate-keypair", async evt => {
    // Generate a keypair and notify Infrastructure Server
    let connectionParamsSingleton = ConnectionParamsSingleton.getInstance();

    console.info("Generating new KeyPair");
    const { publicKey, privateKey } = await generateKeyPairPromise("rsa", {
        modulusLength: 4096,
        publicKeyEncoding: {
            type: "spki",
            format: "pem"
        },
        privateKeyEncoding: {
            type: "pkcs8",
            format: "pem",
            cipher: "aes-256-cbc",
            passphrase: connectionParamsSingleton.getPassword()  // Use user's password to encrypt key in storage for now.  TODO: find a better solution
        }
    });

    // Set user's public key on Infrastructure Server
    if (await setPublicKey(publicKey) === "Success") {
        // Only overwrite local keypair once successfully changed on the server
        await setLocalKeypair(publicKey, privateKey);
    } else {
        console.log("Failed to update keypair on Infrastructure Server");
    }
});

ipcMain.handle("user-has-key", async (evt, username) => {
    // Check if recipient has a public key
    return await getPublicKey(username) !== null;
});

ipcMain.handle("send-message", async (evt, username, content) => {
    // Send a message to the user

    // Get recipient's public key
    let publicKey = await getPublicKey(username);
    let encryptedContent = publicEncrypt({
        key: publicKey
    }, content).toString("base64");

    if (await sendDirectMessage(username, encryptedContent) === "Success") {
        // Add the recipient to conversations if they aren't already there, and set hasUnacknowledgedMessages to false as the user sent the most recent message so acknowledgement of all previous messages can be assumed
        let timestamp = Math.floor(Date.now() / 1000);
        await updateConversations(username, {hasUnacknowlegedMessages: false});
        // Write new message to disk
        await storeMessages(username, [{
            outgoing: true,
            content: content,
            timestamp: timestamp
        }], false);

        // If username is activeConversation, update newestMessageTimestamp
        if (username === activeConversation) {
            newestMessageTimestamp = conversations[activeConversation].newestMessageTimestamp;
            numMessagesWithNewestTimestamp = conversations[activeConversation].numMessagesWithNewestTimestamp;
        }

        return true;
    } else {
        console.log("Unable to send Direct Message");
        return false;
    }
});

ipcMain.handle("get-conversations", async () => {
    await getConversations();
    return conversations;
});

ipcMain.handle("set-active-conversation", async (evt, username) => {
    activeConversation = username;
    // Load all the messages to/from the user from disk
    let activeConversationMessages = await loadMessages(username);
    if (0 < activeConversationMessages.length) {
        oldestMessageTimestamp = activeConversationMessages[0].timestamp;
        newestMessageTimestamp = activeConversationMessages[activeConversationMessages.length - 1].timestamp;
        numMessagesWithOldestTimestamp = countMessagesWithTimestamp(activeConversationMessages, oldestMessageTimestamp, false);
        numMessagesWithNewestTimestamp = countMessagesWithTimestamp(activeConversationMessages, newestMessageTimestamp, true);
    }
    // Set this user to acknowleged, as all messages from them are about to be displayed to the user
    await updateConversations(username, {hasUnacknowlegedMessages: false});
    return activeConversationMessages;
});

ipcMain.handle("get-new-messages", async () => {
    // Return new messages from the active conversation user
    // Load all messages for the user from disk
    let allMessages = await loadMessages(activeConversation);
    if (0 < allMessages.length) {
        // Work out which ones are new (i.e. have not been displayed yet)
        let messagesToReturn = [];
        let i = allMessages.length - 1;
        // Get all messages newer than or equal to the timestamp of the most recent displayed message
        while (0 <= i && newestMessageTimestamp <= allMessages[i].timestamp) {
            messagesToReturn.unshift(allMessages[i]);
            i--;
        }
        // As messages can have the same timestamp, this could potentially still leave us with some duplicates.  Remove these with numMessagesWithNewestTimestamp
        if (newestMessageTimestamp !== undefined && numMessagesWithNewestTimestamp !== undefined) {
            messagesToReturn = removeXPostsWithTimestamp(messagesToReturn, newestMessageTimestamp, numMessagesWithNewestTimestamp, true);
        }

        // Recalculate newestMessageTimestamp and numMessagesWithNewestTimestamp
        if (0 < messagesToReturn.length) {
            newestMessageTimestamp = messagesToReturn[messagesToReturn.length - 1].timestamp;
            numMessagesWithNewestTimestamp = countMessagesWithTimestamp(messagesToReturn, newestMessageTimestamp, true);
        }

        return messagesToReturn;
    } else {
        return [];
    }
});

ipcMain.handle("get-old-messages", async () => {
    // Return older messages for the active conversation user
    if (activeConversation !== undefined) {
        if (await fetchMessages(true)) {
            // If new messages were found, load from disk and return the older ones to the UI
            let allMessages = await loadMessages(activeConversation);
            // Get all messages older than or equal to the timestamp of the oldest displayed message
            let messagesToReturn = [];
            let i = 0;
            while (allMessages[i] !== undefined && allMessages[i].timestamp <= oldestMessageTimestamp) {
                messagesToReturn.push(allMessages[i]);
                i++;
            }

            // As messages can have the same timestamp, we may still have some duplicates
            messagesToReturn = removeXPostsWithTimestamp(messagesToReturn, oldestMessageTimestamp, numMessagesWithOldestTimestamp);

            // Recalculate oldestMessageTimestamp and numMessagesWithOldestTimestamp
            if (0 < messagesToReturn.length) {
                oldestMessageTimestamp = messagesToReturn[0].timestamp;
                numMessagesWithOldestTimestamp = countMessagesWithTimestamp(messagesToReturn, oldestMessageTimestamp);
            }

            return messagesToReturn;
        }
    }

    return [];
});

async function getLocalKeypair() {
    // Get the stored keypair
    try {
        let contents = await readFile("./config/keypair.json", {
            encoding: "utf-8"
        });

        let parsedContents = JSON.parse(contents);
        
        // Check that name matches currently logged in user
        let connectionParamsSingleton = ConnectionParamsSingleton.getInstance();

        if (parsedContents.username !== undefined && parsedContents.username === connectionParamsSingleton.getUsername()) {
            if (parsedContents.publicKey !== undefined && parsedContents.privateKey !== undefined) {
                // Convert to crypto's KeyObject format
                let privateKeyObject = createPrivateKey({
                    key: parsedContents.privateKey,
                    format: "pem",
                    passphrase: connectionParamsSingleton.getPassword()

                });
                let publicKeyObject = createPublicKey(parsedContents.publicKey);

                return { publicKey: publicKeyObject, privateKey: privateKeyObject };
            } else {
                console.log("Invalid local keypair");
            }
        } else {
            console.log("Username in keypair does not match logged in user");
        }
    } catch (e) {
        if (e.code !== undefined && e.code !== "ENOENT") {
            // File does not exist
            console.log("Keypair file does not exist");
        } else {
            console.log("Unable to read keypair file", e);
        }
    }

    return null;
}

async function setLocalKeypair(publicKey, privateKey) {
    // Set the stored keypair
    try {
        let connectionParamsSingleton = ConnectionParamsSingleton.getInstance();

        let data = {
            username: connectionParamsSingleton.getUsername(),
            publicKey: publicKey,
            privateKey: privateKey
        };

        await writeFile("./config/keypair.json", JSON.stringify(data), {
            encoding: "utf-8"
        });
    } catch (e) {
        console.log("Unable to write keypair file", e);
    }
}

async function localKeypairIsSetup() {
    return await getLocalKeypair() !== null;
}

async function getConversations() {
    // Read conversations dict from disk
    try {
        let contents = await readFile("./data/conversations.json", {
            encoding: "utf-8"
        });

        conversations = JSON.parse(contents);
    } catch (e) {
        if (e.code !== undefined && e.code === "ENOENT") {
            // File doesn't exist, create an empty one
            try {
                // Create data directory if it doesn't exist
                await mkdir("./data/", {
                    recursive: true
                });

                // Create file
                await writeFile("./data/conversations.json", JSON.stringify({}), {
                    encoding: "utf-8"
                });

            } catch(err) {
                console.log("Unable to create conversations file", err);
            }
        } else {
            console.log("Unable to read conversations file", e);
        }

        conversations = {};
    }
}

async function updateConversations(username, values) {
    // Update conversations dict and save to disk
    try {
        let existingValues = conversations[username] === undefined ? {} : conversations[username];
        conversations[username] = Object.assign(existingValues, values);

        await writeFile("./data/conversations.json", JSON.stringify(conversations), {
            encoding: "utf-8"
        });
    } catch (e) {
        console.log("Unable to write conversations to file");
    }
}

async function storeMessages(username, messages, prepend=false) {
    // Add the messages to the messages file for the given username
    // Messages should be in format: {outgoing: <true/false Were we the sender of this message? (as opposed to the recipient)>, content: <string. Stored in plaintext>, timestamp: <integer. Timestamp from message>}
    let existingMessages = await loadMessages(username);

    // Write the new messages
    try {
        if (prepend) {
            // Add the messages before the existing messages
            existingMessages = messages.concat(existingMessages);
        } else {
            // Add the messages after the existing messages
            existingMessages = existingMessages.concat(messages);
        }

        // Update oldest/newestMessagesTimestamp and numMessagesWithOldest/newestTimestamp
        if (0 < existingMessages.length) {
            let values = {};
            values.oldestMessageTimestamp = existingMessages[0].timestamp;
            values.newestMessageTimestamp = existingMessages[existingMessages.length - 1].timestamp;
            values.numMessagesWithOldestTimestamp = countMessagesWithTimestamp(existingMessages, values.oldestMessageTimestamp, false);
            values.numMessagesWithNewestTimestamp = countMessagesWithTimestamp(existingMessages, values.newestMessageTimestamp, true);
            await updateConversations(username, values);
        }

        let contents = JSON.stringify(existingMessages);
        
        // Create the directory if it doesn't exist
        await mkdir("./data/messages/", {
            recursive: true
        });

        // WARNING.  USING THE USERNAME AS THE FILE NAME IS VERY INSECURE.
        await writeFile(`./data/messages/${username}.json`, contents, {
            encoding: "utf-8"
        });
    } catch (e) {
        console.log("Unable to write messages to disk", e);
    }
}

async function loadMessages(username) {
    // Read the messages from the file for the given username
    try {
        let contents = await readFile(`./data/messages/${username}.json`, {
            encoding: "utf-8"
        });

        return JSON.parse(contents);
    } catch (e) {
        if (!(e.code !== undefined && e.code === "ENOENT")) {
            // Do not log the error if the issue is just that the file does not exist, as this will always be the case when starting a conversation with someone new
            console.log("Unable to read messages from file", e);
        }

        return [];
    }
}

async function fetchMessages(oldMessages=false) {
    // Fetch messages from the Infrastructure Server and process them

    if (keypair === null) {
        console.log("No private key.  Cannot decrypt messages.");
        return false;
    }

    let startTime;
    let endTime;
    if (oldMessages) {
        endTime = oldestMessageTimestamp;
    } else {
        startTime = newestMessageTimestamp;  // May still be undefined, but this is correct behaviour when no active community is set
    }

    let messages = await fetchDirectMessages(startTime, endTime);

    // Process the messages into the correct format and decrypt their content
    let processedMessagesBySender = {};  // Format {<sender username>: [<messages>]}
    for (let m of messages) {
        if (processedMessagesBySender[m.senderUsername] === undefined) {
            processedMessagesBySender[m.senderUsername] = [];
        }

        let decryptedContent = privateDecrypt(keypair.privateKey, Buffer.from(m.content, "base64")).toString("utf-8");
        processedMessagesBySender[m.senderUsername].push({
            outgoing: false,
            timestamp: m.timestamp,
            content: decryptedContent
        });
    }

    // Store messages to disk
    let newMessagesReceived = false;  // After removing ones we already have are there any messages left?
    for (let sender in processedMessagesBySender) {
        // Remove any messages that we already have

        // Remove messages that are older than the newest timestamp but newer than the oldest timestamp (not inclusive), as this would mean we already have them
        if (conversations[sender] !== undefined && conversations[sender].oldestMessageTimestamp !== undefined && conversations[sender].newestMessageTimestamp !== undefined) {
            processedMessagesBySender[sender] = removeMessagesBetweenTimestamps(processedMessagesBySender[sender], conversations[sender].oldestMessageTimestamp, conversations[sender].newestMessageTimestamp);
        
            if (0 < processedMessagesBySender[sender].length) {
                processedMessagesBySender[sender] = removeXPostsWithTimestamp(processedMessagesBySender[sender], conversations[sender].oldestMessageTimestamp, conversations[sender].numMessagesWithOldestTimestamp);
            }
            if (0 < processedMessagesBySender[sender].length) {
                processedMessagesBySender[sender] = removeXPostsWithTimestamp(processedMessagesBySender[sender], conversations[sender].newestMessageTimestamp, conversations[sender].numMessagesWithNewestTimestamp, true);
            }
        }

        if (0 < processedMessagesBySender[sender].length) {
            newMessagesReceived = true;
            await storeMessages(sender, processedMessagesBySender[sender], oldMessages);
            // There are now unacknowleged messages from this user
            await updateConversations(sender, {hasUnacknowlegedMessages: true});
        }
    }

    return newMessagesReceived;
}

function countMessagesWithTimestamp(messages, timestamp, fromBack=false) {
    // Count the number of messages in messages whose timestamp == timestamp, counting only received messages (not sent ones)  If fromBack is set then count from the end of the array not the start
    let count = 0;
    if (fromBack) {
        for (let i = messages.length - 1; -1 < i; i--) {
            if (messages[i].outgoing === false && messages[i].timestamp === timestamp) count++;
            else break;  // The array is in-order, so we can stop counting once we reach a message that doesn't have that timestamp
        }
    } else {
        for (let m of messages) {
            if (m.outgoing === false && m.timestamp === timestamp) count++;
            else break;
        }
    }

    return count;
}

function removeMessagesBetweenTimestamps(messages, startTime, endTime) {
    // Remove any messages newer than startTime and older than endTime (not including messages equal to either of these timestamps)
    let messagesToReturn = [];
    for (let m of messages) {
        if (!(startTime < m.timestamp && m.timestamp < endTime)) {
            messagesToReturn.push(m);
        }
    }
    return messagesToReturn;
}

function clearActiveConversation() {
    // Clear info related to active conversation
    activeConversation = undefined;
    oldestMessageTimestamp = undefined;
    newestMessageTimestamp = undefined;
    numMessagesWithOldestTimestamp = undefined;
    numMessagesWithNewestTimestamp = undefined;
}

function stopPollingDMs() {
    // Clear active conversation and stop polling for new messages
    clearActiveConversation();
    if (fetchDirectMessagesTimer !== undefined) {
        clearInterval(fetchDirectMessagesTimer);
        fetchDirectMessagesTimer = undefined;
    }
}
