import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/apiClient';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  FileText,
  AlertOctagon,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Building2,
  Clock,
  Phone,
  User,
  Info,
  Copy,
  Check,
} from 'lucide-react';
import { ComplaintRequest, Complaint } from '../types';

export const ComplaintRegistration: React.FC = () => {
  const { language, t } = useLanguage();
  const queryClient = useQueryClient();

  // Form State
  const [category, setCategory] = useState<string>('WEIGHMENT_DISPARITY');
  const [description, setDescription] = useState<string>('');
  const [state, setState] = useState<string>('Punjab');
  const [district, setDistrict] = useState<string>('Ludhiana');
  const [mandiCode, setMandiCode] = useState<string>('KHANNA_PB');
  const [farmerName, setFarmerName] = useState<string>('');
  const [farmerPhone, setFarmerPhone] = useState<string>('');

  // Workflow State: 'edit' | 'review' | 'success'
  const [step, setStep] = useState<'edit' | 'review' | 'success'>('edit');
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Mandis list for dropdown
  const { data: mandis = [] } = useQuery({
    queryKey: ['mandisForComplaint'],
    queryFn: () => api.getMandis(),
    staleTime: 120000,
  });

  // Fetch recorded complaints list
  const {
    data: complaints = [],
    isLoading: loadingComplaints,
    isError: errorComplaints,
  } = useQuery({
    queryKey: ['registeredComplaints'],
    queryFn: () => api.getComplaints(),
    staleTime: 30000,
  });

  // Registration Mutation
  const registerMutation = useMutation({
    mutationFn: (request: ComplaintRequest) => api.registerComplaint(request),
    onSuccess: (newComplaint) => {
      setSubmittedComplaint(newComplaint);
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['registeredComplaints'] });
    },
    onError: (err: Error) => {
      setValidationError(err.message || 'Failed to register grievance. Please retry.');
    },
  });

  const categories = [
    { code: 'WEIGHMENT_DISPARITY', labelKey: 'catWeighment' },
    { code: 'DELAYED_PAYMENT', labelKey: 'catPayment' },
    { code: 'MANDI_INFRASTRUCTURE', labelKey: 'catInfra' },
    { code: 'UNAUTHORIZED_DEDUCTIONS', labelKey: 'catDeductions' },
    { code: 'QUALITY_DISPUTE', labelKey: 'catQuality' },
  ];

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!description.trim() || description.trim().length < 10) {
      setValidationError('Please provide at least 10 characters describing the issue in detail.');
      return;
    }
    if (!state.trim() || !district.trim()) {
      setValidationError('State and District are required.');
      return;
    }

    setStep('review');
  };

  const handleConfirmSubmit = () => {
    setValidationError(null);
    const payload: ComplaintRequest = {
      category,
      description: description.trim(),
      state: state.trim(),
      district: district.trim(),
      mandiCode: mandiCode || undefined,
      farmerName: farmerName.trim() || undefined,
      farmerPhone: farmerPhone.trim() || undefined,
    };
    registerMutation.mutate(payload);
  };

  const handleResetForm = () => {
    setDescription('');
    setFarmerName('');
    setFarmerPhone('');
    setSubmittedComplaint(null);
    setValidationError(null);
    setStep('edit');
  };

  const handleCopyReference = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const getCategoryLabel = (catCode: string) => {
    const match = categories.find((c) => c.code === catCode);
    return match ? t(match.labelKey) : catCode;
  };

  const selectedMandiObj = mandis.find((m) => m.code === mandiCode);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 lg:pb-8">
      {/* Header */}
      <div className="bg-white border border-ivory-dark rounded-md p-5 sm:p-6 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 text-forest text-xs font-semibold uppercase tracking-wider mb-1">
              <FileText className="w-4 h-4 text-harvest-dark" />
              <span>{t('complaintsTitle')}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-charcoal tracking-tight">
              {t('complaintsTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-muted mt-1 max-w-2xl">
              {t('complaintsSubtitle')}
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono bg-ivory border border-ivory-dark px-3 py-1.5 rounded text-charcoal-muted self-start sm:self-center">
            <Building2 className="w-4 h-4 text-forest" />
            <span>Mandi Transparency Workflow</span>
          </div>
        </div>
      </div>

      {/* Statutory Disclaimer Alert (Mandatory Rule) */}
      <div className="bg-harvest-50/70 border border-harvest/50 rounded-md p-4 flex items-start space-x-3 text-xs text-charcoal">
        <Info className="w-4 h-4 text-harvest-dark shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-forest-dark uppercase tracking-wider text-[11px]">
            Platform Governance Notice
          </span>
          <p className="text-charcoal-muted leading-relaxed">
            {t('complaintLegalDisclaimer')}
          </p>
        </div>
      </div>

      {/* Main Flow: Form / Review / Success */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Interactive Form Workflow */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-ivory-dark rounded-md p-5 sm:p-6 shadow-subtle">
            {/* Step 1: Input Form */}
            {step === 'edit' && (
              <form onSubmit={handleReview} className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-ivory-dark pb-3">
                  <h2 className="text-sm font-bold text-charcoal flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-forest text-white text-[11px] flex items-center justify-center font-bold">
                      1
                    </span>
                    <span>Fill Complaint Details</span>
                  </h2>
                  <span className="text-[11px] text-charcoal-muted">
                    Step 1 of 2: Details
                  </span>
                </div>

                {validationError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-xs flex items-center space-x-2">
                    <AlertOctagon className="w-4 h-4 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}

                {/* Category Selection */}
                <div>
                  <label className="block font-semibold text-charcoal mb-1">
                    {t('complaintCategory')} *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-ivory border border-ivory-dark rounded px-3 py-2 text-xs text-charcoal focus:outline-none focus:border-forest"
                  >
                    {categories.map((c) => (
                      <option key={c.code} value={c.code}>
                        {t(c.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* State & District */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-charcoal mb-1">
                      {t('selectState')} *
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. Punjab, Haryana, Rajasthan"
                      required
                      className="w-full bg-ivory border border-ivory-dark rounded px-3 py-2 text-xs text-charcoal focus:outline-none focus:border-forest"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-charcoal mb-1">
                      {t('selectDistrict')} *
                    </label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g. Ludhiana, Karnal, Sirsa"
                      required
                      className="w-full bg-ivory border border-ivory-dark rounded px-3 py-2 text-xs text-charcoal focus:outline-none focus:border-forest"
                    />
                  </div>
                </div>

                {/* Mandi (Optional / Applicable) */}
                <div>
                  <label className="block font-semibold text-charcoal mb-1">
                    APMC Mandi Yard (Where applicable)
                  </label>
                  <select
                    value={mandiCode}
                    onChange={(e) => setMandiCode(e.target.value)}
                    className="w-full bg-ivory border border-ivory-dark rounded px-3 py-2 text-xs text-charcoal focus:outline-none focus:border-forest"
                  >
                    <option value="">General District Mandi / Other</option>
                    {mandis.map((m) => (
                      <option key={m.code} value={m.code}>
                        {language === 'hi' ? m.nameHi : language === 'pa' && m.namePa ? m.namePa : m.nameEn} ({m.district}, {m.state})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Detailed Description */}
                <div>
                  <label className="block font-semibold text-charcoal mb-1">
                    {t('descriptionLabel')} *
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('descriptionPlaceholder')}
                    required
                    className="w-full bg-ivory border border-ivory-dark rounded px-3 py-2 text-xs text-charcoal focus:outline-none focus:border-forest leading-relaxed"
                  />
                  <div className="flex justify-between text-[11px] text-charcoal-muted mt-1">
                    <span>Minimum 10 characters. Include auction lot or gate pass numbers if available.</span>
                    <span>{description.length} chars</span>
                  </div>
                </div>

                {/* Farmer Contact Info (Optional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-ivory-dark">
                  <div>
                    <label className="block font-semibold text-charcoal mb-1 flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-charcoal-muted" />
                      <span>{t('farmerNameLabel')}</span>
                    </label>
                    <input
                      type="text"
                      value={farmerName}
                      onChange={(e) => setFarmerName(e.target.value)}
                      placeholder="e.g. Gurpreet Singh / राम कुमार"
                      className="w-full bg-ivory border border-ivory-dark rounded px-3 py-2 text-xs text-charcoal focus:outline-none focus:border-forest"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-charcoal mb-1 flex items-center space-x-1">
                      <Phone className="w-3.5 h-3.5 text-charcoal-muted" />
                      <span>{t('farmerPhoneLabel')}</span>
                    </label>
                    <input
                      type="tel"
                      value={farmerPhone}
                      onChange={(e) => setFarmerPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-ivory border border-ivory-dark rounded px-3 py-2 text-xs text-charcoal focus:outline-none focus:border-forest"
                    />
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-3">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-forest hover:bg-forest-light text-white text-xs font-semibold rounded shadow-xs flex items-center justify-center space-x-2 transition-colors"
                  >
                    <span>{t('reviewBtn')}</span>
                    <ArrowRight className="w-4 h-4 text-harvest" />
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Review Before Submitting (Mandatory UX Step) */}
            {step === 'review' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-ivory-dark pb-3">
                  <h2 className="text-sm font-bold text-charcoal flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-harvest text-forest-dark text-[11px] flex items-center justify-center font-bold">
                      2
                    </span>
                    <span>Review Complaint Before Submission</span>
                  </h2>
                  <span className="text-[11px] text-charcoal-muted">
                    Step 2 of 2: Confirmation
                  </span>
                </div>

                <p className="text-charcoal-muted text-xs leading-relaxed">
                  {t('reviewNotice')}
                </p>

                <div className="bg-ivory/60 border border-ivory-dark rounded p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2 pb-2 border-b border-ivory-dark">
                    <div>
                      <div className="text-[11px] text-charcoal-muted">Category</div>
                      <div className="font-semibold text-charcoal mt-0.5">
                        {getCategoryLabel(category)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-charcoal-muted">Location</div>
                      <div className="font-semibold text-charcoal mt-0.5">
                        {district}, {state}
                      </div>
                    </div>
                  </div>

                  {mandiCode && selectedMandiObj && (
                    <div className="pb-2 border-b border-ivory-dark">
                      <div className="text-[11px] text-charcoal-muted">Mandi Yard</div>
                      <div className="font-semibold text-charcoal mt-0.5">
                        {selectedMandiObj.nameEn} ({selectedMandiObj.code})
                      </div>
                    </div>
                  )}

                  <div className="pb-2 border-b border-ivory-dark">
                    <div className="text-[11px] text-charcoal-muted">Grievance Description</div>
                    <div className="text-charcoal mt-1 whitespace-pre-wrap leading-relaxed font-sans bg-white p-2.5 rounded border border-ivory-dark">
                      {description}
                    </div>
                  </div>

                  {(farmerName || farmerPhone) && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[11px] text-charcoal-muted">Farmer Contact</div>
                        <div className="font-medium text-charcoal mt-0.5">
                          {farmerName || 'Anonymous'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-charcoal-muted">Phone</div>
                        <div className="font-medium text-charcoal mt-0.5">
                          {farmerPhone || 'Not provided'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setStep('edit')}
                    disabled={registerMutation.isPending}
                    className="flex-1 py-2.5 px-4 bg-ivory hover:bg-ivory-dark border border-ivory-dark text-charcoal text-xs font-semibold rounded flex items-center justify-center space-x-1 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{t('backToEditBtn')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmSubmit}
                    disabled={registerMutation.isPending}
                    className="flex-1 py-2.5 px-4 bg-forest hover:bg-forest-light text-white text-xs font-semibold rounded shadow-xs flex items-center justify-center space-x-2 transition-colors disabled:opacity-60"
                  >
                    {registerMutation.isPending ? (
                      <span>Recording...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-harvest" />
                        <span>{t('confirmSubmitBtn')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Success Confirmation with Reference Number */}
            {step === 'success' && submittedComplaint && (
              <div className="space-y-4 text-xs text-center py-4">
                <div className="w-12 h-12 bg-forest text-harvest rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-7 h-7 stroke-[2.2]" />
                </div>

                <div>
                  <h2 className="text-base font-bold text-charcoal">
                    {t('complaintSuccessTitle')}
                  </h2>
                  <p className="text-xs text-charcoal-muted mt-1">
                    {t('complaintRefNotice')}
                  </p>
                </div>

                {/* Reference Number Card */}
                <div className="bg-forest-50 border border-forest/30 rounded-md p-4 max-w-sm mx-auto flex items-center justify-between">
                  <span className="font-mono text-base font-bold text-forest tracking-wider">
                    {submittedComplaint.referenceNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyReference(submittedComplaint.referenceNumber)}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded bg-white text-forest border border-forest/20 text-xs font-semibold hover:bg-forest hover:text-white transition-colors"
                  >
                    {copiedRef ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-forest" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-charcoal-muted max-w-md mx-auto leading-relaxed pt-2">
                  Status: <span className="font-semibold text-forest">RECORDED</span>. Your issue has been stored with official timestamp. Keep this reference number for follow-up and farmer union representation.
                </div>

                <div className="pt-3">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="px-4 py-2 bg-ivory hover:bg-ivory-dark border border-ivory-dark text-charcoal text-xs font-semibold rounded transition-colors"
                  >
                    Register Another Grievance
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Previously Recorded Complaints & Advocacy Stream */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-ivory-dark rounded-md p-5 shadow-subtle">
            <div className="flex items-center justify-between border-b border-ivory-dark pb-3 mb-3">
              <h2 className="text-xs font-bold text-charcoal uppercase tracking-wider flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-forest" />
                <span>{t('registeredComplaintsTitle')}</span>
              </h2>
              <span className="text-[11px] font-mono text-charcoal-muted">
                {complaints.length} Records
              </span>
            </div>

            {loadingComplaints && (
              <div className="p-6 flex justify-center">
                <LoadingSpinner />
              </div>
            )}

            {errorComplaints && (
              <div className="p-3 bg-ivory rounded text-xs text-charcoal-muted">
                Unable to load recent complaints.
              </div>
            )}

            {!loadingComplaints && !errorComplaints && complaints.length === 0 && (
              <div className="text-center py-8 text-charcoal-muted text-xs">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>{t('noComplaintsRecorded')}</p>
              </div>
            )}

            {!loadingComplaints && !errorComplaints && complaints.length > 0 && (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {complaints.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded border border-ivory-dark bg-ivory/30 space-y-1.5 hover:bg-ivory/60 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-forest">
                        {c.referenceNumber}
                      </span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-forest/10 text-forest">
                        {c.status}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-charcoal">
                      {getCategoryLabel(c.category)}
                    </div>

                    <p className="text-[11px] text-charcoal-muted line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>

                    <div className="pt-1.5 border-t border-ivory-dark flex items-center justify-between text-[10px] text-charcoal-muted">
                      <span>
                        {c.district}, {c.state}
                      </span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
