import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCurrentUser } from '@/hooks/useAuth';
import { useChild, useChildActions } from '@/hooks/useChildren';
import { INTERESTS_LIST, GENDER_OPTIONS } from '@/config/constants';
import { checkForPii } from '@/utils/pii';
import { useToast } from '@/components/shared/Toaster';
import MediaUpload from '@/components/profile/MediaUpload';
import type { Gender } from '@/types';

const schema = z.object({
  firstName: z.string().min(1, 'First name required').max(200),
  ageAtListing: z.coerce.number().int().min(0).max(21),
  gender: z.enum(['male', 'female', 'nonbinary', 'undisclosed', 'sibling_group'] as const),
  ages: z.string().max(200).optional(),
  bio: z.string().max(1000).optional(),
  interests: z.array(z.string()).min(0),
  icwaFlag: z.boolean(),
  icwaNotes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  mode: 'create' | 'edit';
}

export default function ProfileFormPage({ mode }: Props) {
  const { id: childId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const stateId = user?.stateId ?? '';
  const userId = user?.id ?? '';

  const [savedChildId, setSavedChildId] = useState<string | null>(null);

  const effectiveChildId = savedChildId ?? (mode === 'edit' ? (childId ?? '') : '');
  const { child, loading: loadingChild, reload } = useChild(
    effectiveChildId ? stateId : '',
    effectiveChildId
  );

  const { create, update, saving, error } = useChildActions(stateId, userId);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      firstName: '',
      ageAtListing: 0,
      gender: 'undisclosed' as Gender,
      ages: '',
      bio: '',
      interests: [],
      icwaFlag: false,
      icwaNotes: '',
    },
  });

  const gender = watch('gender');
  const isSiblingGroup = gender === 'sibling_group';
  const icwaFlag = watch('icwaFlag');
  const bioValue = watch('bio') ?? '';
  const piiWarnings = checkForPii(bioValue);

  useEffect(() => {
    if (mode === 'edit' && child) {
      reset({
        firstName: child.firstName,
        ageAtListing: child.ageAtListing,
        gender: child.gender,
        ages: child.ages ?? '',
        bio: child.bio ?? '',
        interests: child.interests,
        icwaFlag: child.icwaFlag,
        icwaNotes: child.icwaNotes ?? '',
      });
    }
  }, [child, mode, reset]);

  async function onSubmit(values: FormValues) {
    if (!stateId) {
      toast('Your account is missing a state assignment. Contact a platform admin.', 'error');
      return;
    }

    const isGroup = values.gender === 'sibling_group';

    const payload = {
      firstName: values.firstName,
      ageAtListing: isGroup ? 0 : values.ageAtListing,
      gender: values.gender,
      ...(isGroup && values.ages ? { ages: values.ages } : {}),
      bio: values.bio ?? '',
      interests: values.interests,
      icwaFlag: values.icwaFlag,
      icwaNotes: values.icwaNotes ?? '',
      photoUrls: mode === 'edit' ? (child?.photoUrls ?? []) : [],
      ...(mode === 'edit' && child?.videoUrl ? { videoUrl: child.videoUrl } : {}),
      status: mode === 'edit' ? (child?.status ?? 'draft') : ('draft' as const),
      consentStatus: mode === 'edit' ? (child?.consentStatus ?? 'not_obtained') : ('not_obtained' as const),
      ...(mode === 'edit' && child?.consentId ? { consentId: child.consentId } : {}),
      createdBy: mode === 'edit' ? (child?.createdBy ?? userId) : userId,
    };

    if (mode === 'create') {
      const newId = await create(payload);
      toast('Profile created', 'success');
      setSavedChildId(newId);
    } else if (childId) {
      await update(childId, payload);
      toast('Profile saved', 'success');
      navigate(`/profile/${childId}`);
    }
  }

  if (mode === 'edit' && loadingChild) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-sm text-gray-400 text-center">
        Loading profile…
      </div>
    );
  }

  // After create: show media capture step before navigating to the profile
  if (savedChildId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Add Photos & Video</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Profile saved as draft. Capture media now or skip and add it later.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {child ? (
            <MediaUpload child={child} userId={userId} onUpdate={reload} />
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => navigate(`/profile/${savedChildId}`)}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            Continue to profile →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          {mode === 'create' ? 'New Profile' : `Edit — ${child?.firstName ?? ''}`}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {mode === 'create'
            ? 'Profile saves as draft. Add media and consent before publishing.'
            : 'Changes save immediately.'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic information */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-700">Basic information</h2>

          {/* Gender — shown first so sibling_group selection reshapes the rest of the form */}
          <div>
            <label className="block text-sm text-gray-700 mb-1" htmlFor="gender">
              Profile type
            </label>
            <select
              id="gender"
              {...register('gender')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* First name / Names */}
          <div>
            <label className="block text-sm text-gray-700 mb-1" htmlFor="firstName">
              {isSiblingGroup ? 'First names' : 'First name'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              id="firstName"
              type="text"
              {...register('firstName')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder={
                isSiblingGroup
                  ? 'e.g. Emma, Liam, and Sofia'
                  : "Child's first name only"
              }
            />
            {isSiblingGroup && (
              <p className="text-xs text-gray-400 mt-1">
                Separate names with a comma, and use "and" before the last name — e.g. Emma, Liam, and Sofia.
              </p>
            )}
            {errors.firstName && (
              <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>
            )}
          </div>

          {/* Age at listing (individuals only) or Ages (sibling groups) */}
          {isSiblingGroup ? (
            <div>
              <label className="block text-sm text-gray-700 mb-1" htmlFor="ages">
                Ages
              </label>
              <input
                id="ages"
                type="text"
                {...register('ages')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. 7, 9, 12"
              />
              <p className="text-xs text-gray-400 mt-1">
                If more than one child, separate each age with a comma.
              </p>
              {errors.ages && (
                <p className="text-xs text-red-500 mt-1">{errors.ages.message}</p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm text-gray-700 mb-1" htmlFor="ageAtListing">
                Age at listing <span className="text-red-500">*</span>
              </label>
              <input
                id="ageAtListing"
                type="number"
                min={0}
                max={21}
                {...register('ageAtListing')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {errors.ageAtListing && (
                <p className="text-xs text-red-500 mt-1">{errors.ageAtListing.message}</p>
              )}
            </div>
          )}
        </div>

        {/* Bio */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-700">
            {isSiblingGroup ? 'About this sibling group' : 'Bio'}
          </h2>
          <div>
            <label className="block text-sm text-gray-700 mb-1" htmlFor="bio">
              {isSiblingGroup ? 'Group description' : 'About this child'}
            </label>
            <textarea
              id="bio"
              rows={5}
              {...register('bio')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder={
                isSiblingGroup
                  ? 'Write about the group as a whole. No last names, school names, location, or case history.'
                  : 'Write in first or third person. No last name, school name, location, or case history.'
              }
            />
            {piiWarnings.length > 0 && (
              <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-0.5">
                <p className="text-xs font-medium text-red-700">Possible PII detected — review before saving:</p>
                {piiWarnings.map((w, i) => (
                  <p key={i} className="text-xs text-red-600">
                    "{w.match}" — {w.label}
                  </p>
                ))}
              </div>
            )}
            {piiWarnings.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">
                Do not include last name, school, location, or case details.
              </p>
            )}
            {errors.bio && <p className="text-xs text-red-500 mt-1">{errors.bio.message}</p>}
          </div>
        </div>

        {/* Interests */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-medium text-gray-700">
            {isSiblingGroup ? 'Shared interests / traits' : 'Interests'}
          </h2>
          <Controller
            name="interests"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {INTERESTS_LIST.map((interest) => {
                  const selected = field.value.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => {
                        field.onChange(
                          selected
                            ? field.value.filter((i) => i !== interest)
                            : [...field.value, interest]
                        );
                      }}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        selected
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
                      }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            )}
          />
        </div>

        {/* ICWA */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-medium text-gray-700">ICWA</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('icwaFlag')}
              className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700">
              Indian Child Welfare Act (ICWA) may apply
            </span>
          </label>

          {icwaFlag && (
            <div>
              <label className="block text-sm text-gray-700 mb-1" htmlFor="icwaNotes">
                ICWA notes
              </label>
              <textarea
                id="icwaNotes"
                rows={3}
                {...register('icwaNotes')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder="Tribal affiliation status, notification sent date, etc."
              />
            </div>
          )}
        </div>

        {mode === 'edit' && child && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Media</h2>
            <MediaUpload child={child} userId={userId} onUpdate={reload} />
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate(mode === 'edit' && childId ? `/profile/${childId}` : '/dashboard')}
            className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Create profile' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
