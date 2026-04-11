import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCurrentUser } from '@/hooks/useAuth';
import { getStateConfig, saveStateConfig } from '@/services/stateConfig';
import { getSsoProvider, saveSsoProvider } from '@/services/sso';
import { uploadStateLogo } from '@/services/storage';
import { useToast } from '@/components/shared/Toaster';
import type { StateConfig } from '@/types';

const schema = z.object({
  stateName: z.string().min(1, 'Required'),
  agencyName: z.string().min(1, 'Required'),
  consentModel: z.enum(['caseworker', 'supervisor', 'director', 'court'] as const),
  consentExpiryDays: z.coerce.number().int().min(30, 'Minimum 30 days').max(730, 'Maximum 730 days'),
  requireYouthAssentAge: z.coerce.number().int().min(0).max(21),
  icwaEnabled: z.boolean(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color e.g. #1d4ed8'),
  customDomain: z.string().optional(),
  firstNameOnly: z.boolean(),
  noSchoolNames: z.boolean(),
  noLocationIdentifiers: z.boolean(),
  ssoEnabled: z.boolean(),
  ssoProviderType: z.enum(['saml', 'oidc'] as const),
  ssoProviderId: z.string(),
  ssoDisplayName: z.string(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  stateName: '',
  agencyName: '',
  consentModel: 'supervisor',
  consentExpiryDays: 365,
  requireYouthAssentAge: 12,
  icwaEnabled: true,
  primaryColor: '#1d4ed8',
  customDomain: '',
  firstNameOnly: true,
  noSchoolNames: true,
  noLocationIdentifiers: true,
  ssoEnabled: false,
  ssoProviderType: 'saml' as const,
  ssoProviderId: '',
  ssoDisplayName: '',
};

export default function StateConfigPage() {
  const user = useCurrentUser();
  const stateId = user?.stateId ?? '';
  const userId = user?.id ?? '';

  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [existing, setExisting] = useState<StateConfig | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!stateId) return;
    Promise.all([getStateConfig(stateId), getSsoProvider(stateId)])
      .then(([config, sso]) => {
        setExisting(config);
        reset({
          stateName: config?.stateName ?? '',
          agencyName: config?.agencyName ?? '',
          consentModel: config?.consentModel ?? 'supervisor',
          consentExpiryDays: config?.consentExpiryDays ?? 365,
          requireYouthAssentAge: config?.requireYouthAssentAge ?? 12,
          icwaEnabled: config?.icwaEnabled ?? true,
          primaryColor: config?.branding?.primaryColor ?? '#1d4ed8',
          customDomain: config?.branding?.customDomain ?? '',
          firstNameOnly: config?.piiRules?.firstNameOnly ?? true,
          noSchoolNames: config?.piiRules?.noSchoolNames ?? true,
          noLocationIdentifiers: config?.piiRules?.noLocationIdentifiers ?? true,
          ssoEnabled: sso?.enabled ?? false,
          ssoProviderType: sso?.providerType ?? 'saml',
          ssoProviderId: sso?.providerId ?? '',
          ssoDisplayName: sso?.displayName ?? '',
        });
      })
      .catch(() => toast('Failed to load state configuration', 'error'))
      .finally(() => setLoading(false));
  }, [stateId]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !stateId) return;
    setLogoUploading(true);
    try {
      const url = await uploadStateLogo(stateId, file);
      setExisting((prev) => prev
        ? { ...prev, branding: { ...prev.branding, logoUrl: url } }
        : { stateId, stateName: '', agencyName: '', consentModel: 'supervisor', consentExpiryDays: 365, requireYouthAssentAge: 12, icwaEnabled: true, galleryTiers: { public: { showFullName: false, showAge: true, showBio: true, showVideo: true, showPhotos: true }, registered: { showFullName: false, showAge: true, showBio: true, showVideo: true, showPhotos: true }, agency: { showFullName: true, showAge: true, showBio: true, showVideo: true, showPhotos: true } }, branding: { primaryColor: '#1d4ed8', logoUrl: url }, piiRules: { firstNameOnly: true, noSchoolNames: true, noLocationIdentifiers: true, additionalRules: [] } }
      );
      toast('Logo uploaded', 'success');
    } catch {
      toast('Logo upload failed', 'error');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  }

  async function onSubmit(values: FormValues) {
    if (!stateId) return;
    setSaving(true);
    try {
      const config: StateConfig = {
        stateId,
        stateName: values.stateName,
        agencyName: values.agencyName,
        consentModel: values.consentModel,
        consentExpiryDays: values.consentExpiryDays,
        requireYouthAssentAge: values.requireYouthAssentAge,
        icwaEnabled: values.icwaEnabled,
        galleryTiers: existing?.galleryTiers ?? {
          public: { showFullName: false, showAge: true, showBio: true, showVideo: true, showPhotos: true },
          registered: { showFullName: false, showAge: true, showBio: true, showVideo: true, showPhotos: true },
          agency: { showFullName: true, showAge: true, showBio: true, showVideo: true, showPhotos: true },
        },
        branding: {
          primaryColor: values.primaryColor,
          logoUrl: existing?.branding?.logoUrl,
          customDomain: values.customDomain?.trim() || undefined,
        },
        piiRules: {
          firstNameOnly: values.firstNameOnly,
          noSchoolNames: values.noSchoolNames,
          noLocationIdentifiers: values.noLocationIdentifiers,
          additionalRules: existing?.piiRules?.additionalRules ?? [],
        },
      };
      await saveStateConfig(stateId, config, userId);
      setExisting(config);

      const ssoPayload = {
        providerType: values.ssoProviderType,
        providerId: values.ssoProviderId,
        displayName: values.ssoDisplayName,
        enabled: values.ssoEnabled,
      };
      await saveSsoProvider(stateId, ssoPayload, userId);

      toast('State configuration saved', 'success');
    } catch {
      toast('Failed to save configuration', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-sm text-gray-400 text-center">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">State Configuration</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Branding, consent model, and PII rules for {stateId}.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Agency info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-700">Agency information</h2>

          <div>
            <label className="block text-sm text-gray-700 mb-1" htmlFor="stateName">
              State name <span className="text-red-500">*</span>
            </label>
            <input
              id="stateName"
              type="text"
              {...register('stateName')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Nebraska"
            />
            {errors.stateName && (
              <p className="text-xs text-red-500 mt-1">{errors.stateName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1" htmlFor="agencyName">
              Agency name <span className="text-red-500">*</span>
            </label>
            <input
              id="agencyName"
              type="text"
              {...register('agencyName')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Nebraska DHHS"
            />
            {errors.agencyName && (
              <p className="text-xs text-red-500 mt-1">{errors.agencyName.message}</p>
            )}
          </div>
        </div>

        {/* Branding */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-700">Branding</h2>

          <div>
            <label className="block text-sm text-gray-700 mb-1" htmlFor="primaryColor">
              Primary color <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                id="primaryColor"
                type="text"
                {...register('primaryColor')}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="#1d4ed8"
              />
              <input
                type="color"
                aria-hidden="true"
                tabIndex={-1}
                className="w-9 h-9 rounded border border-gray-200 cursor-pointer p-0.5"
                onChange={(e) => {
                  const input = document.getElementById('primaryColor') as HTMLInputElement | null;
                  if (input) input.value = e.target.value;
                }}
              />
            </div>
            {errors.primaryColor && (
              <p className="text-xs text-red-500 mt-1">{errors.primaryColor.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Agency logo</label>
            {existing?.branding?.logoUrl && (
              <div className="mb-2 p-2 border border-gray-200 rounded-lg inline-flex">
                <img
                  src={existing.branding.logoUrl}
                  alt="Current logo"
                  className="h-10 w-auto max-w-[180px] object-contain"
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <label className={`cursor-pointer text-sm border border-gray-300 hover:border-gray-400 px-3 py-2 rounded-lg transition-colors ${logoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                {logoUploading ? 'Uploading…' : existing?.branding?.logoUrl ? 'Replace logo' : 'Upload logo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="sr-only"
                  onChange={handleLogoUpload}
                  disabled={logoUploading}
                />
              </label>
              <p className="text-xs text-gray-400">PNG, JPG, SVG or WebP — shown in the nav bar</p>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1" htmlFor="customDomain">
              Custom domain
            </label>
            <input
              id="customDomain"
              type="text"
              {...register('customDomain')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="nebraska.spencershome.org"
            />
            <p className="text-xs text-gray-400 mt-1">
              Configure DNS and Firebase Hosting separately. This field stores the intended domain for reference.
            </p>
          </div>
        </div>

        {/* Consent model */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-700">Consent model</h2>

          <div>
            <label className="block text-sm text-gray-700 mb-1" htmlFor="consentModel">
              Minimum signing authority <span className="text-red-500">*</span>
            </label>
            <select
              id="consentModel"
              {...register('consentModel')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="caseworker">Caseworker</option>
              <option value="supervisor">Supervisor</option>
              <option value="director">Agency Director</option>
              <option value="court">Court Order</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1" htmlFor="consentExpiryDays">
              Consent expiry (days) <span className="text-red-500">*</span>
            </label>
            <input
              id="consentExpiryDays"
              type="number"
              {...register('consentExpiryDays')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.consentExpiryDays && (
              <p className="text-xs text-red-500 mt-1">{errors.consentExpiryDays.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1" htmlFor="requireYouthAssentAge">
              Youth assent required at age <span className="text-red-500">*</span>
            </label>
            <input
              id="requireYouthAssentAge"
              type="number"
              {...register('requireYouthAssentAge')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.requireYouthAssentAge && (
              <p className="text-xs text-red-500 mt-1">{errors.requireYouthAssentAge.message}</p>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('icwaEnabled')}
              className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700">ICWA tracking enabled for this state</span>
          </label>
        </div>

        {/* PII rules */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-medium text-gray-700">PII rules</h2>
          <p className="text-xs text-gray-400">
            These rules are enforced at the profile editor level. All are enabled by default and cannot be disabled without platform admin approval.
          </p>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('firstNameOnly')}
              className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700">First name only — no last names in any field</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('noSchoolNames')}
              className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700">No school names</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('noLocationIdentifiers')}
              className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700">No location identifiers (street, neighborhood, city)</span>
          </label>
        </div>

        {/* SSO */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700">Single Sign-On (SSO)</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('ssoEnabled')}
                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700">Enable SSO</span>
            </label>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
            The SSO provider must first be configured in <strong>Firebase Console → Authentication → Sign-in method</strong> before enabling this. The Provider ID below must match the ID you assigned there (e.g. <code>saml.ne-dhhs</code> or <code>oidc.ne-okta</code>).
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1" htmlFor="ssoProviderType">
                Provider type
              </label>
              <select
                id="ssoProviderType"
                {...register('ssoProviderType')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="saml">SAML 2.0</option>
                <option value="oidc">OIDC / OAuth 2.0</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1" htmlFor="ssoProviderId">
                Provider ID
              </label>
              <input
                id="ssoProviderId"
                type="text"
                {...register('ssoProviderId')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="saml.ne-dhhs"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1" htmlFor="ssoDisplayName">
              Button label
            </label>
            <input
              id="ssoDisplayName"
              type="text"
              {...register('ssoDisplayName')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Nebraska DHHS — appears on the login page"
            />
            <p className="text-xs text-gray-400 mt-1">
              Shown on the login page as "Sign in with [label]"
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
