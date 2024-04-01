import {createRouter, createWebHistory} from 'vue-router'

import SplitCalculator from '../views/SplitCalculator'
import HighResDataExplainer from '../views/HighResDataExplainer'
import About from '../views/About'
import TermsOfService from '../views/TermsOfService'
import GPXPlotter from '../views/GPXPlotter'

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
    }

]

const router = createRouter({
    history: createWebHistory(process.env.BASE_URL), 
    routes
})

export default router