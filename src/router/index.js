import { createRouter, createWebHistory } from 'vue-router'
// Normalize legacy links before createWebHistory snapshots the initial location.
if (location.hash.startsWith('#/')) history.replaceState(null, '', location.hash.slice(1))
const router = createRouter({
  history: createWebHistory('/'),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
    { path: '/list', name: 'list', component: () => import('../views/QuestionListView.vue') },
    { path: '/q/:id(\\d+)', name: 'question', component: () => import('../views/QuestionDetailView.vue') },
    { path: '/favorites', name: 'favorites', component: () => import('../views/QuestionListView.vue') },
    { path: '/wrongbook', name: 'wrongbook', component: () => import('../views/QuestionListView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
export default router
