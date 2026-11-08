import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../types';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  fontSize: 'normal' | 'large';
  setFontSize: (size: 'normal' | 'large') => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Brand & Nav
    appTitle: 'MandiSaathi',
    appSubtitle: 'Agricultural Intelligence Platform for Indian Farmers',
    phase2Badge: 'Production Agritech',
    navHome: 'Dashboard',
    navVoice: 'Voice Assistant',
    navPrices: 'Price Intelligence',
    navCompare: 'Mandi Comparison',
    navSchemes: 'Government Schemes',
    navComplaints: 'Grievance / Complaint',
    navSettings: 'Accessibility & Language',
    connected: 'Connected',
    degraded: 'Degraded',
    offline: 'Offline',

    // Dashboard
    greetingMorning: 'Good morning, Kisan Saathi',
    greetingAfternoon: 'Good afternoon, Kisan Saathi',
    greetingEvening: 'Good evening, Kisan Saathi',
    dashboardWelcome: 'Voice-First Agricultural Market Intelligence',
    dashboardHeroSubtitle: 'Speak naturally in Hindi, Punjabi, or English to check verified APMC mandi prices, compare neighboring markets, and explore farmer schemes.',
    startVoicePrompt: 'Tap microphone or speak your question',
    suggestedQueriesLabel: 'Common farmer questions',
    nearbyMandisTitle: 'Monitored APMC Mandis',
    recentQueriesTitle: 'Recent Voice Queries',
    noRecentQueries: 'No recent voice queries recorded yet. Tap the microphone to begin.',
    clearRecent: 'Clear History',
    marketBriefTitle: 'Market Advisory & Provenance Notice',
    marketBriefText: 'MandiSaathi provides strictly verified price telemetry sourced from Agmarknet and State Agricultural Marketing Boards. We never fabricate live prices or simulate fictitious market bids.',
    quickStatsCommodities: 'Tracked Commodities',
    quickStatsMandis: 'Monitored Mandis',
    quickStatsSchemes: 'Verified Schemes',

    // Voice Assistant
    voiceTitle: 'Voice Assistant',
    voiceSubtitle: 'Speak in your native dialect for real-time agricultural intelligence',
    micIdle: 'Tap to Speak',
    micListening: 'Listening to your voice...',
    micRecording: 'Recording audio stream...',
    micTranscribing: 'Transcribing voice with Gnani Prisma STT...',
    micProcessing: 'Processing query with Gnani AI Gateway...',
    micGeneratingAudio: 'Synthesizing voice with Gnani Timbre TTS...',
    micPermissionError: 'Microphone permission denied by browser. Please allow audio access in browser settings.',
    permissionDeniedTitle: 'Microphone Access Required',
    permissionDeniedGuide: 'Please allow microphone access in your browser to speak directly to MandiSaathi. You can also use the text input below.',
    typeQueryPlaceholder: 'Or type your agricultural question here (e.g. आज गेहूं का भाव क्या है?)...',
    sendTextQuery: 'Ask MandiSaathi',
    detectedLanguageLabel: 'Detected Dialect',
    transcriptionLabel: 'Your Query (STT)',
    responseLabel: 'MandiSaathi Response',
    intentLabel: 'Identified Intent',
    extractedEntitiesLabel: 'Detected Entities',
    mandiRateCardTitle: 'Verified APMC Auction Rates',
    dataSyncButton: 'Sync Agmarknet',
    dataSyncSuccess: 'Agmarknet Data Updated',
    dataSyncInProgress: 'Syncing with data.gov.in...',
    audioSourceGnani: 'Gnani Timbre Voice',
    audioSourceSandbox: 'Local Sandbox Synthetic Audio',
    audioSourceBrowser: 'Browser Speech Synthesis (Fallback)',
    listenAudio: 'Listen Response',
    stopAudio: 'Stop Audio',
    tryAgain: 'Ask Another Question',
    gnaniNoticeTitle: 'Voice Engine Integration Boundary',
    gnaniDemoBadge: 'Gnani v2.5 Sandbox / Demo Mode',
    gnaniNoticeText: 'Gnani Prisma v2.5 (STT) and Timbre v2.5 (TTS) backend interfaces are active. Live production API keys are securely guarded server-side.',

    // Price Intelligence
    priceTitle: 'Mandi Price Intelligence',
    priceSubtitle: 'Verified daily arrival and modal rates reported by APMC Mandis',
    selectCommodity: 'Select Commodity',
    selectState: 'Select State',
    selectDistrict: 'Select District',
    selectMandi: 'Select Mandi',
    allCommodities: 'All Commodities',
    allStates: 'All States',
    allDistricts: 'All Districts',
    allMandis: 'All Mandis',
    filterReset: 'Reset Filters',
    modalPrice: 'Modal Price',
    minPrice: 'Min Price',
    maxPrice: 'Max Price',
    priceSpread: 'Price Range',
    reportingDate: 'Reporting Date',
    dataSource: 'Data Source',
    arrivals: 'Arrival Volume',
    perQuintal: '₹ / Quintal',
    noPriceData: 'No price record has been filed for this commodity and mandi selection today.',
    noPriceNotice: 'Prices are reported after the close of trading auctions. Check back after 4:00 PM for updated evening filings.',
    mspReferenceNotice: 'MSP Benchmark Reference: Governed by the Commission for Agricultural Costs and Prices (CACP), Government of India.',

    // Mandi Comparison
    compareTitle: 'Mandi Price Comparison',
    compareSubtitle: 'Compare market rates across neighboring APMC mandis to optimize your harvest sale',
    pickCommodityToCompare: 'Choose Commodity to Compare',
    selectTwoMandisNotice: 'Select at least two mandis to view cross-market spread and chart comparison.',
    bestRateBadge: 'Best Modal Rate',
    differenceSpread: 'Inter-Mandi Spread',
    priceTrendChart: 'Multi-Mandi Price Comparison',
    historicalNote: 'Comparing verified modal prices (₹/qtl) across selected APMC markets.',

    // Government Schemes
    schemesTitle: 'Government Schemes Directory',
    schemesSubtitle: 'Verified central and state agricultural support schemes with direct application pathways',
    searchSchemesPlaceholder: 'Search by scheme name or keyword (e.g. PM-KISAN, बीमा, subsidy)...',
    allCategories: 'All Categories',
    catIncome: 'Income Support',
    catInsurance: 'Crop Insurance',
    catSoil: 'Soil Health & Inputs',
    catMarket: 'Market Infrastructure',
    catCredit: 'Institutional Credit',
    schemeEligibility: 'Eligibility Criteria',
    schemeDocuments: 'Required Documents',
    schemeApplication: 'How to Apply',
    officialPortalBtn: 'Visit Official Portal',
    verifiedOn: 'Verified through',

    // Complaint Registration
    complaintsTitle: 'Farmer Grievance & Mandi Complaint',
    complaintsSubtitle: 'Record issues regarding weighing inaccuracies, payment delays, or mandi infrastructure',
    complaintCategory: 'Grievance Category',
    catWeighment: 'Weighment Disparity / Malpractice (वजन में गड़बड़ी)',
    catPayment: 'Delayed Payment / Below MSP Purchase (भुगतान में देरी)',
    catInfra: 'Mandi Infrastructure / Water / Shed Shortage (मंडी अवसंरचना)',
    catDeductions: 'Unauthorized Market Fee Deductions (अवैध कटौती)',
    catQuality: 'Produce Quality Grading Dispute (गुणवत्ता विवाद)',
    descriptionLabel: 'Description of the Issue',
    descriptionPlaceholder: 'Provide specific details (date, auction lot number, trader name, or platform issue)...',
    farmerNameLabel: 'Farmer Name (Optional)',
    farmerPhoneLabel: 'Contact Phone Number (Optional)',
    reviewBtn: 'Review Complaint Before Submitting',
    confirmSubmitBtn: 'Confirm & Record Complaint',
    backToEditBtn: 'Back to Edit',
    reviewNotice: 'Please verify the details below. Once recorded, an internal reference number will be issued.',
    complaintSuccessTitle: 'Complaint Successfully Recorded',
    complaintRefNotice: 'Your grievance reference number is:',
    complaintLegalDisclaimer: 'Notice: This complaint is recorded in the MandiSaathi platform database for transparency and collective farmer advocacy. To register an official statutory complaint with government vigilance, use the CPGRAMS portal (pgportal.gov.in) or state APMC vigilance helpline.',
    registeredComplaintsTitle: 'Your Recorded Complaints',
    noComplaintsRecorded: 'No complaints recorded yet.',
    statusRecorded: 'Recorded in MandiSaathi',

    // Settings & Accessibility
    settingsTitle: 'Language & Accessibility Settings',
    settingsSubtitle: 'Configure language, dialect rendering, and visual legibility for comfortable viewing',
    languageSectionTitle: 'Interface Language',
    languageDesc: 'Choose your preferred language. All screen content, voice prompts, and error notices will render in this script.',
    fontSizeTitle: 'Text Size Accessibility',
    fontSizeDesc: 'Enlarge text for improved readability in outdoor sunlight and for senior farmers.',
    fontNormal: 'Standard Text Size (Default)',
    fontLarge: 'Large Text Size (High Visibility)',
    systemArchitecturePreview: 'System Architecture & Data Governance',

    // Common
    loading: 'Fetching verified agricultural data...',
    error: 'Error loading data',
    retry: 'Retry',
    close: 'Close',
    details: 'View Details',
    footerNotice: 'MandiSaathi — Production Agritech Foundation. Governed by authentic data provenance.',

    // Phase 4B: PWA & Offline
    liveFeedBadge: 'Live APMC Feed',
    offlineCachedBadge: 'Offline Cached Mode',
    staleDataWarning: 'Stale Data Warning (>24 hrs)',
    reportingDateLabel: 'Auction Reporting Date',
    lastSyncedLabel: 'Last Synchronized',
    offlineBannerText: 'You are currently offline. Showing local cached mandi rates.',
    offlineVoiceNotice: 'Voice recognition (STT) and voice responses (TTS) require an active internet connection.',
    offlineNoDataMsg: 'No offline cached prices available for this selection. Connect to the internet to update your local feed.',
    installAppTitle: 'Install MandiSaathi',
    installAppSubtitle: 'Install on your device for fast access and offline price discovery in the field.',
    installBtnText: 'Install App',
    dismissBtnText: 'Dismiss',
    syncStatusSchedule: 'Nightly Sync Schedule',
    syncStatusCron: 'Cron Schedule (IST)',
  },
  hi: {
    // Brand & Nav
    appTitle: 'मंडी साथी',
    appSubtitle: 'भारतीय किसानों के लिए कृषि बाज़ार आसूचना मंच',
    phase2Badge: 'प्रमाणित कृषि मंच',
    navHome: 'डैशबोर्ड',
    navVoice: 'वॉयस असिस्टेंट',
    navPrices: 'मंडी भाव',
    navCompare: 'मंडी तुलना',
    navSchemes: 'सरकारी योजनाएं',
    navComplaints: 'किसान शिकायत',
    navSettings: 'भाषा एवं सुगमता',
    connected: 'सक्रिय (Connected)',
    degraded: 'आंशिक (Degraded)',
    offline: 'ऑफलाइन (Offline)',

    // Dashboard
    greetingMorning: 'राम राम, किसान साथी',
    greetingAfternoon: 'नमस्ते, किसान साथी',
    greetingEvening: 'शुभ संध्या, किसान साथी',
    dashboardWelcome: 'आवाज़ द्वारा कृषि बाज़ार आसूचना',
    dashboardHeroSubtitle: 'हिन्दी, पंजाबी या अंग्रेज़ी में बोलकर अपनी नजदीकी कृषि मंडियों के सत्यापित भाव जानें, बाज़ारों की तुलना करें और सरकारी योजनाओं की जानकारी पाएं।',
    startVoicePrompt: 'माइक दबाकर अपना प्रश्न पूछें',
    suggestedQueriesLabel: 'किसानों के मुख्य प्रश्न',
    nearbyMandisTitle: 'प्रमुख कृषि मंडियां',
    recentQueriesTitle: 'हाल के वॉयस प्रश्न',
    noRecentQueries: 'अभी तक कोई पिछला प्रश्न दर्ज नहीं है। पूछने के लिए माइक दबाएं।',
    clearRecent: 'इतिहास साफ़ करें',
    marketBriefTitle: 'बाज़ार सलाह एवं डेटा सत्यता',
    marketBriefText: 'मंडी साथी पर प्रदर्शित सभी भाव भारत सरकार के एगमार्कनेट (Agmarknet) एवं राज्य कृषि विपणन बोर्डों से सत्यापित हैं। हम कोई कृत्रिम भाव नहीं दिखाते।',
    quickStatsCommodities: 'सत्यापित फसलें',
    quickStatsMandis: 'निगरानीकृत मंडियां',
    quickStatsSchemes: 'प्रमुख योजनाएं',

    // Voice Assistant
    voiceTitle: 'वॉयस असिस्टेंट (बोलकर पूछें)',
    voiceSubtitle: 'अपनी मातृभाषा में सहजता से बोलें और तुरंत बाज़ार जानकारी पाएं',
    micIdle: 'बोलने के लिए दबाएं',
    micListening: 'आपकी आवाज़ सुनी जा रही है...',
    micRecording: 'ऑडियो रिकॉर्ड हो रहा है...',
    micTranscribing: 'ज्ञानी प्रिज्मा STT द्वारा ध्वनि को शब्दों में बदला जा रहा है...',
    micProcessing: 'ज्ञानी वॉयस गेटवे द्वारा विश्लेषण जारी है...',
    micGeneratingAudio: 'ज्ञानी टिम्ब्रे TTS द्वारा ध्वनि उत्तर तैयार किया जा रहा है...',
    micPermissionError: 'ब्राउज़र में माइक्रोफ़ोन की अनुमति अस्वीकृत है। कृपया सेटिंग्स में अनुमति दें।',
    permissionDeniedTitle: 'माइक्रोफ़ोन अनुमति आवश्यक है',
    permissionDeniedGuide: 'कृपया मंडी साथी से बोलकर पूछने के लिए अपने ब्राउज़र में माइक्रोफ़ोन की अनुमति दें। आप नीचे दिए गए बॉक्स में लिखकर भी प्रश्न पूछ सकते हैं।',
    typeQueryPlaceholder: 'या यहाँ टाइप करके पूछें (उदा. आज गेहूं का भाव क्या है?)...',
    sendTextQuery: 'पूछें',
    detectedLanguageLabel: 'पहचानी गई भाषा',
    transcriptionLabel: 'आपका प्रश्न (ऑडियो से टेक्स्ट)',
    responseLabel: 'मंडी साथी का उत्तर',
    intentLabel: 'पहचाना गया विषय',
    extractedEntitiesLabel: 'पहचानी गई कृषि जानकारी',
    mandiRateCardTitle: 'सत्यापित एपीएमसी मंडी नीलामी भाव',
    dataSyncButton: 'एगमार्कनेट डेटा सिंक करें',
    dataSyncSuccess: 'एगमार्कनेट मंडी भाव सफलतापूर्वक अपडेट हुए',
    dataSyncInProgress: 'data.gov.in से डेटा लाया जा रहा है...',
    audioSourceGnani: 'ज्ञानी टिम्ब्रे ध्वनि',
    audioSourceSandbox: 'स्थानीय सैंडबॉक्स ऑडियो',
    audioSourceBrowser: 'ब्राउज़र स्पीच सिंथेसिस (फ़ॉलबैक)',
    listenAudio: 'उत्तर सुनें',
    stopAudio: 'आवाज़ रोकें',
    tryAgain: 'नया प्रश्न पूछें',
    gnaniNoticeTitle: 'वॉयस इंजन एकीकरण स्थिति',
    gnaniDemoBadge: 'ज्ञानी v2.5 सैंडबॉक्स / विकास मोड',
    gnaniNoticeText: 'ज्ञानी प्रिज्मा v2.5 (STT) एवं टिम्ब्रे v2.5 (TTS) बैकएंड अनुबंध सक्रिय हैं। सुरक्षा कारणों से लाइव क्रेडेंशियल सर्वर पर सुरक्षित हैं।',

    // Price Intelligence
    priceTitle: 'मंडी भाव आसूचना',
    priceSubtitle: 'एपीएमसी मंडियों द्वारा दैनिक नीलामी के बाद दर्ज आधिकारिक मॉडल एवं न्यूनतम-अधिकतम भाव',
    selectCommodity: 'फसल चुनें',
    selectState: 'राज्य चुनें',
    selectDistrict: 'जिला चुनें',
    selectMandi: 'मंडी चुनें',
    allCommodities: 'सभी फसलें',
    allStates: 'सभी राज्य',
    allDistricts: 'सभी जिले',
    allMandis: 'सभी मंडियां',
    filterReset: 'फ़िल्टर हटाएं',
    modalPrice: 'मॉडल भाव',
    minPrice: 'न्यूनतम भाव',
    maxPrice: 'अधिकतम भाव',
    priceSpread: 'भाव का अंतर',
    reportingDate: 'रिपोर्टिंग दिनांक',
    dataSource: 'डेटा स्रोत',
    arrivals: 'कुल आवक',
    perQuintal: '₹ / क्विंटल',
    noPriceData: 'चुनी गई फसल और मंडी के लिए आज का भाव अभी दर्ज नहीं हुआ है।',
    noPriceNotice: 'मंडी में दैनिक नीलामी समाप्त होने के बाद शाम 4:00 बजे भाव अपडेट किए जाते हैं।',
    mspReferenceNotice: 'एमएसपी संदर्भ: कृषि लागत एवं मूल्य आयोग (CACP), भारत सरकार द्वारा निर्धारित न्यूनतम समर्थन मूल्य।',

    // Mandi Comparison
    compareTitle: 'मंडियों की तुलना',
    compareSubtitle: 'आसपास की मंडियों के भावों की तुलना करके अपनी उपज का सर्वोत्तम मूल्य प्राप्त करें',
    pickCommodityToCompare: 'तुलना के लिए फसल चुनें',
    selectTwoMandisNotice: 'तुलना देखने के लिए कम से कम दो मंडियों का चयन करें।',
    bestRateBadge: 'सर्वोत्तम मॉडल भाव',
    differenceSpread: 'मंडियों में भाव का अंतर',
    priceTrendChart: 'मंडी भाव तुलनात्मक चार्ट',
    historicalNote: 'सत्यापित मॉडल भावों (₹/क्विंटल) की तुलना।',

    // Government Schemes
    schemesTitle: 'सरकारी कृषि योजनाएं',
    schemesSubtitle: 'किसानों के लिए प्रमाणित केंद्रीय एवं राज्य योजनाएं, पात्रता एवं आवेदन प्रक्रिया',
    searchSchemesPlaceholder: 'योजना का नाम या विषय खोजें (उदा. पीएम-किसान, फसल बीमा, केसीसी)...',
    allCategories: 'सभी श्रेणियां',
    catIncome: 'आय सहायता',
    catInsurance: 'फसल बीमा',
    catSoil: 'मृदा स्वास्थ्य एवं खाद',
    catMarket: 'बाज़ार अवसंरचना',
    catCredit: 'संस्थागत ऋण',
    schemeEligibility: 'पात्रता की शर्तें',
    schemeDocuments: 'आवश्यक दस्तावेज़',
    schemeApplication: 'आवेदन कैसे करें',
    officialPortalBtn: 'आधिकारिक पोर्टल पर जाएं',
    verifiedOn: 'सत्यापित स्रोत',

    // Complaint Registration
    complaintsTitle: 'किसान शिकायत एवं मंडी समस्या',
    complaintsSubtitle: 'मंडी में तौल में गड़बड़ी, भुगतान में देरी या बुनियादी समस्याओं की रिपोर्ट दर्ज करें',
    complaintCategory: 'शिकायत की श्रेणी',
    catWeighment: 'वजन में गड़बड़ी / अनियमितता',
    catPayment: 'भुगतान में देरी / एमएसपी से कम खरीद',
    catInfra: 'मंडी शेड, पेयजल या सड़क की कमी',
    catDeductions: 'अवैध आढ़त या शुल्क कटौती',
    catQuality: 'फसल गुणवत्ता ग्रेड विवाद',
    descriptionLabel: 'समस्या का पूरा विवरण',
    descriptionPlaceholder: 'कृपया तारीख, लॉट नंबर, आढ़ती का नाम या विशिष्ट समस्या लिखें...',
    farmerNameLabel: 'किसान का नाम (वैकल्पिक)',
    farmerPhoneLabel: 'मोबाइल नंबर (वैकल्पिक)',
    reviewBtn: 'दर्ज करने से पहले समीक्षा करें',
    confirmSubmitBtn: 'पुष्टि करें और शिकायत दर्ज करें',
    backToEditBtn: 'वापस सुधारें',
    reviewNotice: 'कृपया विवरण की जांच कर लें। इसके बाद आपको एक संदर्भ संख्या दी जाएगी।',
    complaintSuccessTitle: 'शिकायत सफलतापूर्वक दर्ज हुई',
    complaintRefNotice: 'आपकी शिकायत संदर्भ संख्या है:',
    complaintLegalDisclaimer: 'सूचना: यह शिकायत मंडी साथी प्लेटफॉर्म में पारदर्शिता हेतु दर्ज की गई है। सरकारी सतर्कता हेतु सीधे pgportal.gov.in (CPGRAMS) का उपयोग करें।',
    registeredComplaintsTitle: 'आपकी दर्ज शिकायतें',
    noComplaintsRecorded: 'अभी तक कोई शिकायत दर्ज नहीं है।',
    statusRecorded: 'मंडी साथी में दर्ज',

    // Settings & Accessibility
    settingsTitle: 'भाषा एवं सुगमता सेटिंग्स',
    settingsSubtitle: 'अपनी सुविधा के अनुसार भाषा और अक्षर का आकार (Font Size) चुनें',
    languageSectionTitle: 'इंटरफ़ेस भाषा',
    languageDesc: 'अपनी मनपसंद भाषा चुनें। पूरी वेबसाइट उसी भाषा में प्रदर्शित होगी।',
    fontSizeTitle: 'अक्षर का आकार (Text Size)',
    fontSizeDesc: 'धूप में या पढ़ने में आसानी के लिए अक्षरों का आकार बड़ा करें।',
    fontNormal: 'सामान्य आकार (Standard)',
    fontLarge: 'बड़ा आकार (High Visibility)',
    systemArchitecturePreview: 'सिस्टम आर्किटेक्चर एवं डेटा नियम',

    // Common
    loading: 'डेटा लोड हो रहा है...',
    error: 'डेटा लोड करने में त्रुटि',
    retry: 'पुनः प्रयास करें',
    close: 'बंद करें',
    details: 'विवरण देखें',
    footerNotice: 'मंडी साथी — किसानों के लिए प्रमाणित कृषि मंच।',

    // Phase 4B: PWA & Offline
    liveFeedBadge: 'ताज़ा एपीएमसी भाव',
    offlineCachedBadge: 'ऑफ़लाइन सहेजा गया डेटा',
    staleDataWarning: 'पुराना डेटा चेतावनी (>24 घंटे)',
    reportingDateLabel: 'नीलामी रिपोर्टिंग तिथि',
    lastSyncedLabel: 'अंतिम सिंक्रनाइज़ेशन',
    offlineBannerText: 'आप वर्तमान में ऑफ़लाइन हैं। पहले सहेजे गए स्थानीय मंडी भाव दिखाए जा रहे हैं।',
    offlineVoiceNotice: 'वॉयस असिस्टेंट (बोलकर पूछना) के लिए सक्रिय इंटरनेट कनेक्शन आवश्यक है।',
    offlineNoDataMsg: 'इस चयन के लिए कोई ऑफ़लाइन डेटा उपलब्ध नहीं है। स्थानीय डेटा अपडेट करने के लिए इंटरनेट से कनेक्ट करें।',
    installAppTitle: 'मंडी साथी ऐप इंस्टॉल करें',
    installAppSubtitle: 'खेत में बिना रुकावट और ऑफ़लाइन भाव देखने के लिए अपने फ़ोन पर MandiSaathi इंस्टॉल करें।',
    installBtnText: 'ऐप इंस्टॉल करें',
    dismissBtnText: 'हटाएं',
    syncStatusSchedule: 'दैनिक सिंक्रनाइज़ेशन अनुसूची',
    syncStatusCron: 'क्रॉन शेड्यूल (भारतीय समय)',
  },
  pa: {
    // Brand & Nav
    appTitle: 'ਮੰਡੀ ਸਾਥੀ',
    appSubtitle: 'ਭਾਰਤੀ ਕਿਸਾਨਾਂ ਲਈ ਖੇਤੀਬਾੜੀ ਮੰਡੀ ਜਾਣਕਾਰੀ ਪਲੇਟਫਾਰਮ',
    phase2Badge: 'ਪ੍ਰਮਾਣਿਤ ਖੇਤੀ ਮੰਚ',
    navHome: 'ਡੈਸ਼ਬੋਰਡ',
    navVoice: 'ਵੌਇਸ ਅਸਿਸਟੈਂਟ',
    navPrices: 'ਮੰਡੀ ਦੇ ਭਾਅ',
    navCompare: 'ਮੰਡੀਆਂ ਦੀ ਤੁਲਨਾ',
    navSchemes: 'ਸਰਕਾਰੀ ਸਕੀਮਾਂ',
    navComplaints: 'ਕਿਸਾਨ ਸ਼ਿਕਾਇਤ',
    navSettings: 'ਭਾਸ਼ਾ ਅਤੇ ਸੈਟਿੰਗਜ਼',
    connected: 'ਸਰਗਰਮ (Connected)',
    degraded: 'ਅੰਸ਼ਕ (Degraded)',
    offline: 'ਆਫਲਾਈਨ (Offline)',

    // Dashboard
    greetingMorning: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਕਿਸਾਨ ਸਾਥੀ',
    greetingAfternoon: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਕਿਸਾਨ ਸਾਥੀ',
    greetingEvening: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਕਿਸਾਨ ਸਾਥੀ',
    dashboardWelcome: 'ਆਵਾਜ਼ ਰਾਹੀਂ ਖੇਤੀਬਾੜੀ ਮੰਡੀ ਜਾਣਕਾਰੀ',
    dashboardHeroSubtitle: 'ਪੰਜਾਬੀ, ਹਿੰਦੀ ਜਾਂ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਬੋਲ ਕੇ ਆਪਣੀ ਨੇੜਲੀ ਮੰਡੀ ਦੇ ਪ੍ਰਮਾਣਿਤ ਭਾਅ ਜਾਣੋ ਅਤੇ ਸਰਕਾਰੀ ਸਕੀਮਾਂ ਬਾਰੇ ਪਤਾ ਕਰੋ।',
    startVoicePrompt: 'ਮਾਈਕ ਦਬਾ ਕੇ ਸਵਾਲ ਪੁੱਛੋ',
    suggestedQueriesLabel: 'ਕਿਸਾਨਾਂ ਦੇ ਮੁੱਖ ਸਵਾਲ',
    nearbyMandisTitle: 'ਮੁੱਖ ਖੇਤੀ ਮੰਡੀਆਂ',
    recentQueriesTitle: 'ਪਿਛਲੇ ਸਵਾਲ',
    noRecentQueries: 'ਅਜੇ ਕੋਈ ਪਿਛਲਾ ਸਵਾਲ ਨਹੀਂ ਹੈ। ਪੁੱਛਣ ਲਈ ਮਾਈਕ ਦਬਾਓ।',
    clearRecent: 'ਸਾਫ਼ ਕਰੋ',
    marketBriefTitle: 'ਮੰਡੀ ਸਲਾਹ ਅਤੇ ਜਾਣਕਾਰੀ',
    marketBriefText: 'ਮੰਡੀ ਸਾਥੀ ਤੇ ਦਿਖਾਏ ਗਏ ਸਾਰੇ ਭਾਅ ਐਗਮਾਰਕਨੈੱਟ ਅਤੇ ਮੰਡੀ ਬੋਰਡਾਂ ਤੋਂ ਪ੍ਰਮਾਣਿਤ ਹਨ। ਕੋਈ ਨਕਲੀ ਭਾਅ ਨਹੀਂ ਦਿਖਾਇਆ ਜਾਂਦਾ।',
    quickStatsCommodities: 'ਦਰਜ ਫ਼ਸਲਾਂ',
    quickStatsMandis: 'ਸਰਗਰਮ ਮੰਡੀਆਂ',
    quickStatsSchemes: 'ਸਰਕਾਰੀ ਸਕੀਮਾਂ',

    // Voice Assistant
    voiceTitle: 'ਵੌਇਸ ਅਸਿਸਟੈਂਟ (ਬੋਲ ਕੇ ਪੁੱਛੋ)',
    voiceSubtitle: 'ਆਪਣੀ ਮਾਂ-ਬੋਲੀ ਵਿੱਚ ਸਹਿਜਤਾ ਨਾਲ ਬੋਲੋ ਅਤੇ ਤੁਰੰਤ ਜਾਣਕਾਰੀ ਲਵੋ',
    micIdle: 'ਬੋਲਣ ਲਈ ਦਬਾਓ',
    micListening: 'ਤੁਹਾਡੀ ਆਵਾਜ਼ ਸੁਣੀ ਜਾ ਰਹੀ ਹੈ...',
    micRecording: 'ਆਡੀਓ ਰਿਕਾਰਡ ਹੋ ਰਹੀ ਹੈ...',
    micTranscribing: 'ਗਿਆਨੀ ਪ੍ਰਿਜ਼ਮਾ STT ਦੁਆਰਾ ਆਵਾਜ਼ ਨੂੰ ਲਿਖਤ ਵਿੱਚ ਬਦਲਿਆ ਜਾ ਰਿਹਾ ਹੈ...',
    micProcessing: 'ਗਿਆਨੀ ਏਆਈ ਵੱਲੋਂ ਜਾਂਚ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ...',
    micGeneratingAudio: 'ਗਿਆਨੀ ਟਿੰਬਰੇ TTS ਦੁਆਰਾ ਬੋਲਣ ਵਾਲਾ ਉੱਤਰ ਤਿਆਰ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ...',
    micPermissionError: 'ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਮਾਈਕ੍ਰੋਫੋਨ ਦੀ ਇਜਾਜ਼ਤ ਨਹੀਂ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਸੈਟਿੰਗਜ਼ ਚੈੱਕ ਕਰੋ।',
    permissionDeniedTitle: 'ਮਾਈਕ੍ਰੋਫੋਨ ਦੀ ਇਜਾਜ਼ਤ ਲੋੜੀਂਦੀ ਹੈ',
    permissionDeniedGuide: 'ਕਿਰਪਾ ਕਰਕੇ ਬੋਲ ਕੇ ਸਵਾਲ ਪੁੱਛਣ ਲਈ ਆਪਣੇ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਮਾਈਕ੍ਰੋਫੋਨ ਦੀ ਇਜਾਜ਼ਤ ਦਿਓ। ਤੁਸੀਂ ਹੇਠਾਂ ਲਿਖ ਕੇ ਵੀ ਸਵਾਲ ਪੁੱਛ ਸਕਦੇ ਹੋ।',
    typeQueryPlaceholder: 'ਜਾਂ ਇੱਥੇ ਲਿਖ ਕੇ ਪੁੱਛੋ (ਜਿਵੇਂ: ਲੁਧਿਆਣਾ ਮੰਡੀ ਵਿੱਚ ਕਣਕ ਦਾ ਕੀ ਭਾਅ ਹੈ?)...',
    sendTextQuery: 'ਪੁੱਛੋ',
    detectedLanguageLabel: 'ਪਛਾਣੀ ਗਈ ਬੋਲੀ',
    transcriptionLabel: 'ਤੁਹਾਡਾ ਸਵਾਲ (ਆਵਾਜ਼ ਤੋਂ ਅੱਖਰ)',
    responseLabel: 'ਮੰਡੀ ਸਾਥੀ ਦਾ ਜਵਾਬ',
    intentLabel: 'ਪਛਾਣਿਆ ਗਿਆ ਵਿਸ਼ਾ',
    extractedEntitiesLabel: 'ਪਛਾਣੀ ਗਈ ਖੇਤੀ ਜਾਣਕਾਰੀ',
    mandiRateCardTitle: 'ਪ੍ਰਮਾਣਿਤ ਮੰਡੀ ਬੋਲੀ ਭਾਅ',
    dataSyncButton: 'ਐਗਮਾਰਕਨੈੱਟ ਡਾਟਾ ਸਿੰਕ ਕਰੋ',
    dataSyncSuccess: 'ਐਗਮਾਰਕਨੈੱਟ ਮੰਡੀ ਭਾਅ ਸਫਲਤਾਪੂਰਵਕ ਅਪਡੇਟ ਹੋ ਗਏ',
    dataSyncInProgress: 'data.gov.in ਤੋਂ ਡਾਟਾ ਲਿਆਇਆ ਜਾ ਰਿਹਾ ਹੈ...',
    audioSourceGnani: 'ਗਿਆਨੀ ਟਿੰਬਰੇ ਆਵਾਜ਼',
    audioSourceSandbox: 'ਸਥਾਨਕ ਸੈਂਡਬਾਕਸ ਆਡੀਓ',
    audioSourceBrowser: 'ਬ੍ਰਾਊਜ਼ਰ ਸਪੀਚ ਸਿੰਥੇਸਿਸ (ਫਾਲਬੈਕ)',
    listenAudio: 'ਜਵਾਬ ਸੁਣੋ',
    stopAudio: 'ਆਵਾਜ਼ ਬੰਦ ਕਰੋ',
    tryAgain: 'ਨਵਾਂ ਸਵਾਲ ਪੁੱਛੋ',
    gnaniNoticeTitle: 'ਵੌਇਸ ਇੰਜਣ ਸਥਿਤੀ',
    gnaniDemoBadge: 'ਗਿਆਨੀ v2.5 ਡੈਮੋ ਮੋਡ',
    gnaniNoticeText: 'ਗਿਆਨੀ ਪ੍ਰਿਜ਼ਮਾ v2.5 ਅਤੇ ਟਿੰਬਰੇ v2.5 ਇੰਟਰਫੇਸ ਸਰਗਰਮ ਹਨ। ਸੁਰੱਖਿਆ ਕਾਰਨਾਂ ਕਰਕੇ ਕੁੰਜੀਆਂ ਸਰਵਰ ਤੇ ਸੁਰੱਖਿਅਤ ਹਨ।',

    // Price Intelligence
    priceTitle: 'ਮੰਡੀ ਭਾਅ ਜਾਣਕਾਰੀ',
    priceSubtitle: 'ਮੰਡੀ ਬੋਰਡਾਂ ਵੱਲੋਂ ਦਰਜ ਕੀਤੇ ਅਧਿਕਾਰਤ ਮਾਡਲ ਅਤੇ ਘੱਟੋ-ਘੱਟ ਭਾਅ',
    selectCommodity: 'ਫ਼ਸਲ ਚੁਣੋ',
    selectState: 'ਰਾਜ ਚੁਣੋ',
    selectDistrict: 'ਜ਼ਿਲ੍ਹਾ ਚੁਣੋ',
    selectMandi: 'ਮੰਡੀ ਚੁਣੋ',
    allCommodities: 'ਸਾਰੀਆਂ ਫ਼ਸਲਾਂ',
    allStates: 'ਸਾਰੇ ਰਾਜ',
    allDistricts: 'ਸਾਰੇ ਜ਼ਿਲ੍ਹੇ',
    allMandis: 'ਸਾਰੀਆਂ ਮੰਡੀਆਂ',
    filterReset: 'ਮੁੜ ਸੈੱਟ ਕਰੋ',
    modalPrice: 'ਮਾਡਲ ਭਾਅ',
    minPrice: 'ਘੱਟੋ-ਘੱਟ ਭਾਅ',
    maxPrice: 'ਵੱਧ ਤੋਂ ਵੱਧ ਭਾਅ',
    priceSpread: 'ਭਾਅ ਦਾ ਫ਼ਰਕ',
    reportingDate: 'ਤਾਰੀਖ',
    dataSource: 'ਸਰੋਤ',
    arrivals: 'ਕੁੱਲ ਆਮਦ',
    perQuintal: '₹ / ਕੁਇੰਟਲ',
    noPriceData: 'ਚੁਣੀ ਗਈ ਫ਼ਸਲ ਅਤੇ ਮੰਡੀ ਲਈ ਅੱਜ ਦਾ ਭਾਅ ਅਜੇ ਦਰਜ ਨਹੀਂ ਹੋਇਆ।',
    noPriceNotice: 'ਬੋਲੀ ਖਤਮ ਹੋਣ ਤੋਂ ਬਾਅਦ ਸ਼ਾਮ ਨੂੰ ਭਾਅ ਅਪਡੇਟ ਕੀਤੇ ਜਾਂਦੇ ਹਨ।',
    mspReferenceNotice: 'ਸਰਕਾਰੀ ਐਮਐਸਪੀ (MSP) ਅਨੁਸਾਰ ਪ੍ਰਮਾਣਿਤ ਭਾਅ।',

    // Mandi Comparison
    compareTitle: 'ਮੰਡੀਆਂ ਦੀ ਤੁਲਨਾ',
    compareSubtitle: 'ਨੇੜਲੀਆਂ ਮੰਡੀਆਂ ਦੇ ਭਾਅ ਮਿਲਾ ਕੇ ਆਪਣੀ ਫ਼ਸਲ ਦਾ ਸਭ ਤੋਂ ਵੱਧ ਮੁੱਲ ਲਵੋ',
    pickCommodityToCompare: 'ਤੁਲਨਾ ਲਈ ਫ਼ਸਲ ਚੁਣੋ',
    selectTwoMandisNotice: 'ਤੁਲਨਾ ਦੇਖਣ ਲਈ ਘੱਟੋ-ਘੱਟ ਦੋ ਮੰਡੀਆਂ ਚੁਣੋ।',
    bestRateBadge: 'ਸਭ ਤੋਂ ਵਧੀਆ ਭਾਅ',
    differenceSpread: 'ਮੰਡੀਆਂ ਵਿੱਚ ਭਾਅ ਦਾ ਅੰਤਰ',
    priceTrendChart: 'ਮੰਡੀ ਭਾਅ ਤੁਲਨਾ ਚਾਰਟ',
    historicalNote: 'ਮਾਡਲ ਭਾਅ (₹/ਕੁਇੰਟਲ) ਦੀ ਤੁਲਨਾ।',

    // Government Schemes
    schemesTitle: 'ਸਰਕਾਰੀ ਖੇਤੀਬਾੜੀ ਸਕੀਮਾਂ',
    schemesSubtitle: 'ਕਿਸਾਨਾਂ ਲਈ ਸਰਕਾਰੀ ਸਹਾਇਤਾ, ਯੋਗਤਾ ਅਤੇ ਅਰਜ਼ੀ ਦੇਣ ਦਾ ਤਰੀਕਾ',
    searchSchemesPlaceholder: 'ਸਕੀਮ ਦਾ ਨਾਮ ਲੱਭੋ (ਜਿਵੇਂ ਪੀਐਮ-ਕਿਸਾਨ, ਫਸਲ ਬੀਮਾ)...',
    allCategories: 'ਸਾਰੀਆਂ ਸ਼੍ਰੇਣੀਆਂ',
    catIncome: 'ਆਮਦਨ ਸਹਾਇਤਾ',
    catInsurance: 'ਫ਼ਸਲ ਬੀਮਾ',
    catSoil: 'ਮਿੱਟੀ ਦੀ ਪਰਖ',
    catMarket: 'ਮੰਡੀਕਰਨ',
    catCredit: 'ਸਸਤਾ ਕਰਜ਼ਾ',
    schemeEligibility: 'ਯੋਗਤਾ',
    schemeDocuments: 'ਲੋੜੀਂਦੇ ਕਾਗਜ਼ਾਤ',
    schemeApplication: 'ਅਰਜ਼ੀ ਕਿਵੇਂ ਦੇਣੀ ਹੈ',
    officialPortalBtn: 'ਅਧਿਕਾਰਤ ਵੈੱਬਸਾਈਟ ਖੋਲ੍ਹੋ',
    verifiedOn: 'ਪ੍ਰਮਾਣਿਤ ਸਰੋਤ',

    // Complaint Registration
    complaintsTitle: 'ਕਿਸਾਨ ਸ਼ਿਕਾਇਤ ਅਤੇ ਮੰਡੀ ਮਸਲੇ',
    complaintsSubtitle: 'ਤੋਲ ਵਿੱਚ ਹੇਰਾਫੇਰੀ, ਭੁਗਤਾਨ ਵਿੱਚ ਦੇਰੀ ਜਾਂ ਮੰਡੀ ਦੀਆਂ ਮੁਸ਼ਕਲਾਂ ਦਰਜ ਕਰੋ',
    complaintCategory: 'ਸ਼ਿਕਾਇਤ ਦੀ ਕਿਸਮ',
    catWeighment: 'ਤੋਲ ਵਿੱਚ ਗੜਬੜੀ',
    catPayment: 'ਪੈਸੇ ਮਿਲਣ ਵਿੱਚ ਦੇਰੀ / ਐਮਐਸਪੀ ਤੋਂ ਘੱਟ ਖਰੀਦ',
    catInfra: 'ਮੰਡੀ ਵਿੱਚ ਸ਼ੈੱਡ ਜਾਂ ਪਾਣੀ ਦੀ ਘਾਟ',
    catDeductions: 'ਨਾਜਾਇਜ਼ ਕਟੌਤੀ',
    catQuality: 'ਗੁਣਵੱਤਾ ਦਾ ਝਗੜਾ',
    descriptionLabel: 'ਮਸਲੇ ਦਾ ਪੂਰਾ ਵੇਰਵਾ',
    descriptionPlaceholder: 'ਕਿਰਪਾ ਕਰਕੇ ਤਾਰੀਖ, ਆੜ੍ਹਤੀ ਦਾ ਨਾਮ ਜਾਂ ਮੁਸ਼ਕਲ ਲਿਖੋ...',
    farmerNameLabel: 'ਕਿਸਾਨ ਦਾ ਨਾਮ (ਮਰਜ਼ੀ ਮੁਤਾਬਕ)',
    farmerPhoneLabel: 'ਫ਼ੋਨ ਨੰਬਰ (ਮਰਜ਼ੀ ਮੁਤਾਬਕ)',
    reviewBtn: 'ਵੇਰਵੇ ਚੈੱਕ ਕਰੋ',
    confirmSubmitBtn: 'ਪੁਸ਼ਟੀ ਕਰੋ ਅਤੇ ਸ਼ਿਕਾਇਤ ਦਰਜ ਕਰੋ',
    backToEditBtn: 'ਸੁਧਾਰ ਕਰੋ',
    reviewNotice: 'ਕਿਰਪਾ ਕਰਕੇ ਵੇਰਵੇ ਚੈੱਕ ਕਰ ਲਵੋ। ਦਰਜ ਕਰਨ ਤੇ ਨੰਬਰ ਮਿਲੇਗਾ।',
    complaintSuccessTitle: 'ਸ਼ਿਕਾਇਤ ਸਫਲਤਾਪੂਰਵਕ ਦਰਜ ਹੋ ਗਈ',
    complaintRefNotice: 'ਤੁਹਾਡਾ ਸ਼ਿਕਾਇਤ ਨੰਬਰ ਹੈ:',
    complaintLegalDisclaimer: 'ਸੂਚਨਾ: ਇਹ ਸ਼ਿਕਾਇਤ ਮੰਡੀ ਸਾਥੀ ਪਲੇਟਫਾਰਮ ਤੇ ਰਿਕਾਰਡ ਕੀਤੀ ਗਈ ਹੈ।',
    registeredComplaintsTitle: 'ਤੁਹਾਡੀਆਂ ਦਰਜ ਸ਼ਿਕਾਇਤਾਂ',
    noComplaintsRecorded: 'ਅਜੇ ਕੋਈ ਸ਼ਿਕਾਇਤ ਦਰਜ ਨਹੀਂ ਹੈ।',
    statusRecorded: 'ਮੰਡੀ ਸਾਥੀ ਵਿੱਚ ਦਰਜ',

    // Settings & Accessibility
    settingsTitle: 'ਭਾਸ਼ਾ ਅਤੇ ਆਕਾਰ ਸੈਟਿੰਗਜ਼',
    settingsSubtitle: 'ਆਪਣੀ ਪਸੰਦ ਅਨੁਸਾਰ ਬੋਲੀ ਅਤੇ ਅੱਖਰਾਂ ਦਾ ਆਕਾਰ ਚੁਣੋ',
    languageSectionTitle: 'ਐਪਲੀਕੇਸ਼ਨ ਭਾਸ਼ਾ',
    languageDesc: 'ਆਪਣੀ ਮਨਪਸੰਦ ਭਾਸ਼ਾ ਚੁਣੋ। ਸਾਰੀ ਜਾਣਕਾਰੀ ਇਸੇ ਭਾਸ਼ਾ ਵਿੱਚ ਮਿਲੇਗੀ।',
    fontSizeTitle: 'ਅੱਖਰਾਂ ਦਾ ਆਕਾਰ (Text Size)',
    fontSizeDesc: 'ਧੁੱਪ ਵਿੱਚ ਸਾਫ਼ ਪੜ੍ਹਨ ਲਈ ਅੱਖਰਾਂ ਦਾ ਆਕਾਰ ਵੱਡਾ ਕਰੋ।',
    fontNormal: 'ਸਧਾਰਨ ਆਕਾਰ (Standard)',
    fontLarge: 'ਵੱਡਾ ਆਕਾਰ (High Visibility)',
    systemArchitecturePreview: 'ਸਿਸਟਮ ਨਿਯਮ ਅਤੇ ਡਾਟਾ ਸੁਰੱਖਿਆ',

    // Common
    loading: 'ਜਾਣਕਾਰੀ ਲੋਡ ਹੋ ਰਹੀ ਹੈ...',
    error: 'ਡਾਟਾ ਲੋਡ ਕਰਨ ਵਿੱਚ ਸਮੱਸਿਆ',
    retry: 'ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ',
    close: 'ਬੰਦ ਕਰੋ',
    details: 'ਵੇਰਵੇ ਦੇਖੋ',
    footerNotice: 'ਮੰਡੀ ਸਾਥੀ — ਕਿਸਾਨਾਂ ਲਈ ਪ੍ਰਮਾਣਿਤ ਖੇਤੀ ਮੰਚ।',

    // Phase 4B: PWA & Offline
    liveFeedBadge: 'ਤਾਜ਼ਾ ਏਪੀਐਮਸੀ ਭਾਅ',
    offlineCachedBadge: 'ਔਫਲਾਈਨ ਕੈਸ਼ ਕੀਤਾ ਡਾਟਾ',
    staleDataWarning: 'ਪੁਰਾਣਾ ਡਾਟਾ ਚੇਤਾਵਨੀ (>24 ਘੰਟੇ)',
    reportingDateLabel: 'ਬੋਲੀ ਰਿਪੋਰਟਿੰਗ ਮਿਤੀ',
    lastSyncedLabel: 'ਆਖਰੀ ਸਿੰਕ੍ਰੋਨਾਈਜ਼ੇਸ਼ਨ',
    offlineBannerText: 'ਤੁਸੀਂ ਇਸ ਵੇਲੇ ਔਫਲਾਈਨ ਹੋ। ਪਹਿਲਾਂ ਸੁਰੱਖਿਅਤ ਕੀਤੇ ਸਥਾਨਕ ਮੰਡੀ ਭਾਅ ਦਿਖਾਏ ਜਾ ਰਹੇ ਹਨ।',
    offlineVoiceNotice: 'ਵੌਇਸ ਅਸਿਸਟੈਂਟ (ਬੋਲ ਕੇ ਪੁੱਛਣ) ਲਈ ਇੰਟਰਨੈੱਟ ਕੁਨੈਕਸ਼ਨ ਲਾਜ਼ਮੀ ਹੈ।',
    offlineNoDataMsg: 'ਇਸ ਚੋਣ ਲਈ ਕੋਈ ਔਫਲਾਈਨ ਡਾਟਾ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਸਥਾਨਕ ਡਾਟਾ ਅੱਪਡੇਟ ਕਰਨ ਲਈ ਇੰਟਰਨੈੱਟ ਨਾਲ ਜੁੜੋ।',
    installAppTitle: 'ਮੰਡੀ ਸਾਥੀ ਐਪ ਇੰਸਟੌਲ ਕਰੋ',
    installAppSubtitle: 'ਖੇਤਾਂ ਵਿੱਚ ਬਿਨਾਂ ਰੁਕਾਵਟ ਅਤੇ ਔਫਲਾਈਨ ਭਾਅ ਦੇਖਣ ਲਈ ਆਪਣੇ ਫੋਨ ਤੇ MandiSaathi ਇੰਸਟੌਲ ਕਰੋ।',
    installBtnText: 'ਐਪ ਇੰਸਟੌਲ ਕਰੋ',
    dismissBtnText: 'ਹਟਾਓ',
    syncStatusSchedule: 'ਰਾਤ ਦੀ ਸਿੰਕ੍ਰੋਨਾਈਜ਼ੇਸ਼ਨ ਅਨੁਸੂਚੀ',
    syncStatusCron: 'ਕ੍ਰੋਨ ਅਨੁਸੂਚੀ (ਭਾਰਤੀ ਸਮਾਂ)',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('mandisaathi_lang');
    return saved === 'hi' || saved === 'pa' || saved === 'en' ? saved : 'hi';
  });

  const [fontSize, setFontSizeState] = useState<'normal' | 'large'>(() => {
    const saved = localStorage.getItem('mandisaathi_fontsize');
    return saved === 'large' ? 'large' : 'normal';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('mandisaathi_lang', lang);
  };

  const setFontSize = (size: 'normal' | 'large') => {
    setFontSizeState(size);
    localStorage.setItem('mandisaathi_fontsize', size);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (fontSize === 'large') {
      document.documentElement.classList.add('text-lg');
    } else {
      document.documentElement.classList.remove('text-lg');
    }
  }, [fontSize]);

  const t = (key: string): string => {
    const current = translations[language];
    return current[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, fontSize, setFontSize, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
};
