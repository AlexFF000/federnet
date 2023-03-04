<template>
    <div class="welcome-page">
        
        <div id="welcome-title" class="welcome-title">
            Welcome to Federnet!
        </div>

        <div id="server-box" class="floating-box-container server-box">
            <div id="server-box-title" class="form-box-title">
                Infrastructure Server
            </div>

            <div id="server-input-box">
                <input type="text" id="server-input" class="text-input-box" aria-label="Infrastructure server address" v-model="infrastructureServer"/>
            </div>
        </div>

        <div id="login-box" class="floating-box-container login-box">
            <div id="login-box-title" class="form-box-title">
                Log In
            </div>

            <div id="login-input-form-area">
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
                <div id="login-feedback-box-container" class="form-feedback-box" v-show="0 < loginFeedback.length">
                    {{loginFeedback}}
                </div>
                <div id="login-submit-container" class="form-submit-button-container">
                    <input id="login-submit" type="button" value="Log in" class="form-submit-button" @click="submitLogin" :disabled="!fieldsNotEmpty()"/>
                </div>
            </div>
        </div>

        <div id="create-account-link-container" class="create-account-link-container">
            <div id="create-account-or-text" class="create-account-link-text">Or</div>
            <div id="create-account-link" class="create-account-link-text">
                <input id="create-account-link-button" type="button" value="Create Account" class="form-submit-button" @click="redirectToCreateAccountPage"/>
            </div>
        </div>
        
    </div>
</template>

<style scoped>
.welcome-page {
    display: grid;
    /* Organise page as grid with 3 columns and 4 rows */
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: 1fr 1fr 1fr 1fr;
   
    max-height: 100vh;
}

.welcome-title {
    grid-row-start: 1;
    grid-column-start: 2;
    font-size: 4vh;
    text-align: center;
}

.server-box {
    grid-row: 2;
    grid-column: 2;
    margin-top: 5vh;
}

.login-box {
    order: 1;
    grid-row-start: 3;
    grid-column: 2;
    margin-top: 10vh;
}

.create-account-link-container {
    grid-row-start: 4;
    grid-column: 2;
}

.create-account-link-text {
    margin-top: 2vh;
    text-align: center;
}

</style>

<script>
export default {
    data() {
        return {
            infrastructureServer: "",
            username: "",
            password: "",
            loginFeedback: "",
        }
    },
    methods: {
        submitLogin() {
            let vueScope = this;
            vueScope.loginFeedback = "";  // Clear any existing feedback before resubmitting
            
            window.api.logIn(this.infrastructureServer, this.username, this.password).then(result => {
                if (result === "Success") {
                    alert("Login was a success");
                } else {
                    vueScope.loginFeedback = result;
                }
            });
        },
        fieldsNotEmpty() {
            // Check that all the fields are filled in
            return this.infrastructureServer.trim() !== "" 
                && this.username.trim() !== "" 
                && this.password.trim() !== "";
        },
        redirectToCreateAccountPage() {
            this.$router.push({ name: "createAccount", params: { previousPage: "welcomeLogIn" } });
        }
    }
}
</script>