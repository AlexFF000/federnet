<script setup>
import BackArrow from "../components/BackArrow.vue";
import SettingsButton from "../components/SettingsButton.vue";
</script>

<template>
    <div class="create-account-page">

        <div id="back-arrow-container" class="back-arrow-container">
            <BackArrow previousPage="welcomeLogIn"/>
        </div>
        <div id="settings-button-container" class="settings-button-container">
            <div id="settings-button-icon" class="settings-button-icon">
                <SettingsButton/>
            </div>
        </div>

        <div id="server-box" class="floating-box-container server-box">
            <div id="server-box-title" class="form-box-title">
                Infrastructure Server
            </div>

            <div id="server-input-box">
                <input type="text" id="server-input" class="text-input-box" aria-label="Infrastructure server address" v-model="infrastructureServer"/>
            </div>
        </div>

        <div id="signup-box" class="floating-box-container signup-box">
            <div id="signup-box-title" class="form-box-title">
                Create Account
            </div>

            <div id="signup-input-form-area">
                <div id="username-input-box" class="input-box-container">
                    <div id="username-input-label-wrapper" class="text-input-label">
                        <label for="username-input">Username:</label>
                    </div>
                    <input id="username-input" class="text-input-box" type="text" v-model="username"/>
                </div>
                <div id="password-input-box" class="input-box-container">
                    <div id="password-input-label-wrapper" class="text-input-label">
                        <label for="password-input">Password:</label>
                    </div>
                    <input id="password-input" class="text-input-box" type="password" v-model="password"/>
                </div>
                <div id="signup-feedback-box-container" class="form-feedback-box" v-show="0 < signupFeedback.length">
                    {{signupFeedback}}
                </div>
                <div id="signup-submit-container" class="form-submit-button-container">
                    <input id="signup-submit" type="button" value="Create" class="form-submit-button" @click="submitSignup" :disabled="!fieldsNotEmpty()"/>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.create-account-page {
    display: grid;
    /* Organise page as grid with 3 columns and 4 rows */
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: 1fr 1fr 1fr 1fr;
   
    max-height: 100vh;
    margin: 0 auto;
}

.server-box {
    grid-row: 2;
    grid-column: 2;
    margin-top: 5vh;
}

.signup-box {
    order: 1;
    grid-row-start: 3;
    grid-column: 2;
    margin-top: 10vh;
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

</style>

<script>
export default {
    data() {
        return {
            infrastructureServer: "",
            username: "",
            password: "",
            signupFeedback: "",
        }
    },
    methods: {
        submitSignup() {
            let vueScope = this;

            vueScope.signupFeedback = "";  // Clear any existing feedback
            window.api.createAccount(this.infrastructureServer, this.username, this.password).then(result => {
                if (result === "Success") {
                    alert("Successfully created account and logged in");
                } else if (result === "AccountCreatedLoginFailed") {
                    // Account was created but logging in failed.  Redirect to login page so user can try to login again manually
                    vueScope.$router.push({ path: "/welcome" });
                } else {
                    // Failed to create account.  Display reason to user
                    vueScope.signupFeedback = result;
                }
            });
        },
        fieldsNotEmpty() {
            // Check that all the fields are filled in
            return this.infrastructureServer.trim() !== "" 
                && this.username.trim() !== "" 
                && this.password.trim() !== "";
        }
    }
}
</script>