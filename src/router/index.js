import { createRouter, createWebHistory } from 'vue-router'

import SplitCalculator from '../views/SplitCalculator'
import HighResDataExplainer from '../views/HighResDataExplainer'
import About from '../views/About'
import TermsOfService from '../views/TermsOfService'
import GPXPlotter from '../views/GPXPlotter'
import SplitHistory from '../views/SplitHistory'
import HighResPhasePlotter from '../views/HighResPhasePlotter'
import TrafficSim from '../views/TrafficSim'
import GPXPhasePlotter from '../views/GPXPhasePlotter'
import GPXMapper from '../views/MapGPXPlotter'
import GPXElevation from '../views/GPXElevation'
import HighResDetectors from '../views/HighResDetectors'
import PracticeExam from '../views/PracticeExam'
import HighResPreemptionPlotter from '../views/HighResPreemptionPlotter'



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
        path: '/gpx-phase-plotter',
        name: 'gpxPhasePlotter',
        component: GPXPhasePlotter,
    },
    {
        path: '/gpx-mapper',
        name: 'gpxMapper',
        component: GPXMapper,
    },
    {
        path: '/gpx-elevation',
        name: 'gpxElevation',
        component: GPXElevation,
    },
    {
        path: '/detectorRLR',
        name: 'detectorRLR',
        component: HighResDetectors,
    },
    {
        path: '/preemption-plotter',
        name: 'preemptionPlotter',
        component: HighResPreemptionPlotter,
    },
    {
        path: '/PracticeExam',
        name: 'practiceExam',
        component: PracticeExam,
    },
    {
        path: '/:pathMatch(.*)*',
        name: "not-found",
        component: About,
    },
    
     
    
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
})

export default router
