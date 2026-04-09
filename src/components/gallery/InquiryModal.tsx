import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { submitInquiry } from '@/services/inquiries';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  message: z.string().min(10, 'Please write a brief message').max(1000),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  childFirstName: string;
  stateId: string;
  childId: string;
}

export default function InquiryModal({ childFirstName, stateId, childId }: Props) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      await submitInquiry(stateId, childId, values);
      setSubmitted(true);
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    }
  }

  function handleClose(val: boolean) {
    setOpen(val);
    if (!val) {
      setTimeout(() => {
        setSubmitted(false);
        setSubmitError(null);
        reset();
      }, 300);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Trigger asChild>
        <button className="w-full mt-3 text-sm bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-xl transition-colors">
          I'm interested in {childFirstName}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-2xl shadow-xl p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <Dialog.Title className="text-lg font-semibold text-gray-900 mb-1">
            Reach out about {childFirstName}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-gray-500 mb-5">
            A caseworker will follow up with you. Your contact information is kept private.
          </Dialog.Description>

          {submitted ? (
            <div className="text-center py-4 space-y-3">
              <p className="text-2xl">✓</p>
              <p className="text-sm font-medium text-gray-900">Message received</p>
              <p className="text-sm text-gray-500">
                A caseworker will be in touch with you soon about {childFirstName}.
              </p>
              <button
                onClick={() => handleClose(false)}
                className="text-sm text-brand-600 hover:text-brand-800 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="inq-message">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="inq-message"
                  rows={4}
                  {...register('message')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  placeholder="Tell us a little about yourself and why you're interested…"
                />
                {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message.message}</p>}
              </div>

              {submitError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {submitError}
                </p>
              )}

              <div className="flex gap-2 justify-end">
                <Dialog.Close asChild>
                  <button type="button" className="text-sm text-gray-500 hover:text-gray-800 px-4 py-2">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="text-sm bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Sending…' : 'Send message'}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
