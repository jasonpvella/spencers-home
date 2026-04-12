import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useAuth';
import { getAllSponsors, addSponsor, deleteSponsor, updateSponsorActive } from '@/services/sponsors';
import { uploadSponsorLogo } from '@/services/storage';
import { useToast } from '@/components/shared/Toaster';
import type { Sponsor } from '@/types';

export default function AdminSponsorsPage() {
  const user = useCurrentUser();
  const { toast } = useToast();

  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-sponsor form state
  const [name, setName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [order, setOrder] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAllSponsors()
      .then(setSponsors)
      .catch(() => toast('Failed to load sponsors', 'error'))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !name.trim()) return;
    setSaving(true);
    try {
      const logoUrl = await uploadSponsorLogo(file);
      const id = await addSponsor({
        name: name.trim(),
        logoUrl,
        linkUrl: linkUrl.trim() || undefined,
        order,
        active: true,
        uploadedBy: user?.id ?? '',
      });
      setSponsors((prev) => [
        ...prev,
        { id, name: name.trim(), logoUrl, linkUrl: linkUrl.trim() || undefined, order, active: true, uploadedBy: user?.id ?? '', createdAt: null as never },
      ]);
      setName('');
      setLinkUrl('');
      setOrder(0);
      setFile(null);
      toast('Sponsor added', 'success');
    } catch {
      toast('Failed to add sponsor', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, active: boolean) {
    try {
      await updateSponsorActive(id, !active);
      setSponsors((prev) => prev.map((s) => s.id === id ? { ...s, active: !active } : s));
    } catch {
      toast('Failed to update sponsor', 'error');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSponsor(id);
      setSponsors((prev) => prev.filter((s) => s.id !== id));
      toast('Sponsor removed', 'success');
    } catch {
      toast('Failed to delete sponsor', 'error');
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Sponsors</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Sponsor logos shown in the "Our Partners &amp; Sponsors" section on the landing page.
        </p>
      </div>

      {/* Add sponsor form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Add sponsor</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1" htmlFor="spon-name">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="spon-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Arkansas Project Zero"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1" htmlFor="spon-order">
                Display order
              </label>
              <input
                id="spon-order"
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1" htmlFor="spon-link">
              Link URL
            </label>
            <input
              id="spon-link"
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.org"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Logo <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer text-sm border border-gray-300 hover:border-gray-400 px-3 py-2 rounded-lg transition-colors">
                {file ? file.name : 'Choose image'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <p className="text-xs text-gray-400">PNG, JPG, SVG or WebP</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !file || !name.trim()}
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? 'Uploading…' : 'Add sponsor'}
            </button>
          </div>
        </form>
      </div>

      {/* Sponsor list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-700">Current sponsors</h2>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400 px-4 py-8 text-center">Loading…</p>
        ) : sponsors.length === 0 ? (
          <p className="text-sm text-gray-400 px-4 py-8 text-center">No sponsors yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sponsors.map((sponsor) => (
              <li key={sponsor.id} className="flex items-center gap-4 px-4 py-3">
                <div className="w-20 h-10 flex items-center justify-center flex-shrink-0 border border-gray-100 rounded-lg p-1 bg-gray-50">
                  <img
                    src={sponsor.logoUrl}
                    alt={sponsor.name}
                    className="max-h-8 max-w-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{sponsor.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    Order: {sponsor.order}
                    {sponsor.linkUrl && ` · ${sponsor.linkUrl}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(sponsor.id, sponsor.active)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                      sponsor.active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {sponsor.active ? 'Active' : 'Hidden'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(sponsor.id)}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
