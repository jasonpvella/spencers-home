import { useRef, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useChild } from '@/hooks/useChildren';
import { submitInquiry } from '@/services/inquiries';
import { recordProfileView } from '@/services/children';


const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
  'New Hampshire','New Jersey','New Mexico','New York','North Carolina',
  'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
  'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming',
  'District of Columbia',
];

// Google's public test site key — replace with real key via VITE_RECAPTCHA_SITE_KEY
const RECAPTCHA_SITE_KEY =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  phone: z.string().min(7, 'Valid phone number required'),
  email: z.string().email('Valid email required'),
  inquirerState: z.string().min(1, 'Please select your state'),
  message: z.string().min(10, 'Please write a brief message').max(1000),
});
type FormValues = z.infer<typeof schema>;

export default function PublicProfilePage() {
  const { stateId, childId } = useParams<{ stateId: string; childId: string }>();
  const { child, loading, error } = useChild(stateId ?? '', childId ?? '');

  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<ReCAPTCHA>(null);
  const viewRecorded = useRef(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!stateId || !childId || viewRecorded.current) return;
    viewRecorded.current = true;
    recordProfileView(stateId, childId).catch(() => undefined);
  }, [stateId, childId]);

  async function onSubmit(values: FormValues) {
    if (!captchaToken) return;
    if (!stateId || !childId || !child) return;
    setSubmitError(null);
    try {
      await submitInquiry(stateId, childId, values, {
        caseworkerUserId: child.createdBy,
        childFirstName: child.firstName,
      });
      setSubmitted(true);
    } catch {
      setSubmitError('Something went wrong. Please try again.');
      captchaRef.current?.reset();
      setCaptchaToken(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-gray-400">Loading…</span>
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500 text-sm">This profile isn't available.</p>
        <Link to="/gallery" className="text-sm text-brand-600 hover:underline">← Back to gallery</Link>
      </div>
    );
  }

  const hasVideo = Boolean(child.videoUrl);
  const hasPhoto = child.photoUrls.length > 0;

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Nav */}
      <header className="bg-white border-b border-gray-200 px-4 h-14 flex items-center">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <Link to="/gallery" className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back to gallery
          </Link>
          <span className="font-semibold text-gray-900 text-sm">Spencer's Home</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {/* Media */}
        <div className="rounded-2xl overflow-hidden bg-gray-100 aspect-video">
          {hasVideo ? (
            <video
              src={child.videoUrl}
              poster={hasPhoto ? child.photoUrls[0] : undefined}
              controls
              className="w-full h-full object-cover"
            />
          ) : hasPhoto ? (
            <img
              src={child.photoUrls[0]}
              alt={`${child.firstName}'s photo`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl text-gray-300">👤</span>
            </div>
          )}
        </div>

        {/* Additional photos */}
        {child.photoUrls.length > 1 && (
          <div className="grid grid-cols-3 gap-2">
            {child.photoUrls.slice(1).map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`${child.firstName} photo ${i + 2}`}
                className="rounded-xl object-cover aspect-square w-full"
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
        )}

        {/* Child info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{child.firstName}</h1>
            <span className="text-gray-400 text-sm">{child.ageAtListing} years old</span>
          </div>

          {child.bio && (
            <p className="text-gray-700 leading-relaxed">{child.bio}</p>
          )}

          {child.interests.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {child.interests.map((interest) => (
                <span
                  key={interest}
                  className="text-sm bg-brand-50 text-brand-700 border border-brand-100 px-3 py-1 rounded-full"
                >
                  {interest}
                </span>
              ))}
            </div>
          )}

          {child.siblingGroupIds && child.siblingGroupIds.length > 0 && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              {child.firstName} is part of a sibling group and will need to be placed together.
            </p>
          )}
        </div>

        {/* Inquiry form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Reach out about {child.firstName}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            A caseworker will follow up with you. Your contact information is kept private.
          </p>

          {submitted ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-600">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p className="font-medium text-gray-900">Message received</p>
              <p className="text-sm text-gray-500">
                A caseworker will be in touch with you soon about {child.firstName}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="inq-name">
                    Your name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="inq-name"
                    type="text"
                    autoComplete="name"
                    {...register('name')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="inq-phone">
                    Phone number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="inq-phone"
                    type="tel"
                    autoComplete="tel"
                    {...register('phone')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="inq-email">
                    Email address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="inq-email"
                    type="email"
                    autoComplete="email"
                    {...register('email')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="inq-state">
                    Your state <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="inq-state"
                    {...register('inquirerState')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    <option value="">Select a state…</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.inquirerState && <p className="text-xs text-red-500 mt-1">{errors.inquirerState.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="inq-message">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="inq-message"
                  rows={4}
                  {...register('message')}
                  placeholder="Tell us a little about yourself and why you're interested…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
                {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message.message}</p>}
              </div>

              <ReCAPTCHA
                ref={captchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={(token) => setCaptchaToken(token)}
                onExpired={() => setCaptchaToken(null)}
              />

              {submitError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !captchaToken}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50 text-sm"
              >
                {isSubmitting ? 'Sending…' : `Send message about ${child.firstName}`}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
