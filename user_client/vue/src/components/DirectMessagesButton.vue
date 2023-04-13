<template>
    <!-- Created with Inkscape (http://www.inkscape.org/) -->
    <svg width="15mm" height="14mm" version="1.1" viewBox="0 0 45.275 47.34" xmlns="http://www.w3.org/2000/svg" @click="redirectToDirectMessagesPage()" @keyup.enter="redirectToDirectMessagesPage()" :tabindex="tabindex" aria-label="Direct messages">
        <g transform="translate(-67.701 -118.05)" fill="none" stroke="#000" class="icon-path">
            <rect x="69.438" y="125.36" width="41.955" height="29.221" ry=".68756" stroke-width="2.746"/>
            <path transform="matrix(.53829 0 0 .25782 180.56 131.02)" d="m-167.47 40.487-33.655-58.292 67.31-2e-6z" stroke-width="7.1782"/>
        </g>
        <circle cx="39.194" cy="38.152" r="5.8969" class="notification-dot-inactive" id="direct-messages-icon-notification-dot"/>
    </svg>
</template>

<style scoped>
.icon-path {
    stroke: var(--background-tertiary);
}
.icon-path:hover {
    fill: var(--background-secondary);
}
.icon-path:active {
    stroke: var(--button-background-primary);
}
.notification-dot-inactive {
    fill: none;
}
</style>

<script>
export default {
    props: ["tabindex"],
    methods: {
        redirectToDirectMessagesPage() {
            this.$router.push({ name: "directMessages" });
        }
    }
}
</script>