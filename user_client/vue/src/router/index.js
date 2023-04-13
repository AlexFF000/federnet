import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import WelcomeLogInView from '../views/WelcomeLogInView.vue'
import CreateAccountView from '../views/CreateAccountView.vue'
import SettingsView from '../views/SettingsView.vue'
import PostsView from '../views/PostsView.vue'
import FindCommunityView from '../views/FindCommunityView.vue';
import DirectMessagesView from '../views/DirectMessagesView.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      redirect: '/welcome',
      component: HomeView
    },
    {
      path: '/welcome',
      name: 'welcomeLogIn',
      component: WelcomeLogInView,
      meta: {
        title: "Federnet"
      }
    },
    {
      path: '/createAccount/:previousPage',
      name: 'createAccount',
      component: CreateAccountView,
      meta: {
        title: "Create Account"
      }
    },
    {
      path: '/settings/:previousPage',
      name: 'settings',
      component: SettingsView,
      meta: {
        title: "Federnet Settings"
      }
    },
    {
      path: '/findCommunity/:previousPage',
      name: 'findCommunity',
      component: FindCommunityView,
      meta: {
        title: "Find Federnet Community"
      }
    },
    {
      path: '/posts/:communityAddress?:communityName?',
      name: 'posts',
      component: PostsView,
      meta: {
        title: "Federnet"
      }
    },
    {
      path: '/messages',
      name: 'directMessages',
      component: DirectMessagesView,
      meta: {
        title: "Federnet Direct Messages"
      }
    }
  ]
})

router.beforeEach((to, from) => {
  // Set window title on navigating to a new page
  if (to.meta.title) {
    document.title = to.meta.title;
  }
})

export default router
