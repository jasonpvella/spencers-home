import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCurrentUser } from '@/hooks/useAuth';
import { useChild, useChildActions } from '@/hooks/useChildren';
import { INTERESTS_LIST, GENDER_OPTIONS } from '@/config/constants';
import type { Gender } from '@/types';

const schema = z.object({
  firstName: z.string().min(1, 'First name required').max(50),
  ageAtListing: z.coerce.number().int().min(0).max(21),
  gender: z.enum(['male', 'female', 'nonbinary', 'undisclosed'] as const),
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

  const { child, loading: loadingChild } = useChild(
    mode === 'edit' ? stateId : '',
    mode === 'edit' ? (childId ?? '') : ''
  );

  const { create, update, saving, error } = useChildActions(stateId, userId);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      ageAtListing: 0,
      gender: 'undisclosed' as Gender,
      bio: '',
      interests: [],
      icwaFlag: false,
      icwaNotes: '',
    },
  });

  const icwaFlag = watch('icwaFlag');

  useEffect(() => {
    if (mode === 'edit' && child) {
      reset({
        firstName: child.firstName,
        ageAtListing: child.ageAtListing,
        gender: child.gender,
        bio: child.bio ?? '',
        interests: child.interests,
        icwaFlag: child.icwaFlag,
        icwaNotes: child.icwaNotes ?? '',
      });
    }
  }, [child, mode, reset]);

  async function onSubmit(values: FormValues) {
    const payload = {
      firstName: values.firstName,
      ageAtListing: values.ageAtListing,
      gender: values.gender,
      bio: values.bio ?? '',
      interests: values.interests,
      icwaFlag: values.icwaFlag,
      icwaNotes: values.icwaNotes,
      photoUrls: mode === 'edit' ? (child?.photoUrls ?? []) : [],
      videoUrl: mode === 'edit' ? child?.videoUrl : undefined,
      status: mode === 'edit' ? (child?.status ?? 'draft') : ('draft' as const),
      consentStatus: mode === 'edit' ? (child?.consentStatus ?? 'not_obtained') : ('not_obtained' as const),
      consentId: mode === 'edit' ? child?.consentId : undefined,
      createdBy: mode === 'edit' ? (child?.createdBy ?? userId) : userId,
    };

    if (mode === 'create') {
      const newId = await create(payload);
      navigate(`/profile/${newId}`);
    } else if (childId) {
      await update(childId, payload);
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
        {/* Name + Age + Gender */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-700">Basic information</h2>

          <div>
            <label className="block text-sm text-gray-700 mb-1" htmlFor="firstName">
              First name <span className="text-red-500">*</span>
            </label>
            <input
              id="firstName"
              type="text"
              {...register('firstName')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Child's first name only"
            />
            {errors.firstName && (
              <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div>
              <label className="block text-sm text-gray-700 mb-1" htmlFor="gender">
                Gender
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
          </div>
        </div>

        {/* Bio */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-700">Bio</h2>
          <div>
            <label className="block text-sm text-gray-700 mb-1" htmlFor="bio">
              About this child
            </label>
            <textarea
              id="bio"
              rows={5}
              {...register('bio')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Write in first or third person. No last name, school name, location, or case history."
            />
            <p className="text-xs text-gray-400 mt-1">
              Do not include last name, school, location, or case details.
            </p>
            {errors.bio && <p className="text-xs text-red-500 mt-1">{errors.bio.message}</p>}
          </div>
        </div>

        {/* Interests */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-medium text-gray-700">Interests</h2>
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
