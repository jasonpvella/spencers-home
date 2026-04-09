import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCurrentUser } from '@/hooks/useAuth';
import { useChild } from '@/hooks/useChildren';
import { createConsent } from '@/services/consent';
import { useToast } from '@/components/shared/Toaster';
import { DEFAULT_CONSENT_EXPIRY_DAYS, DEFAULT_YOUTH_ASSENT_AGE } from '@/config/constants';

const schema = z.object({
  signerName: z.string().min(2, 'Full name required'),
  signerRole: z.enum(['caseworker', 'supervisor', 'director', 'court'] as const),
  youthAssentObtained: z.boolean(),
  icwaTribalNotified: z.boolean(),
  acknowledged: z.literal(true, {
    errorMap: () => ({ message: 'You must read and acknowledge the consent statement' }),
  }),
});

type FormValues = z.infer<typeof schema>;

export default function ConsentFormPage() {
  const { id: childId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const stateId = user?.stateId ?? '';
  const userId = user?.id ?? '';

  const { child, loading } = useChild(stateId, childId ?? '');

  const { toast } = useToast();
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const [sigError, setSigError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      signerRole: 'caseworker',
      youthAssentObtained: false,
      icwaTribalNotified: false,
    },
  });

  function clearSignature() {
    sigCanvasRef.current?.clear();
    setSigError(null);
  }

  async function onSubmit(values: FormValues) {
    if (!childId || !child) return;

    const canvas = sigCanvasRef.current;
    if (!canvas || canvas.isEmpty()) {
      setSigError('Signature required');
      return;
    }
    setSigError(null);

    const signatureDataUrl = canvas.toDataURL('image/png');

    setSubmitting(true);
    setSubmitError(null);
    try {
      await createConsent({
        stateId,
        childId,
        signedBy: userId,
        signerRole: values.signerRole,
        expiryDays: DEFAULT_CONSENT_EXPIRY_DAYS,
        formData: {
          signerName: values.signerName,
          signerRole: values.signerRole,
          acknowledged: true,
          signatureDataUrl,
          // TODO: Replace with Nebraska DHHS-approved consent language before production
          consentLanguageVersion: 'placeholder-v1',
        },
        youthAssentObtained: values.youthAssentObtained,
        icwaTribalNotified: values.icwaTribalNotified,
      });
      toast('Consent saved — profile is ready to publish', 'success');
      navigate(`/profile/${childId}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save consent');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-sm text-gray-400 text-center">
        Loading…
      </div>
    );
  }

  if (!child) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-sm text-red-500 text-center">
        Profile not found.
      </div>
    );
  }

  const requireYouthAssent = child.ageAtListing >= DEFAULT_YOUTH_ASSENT_AGE;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Consent to List — {child.firstName}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          This consent authorizes listing {child.firstName}'s profile on the digital gallery.
          Once signed, the profile can be published.
        </p>
      </div>

      {/* Legal placeholder notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-xs text-amber-800">
        <strong>Note:</strong> This consent form uses placeholder language. It must be reviewed
        and replaced with Nebraska DHHS-approved consent language before going live with real
        children's data.
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Signer info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-700">Signer information</h2>

          <div>
            <label className="block text-sm text-gray-700 mb-1" htmlFor="signerName">
              Full name of person signing <span className="text-red-500">*</span>
            </label>
            <input
              id="signerName"
              type="text"
              {...register('signerName')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="First and last name"
            />
            {errors.signerName && (
              <p className="text-xs text-red-500 mt-1">{errors.signerName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1" htmlFor="signerRole">
              Authority <span className="text-red-500">*</span>
            </label>
            <select
              id="signerRole"
              {...register('signerRole')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="caseworker">Caseworker</option>
              <option value="supervisor">Supervisor</option>
              <option value="director">Agency Director</option>
              <option value="court">Court Order</option>
            </select>
          </div>
        </div>

        {/* Consent statement */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-700">Consent statement</h2>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed space-y-3 border border-gray-100">
            <p>
              I, the undersigned, acting in my authorized capacity as identified above, hereby
              consent to the listing of {child.firstName} on the Spencer's Home digital
              recruitment gallery. I confirm that:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-gray-600">
              <li>
                This child has been legally freed for adoption or is an eligible foster youth
                whose participation in adoption recruitment is appropriate.
              </li>
              <li>
                The information included in this profile does not contain any personally
                identifiable information prohibited by state or federal law, including last
                name, school name, or geographic identifiers.
              </li>
              <li>
                I have the authority to authorize this listing under applicable state law and
                agency policy.
              </li>
              <li>
                This consent is valid for {DEFAULT_CONSENT_EXPIRY_DAYS} days from the date
                of signing and must be renewed upon expiration.
              </li>
              <li>
                I understand this listing may be removed or unpublished at any time by agency
                staff.
              </li>
            </ul>
            <p className="text-xs text-gray-400 italic">
              Placeholder consent language — version placeholder-v1. Replace before
              production use with Nebraska DHHS-approved text.
            </p>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('acknowledged')}
              className="w-4 h-4 mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700">
              I have read the consent statement above and confirm all statements are accurate
              to the best of my knowledge. <span className="text-red-500">*</span>
            </span>
          </label>
          {errors.acknowledged && (
            <p className="text-xs text-red-500">{errors.acknowledged.message}</p>
          )}
        </div>

        {/* Conditional checkboxes */}
        {(requireYouthAssent || child.icwaFlag) && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-medium text-gray-700">Additional requirements</h2>

            {requireYouthAssent && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('youthAssentObtained')}
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">
                  Youth assent has been obtained.{' '}
                  <span className="text-gray-400">
                    ({child.firstName} is {child.ageAtListing} years old — assent required at age{' '}
                    {DEFAULT_YOUTH_ASSENT_AGE}+)
                  </span>
                </span>
              </label>
            )}

            {child.icwaFlag && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('icwaTribalNotified')}
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">
                  Tribal notification has been completed per ICWA requirements.
                </span>
              </label>
            )}
          </div>
        )}

        {/* Signature */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700">
              Signature <span className="text-red-500">*</span>
            </h2>
            <button
              type="button"
              onClick={clearSignature}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear
            </button>
          </div>

          <div
            className={`rounded-xl border-2 overflow-hidden ${
              sigError ? 'border-red-400' : 'border-gray-200'
            }`}
          >
            <SignatureCanvas
              ref={sigCanvasRef}
              canvasProps={{
                className: 'w-full',
                style: { height: 160, background: '#fafafa', display: 'block' },
              }}
              penColor="#111827"
              onEnd={() => setSigError(null)}
            />
          </div>
          {sigError && <p className="text-xs text-red-500">{sigError}</p>}
          <p className="text-xs text-gray-400">Draw your signature above using mouse or touch.</p>
        </div>

        {submitError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {submitError}
          </p>
        )}

        <div className="flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate(`/profile/${childId}`)}
            className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Saving consent…' : 'Sign and save consent'}
          </button>
        </div>
      </form>
    </div>
  );
}
