<script setup>
import { nextTick } from "vue";
import DirectMessagesPageNavButtons from "../components/DirectMessagesPageNavButtons.vue";
</script>
<template>
    <div class="direct-messages-page invisible-page" ref="normalPage">
        <DirectMessagesPageNavButtons/>

        <div id="messages-sidebar-container" class="posts-sidebar-container height-limited">
            <div id="messages-sidebar" class="posts-sidebar">
                <div id="new-conversation-button-section" class="find-community-button-section">
                    <div id="new-conversation-button" class="sidebar-link" @click="newConversation()" @keyup.enter="newConversation()" tabindex="3">New conversation</div>
                </div>
                <div class="pinned-communities-heading">
                    Conversations
                </div>
                <div id="existing-conversations">
                    <ul class="pinned-communities-list" ref="existingConversationsList" @keyup.down="scrollDownThroughConversationsWithKeyboard" @keyup.up="scrollUpThroughConversationsWithKeyboard" tabindex="4">
                        <li class="sidebar-list-item sidebar-link" v-for="(info, name) in existingConversations" @click="changeActiveConversation(name)" @keyup.enter="changeActiveConversation(name)" tabindex="-1">
                            {{ name }}
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        <div id="messages-section" class="posts-section">
            <div id="messages-area" class="posts-area messages-area" ref="messagesArea" @scroll="handleMessagesScrolled" tabindex="5">
                <!-- The area where the posts are displayed -->
                <ul>
                    <li v-for="m in currentConversationMessages" class="post-box message-box">
                        <div class="post-box-username">
                            {{ m.outgoing ? "You" : currentConversationUsername }}
                        </div>
                        <div class="post-box-content">
                            {{ m.content }}
                        </div>
                    </li>
                </ul>
            </div>
            <div id="message-creation-container" class="post-creation-container">
                <input id="new-message-textbox" type="text" class="text-input-box new-post-textbox" v-model="newMessageContent" @keyup.enter="sendMessage" :disabled="!aConversationIsSelected()" tabindex="6"/>
                <input id="new-message-submit" type="button" class="form-submit-button new-post-submit" value="Send" @click="sendMessage" :disabled="!aConversationIsSelected()" tabindex="7"/>
            </div>
        </div>
    </div>

    <div class="direct-messages-page invisible-page" ref="newConversationDialog">
        <!-- A dialog that replaces the page when starting a new conversation -->

        <DirectMessagesPageNavButtons/>

        <div id="new-conversation-page" class="alternate-page height-limited">
            <div id="new-conversation-form" class="floating-box-container alternate-page-form">
                <div id="new-conversation-username-input-box" class="input-box-container">
                    <div id="new-conversation-username-input-label-wrapper" class="text-input-label">
                        <label for="new-conversation-username">Recipient username:</label>
                    </div>
                    <input id="new-conversation-username" type="text" class="text-input-box" v-model="newConversationDialogUsername" @keyup.enter="newConversationSubmitUsernameIfProvided()" tabindex="3"/>
                </div>
                <div id="new-conversation-feedback" class="form-feedback-box" v-show="0 < newConversationErrorText.length">
                    {{ newConversationErrorText }}
                </div>
                <div class="form-submit-button-container">
                    <input id="new-conversation-cancel" type="button" value="Cancel" class="form-submit-button button-secondary new-conversation-form-button" @click="newConversationCancel()" tabindex="4"/>
                    <input id="new-conversation-submit" type="button" value="Submit" class="form-submit-button new-conversation-form-button" @click="newConversationSubmitUsername()" :disabled="newConversationDialogUsername.length === 0" tabindex="5"/>
                </div>
            </div>
        </div>
    </div>

    <div class="direct-messages-page" ref="setupPage">
        <!-- An alternate version of the page for when the keypair is not already set up -->

        <DirectMessagesPageNavButtons/>

        <div id="generate-keypair-page" class="alternate-page">
            <div id="generate-keypair-page-content" class="floating-box-container alternate-page-form">
                <div class="form-text">
                    Unfortunately, you cannot use Direct Messaging as there is no encryption keypair stored on this device.
                </div>
                <div class="form-text">
                    Press the button to generate a keypair to use direct messaging.
                </div>
                <div class="form-text warning-text">
                    Warning: If you have an existing keypair on another device, this will invalidate it
                </div>
                <div class="form-submit-button-container">
                    <input id="generate-keypair-button" type="button" value="Generate keypair" class="form-submit-button" @click="generateKeypair()" tabindex="3"/>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.direct-messages-page {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
    grid-template-rows: 15mm 1fr;
    max-height: 100vh;
}

.invisible-page {
    display: none;
}

.bold-text {
    font-weight: bold;
}

.height-limited {
    height: calc(100vh - 15mm);  /* Adjust 100vh heights to take into account 15mm nav buttons bar at the top */
}

.messages-area {
    margin-top: 5vh;
}

.message-box {
    list-style: none;
}

.alternate-page {
    grid-row: 2;
    width: 100vw;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: 1fr 1fr 1fr;
}
.alternate-page-form {
    grid-row: 2;
    grid-column: 2;
    height: fit-content;
}

.new-conversation-form-button {
    margin: 1vh;
}

.form-text {
    margin-bottom: 1em;
    text-align: center;
}

.warning-text {
    font-weight: bold;
}
</style>

<script>
export default {
    data() {
        return {
            existingConversations: {},
            newConversationDialogUsername: "",
            newConversationErrorText: "",
            newMessageContent: "",
            currentConversationUsername: "",
            currentConversationMessages: [],
            selectedConversationListItem: null
        }
    },
    methods: {
        async showSetupPromptIfNeeded() {
            // If the keypair has not been setup, display the version of the page with the setup prompt.  If it has been setup, display the normal page.  Return true if setup page shown
            if (await window.api.needsKeypairSetup()) {
                this.$refs.normalPage.style.display = "none";
                this.$refs.setupPage.style.display = "grid";
                return true;
            } else {
                this.$refs.normalPage.style.display = "grid";
                this.$refs.setupPage.style.display = "none";
                return false;
            }
        },
        async generateKeypair() {
            // Generate a new keypair and refresh the page
            await window.api.generateKeypair();
            window.location.reload();
        },
        async loadConversations() {
            // Load dict of existing conversations
            this.existingConversations = await window.api.getConversations();
        },
        newConversation() {
            // Open new conversation dialog
            this.$refs.normalPage.style.display = "none";
            this.$refs.newConversationDialog.style.display = "grid";
        },
        async newConversationSubmitUsername() {
            // Check that the user can receive direct messages
            if (await window.api.userHasKey(this.newConversationDialogUsername)) {
                this.currentConversationUsername = this.newConversationDialogUsername;
                this.newConversationDialogUsername = "";

                this.$refs.newConversationDialog.style.display = "none";
                this.$refs.normalPage.style.display = "grid";

                this.currentConversationMessages = [];  // Clear any existing messages from the display
                this.highlightSelectedConversation();  // As the new conversation isn't in the list we are just calling this to un-highlight the previous conversation (if there was one)
            } else {
                this.newConversationErrorText = "The recipient does not have a public key set up so cannot receive direct messages";
            }
        },
        async newConversationSubmitUsernameIfProvided() {
            // Trigger newConversationSubmitUsername if a username has been provided
            if (0 < this.newConversationDialogUsername.length) {
                await this.newConversationSubmitUsername();
            }
        },
        newConversationCancel() {
            this.newConversationDialogUsername = "";
            this.newConversationErrorText = "";
            this.$refs.newConversationDialog.style.display = "none";
            this.$refs.normalPage.style.display = "grid";
        },
        aConversationIsSelected() {
            return this.currentConversationUsername !== "";
        },
        async changeActiveConversation(username) {
            this.currentConversationUsername = username;
            this.currentConversationMessages = [];  // Clear any existing messages from display
            this.addMessagesWithoutDuplicates(await window.api.setConversation(username));
            await this.loadConversations();
            this.highlightSelectedConversation();
        },
        async handleMessagesScrolled() {
            // If user is trying to scroll up for more messages
            if (this.$refs.messagesArea.scrollTop === 0) {
                // If scrolled all the way to the top of the current messages, fetch older ones and prepend to currentConversationMessages
                //this.currentConversationMessages = (await window.api.getOldMessages()).concat(this.currentConversationMessages);
                // This is disabled as it is non essential functionality so there is not enough time to finish implementing it.  TODO Implement it
            }
        },
        async sendMessage() {
            if (await window.api.sendMessage(this.currentConversationUsername, this.newMessageContent)) {
                let needsScroll = Math.abs(this.$refs.messagesArea.scrollHeight - this.$refs.messagesArea.clientHeight - this.$refs.messagesArea.scrollTop) <= 1;  // If already scrolled to bottom, automatically scroll down to keep it that way after adding message
                
                // Add the message to the list of messages
                this.currentConversationMessages.push({outgoing: true, timestamp: Math.floor(Date.now() / 1000), content: this.newMessageContent});
                this.newMessageContent = "";

                if (needsScroll) nextTick(() => {
                    this.$refs.messagesArea.scrollTop = this.$refs.messagesArea.scrollHeight;
                });
            } else {
                console.log("Failed to send direct message");
            }

            if (!this.recipientIsInConversations()) {
                // This is a new recipient, so won't be in the list of conversations yet.  The list must therefore be reloaded to include them
                await this.loadConversations();
                // Set the active conversation to this new recipient
                await window.api.setConversation(this.currentConversationUsername);
            }
        },
        recipientIsInConversations() {
            // Check if recipient is in conversations, i.e. have we messaged them before
            for (let c in this.existingConversations) {
                if (c === this.currentConversationUsername) {
                    return true;
                }
            }
            return false;
        },
        highlightSelectedConversation() {
            // Highlight the currently active conversation, and put any with unacknowleged messages in bold
            let listItems = this.$refs.existingConversationsList.getElementsByTagName("li");
            for (let item of listItems) {
                if (item.innerText === this.currentConversationUsername) {
                    item.classList.add("sidebar-link-selected");
                } else {
                    // Unhighlight any entries that are not the current conversation, so that previously selected conversations do not still appear selected
                    item.classList.remove("sidebar-link-selected");
                }

                if (this.existingConversations[item.innerText].hasUnacknowlegedMessages) {
                    item.classList.add("bold-text");
                } else {
                    item.classList.remove("bold-text");
                }
            }
        },
        async loadNewMessages() {
            // Get new messages and add to display
            this.addMessagesWithoutDuplicates(await window.api.getNewMessages());
        },
        async handleNewMessages() {
            // Reload conversations dict, as it may have new conversations or some existing conversations are now unacknowleged
            await this.loadConversations();
            // If the currently active conversation is now unacknowleged, load the new messages
            if (this.existingConversations[this.currentConversationUsername] !== undefined && this.existingConversations[this.currentConversationUsername].hasUnacknowlegedMessages === true) {
                await this.loadNewMessages();
            }
            this.highlightSelectedConversation();
        },
        addMessagesWithoutDuplicates(newMessages) {
            // Add new messages to the display
            // If user was already scrolled all the way to the bottom, scroll down automatically so they are still at the bottom after the new messages are added
            let needsScroll = Math.abs(this.$refs.messagesArea.scrollHeight - this.$refs.messagesArea.clientHeight - this.$refs.messagesArea.scrollTop) <= 1;

            /*
                Clearly some mistakes were made when planning the approach for the code for the Direct Messages part of the user client, and its all turned into a mess
                Despite measures of ever increasing complexity in the background logic, some messages we have already sent are still being shown twice.
                As the background logic's measures for dealing with this are getting increasingly difficult for me to get my head around (worrying considering I only wrote it the day before writing this, imagine how hard it'll be in a month...)
                In the interests of getting a working product, instead of throwing more spaghetti on the bolognese and adding even more logic to filter out duplicate messages, we will simply detect and discard duplicates here
                Do this by looping through the new messages, checking if it is exactly the same as the last message, and discarding it if so.  There may be some false positives with this - maybe a user really did send the exact same message twice in the same second - but we no longer have the luxury of having time to worry about such edge cases in the user client.
            */
            for (let m of newMessages) {
                if (0 < this.currentConversationMessages.length) {
                    let previousMessage = this.currentConversationMessages[this.currentConversationMessages.length - 1];
                    if (!(m.outgoing === previousMessage.outgoing && m.timestamp === previousMessage.timestamp && m.content === previousMessage.content)) {
                        this.currentConversationMessages.push(m);
                    }
                } else {
                    this.currentConversationMessages.push(m);
                }
            }

            if (needsScroll) {
                // Wait until DOM update has actually be done before scrolling to the bottom, otherwise it won't make any difference
                nextTick(() => {
                    this.$refs.messagesArea.scrollTop = this.$refs.messagesArea.scrollHeight;
                })
            }
        },
        scrollDownThroughConversationsWithKeyboard() {
            // Scroll down through the list of conversations with the keyboard
            if (this.selectedConversationListItem === null) {
                // Nothing selected yet, select the first one
                this.selectedConversationListItem = 0;
            } else if (this.selectedConversationListItem < Object.keys(this.existingConversations).length -1) {
                // Scroll to next one
                this.selectedConversationListItem++;
            } else {
                // End reached, scroll back to first one
                this.selectedConversationListItem = 0;
            }

            // Focus on selected list item
            this.$refs.existingConversationsList.children[this.selectedConversationListItem].focus();
        },
        scrollUpThroughConversationsWithKeyboard() {
            // Scroll up through the list of conversations with the keyboard
            if (this.selectedConversationListItem === null || this.selectedConversationListItem === 0) {
                // Jump straight to end
                this.selectedConversationListItem = Object.keys(this.existingConversations).length - 1;
            } else {
                this.selectedConversationListItem--;
            }

            // Focus on selected list item
            this.$refs.existingConversationsList.children[this.selectedConversationListItem].focus();
        }
    },
    async mounted() {
        
        /*
            As we have to be able to trigger the handleNewMessages method from outside Vue code, pass a reference to it into the electron preload world
            This is an inelegant and terrible solution
        */
        window.api.exposeHandleNewMessagesFunctionRef(this.handleNewMessages);

        if (!await this.showSetupPromptIfNeeded()) {
            await this.loadConversations();
            // Start polling for DMs
            await window.api.startDirectMessagePolling();
        }
    }
}
</script>