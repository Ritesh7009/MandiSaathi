import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@astryxdesign/core/Card';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Selector, type SelectorOptionData } from '@astryxdesign/core/Selector';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Stepper, Step } from '@astryxdesign/core/Stepper';
import { useToast } from '@astryxdesign/core/Toast';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/apiClient';
import { LottieBadge } from '../components/ui/LottieBadge';
import { TransitionPanel } from '../components/ui/MotionPrimitives';
import {
  ClipboardText,
  ArrowLeft,
  PaperPlaneTilt,
  Ticket,
  Key,
  Copy,
  Check,
  ShieldCheck,
  MapPin,
  User,
  Phone,
  MagnifyingGlass,
  Trash,
} from '@phosphor-icons/react';
import { Complaint, ComplaintRequest } from '../types';

const FILED_COMPLAINTS_STORAGE_KEY = 'mandisaathi_filed_complaints';
const ALL_MANDIS_SENTINEL = '__ALL__';

interface StoredComplaintSummary {
  referenceNumber: string;
  category: string;
  state: string;
  district: string;
  mandiName: string | null;
  status: string;
  createdAt: string;
}

type FormStep = 'edit' | 'review' | 'success';

export const ComplaintRegistration: React.FC = () => {
  const { language, t, getMandiName } = useLanguage();
  const showToast = useToast();

  const [step, setStep] = useState<FormStep>('edit');
  const [category, setCategory] = useState<string>('WEIGHMENT_DISPARITY');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [customState, setCustomState] = useState<string>('');
  const [customDistrict, setCustomDistrict] = useState<string>('');
  const [selectedMandiCode, setSelectedMandiCode] = useState<string>('');
  const [farmerName, setFarmerName] = useState<string>('');
  const [farmerPhone, setFarmerPhone] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Holds the newly created complaint (and its one-time trackingToken) strictly in memory.
  const [createdComplaint, setCreatedComplaint] = useState<Complaint | null>(null);
  const [copiedField, setCopiedField] = useState<'ref' | 'token' | null>(null);

  // Tracking lookup panel state (X-Tracking-Token header)
  const [trackRef, setTrackRef] = useState<string>('');
  const [trackToken, setTrackToken] = useState<string>('');
  const [trackedComplaint, setTrackedComplaint] = useState<Complaint | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState<boolean>(false);

  // Safe local history (stores metadata only, never tracking tokens)
  const [filedHistory, setFiledHistory] = useState<StoredComplaintSummary[]>(() => {
    try {
      const raw = localStorage.getItem(FILED_COMPLAINTS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(FILED_COMPLAINTS_STORAGE_KEY, JSON.stringify(filedHistory.slice(0, 12)));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }, [filedHistory]);

  const { data: mandis = [] } = useQuery({
    queryKey: ['mandisList', 'ALL'],
    queryFn: () => api.getMandis(),
    staleTime: 120000,
  });

  const uniqueStates = useMemo(
    () => Array.from(new Set(mandis.map((m) => m.state).filter(Boolean))).sort(),
    [mandis]
  );

  const districtsForState = useMemo(() => {
    if (!selectedState || selectedState === '__OTHER__') return [];
    return Array.from(
      new Set(mandis.filter((m) => m.state === selectedState).map((m) => m.district).filter(Boolean))
    ).sort();
  }, [mandis, selectedState]);

  const mandisForSelection = useMemo(() => {
    if (!selectedState || selectedState === '__OTHER__') return [];
    return mandis.filter(
      (m) =>
        m.state === selectedState &&
        (!selectedDistrict || selectedDistrict === '__OTHER__' || m.district === selectedDistrict)
    );
  }, [mandis, selectedState, selectedDistrict]);

  const resolvedState =
    selectedState === '__OTHER__' || uniqueStates.length === 0 ? customState.trim() : selectedState.trim();
  const resolvedDistrict =
    selectedDistrict === '__OTHER__' || districtsForState.length === 0
      ? customDistrict.trim()
      : selectedDistrict.trim();

  const categories = useMemo(
    () => [
      { value: 'WEIGHMENT_DISPARITY', label: t('catWeighment') },
      { value: 'DELAYED_PAYMENT', label: t('catPayment') },
      { value: 'MANDI_INFRASTRUCTURE', label: t('catInfra') },
      { value: 'UNAUTHORIZED_DEDUCTIONS', label: t('catDeductions') },
      { value: 'QUALITY_DISPUTE', label: t('catQuality') },
    ],
    [t]
  );

  const categoryLabelMap: Record<string, string> = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.value, c.label])),
    [categories]
  );

  const copy = useMemo(() => {
    if (language === 'hi') {
      return {
        eyebrow: '05 · मंडी शिकायत एवं गोपनीयता डेस्क',
        step1Label: 'विवरण भरें',
        step2Label: 'समीक्षा व पुष्टि',
        step3Label: 'संदर्भ जारी',
        fillDetailsTitle: 'समस्या का विवरण भरें',
        otherManual: 'अन्य (स्वयं लिखें)',
        customStatePlaceholder: 'राज्य का नाम लिखें',
        customDistrictPlaceholder: 'जिला का नाम लिखें',
        optionalMandiLabel: 'मंडी चुनें (वैकल्पिक)',
        charCountHint: 'न्यूनतम 10 अक्षर आवश्यक',
        oneTimeTokenTitle: 'एक-बारगी ट्रैकिंग टोकन (सुरक्षित रखें)',
        oneTimeTokenWarn:
          'कृपया इस टोकन को अभी सुरक्षित नोट करें। गोपनीयता के लिए यह टोकन केवल एक बार दिखाया जाता है और इसे स्थानीय स्टोरेज में सहेजा नहीं जाता।',
        newGrievanceBtn: 'नया रिकॉर्ड दर्ज करें',
        trackTitle: 'रिकॉर्ड की स्थिति जांचें',
        trackSubtitle: 'आंतरिक संदर्भ संख्या और ट्रैकिंग टोकन दर्ज करें',
        refLabel: 'संदर्भ संख्या',
        tokenLabel: 'ट्रैकिंग टोकन (X-Tracking-Token)',
        tokenPlaceholder: 'प्राप्त सुरक्षा टोकन दर्ज करें',
        checkStatusBtn: 'स्थिति जांचें',
        checkingBtn: 'जांच हो रही है...',
        trackNotFound: 'संदर्भ संख्या या ट्रैकिंग टोकन मेल नहीं खाया।',
        clearHistory: 'सूची साफ करें',
        privacyBadge: 'गोपनीयता सुरक्षित: टोकन केवल एक बार दिखाया जाता है',
        copiedToast: 'क्लिपबोर्ड में कॉपी किया गया',
      };
    }
    if (language === 'pa') {
      return {
        eyebrow: '05 · ਮੰਡੀ ਸ਼ਿਕਾਇਤ ਅਤੇ ਗੋਪਨੀਯਤਾ ਡੈਸਕ',
        step1Label: 'ਵੇਰਵਾ ਭਰੋ',
        step2Label: 'ਸਮੀਖਿਆ ਤੇ ਪੁਸ਼ਟੀ',
        step3Label: 'ਹਵਾਲਾ ਜਾਰੀ',
        fillDetailsTitle: 'ਸਮੱਸਿਆ ਦਾ ਵੇਰਵਾ ਭਰੋ',
        otherManual: 'ਹੋਰ (ਖੁਦ ਲਿਖੋ)',
        customStatePlaceholder: 'ਰਾਜ ਦਾ ਨਾਮ ਲਿਖੋ',
        customDistrictPlaceholder: 'ਜ਼ਿਲ੍ਹੇ ਦਾ ਨਾਮ ਲਿਖੋ',
        optionalMandiLabel: 'ਮੰਡੀ ਚੁਣੋ (ਵਿਕਲਪਿਕ)',
        charCountHint: 'ਘੱਟੋ-ਘੱਟ 10 ਅੱਖਰ ਲੋੜੀਂਦੇ ਹਨ',
        oneTimeTokenTitle: 'ਇੱਕ-ਵਾਰ ਟਰੈਕਿੰਗ ਟੋਕਨ (ਸੁਰੱਖਿਅਤ ਰੱਖੋ)',
        oneTimeTokenWarn:
          'ਕਿਰਪਾ ਕਰਕੇ ਇਹ ਟੋਕਨ ਹੁਣੇ ਸੁਰੱਖਿਅਤ ਨੋਟ ਕਰੋ। ਗੋਪਨੀਯਤਾ ਲਈ ਇਹ ਟੋਕਨ ਸਿਰਫ਼ ਇੱਕ ਵਾਰ ਦਿਖਾਇਆ ਜਾਂਦਾ ਹੈ।',
        newGrievanceBtn: 'ਨਵਾਂ ਰਿਕਾਰਡ ਦਰਜ ਕਰੋ',
        trackTitle: 'ਰਿਕਾਰਡ ਦੀ ਸਥਿਤੀ ਜਾਂਚੋ',
        trackSubtitle: 'ਅੰਦਰੂਨੀ ਹਵਾਲਾ ਨੰਬਰ ਅਤੇ ਟਰੈਕਿੰਗ ਟੋਕਨ ਭਰੋ',
        refLabel: 'ਹਵਾਲਾ ਨੰਬਰ',
        tokenLabel: 'ਟਰੈਕਿੰਗ ਟੋਕਨ (X-Tracking-Token)',
        tokenPlaceholder: 'ਮਿਲਿਆ ਸੁਰੱਖਿਆ ਟੋਕਨ ਭਰੋ',
        checkStatusBtn: 'ਸਥਿਤੀ ਜਾਂਚੋ',
        checkingBtn: 'ਜਾਂਚ ਜਾਰੀ ਹੈ...',
        trackNotFound: 'ਹਵਾਲਾ ਨੰਬਰ ਜਾਂ ਟਰੈਕਿੰਗ ਟੋਕਨ ਮੇਲ ਨਹੀਂ ਖਾਂਦਾ।',
        clearHistory: 'ਸੂची ਸਾਫ਼ ਕਰੋ',
        privacyBadge: 'ਗੋਪਨੀਯਤਾ ਸੁਰੱਖਿਅਤ: ਟੋਕਨ ਸਿਰਫ਼ ਇੱਕ ਵਾਰ ਦਿਖਾਇਆ ਜਾਂਦਾ ਹੈ',
        copiedToast: 'ਕਲਿੱਪਬੋਰਡ ਵਿੱਚ ਕਾਪੀ ਕੀਤਾ ਗਿਆ',
      };
    }
    return {
      eyebrow: '05 · GRIEVANCE LEDGER & TOKENIZED LOOKUP',
      step1Label: 'Issue Details',
      step2Label: 'Review & Confirm',
      step3Label: 'Reference Issued',
      fillDetailsTitle: 'Fill Issue Details',
      otherManual: 'Other (Type manually)',
      customStatePlaceholder: 'Enter State name',
      customDistrictPlaceholder: 'Enter District name',
      optionalMandiLabel: 'Select Mandi (Optional)',
      charCountHint: 'Minimum 10 characters required',
      oneTimeTokenTitle: 'One-Time Tracking Token (Save Now)',
      oneTimeTokenWarn:
        'Copy and store this token now. For your privacy, raw tracking tokens are shown only once at creation and are never stored in browser history.',
      newGrievanceBtn: 'Record Another Issue',
      trackTitle: 'Track a Grievance',
      trackSubtitle: 'Look up status with your reference number and X-Tracking-Token',
      refLabel: 'Reference Number',
      tokenLabel: 'Tracking Token (X-Tracking-Token)',
      tokenPlaceholder: 'Paste your private tracking token',
      checkStatusBtn: 'Check Status',
      checkingBtn: 'Checking...',
      trackNotFound: 'No matching record found for this reference and tracking token.',
      clearHistory: 'Clear list',
      privacyBadge: 'Privacy-first: Token hashed with SHA-256 on server',
      copiedToast: 'Copied to clipboard',
    };
  }, [language]);

  const registerMutation = useMutation({
    mutationFn: (payload: ComplaintRequest) => api.registerComplaint(payload),
    onSuccess: (data) => {
      setCreatedComplaint(data);
      setStep('success');
      setFormError(null);
      setTrackRef(data.referenceNumber);
      if (data.trackingToken) {
        setTrackToken(data.trackingToken);
      }
      const summary: StoredComplaintSummary = {
        referenceNumber: data.referenceNumber,
        category: data.category,
        state: data.state,
        district: data.district,
        mandiName: data.mandiName,
        status: data.status,
        createdAt: data.createdAt,
      };
      setFiledHistory((prev) => [
        summary,
        ...prev.filter((item) => item.referenceNumber !== data.referenceNumber),
      ]);
      showToast({ body: t('complaintSuccessTitle'), type: 'info' });
    },
    onError: (err: Error) => {
      setFormError(err.message || t('errFailedRegisterGrievance'));
    },
  });

  const handleProceedReview = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!resolvedState || !resolvedDistrict) {
      setFormError(t('errStateDistrictReq'));
      return;
    }
    if (description.trim().length < 10) {
      setFormError(t('errMinComplaintDesc'));
      return;
    }
    setStep('review');
  };

  const handleConfirmSubmit = () => {
    setFormError(null);
    const payload: ComplaintRequest = {
      category,
      description: description.trim(),
      state: resolvedState,
      district: resolvedDistrict,
      ...(selectedMandiCode ? { mandiCode: selectedMandiCode } : {}),
      ...(farmerName.trim() ? { farmerName: farmerName.trim() } : {}),
      ...(farmerPhone.trim() ? { farmerPhone: farmerPhone.trim() } : {}),
    };
    registerMutation.mutate(payload);
  };

  const handleResetForm = () => {
    setCategory('WEIGHMENT_DISPARITY');
    setSelectedMandiCode('');
    setFarmerName('');
    setFarmerPhone('');
    setDescription('');
    setCreatedComplaint(null);
    setFormError(null);
    setStep('edit');
  };

  const handleTrackLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const ref = trackRef.trim();
    const tok = trackToken.trim();
    if (!ref || !tok) return;

    setIsTracking(true);
    setTrackError(null);
    setTrackedComplaint(null);
    try {
      const result = await api.getComplaintByRef(ref, tok);
      setTrackedComplaint(result);
    } catch (err) {
      setTrackError((err as Error).message || copy.trackNotFound);
    } finally {
      setIsTracking(false);
    }
  };

  const copyToClipboard = async (value: string, field: 'ref' | 'token') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      showToast({ body: copy.copiedToast, type: 'info' });
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      // Clipboard fallback not critical
    }
  };

  const selectedMandiName = useMemo(() => {
    if (!selectedMandiCode) return null;
    const found = mandis.find((m) => m.code === selectedMandiCode);
    return found ? getMandiName(found.code, found.nameHi || found.nameEn) : selectedMandiCode;
  }, [mandis, selectedMandiCode, getMandiName]);

  const descLength = description.trim().length;
  const activeStepIndex = step === 'edit' ? 0 : step === 'review' ? 1 : 2;

  const stateOptions: SelectorOptionData[] = useMemo(
    () => [
      ...uniqueStates.map((st) => ({ value: st, label: st })),
      { value: '__OTHER__', label: copy.otherManual },
    ],
    [uniqueStates, copy.otherManual]
  );

  const districtOptions: SelectorOptionData[] = useMemo(
    () => [
      ...districtsForState.map((d) => ({ value: d, label: d })),
      { value: '__OTHER__', label: copy.otherManual },
    ],
    [districtsForState, copy.otherManual]
  );

  const mandiOptions: SelectorOptionData[] = useMemo(
    () => [
      { value: ALL_MANDIS_SENTINEL, label: t('allMandis') },
      ...mandisForSelection.map((m) => ({
        value: m.code,
        label: `${getMandiName(m.code, m.nameHi || m.nameEn)} (${m.district})`,
      })),
    ],
    [mandisForSelection, getMandiName, t]
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Editorial Masthead + Legal Disclaimer Banner */}
      <Card padding={6} className="bg-surface">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center flex-wrap gap-2">
                <Badge
                  variant="success"
                  icon={<ClipboardText weight="duotone" className="w-3.5 h-3.5" />}
                  label={t('moreComplaintsBadge')}
                />
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                  {copy.eyebrow}
                </span>
              </div>
              <h1 className="font-display font-semibold text-2xl sm:text-3xl text-ink tracking-tight">
                {t('complaintsTitle')}
              </h1>
              <p className="text-sm text-ink-muted max-w-2xl leading-relaxed">
                {t('complaintsSubtitle')}
              </p>
            </div>

            <Badge
              variant="success"
              icon={<ShieldCheck weight="fill" className="w-3.5 h-3.5" />}
              label={copy.privacyBadge}
            />
          </div>

          <Banner
            status="warning"
            collapsible={false}
            title={t('complaintLegalDisclaimer')}
          />
        </div>
      </Card>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Registration Flow */}
        <Card padding={6} className="lg:col-span-7 bg-surface">
          <div className="space-y-5">
            <div className="space-y-4">
              <h2 className="font-display font-semibold text-base sm:text-lg text-ink">
                {step === 'edit'
                  ? copy.fillDetailsTitle
                  : step === 'review'
                  ? copy.step2Label
                  : t('complaintSuccessTitle')}
              </h2>

              <Stepper
                activeStep={activeStepIndex}
                indicatorPosition="on-track"
                density="balanced"
                label={t('complaintsTitle')}
                onStepClick={(idx) => {
                  if (idx === 0 && step === 'review' && !registerMutation.isPending) {
                    setStep('edit');
                  }
                }}
              >
                <Step step={0} label={copy.step1Label} />
                <Step step={1} label={copy.step2Label} isDisabled={step === 'edit'} />
                <Step step={2} label={copy.step3Label} isDisabled={step !== 'success'} />
              </Stepper>

              <Divider />
            </div>

            <TransitionPanel activeKey={step}>
              {step === 'edit' && (
                <form onSubmit={handleProceedReview} className="space-y-4">
                  <Selector
                    label={t('complaintCategory')}
                    options={categories}
                    value={category}
                    onChange={setCategory}
                    presentation="adaptive"
                    size="lg"
                    width="100%"
                    isRequired
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2.5">
                      {uniqueStates.length > 0 && (
                        <Selector
                          label={t('selectState')}
                          options={stateOptions}
                          value={selectedState || undefined}
                          onChange={(val) => {
                            setSelectedState(val);
                            setSelectedDistrict('');
                            setSelectedMandiCode('');
                          }}
                          placeholder={t('selectState')}
                          presentation="adaptive"
                          hasSearch={uniqueStates.length > 6}
                          size="lg"
                          width="100%"
                          isRequired
                        />
                      )}
                      {(selectedState === '__OTHER__' || uniqueStates.length === 0) && (
                        <TextInput
                          label={copy.customStatePlaceholder}
                          isLabelHidden={uniqueStates.length > 0}
                          value={customState}
                          onChange={setCustomState}
                          placeholder={copy.customStatePlaceholder}
                          size="lg"
                          width="100%"
                          isRequired
                        />
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {districtsForState.length > 0 && (
                        <Selector
                          label={t('selectDistrict')}
                          options={districtOptions}
                          value={selectedDistrict || undefined}
                          onChange={(val) => {
                            setSelectedDistrict(val);
                            setSelectedMandiCode('');
                          }}
                          placeholder={t('selectDistrict')}
                          presentation="adaptive"
                          hasSearch={districtsForState.length > 6}
                          size="lg"
                          width="100%"
                          isRequired
                        />
                      )}
                      {(districtsForState.length === 0 || selectedDistrict === '__OTHER__') && (
                        <TextInput
                          label={t('selectDistrict')}
                          isLabelHidden={districtsForState.length > 0}
                          value={customDistrict}
                          onChange={setCustomDistrict}
                          placeholder={copy.customDistrictPlaceholder}
                          size="lg"
                          width="100%"
                          isRequired
                        />
                      )}
                    </div>
                  </div>

                  {mandisForSelection.length > 0 && (
                    <Selector
                      label={copy.optionalMandiLabel}
                      options={mandiOptions}
                      value={selectedMandiCode || ALL_MANDIS_SENTINEL}
                      onChange={(val) =>
                        setSelectedMandiCode(val === ALL_MANDIS_SENTINEL ? '' : val)
                      }
                      presentation="adaptive"
                      hasSearch={mandisForSelection.length > 6}
                      size="lg"
                      width="100%"
                      isOptional
                    />
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextInput
                      label={t('farmerNameLabel')}
                      value={farmerName}
                      onChange={(v) => setFarmerName(v.slice(0, 100))}
                      startIcon={<User weight="duotone" className="w-4 h-4" />}
                      size="lg"
                      width="100%"
                      isOptional
                    />

                    <TextInput
                      label={t('farmerPhoneLabel')}
                      type="tel"
                      value={farmerPhone}
                      onChange={(v) => setFarmerPhone(v.slice(0, 20))}
                      startIcon={<Phone weight="duotone" className="w-4 h-4" />}
                      size="lg"
                      width="100%"
                      isOptional
                    />
                  </div>

                  <div className="space-y-1">
                    <TextArea
                      label={t('descriptionLabel')}
                      description={`${descLength} / 10 (${copy.charCountHint})`}
                      value={description}
                      onChange={setDescription}
                      placeholder={t('descriptionPlaceholder')}
                      rows={4}
                      maxLength={2000}
                      width="100%"
                      isRequired
                    />
                  </div>

                  {formError && (
                    <Banner status="error" role="alert" collapsible={false} title={formError} />
                  )}

                  <Button
                    type="submit"
                    label={t('reviewBtn')}
                    variant="primary"
                    size="lg"
                    width="100%"
                  />
                </form>
              )}

              {step === 'review' && (
                <div className="space-y-4">
                  <Card variant="muted" padding={4}>
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-line">
                        <span className="text-ink-muted">{t('complaintCategory')}</span>
                        <span className="font-semibold text-canopy dark:text-canopy-bright">
                          {categoryLabelMap[category] || category}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-line">
                        <span className="text-ink-muted">
                          {t('selectState')} / {t('selectDistrict')}
                        </span>
                        <span className="font-medium text-ink text-right">
                          {resolvedDistrict}, {resolvedState}
                          {selectedMandiName ? ` (${selectedMandiName})` : ''}
                        </span>
                      </div>

                      {(farmerName.trim() || farmerPhone.trim()) && (
                        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-line">
                          <span className="text-ink-muted">{t('farmerNameLabel')}</span>
                          <span className="font-medium text-ink">
                            {[farmerName.trim(), farmerPhone.trim()].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <span className="text-ink-muted block">{t('descriptionLabel')}</span>
                        <p className="text-ink leading-relaxed bg-surface rounded-lg p-3 border border-line">
                          {description.trim()}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <p className="text-xs text-ink-muted leading-relaxed">{t('reviewNotice')}</p>

                  {formError && (
                    <Banner status="error" role="alert" collapsible={false} title={formError} />
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      label={t('backToEditBtn')}
                      variant="secondary"
                      size="lg"
                      icon={<ArrowLeft weight="bold" className="w-4 h-4" />}
                      isDisabled={registerMutation.isPending}
                      onClick={() => setStep('edit')}
                    />
                    <div className="flex-1">
                      <Button
                        label={registerMutation.isPending ? t('processing') : t('confirmSubmitBtn')}
                        variant="primary"
                        size="lg"
                        width="100%"
                        icon={<PaperPlaneTilt weight="bold" className="w-4 h-4" />}
                        isLoading={registerMutation.isPending}
                        onClick={handleConfirmSubmit}
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 'success' && createdComplaint && (
                <div className="space-y-5 text-center">
                  <LottieBadge variant="check" loop={false} className="w-20 h-20 mx-auto" />

                  <div className="space-y-1">
                    <h3 className="font-display font-semibold text-lg text-ink">
                      {t('complaintSuccessTitle')}
                    </h3>
                    <p className="text-xs text-ink-muted">{t('complaintRefNotice')}</p>
                  </div>

                  {/* Reference Number & One-Time Token */}
                  <div className="rounded-xl bg-canopy-soft border border-canopy/25 p-4 space-y-3 text-left">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <span className="text-[11px] font-medium text-ink-muted block">
                          {copy.refLabel}
                        </span>
                        <span className="font-mono tnum text-base font-bold text-canopy dark:text-canopy-bright">
                          {createdComplaint.referenceNumber}
                        </span>
                      </div>
                      <Button
                        label={createdComplaint.referenceNumber}
                        variant="secondary"
                        size="sm"
                        icon={
                          copiedField === 'ref' ? (
                            <Check weight="bold" className="w-3.5 h-3.5 text-canopy dark:text-canopy-bright" />
                          ) : (
                            <Copy weight="duotone" className="w-3.5 h-3.5" />
                          )
                        }
                        onClick={() => copyToClipboard(createdComplaint.referenceNumber, 'ref')}
                      />
                    </div>

                    {createdComplaint.trackingToken && (
                      <div className="pt-3 border-t border-canopy/20 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-semibold text-saffron-text flex items-center gap-1">
                              <Key weight="fill" className="w-3.5 h-3.5" />
                              <span>{copy.oneTimeTokenTitle}</span>
                            </span>
                            <p className="font-mono text-xs text-ink break-all mt-1 select-all">
                              {createdComplaint.trackingToken}
                            </p>
                          </div>
                          <Button
                            label={copiedField === 'token' ? 'Copied' : 'Copy'}
                            variant="secondary"
                            size="sm"
                            icon={
                              copiedField === 'token' ? (
                                <Check weight="bold" className="w-3.5 h-3.5 text-canopy dark:text-canopy-bright" />
                              ) : (
                                <Copy weight="duotone" className="w-3.5 h-3.5" />
                              )
                            }
                            onClick={() => copyToClipboard(createdComplaint.trackingToken!, 'token')}
                          />
                        </div>
                        <p className="text-[11px] text-ink-muted leading-relaxed">
                          {copy.oneTimeTokenWarn}
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    label={copy.newGrievanceBtn}
                    variant="secondary"
                    size="lg"
                    width="100%"
                    onClick={handleResetForm}
                  />
                </div>
              )}
            </TransitionPanel>
          </div>
        </Card>

        {/* Right Sidebar: Track Grievance + Saved Local References */}
        <aside className="lg:col-span-5 space-y-6">
          {/* Track Grievance via X-Tracking-Token */}
          <Card padding={5} className="bg-surface">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-canopy-soft text-canopy dark:text-canopy-bright shrink-0">
                  <Ticket weight="duotone" className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-base text-ink">{copy.trackTitle}</h2>
                  <p className="text-xs text-ink-muted mt-0.5">{copy.trackSubtitle}</p>
                </div>
              </div>

              <form onSubmit={handleTrackLookup} className="space-y-3">
                <TextInput
                  label={copy.refLabel}
                  value={trackRef}
                  onChange={setTrackRef}
                  placeholder="MS-COMP-..."
                  size="md"
                  width="100%"
                  isRequired
                />

                <TextInput
                  label={copy.tokenLabel}
                  value={trackToken}
                  onChange={setTrackToken}
                  placeholder={copy.tokenPlaceholder}
                  size="md"
                  width="100%"
                  isRequired
                />

                <Button
                  type="submit"
                  label={isTracking ? copy.checkingBtn : copy.checkStatusBtn}
                  variant="primary"
                  size="lg"
                  width="100%"
                  isLoading={isTracking}
                  isDisabled={isTracking || !trackRef.trim() || !trackToken.trim()}
                  icon={<MagnifyingGlass weight="bold" className="w-3.5 h-3.5" />}
                />
              </form>

              {trackError && (
                <Banner status="error" role="alert" collapsible={false} title={trackError} />
              )}

              {trackedComplaint && (
                <Card variant="muted" padding={4}>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono tnum font-bold text-ink">
                        {trackedComplaint.referenceNumber}
                      </span>
                      <Badge variant="success" label={t('statusRecorded')} />
                    </div>
                    <p className="font-medium text-ink">
                      {categoryLabelMap[trackedComplaint.category] || trackedComplaint.category}
                    </p>
                    <p className="text-ink-muted flex items-center gap-1.5">
                      <MapPin weight="duotone" className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {trackedComplaint.district}, {trackedComplaint.state}
                        {trackedComplaint.mandiName ? ` (${trackedComplaint.mandiName})` : ''}
                      </span>
                    </p>
                    <p className="text-ink leading-relaxed bg-surface rounded-lg p-2.5 border border-line">
                      {trackedComplaint.description}
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </Card>

          {/* Local Reference History (Metadata only, zero tokens) */}
          <Card padding={5} className="bg-surface">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display font-semibold text-sm text-ink">
                  {t('registeredComplaintsTitle')}
                </h2>
                {filedHistory.length > 0 && (
                  <Button
                    label={copy.clearHistory}
                    variant="ghost"
                    size="sm"
                    icon={<Trash weight="duotone" className="w-3.5 h-3.5" />}
                    onClick={() => setFiledHistory([])}
                  />
                )}
              </div>

              {filedHistory.length === 0 ? (
                <EmptyState
                  isCompact
                  icon={<LottieBadge variant="empty" loop className="w-12 h-12" />}
                  title={t('noComplaintsRecorded')}
                />
              ) : (
                <div className="space-y-2">
                  {filedHistory.map((item) => (
                    <button
                      key={item.referenceNumber}
                      type="button"
                      onClick={() => setTrackRef(item.referenceNumber)}
                      className="w-full text-left p-3 rounded-xl bg-surface-subtle/80 border border-line hover:border-canopy/40 transition-colors cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono tnum text-xs font-semibold text-canopy dark:text-canopy-bright">
                          {item.referenceNumber}
                        </span>
                        <span className="text-[10px] font-mono text-ink-muted">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-ink truncate">
                        {categoryLabelMap[item.category] || item.category}
                      </p>
                      <p className="text-[11px] text-ink-muted truncate">
                        {item.district}, {item.state}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
};
