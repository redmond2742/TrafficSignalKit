import {createRouter, createWebHistory} from 'vue-router'

import SplitCalculator from '../views/SplitCalculator'
import HighResDataExplainer from '../views/HighResDataExplainer'
import About from '../views/About'
import TermsOfService from '../views/TermsOfService'
import GPXPlotter from '../views/GPXPlotter'
import SplitHistory from '../views/SplitHistory'
import HighResPhasePlotter from '../views/HighResPhasePlotter'
import TrafficSim from '../views/TrafficSim'

const routes = [
    {
        path: '/',
        name: 'home',
        component: About
    },
    {
        path: '/about',
        name: 'About',
        component: About
    },
    {  
        path: '/terms-of-service',
        name: 'TermsOfService',
        component: TermsOfService, 
    },
    {
        path: '/split-calculator',
        name: 'SplitCalculator',
        component: SplitCalculator,
    },
    {
        path: '/explainer',
        name: 'HighResDataExplainer',
        component: HighResDataExplainer,
    },
    {
        path: '/gpx',
        name: 'gpxPlotter',
        component: GPXPlotter,
    },
    {
        path: '/split-history',
        name: 'splitHistory',
        component: SplitHistory,
    },
    {
        path: '/traffic-simulator',
        name: 'trafficSim',
        component: TrafficSim,
    },
    {
        path: '/phase-plotter',
        name: 'phasePlotter',
        component: HighResPhasePlotter,
    },
    {
        path: '/:pathMatch(.*)*',
        name: "not-found",
        component: About,
    }
]

const router = createRouter({
    history: createWebHistory(process.env.BASE_URL), 
    routes
})

export default router