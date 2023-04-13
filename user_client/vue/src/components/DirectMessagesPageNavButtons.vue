<script setup>
import BackArrow from "../components/BackArrow.vue";
import SettingsButton from "../components/SettingsButton.vue";
</script>

<template>
    <!-- As the Direct Messages page contains 3 different pages that are swapped out as needed, we would need to repeat the markup for the back and settings buttons 3 times.  Instead do it once here and import it as a component -->
    <div class="nav-buttons-container">
        <div class="back-arrow-container">
            <BackArrow previousPage="posts" tabindex="1"/>
        </div>
        <div class="settings-button-container">
            <SettingsButton tabindex="2"/>
        </div>
    </div>
</template>

<style scoped>
.nav-buttons-container {
    display: inherit;
    grid-row: 1;
    grid-column-start: 1;
    grid-column-end: 5;
    width: 100vw;
    background-color: var(--background-secondary);
}

.settings-button-container {
    grid-row: 1;
    grid-column: 5;
    height: 100%;
    width: 100%;
    padding: 0.7vh;
    display: flex;
    flex-direction: row-reverse;
}
</style>