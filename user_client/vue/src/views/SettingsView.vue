<script setup>
import BackArrow from '../components/BackArrow.vue';
</script>

<template>
    <div class="settings-page">
        <div id="back-arrow-container" class="back-arrow-container">
            <BackArrow ref="backArrowRef"/>
        </div>
        <div id="interface-settings-section" class="settings-section">
            <div id="interface-settings-title" class="section-title">
                Interface Settings
            </div>

            <div class="settings-entry">
                <label for="primary-background-colour" class="settings-input-label">Primary background colour</label>
                <input type="color" id="primary-background-colour" v-model="primaryBackgroundColour" class="settings-colour-picker"/>
            </div>

            <div class="settings-entry">
                <label for="secondary-background-colour" class="settings-input-label">Secondary background colour</label>
                <input type="color" id="secondary-background-colour" v-model="secondaryBackgroundColour" class="settings-colour-picker"/>
            </div>

            <div class="settings-entry">
                <label for="tertiary-background-colour" class="settings-input-label">Tertiary background colour</label>
                <input type="color" id="tertiary-background-colour" v-model="tertiaryBackgroundColour" class="settings-colour-picker"/>
            </div>

            <div class="settings-entry">
                <label for="primary-button-background-colour" class="settings-input-label">Primary button background colour</label>
                <input type="color" id="primary-button-background-colour" v-model="primaryButtonBackgroundColour" class="settings-colour-picker"/>
            </div>

            <div class="settings-entry">
                <label for="secondary-button-background-colour" class="settings-input-label">Secondary button background colour</label>
                <input type="color" id="secondary-button-background-colour" v-model="secondaryButtonBackgroundColour" class="settings-colour-picker"/>
            </div>

            <div class="settings-entry">
                <label for="primary-button-text-colour" class="settings-input-label">Primary button text colour</label>
                <input type="color" id="primary-button-text-colour" v-model="primaryButtonTextColour" class="settings-colour-picker"/>
            </div>

            <div class="settings-entry">
                <label for="secondary-button-text-colour" class="settings-input-label">Secondary button text colour</label>
                <input type="color" id="secondary-button-text-colour" v-model="secondaryButtonTextColour" class="settings-colour-picker"/>
            </div>

            <div class="settings-entry">
                <label for="primary-text-colour" class="settings-input-label">Primary text colour</label>
                <input type="color" id="primary-text-colour" v-model="primaryTextColour" class="settings-colour-picker"/>
            </div>

            <div class="settings-entry">
                <label for="secondary-text-colour" class="settings-input-label">Secondary text colour</label>
                <input type="color" id="secondary-text-colour" v-model="secondaryTextColour" class="settings-colour-picker"/>
            </div>
        </div>

        <div class="settings-page-buttons">
            <input type="button" id="cancel-button" value="Cancel" class="form-submit-button page-button button-secondary " @click="cancel"/>
            <input type="button" id="save-button" value="Save" @click="save" class="form-submit-button page-button"/>
        </div>
    </div>
</template>

<style scoped>
.settings-page {
    height: 100vh;
}

.settings-section {
    display: grid;
    margin-left: 1vw;
    margin-right: 50vw;
}

.section-title {
    padding: 1vh;
    border-bottom: solid;
    margin-bottom: 3vh;
}

.settings-entry {
    display: inherit;
    margin-bottom: 1vh;
}

.settings-input-label {
    grid-column: 1;
}

.settings-colour-picker {
    grid-column: 2;
    justify-self: end;
}

.settings-page-buttons {
    position: absolute;
    bottom: 0;
    right: 0;
    margin: 2vh;
}

.page-button {
    margin: 1vh;
}

</style>

<script>
    export default {
        data() {
            let style = getComputedStyle(document.documentElement);
            return {
                primaryBackgroundColour: style.getPropertyValue("--background-primary").trim(),
                secondaryBackgroundColour: style.getPropertyValue("--background-secondary").trim(),
                tertiaryBackgroundColour: style.getPropertyValue("--background-tertiary").trim(),

                primaryButtonBackgroundColour: style.getPropertyValue("--button-background-primary").trim(),
                secondaryButtonBackgroundColour: style.getPropertyValue("--button-background-secondary").trim(),
                primaryButtonTextColour: style.getPropertyValue("--button-text-primary").trim(),
                secondaryButtonTextColour: style.getPropertyValue("--button-text-secondary"),

                primaryTextColour: style.getPropertyValue("--text-primary").trim(),
                secondaryTextColour: style.getPropertyValue("--text-secondary").trim()
            }
        },

        methods: {
            save() {
                // Set the CSS variables with the changed values
                document.documentElement.style.setProperty("--background-primary", this.primaryBackgroundColour);
                document.documentElement.style.setProperty("--background-secondary", this.secondaryBackgroundColour);
                document.documentElement.style.setProperty("--background-tertiary", this.tertiaryBackgroundColour);
                document.documentElement.style.setProperty("--button-background-primary", this.primaryButtonBackgroundColour);
                document.documentElement.style.setProperty("--button-background-secondary", this.secondaryButtonBackgroundColour);
                document.documentElement.style.setProperty("--button-text-primary", this.primaryButtonTextColour);
                document.documentElement.style.setProperty("--button-text-secondary", this.secondaryButtonTextColour);
                document.documentElement.style.setProperty("--text-primary", this.primaryTextColour);
                document.documentElement.style.setProperty("--text-secondary", this.secondaryTextColour);
                
                // Notify the background logic of the changes
                window.api.updateSettings({
                    backgroundPrimary: this.primaryBackgroundColour,
                    backgroundSecondary: this.secondaryBackgroundColour,
                    backgroundTertiary: this.tertiaryBackgroundColour,

                    buttonBackgroundPrimary: this.primaryButtonBackgroundColour,
                    buttonBackgroundSecondary: this.secondaryButtonBackgroundColour,
                    buttonTextPrimary: this.primaryButtonTextColour,
                    buttonTextSecondary: this.secondaryButtonTextColour,

                    textPrimary: this.primaryTextColour,
                    textSecondary: this.secondaryTextColour
                });

                // Return to previous page
                this.$refs.backArrowRef.returnToPreviousPage();
            },
            cancel() {
                // Just trigger the back button
                this.$refs.backArrowRef.returnToPreviousPage();
            }
        }
    }
</script>