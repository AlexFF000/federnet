<script setup>
import SettingsButton from "../components/SettingsButton.vue";
import DirectMessagesButton from "../components/DirectMessagesButton.vue";
</script>
<template>
    <div class="posts-page" id="posts-page">
        <div id="posts-sidebar-container" class="posts-sidebar-container">
            <div id="posts-sidebar" class="posts-sidebar">
                <div id="find-community-button-section" class="find-community-button-section">
                    <div id="find-community-button" class="sidebar-link" @click="findCommunity()" @keyup.enter="findCommunity()" tabindex="3">Find Community</div>
                </div>
                <div class="pinned-communities-heading">
                    Pinned communities
                </div>
                <div id="pinned-communities">
                    <ul class="pinned-communities-list" ref="pinnedCommunitiesList" @keyup.down="scrollCommunitiesDownWithKeyboard" @keyup.up="scrollCommunitiesUpWithKeyboard" tabindex="4">
                        <li class="sidebar-list-item sidebar-link" v-for="(name, address) in pinnedCommunties" @click="changeActiveServer(address, name)" @keyup.enter="changeActiveServer(address, name)" tabindex="-1">
                            {{ name }}
                        </li>
                    </ul>
                </div>
                <div id="log-out-button-section" class="log-out-button-section">
                    <input id="log-out-button" type="button" class="form-submit-button button-secondary" value="Log out" @click="logOut" tabindex="5"/>
                </div>
            </div>
        </div>
        <div id="nav-buttons-container" class="nav-buttons-container">
            <div id="settings-button-icon" >
                <SettingsButton tabindex="2"/>
            </div>
            <div id="direct-messages-button-icon">
                <DirectMessagesButton tabindex="1"/>
            </div>
        </div>
        <div id="posts-section" class="posts-section">
            <div class="pin-community-button-container">
                <input id="pin-community-button" type="button" class="form-submit-button pin-community-button" value="Pin community" ref="togglePinnedButton" @click="toggleCommunityPinned" :disabled="!aCommunityIsSelected()" tabindex="7"/>
            </div>
            <div id="posts-area" class="posts-area" ref="postsArea" @scroll="handlePostsScrolled" tabindex="6">
                <!-- The area where the posts are displayed -->
            </div>
            <div id="post-creation-container" class="post-creation-container">
                <input id="new-post-textbox" type="text" class="text-input-box new-post-textbox" v-model="newPostContent" @keyup.enter="sendPost" :disabled="!aCommunityIsSelected()" tabindex="8"/>
                <input id="new-post-submit" type="button" class="form-submit-button new-post-submit" value="Send" @click="sendPost" :disabled="!aCommunityIsSelected()" tabindex="9"/>  
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Many of the classes used on this page are in main.css as they are also used by the Direct Messages page */
.posts-page {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
    grid-template-rows: 15mm 1fr;
    max-height: 100vh;
}

.log-out-button-section {
    width: 100%;
    margin-top: auto;
    text-align: center;
    padding: 1vh;
    border-top: solid var(--background-tertiary);
}

.pin-community-button-container {
    display: flex;
    flex-direction: row-reverse;
}

.pin-community-button {
    margin: 0.5em;
}

.nav-buttons-container {
    grid-row: 1;
    grid-column: 5;
    height: fit-content;
    width: 100%;
    padding: 1vh;
    display: flex;
    flex-direction: row-reverse;
}

.settings-button-icon {

}
</style>

<script>
export default {
    data() {
        return {
            newPostContent: "",
            pinnedCommunties: {},
            currentCommunityAddress: "",
            currentCommunityName: "",
            selectedCommunityListItem: null
        }
    },
    methods: {
        sendPost() {
            let vueScope = this;
            window.api.sendPost(this.newPostContent).then(result => {
                if (result === "Success") {
                    vueScope.newPostContent = "";
                } else {
                    console.log(result);
                }
            });
        },
        findCommunity() {
            // Redirect to "find community" page
            this.$router.push({ name: "findCommunity", params: { previousPage: "posts" } });
        },
        changeActiveServer(serverAddress, communityName) {
            // Switch to a different community server

            // Clear all existing messages
            this.$refs.postsArea.replaceChildren();

            // Notify backend logic to switch to the new community
            window.api.setCommunity(serverAddress, communityName);

            this.currentCommunityAddress = serverAddress;
            this.currentCommunityName = communityName;

            // Update pin button depending on whether community is already pinned
            this.updatePinButton();
            // Highlight community if it is in pinned list
            this.highlightSelectedCommunity();
        },
        handlePostsScrolled() {
            // If the user has scrolled to the top of the posts area (i.e. to the oldest post available) then fetch older posts
            if (this.$refs.postsArea.scrollTop === 0) {
                window.api.fetchOlderPosts();
            }

        },
        async getPinnedCommunities() {
            // Get the list of pinned communities, and add each one to the sidebar
            this.pinnedCommunties = await window.api.getPinnedCommunities();
            
        },
        updatePinButton() {
            // Change the text of the pin community button to either "pin community" or "unpin community" depending on whether its already pinned
            let alreadyPinned = this.pinnedCommunties[this.currentCommunityAddress] !== undefined;
            this.$refs.togglePinnedButton.value = alreadyPinned ? "Unpin community" : "Pin community";
            
        },
        aCommunityIsSelected() {
            // Is a community currently selected?
            return this.currentCommunityAddress && this.currentCommunityName;
        },
        async toggleCommunityPinned() {
            await window.api.toggleCommunityPinned();
            // Refresh list of pinned communities
            await this.getPinnedCommunities();
            // Update button text
            this.updatePinButton();
            // Highlight the selected community if it is pinned
            this.highlightSelectedCommunity();
        },
        highlightSelectedCommunity() {
            // If the currently selected community is in the list of pinned communities, highlight it
            let listItems = this.$refs.pinnedCommunitiesList.getElementsByTagName("li");
            for (let item of listItems) {
                if (item.innerText === this.currentCommunityName) {
                    item.classList.add("sidebar-link-selected");
                } else {
                    // Unhighlight any entries that are not the current community, so that previously selected communities do not still appear selected
                    item.classList.remove("sidebar-link-selected");
                }
            }
        },
        async logOut() {
            // Clear session info and return to the login page
            await window.api.logOut();
            this.$router.push({ name: "welcomeLogIn" });
        },
        scrollCommunitiesDownWithKeyboard() {
            // Scroll down through list of communities with keyboard
            if (this.selectedCommunityListItem === null) {
                this.selectedCommunityListItem = 0;
            } else if (this.selectedCommunityListItem < Object.keys(this.pinnedCommunties).length - 1) {
                this.selectedCommunityListItem++;
            } else {
                // Scrolled all the way to the bottom, jump back to the top
                this.selectedCommunityListItem = 0;
            }

            // Give focus to selected item
            this.$refs.pinnedCommunitiesList.children[this.selectedCommunityListItem].focus();
        },
        scrollCommunitiesUpWithKeyboard() {
            // Scroll up through list of communities with keyboard
            if (this.selectedCommunityListItem === null || this.selectedCommunityListItem === 0) {
                this.selectedCommunityListItem = Object.keys(this.pinnedCommunties).length - 1;
            } else {
                this.selectedCommunityListItem--;
            }

            // Give focus to selected item
            this.$refs.pinnedCommunitiesList.children[this.selectedCommunityListItem].focus();
        }
    },
    async mounted() {
        // Scroll the posts display to the bottom so that when the posts are sent it remains scrolled to the bottom
        this.$refs.postsArea.scrollTop = this.$refs.postsArea.scrollHeight;

        // Get pinned communities
        await this.getPinnedCommunities();

        // Start polling for direct messages
        window.api.startDirectMessagePolling();

        // If a communityServer has been provided in params, connect to it
        if (this.$route.params.communityAddress && this.$route.params.communityName) {
            this.changeActiveServer(this.$route.params.communityAddress, this.$route.params.communityName);
        } else if (Object.keys(this.pinnedCommunties).length === 0) {
            // No communityServer has been provided in params, and there are no pinned communities to connect to.  Automatically redirect to the "Find Community" page
            this.$router.push({ name: "findCommunity", params: { previousPage: "welcomeLogIn" } });
        }
    }
}
</script>