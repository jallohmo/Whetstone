import Link from "next/link";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { AvatarUploader } from "./AvatarUploader";

/**
 * Left-column profile card (screens 9c/14c): photo uploader + identity. The
 * advisor variant adds a Verified pill and a "View public profile" link.
 */
export function ProfileCard({
  userId,
  name,
  email,
  meta,
  avatarUrl,
  verified,
  publicProfileHref,
}: {
  userId: string;
  name: string;
  email: string;
  meta: string;
  avatarUrl: string | null;
  verified?: boolean;
  publicProfileHref?: string | null;
}) {
  return (
    <div className="rounded-xl bg-white p-card text-center shadow-card">
      <AvatarUploader userId={userId} name={name} avatarUrl={avatarUrl} />
      <p className="mt-4 text-h3 text-ink">{name}</p>
      <p className="mt-0.5 truncate text-sm text-gray-500">{email}</p>

      {verified && (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
          <BadgeCheck size={14} strokeWidth={2} /> Verified advisor
        </span>
      )}
      <p className="mt-3 text-sm text-gray-500">{meta}</p>

      {publicProfileHref && (
        <div className="mt-4 border-t border-dashed border-gray-300 pt-4">
          <Link
            href={publicProfileHref}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue hover:underline"
          >
            <ExternalLink size={14} strokeWidth={2} />
            View public profile
          </Link>
        </div>
      )}
    </div>
  );
}
