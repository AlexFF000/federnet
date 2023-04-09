// Preload script runs before the renderer and backend contexts are isolated from one another, so can be used to set up an API through which they can safely communicate

const { contextBridge, ipcRenderer } = require("electron");

let handleNewMessagesFunctionRef = null;
// Expose the following methods in the renderer context as children of the window object
contextBridge.exposeInMainWorld(
    "api",
    {
        "logIn": (infrastructureServer, username, password) => {
            return ipcRenderer.invoke("log-in", infrastructureServer, username, password)
        },
        "createAccount": (infrastructureServer, username, password) => {
            return ipcRenderer.invoke("create-account", infrastructureServer, username, password)
        },
        "updateSettings": (newSettings) => {
            return ipcRenderer.send("update-settings", newSettings)
        },
        "fetchSettings": () => {
            return ipcRenderer.invoke("fetch-settings");
        },
        "setCommunity": (communityAddress, communityName) => {
            return ipcRenderer.send("set-active-community", communityAddress, communityName);
        },
        "fetchOlderPosts": () => {
            return ipcRenderer.send("fetch-older");
        },
        "sendPost": (postContent) => {
            return ipcRenderer.invoke("send-post", postContent);
        },
        "toggleCommunityPinned": () => {
            return ipcRenderer.send("toggle-community-pinned");
        },
        "getPinnedCommunities": () => {
            return ipcRenderer.invoke("get-pinned-communities");
        },
        "getCommunities": () => {
            return ipcRenderer.invoke("fetch-communities");
        },
        "checkCommunityExists": (communityAddress) => {
            return ipcRenderer.invoke("check-community-exists", communityAddress);
        },
        "startDirectMessagePolling": () => {
            return ipcRenderer.send("start-dm-polling");
        },
        "needsKeypairSetup": () => {
            return ipcRenderer.invoke("needs-keypair-setup");
        },
        "generateKeypair": () => {
            return ipcRenderer.invoke("generate-keypair");
        },
        "userHasKey": (username) => {
            return ipcRenderer.invoke("user-has-key", username);
        },
        "sendMessage": (username, content) => {
            return ipcRenderer.invoke("send-message", username, content);
        },
        "getConversations": () => {
            return ipcRenderer.invoke("get-conversations");
        },
        "setConversation": (username) => {
            return ipcRenderer.invoke("set-active-conversation", username);
        },
        "getNewMessages": () => {
            return ipcRenderer.invoke("get-new-messages");
        },
        "getOldMessages": () => {
            return ipcRenderer.invoke("get-old-messages");
        },
        "logOut": () => {
            return ipcRenderer.invoke("log-out");
        },
        "exposeHandleNewMessagesFunctionRef": (functionRef) => {
            handleNewMessagesFunctionRef = functionRef;
        }
    }
);

// Frontend listeners
ipcRenderer.on("error-info", (evt, message) => {
    // Background logic is notifying us of a problem
    console.log(message);
});

ipcRenderer.on("new-posts", (evt, posts) => {
    // Add the new posts

    /*
        Scroll down to the bottom automatically so that the new posts are visible
        Only do this if the user is already scrolled to the bottom.  Otherwise they are probably looking at older posts and it would be annoying to automatically scroll down when a new post arrives.
        This scrolling is done here instead of inside the addPostToDisplay function because determining if it is scrolled all the way to the bottom and setting scrollTop is a little inexact
        If the scrolling is done on each post being added, the small amount of error* quickly adds up enough that the threshold for being "scrolled all the way down" is no longer met, so it will stop scrolling down for the rest of the new posts.
        Doing the scrolling once here avoids this issue.

        *error is probably the wrong term here.  The issue is most likely my incomplete understanding of scrollHeight, offsetHeight, clientHeight and any other factors that affect scrolling
    */
    let postsArea = document.getElementById("posts-area");

    let needsScroll = false;
    if (Math.abs(postsArea.scrollHeight - postsArea.clientHeight - postsArea.scrollTop) <= 1) {
        // The user is scrolled all the way down
        needsScroll = true;
    }

    for (let p of posts) {
        addPostToDisplay(p);
    }

    if (needsScroll) postsArea.scrollTop = postsArea.scrollHeight;
});

ipcRenderer.on("old-posts", (evt, posts) => {
    let postsArea = document.getElementById("posts-area");
    // Record old scrollHeight so we can prevent the scrollbar being moved upwards when the message is prepended
    let oldScrollHeight = postsArea.scrollHeight;

    // Iterate backwards through posts, so that they are added newest to oldest rather than oldest to newest
    for (let i = posts.length - 1; -1 < i; i--) {
        addPostToDisplay(posts[i], true);
    }

    postsArea.scrollTop = postsArea.scrollHeight - oldScrollHeight;
});

ipcRenderer.on("new-messages", () => {
    if (document.getElementById("posts-page") !== null) {
        // If on posts page, add the new messages icon to the direct messages icon
        document.getElementById("direct-messages-icon-notification-dot").style.fill = "var(--button-background-primary)";
    } else {
        // If on direct messages page, call handleNewMessages function
        if (handleNewMessagesFunctionRef instanceof Function) {
            // Call loadMessages function
            handleNewMessagesFunctionRef();
        }
    }
});

function addPostToDisplay(post, prepend=false) {
    let postsArea = document.getElementById("posts-area");
    
    let postBox = document.createElement("div");
    let postBoxUsername = document.createElement("div");
    postBoxUsername.className = "post-box-username";
    postBoxUsername.innerText = post.posterUsername;

    let postBoxContent = document.createElement("div");
    postBoxContent.className = "post-box-content";
    postBoxContent.innerText = post.content;

    postBox.className = "post-box";
    postBox.appendChild(postBoxUsername);
    postBox.appendChild(postBoxContent);

    if (prepend) {
        // Place the post before the existing posts
        let oldestPost = postsArea.children[0];
        if (oldestPost === undefined) {
            // The new post is the first one the UI has received
            postsArea.appendChild(postBox);
        } else {
            postsArea.insertBefore(postBox, oldestPost);
        }
    } else {
        postsArea.appendChild(postBox);
    }
}