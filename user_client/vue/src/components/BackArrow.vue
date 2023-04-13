<template>
<!-- Created with Inkscape (http://www.inkscape.org/) -->
<svg width="30mm" height="30mm" version="1.1" xmlns="http://www.w3.org/2000/svg" @click="returnToPreviousPage" @keyup.enter="returnToPreviousPage" :tabindex="tabindex" aria-label="Back to previous page">
 <g transform="translate(-30.329 -92.415)">
  <path class="arrow-path" transform="translate(-5.6774 -46.129)" d="m72.396 138.56a0.91654 0.91654 0 0 0-0.29921 0.10904l-35.632 20.572a0.91654 0.91654 0 0 0 0 1.5875l35.632 20.572a0.91654 0.91654 0 0 0 1.3746-0.79375v-8.6532h25.497a1.5875 1.5875 0 0 0 1.5875-1.5875v-19.802a1.5875 1.5875 0 0 0-1.5875-1.5875h-25.497v-9.5141a0.91654 0.91654 0 0 0-1.0754-0.90279z" stroke-width=".26458"/>
 </g>
</svg>

<!-- Old width and height width="64.55mm" height="42.977mm" "translate(-30.329 -92.415)" -->
</template>

<style scoped>
.arrow-path {
    fill: var(--background-tertiary);
}
.arrow-path:hover {
    fill: var(--background-secondary);
}
.arrow-path:active {
    fill: var(--button-background-primary);
}
</style>

<script>
    export default {
        props: {
            previousPage: String,
            tabindex: Number
        },
        methods: {
            returnToPreviousPage() {
                // If previousPage prop provided, use this as name of page to return to.  Otherwise use params.previousPage.
                let previousPage = this.previousPage ? 
                this.previousPage 
                : this.$route.params.previousPage;

                this.$router.push({ name: previousPage });
            }
        }
    }
</script>