import {
  createRouter,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import { defineAsyncComponent } from 'vue'

const lazy = (name) =>
  defineAsyncComponent(() => import(`../views/${name}.vue`))



const routes = [
  {
    path: '/',
    name: 'home',
    component: lazy('About'),
    meta: {
      title: 'Traffic Signal Kit',
      description: 'Home page listing available tools.',
    },
  },
  {
    path: '/about',
    name: 'About',
    component: lazy('About'),
    meta: {
      title: 'About',
      description: 'About Traffic Signal Kit.',
    },
  },
  {
    path: '/terms-of-service',
    name: 'TermsOfService',
    component: lazy('TermsOfService'),
    meta: {
      title: 'Terms of Service',
      description: 'Usage terms for the tools.',
    },
  },
  {
    path: '/split-calculator',
    name: 'SplitCalculator',
    component: lazy('SplitCalculator'),
    meta: {
      title: 'Split Calculator',
      description: 'Verify splits and cycle lengths.',
    },
  },
  {
    path: '/explainer',
    name: 'HighResDataExplainer',
    component: lazy('HighResDataExplainer'),
    meta: {
      title: 'High Res Data Explainer',
      description: 'Explore controller enumerations and logs.',
    },
  },
  {
    path: '/gpx',
    name: 'gpxPlotter',
    component: lazy('GPXPlotter'),
    meta: {
      title: 'GPX Plotter',
      description: 'Plot a GPX file in time-space.',
    },
  },
  {
    path: '/split-history',
    name: 'splitHistory',
    component: lazy('SplitHistory'),
    meta: {
      title: 'Split History',
      description: 'View phase durations from high-res data.',
    },
  },
  {
    path: '/traffic-simulator',
    name: 'trafficSim',
    component: lazy('TrafficSim'),
    meta: {
      title: 'Traffic Simulator',
      description: 'Simulate basic intersection timing.',
    },
  },
  {
    path: '/phase-plotter',
    name: 'phasePlotter',
    component: lazy('HighResPhasePlotter'),
    meta: {
      title: 'Phase Plotter',
      description: 'Plot phase state over time.',
    },
  },
  {
    path: '/gpx-phase-plotter',
    name: 'gpxPhasePlotter',
    component: lazy('GPXPhasePlotter'),
    meta: {
      title: 'GPX Phase Plotter',
      description: 'Combine GPX and phase state plots.',
    },
  },
  {
    path: '/gpx-mapper',
    name: 'gpxMapper',
    component: lazy('MapGPXPlotter'),
    meta: {
      title: 'GPX Mapper',
      description: 'Map GPX tracks on a leaflet map.',
    },
  },
  {
    path: '/detectorRLR',
    name: 'detectorRLR',
    component: lazy('HighResDetectors'),
    meta: {
      title: 'Red Light Runner',
      description: 'Table of RLR events.',
    },
  },
  {
    path: '/PracticeExam',
    name: 'practiceExam',
    component: lazy('PracticeExam'),
    meta: {
      title: 'Practice Exam',
      description: 'Practice exam questions and grading.',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: lazy('About'),
    meta: {
      title: 'Not Found',
      description: 'The page could not be found.',
    },
  },
    
     
    
]

const router = createRouter({
  history:
    import.meta.env.VITE_ROUTER_MODE === 'hash'
      ? createWebHashHistory()
      : createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
