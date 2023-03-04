import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import WelcomeLogInView from '../views/WelcomeLogInView.vue'
import CreateAccountView from '../views/CreateAccountView.vue'

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
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue')
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
