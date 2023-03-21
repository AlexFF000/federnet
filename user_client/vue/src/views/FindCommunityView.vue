<script setup>
import BackArrow from "../components/BackArrow.vue";
import SettingsButton from "../components/SettingsButton.vue";
</script>
<template>
    <div id="find-community-page" class="find-community-page">
        <div id="back-arrow-container" class="back-arrow-container">
            <BackArrow/>
        </div>
        <div id="settings-button-container" class="settings-button-container">
            <div id="settings-button-icon" class="settings-button-icon">
                <SettingsButton/>
            </div>
        </div>

        <div class="manual-connection-container">
            <div class="section-heading">Connect manually</div>

            <div id="manual-connection-name-container" class="input-box-container">
                <div id="manual-connection-name-label-wrapper" class="text-input-label">
                    <label for="manual-connection-name-field">Name</label>
                </div>
                <input id="manual-connection-name-field" class="text-input-box" type="text" v-model="communityName"/>
            </div>
            
            <div id="manual-connection-address-container" class="input-box-container">
                <div id="manual-connection-address-label-wrapper" class="text-input-label">
                    <label for="manual-connection-address-field">Address</label>
                </div>
                <input id="manual-connection-address-field" class="text-input-box" type="text" v-model="communityAddress"/>
            </div>
        </div>

        <div class="discover-community-container">
            <div class="section-heading">Find community in list</div>
            <div class="discover-community-list-container">
                <ul id="discover-community-list" class="discover-community-list">
                    <li class="discover-community-list-item" v-for="community in communities" @click="setCommunityFields(community.name, community.address)">
                        <div class="discover-community-list-item-name">
                            {{ community.name }}
                        </div>
                        <div class="discover-community-list-item-description">
                            {{ community.description }}
                        </div>
                    </li>
                </ul>
            </div>
        </div>

        <div id="error-container" class="error-container form-feedback-box" v-show="0 < errorText.length">
            {{ errorText }}
        </div>

        <div id="connect-button-container" class="connect-button-container">
            <input id="connect-button" class="form-submit-button connect-button" type="button" @click="connectToCommunity" value="Connect" :disabled="!fieldsNotEmpty()"/>
        </div>
    </div>
</template>

<style scoped>
.find-community-page {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: 1fr 1fr 1fr 1fr;
    max-height: 100vh;
}

.settings-button-container {
    grid-row: 1;
    grid-column: 3;
    height: 100%;
    width: 100%;
    padding: 1vh;
    display: flex;
    flex-direction: row-reverse;
}

.manual-connection-container {
    grid-row: 2;
    grid-column: 2;
}

.section-heading {
    border-bottom: solid var(--background-secondary);
    padding-bottom: 0.5em;
    margin-bottom: 1em;
}

.discover-community-container {
    grid-row: 3;
    grid-column: 2;
}

.discover-community-list-container {
    max-height: 50vh;
    overflow-y: auto;
    border-radius: 0.5vh;
    background-color: var(--background-secondary);
}

.discover-community-list {
    padding-left: 0;
}

.discover-community-list-item {
    list-style: none;
    border-radius: 0.5vh;
    padding-inline-start: 0;
    padding-left: 0.5vw;
    padding-right: 0.5vw;
    color: var(--text-secondary);
    margin-bottom: 1ch;
}

.discover-community-list-item:hover {
    background-color: var(--background-tertiary);
    color: var(--text-secondary);
    cursor: pointer;
}

.discover-community-list-item-name {
    font-weight: bold;
}

.discover-community-list-item-description {
    margin-top: 1ch;
}

.error-container {
    grid-row: 4;
    grid-column: 2;
}

.connect-button-container {
    grid-row: 5;
    grid-column: 3;
    display: flex;
    flex-direction: row-reverse;
}

.connect-button {
    margin: 1vh;
}
</style>

<script>
    export default {
        data() {
            return {
                communityAddress: "",
                communityName: "",
                communities: [],
                errorText: ""
            }
        },
        methods: {
            async getCommunities() {
                // Get list of communities
                this.communities = await window.api.getCommunities();
            },
            setCommunityFields(name, address) {
                this.communityName = name;
                this.communityAddress = address;
                // Clear error if there is one
                this.errorText = "";
            },
            fieldsNotEmpty() {
                // Check if the name and address fields are empty
                return this.communityName && this.communityAddress;
            },
            async connectToCommunity() {
                // Clear error if there is one
                this.errorText = "";

                // Check if there is a working community server at the provided address
                if (await window.api.checkCommunityExists(this.communityAddress)) {
                    // Open the provided address in the posts page
                    this.$router.push({ name: "posts", params: { communityAddress: this.communityAddress, communityName: this.communityName }});
                } else {
                    this.errorText = "No community server found at the given address";
                }
            }
        },
        async mounted() {
            await this.getCommunities();
        }
    }
</script>