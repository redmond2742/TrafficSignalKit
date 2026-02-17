import { createRouter, createWebHistory } from 'vue-router'

import SplitCalculator from '../views/SplitCalculator'
import HighResDataExplainer from '../views/HighResDataExplainer'
import About from '../views/About'
import Home from '../views/Home'
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
import HighResEnumerationMatrix from '../views/HighResEnumerationMatrix'
import Reference from '../views/Reference'
import HighResDetectionPlotter from '../views/HighResDetectionPlotter'
import DelayEstimator from '../views/DelayEstimator'
import MessageSignDesigner from '../views/MessageSignDesigner'
import Blog from '../views/Blog'
import OffsetsAreThePoint from '../views/OffsetsAreThePoint'
import HighResDataExplainerPost from '../views/HighResDataExplainerPost'
import HighResSplitHistoryPost from '../views/HighResSplitHistoryPost'
import TimeseriesAllEnumerationsPost from '../views/TimeseriesAllEnumerationsPost'
import GPXMapperKnowledgeHubPost from '../views/GPXMapperKnowledgeHubPost'
import StuckDetectors from '../views/StuckDetectors'
import SignalOffsetCalculator from '../views/SignalOffsetCalculator'
import YellowRedRunning from '../views/YellowRedRunning'
import PedestrianInvestigator from '../views/PedestrianInvestigator'
import Dashboard from '../views/Dashboard'
import VideoFrameExtractor from '../views/VideoFrameExtractor'
import HighResPhaseStartTable from '../views/HighResPhaseStartTable'
import PatternCalendar from '../views/PatternCalendar'
import BasicTimingSeeker from '../views/BasicTimingSeeker'
import StartUpLossAverage from '../views/StartUpLossAverage'
import TimeToReduce from '../views/TimeToReduce'
import SkippedPhaseFinder from '../views/SkippedPhaseFinder'
import TrafficSignalCabinetPMScheduler from '../views/TrafficSignalCabinetPMScheduler'
import PhaseBubblePlot from '../views/PhaseBubblePlot'
import SplitFailureChecker from '../views/SplitFailureChecker'
import DetectorEventHeatMap from '../views/DetectorEventHeatMap'
import GapOutGapReductionHelper from '../views/GapOutGapReductionHelper'





const routes = [
    {
        path: '/',
        name: 'home',
        component: Home
    },
    {
        path: '/about',
        name: 'About',
        component: About
    },
    {
        path: '/blog',
        name: 'Blog',
        component: Blog
    },
    {
        path: '/blog/offsets-are-the-point',
        name: 'OffsetsAreThePoint',
        component: OffsetsAreThePoint,
    },
    {
        path: '/blog/high-resolution-data-explainer',
        name: 'HighResDataExplainerPost',
        component: HighResDataExplainerPost,
    },
    {
        path: '/blog/high-resolution-split-history',
        name: 'HighResSplitHistoryPost',
        component: HighResSplitHistoryPost,
    },
    {
        path: '/blog/timeseries-plot-all-enumerations',
        name: 'TimeseriesAllEnumerationsPost',
        component: TimeseriesAllEnumerationsPost,
    },
    {
        path: '/blog/gpx-mapper-guide',
        name: 'GPXMapperKnowledgeHubPost',
        component: GPXMapperKnowledgeHubPost,
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
        path: '/enumeration-matrix',
        name: 'enumerationMatrix',
        component: HighResEnumerationMatrix,
    },
    {
        path: '/detection-plotter',
        name: 'detectionPlotter',
        component: HighResDetectionPlotter,
    },
    {
        path: '/phase-bubble-plot',
        name: 'phaseBubblePlot',
        component: PhaseBubblePlot,
    },
    {
        path: '/delay-estimator',
        name: 'delayEstimator',
        component: DelayEstimator,
    },
    {
        path: '/yellow-red-running',
        name: 'yellowRedRunning',
        component: YellowRedRunning,
    },
    {
        path: '/stuck-detectors',
        name: 'stuckDetectors',
        component: StuckDetectors,
    },
    {
        path: '/signal-offsets',
        name: 'signalOffsets',
        component: SignalOffsetCalculator,
    },
    {
        path: '/pedestrian-investigator',
        name: 'pedestrianInvestigator',
        component: PedestrianInvestigator,
    },
    {
        path: '/dashboard',
        name: 'dashboard',
        component: Dashboard,
    },
    {
        path: '/practice-exam',
        name: 'practiceExam',
        component: PracticeExam,
    },
    {
        path: '/video-frame-extractor',
        name: 'videoFrameExtractor',
        component: VideoFrameExtractor,
    },
    {
        path: '/phase-start-table',
        name: 'phaseStartTable',
        component: HighResPhaseStartTable,
    },
    {
        path: '/message-sign-designer',
        name: 'messageSignDesigner',
        component: MessageSignDesigner,
    },
    {
        path: '/pattern-calendar',
        name: 'patternCalendar',
        component: PatternCalendar,
    },
    {
        path: '/basic-timing-seeker',
        name: 'basicTimingSeeker',
        component: BasicTimingSeeker,
    },
    {
        path: '/startup-loss-average',
        name: 'startUpLossAverage',
        component: StartUpLossAverage,
    },
    {
        path: '/time-to-reduce',
        name: 'timeToReduce',
        component: TimeToReduce,
    },
    {
        path: '/skipped-phase-finder',
        name: 'skippedPhaseFinder',
        component: SkippedPhaseFinder,
    },
    {
        path: '/split-failure-checker',
        name: 'splitFailureChecker',
        component: SplitFailureChecker,
    },
    {
        path: '/detector-event-heat-map',
        name: 'detectorEventHeatMap',
        component: DetectorEventHeatMap,
    },

    {
        path: '/gap-out-gap-reduction-helper',
        name: 'gapOutGapReductionHelper',
        component: GapOutGapReductionHelper,
    },
    {
        path: '/cabinet-pm-scheduler',
        name: 'cabinetPMScheduler',
        component: TrafficSignalCabinetPMScheduler,
    },
    {
        path: '/PracticeExam',
        redirect: '/practice-exam',
    },
    {
        path: '/practiceExam',
        redirect: '/practice-exam',
    },
    {
        path: '/reference',
        name: 'Reference',
        component: Reference,
    },
    {
        path: '/:pathMatch(.*)*',
        name: "not-found",
        component: About,
    },
    
     
    
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router
