"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { Badge, STATUS_TONE } from "./Badge";
import { useI18n, type DictKey } from "@/lib/i18n";

function Avatar({ src, name, size = 48 }: { src?: string | null; name: string; size?: number }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} loading="lazy" className="shrink-0 rounded-2xl border border-line object-cover" style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden="true" className="grid shrink-0 place-items-center rounded-2xl bg-canari-blue-soft font-black text-canari-blue" style={{ width: size, height: size }}>{initial}</span>
  );
}

const cardCls =
  "group block rounded-card border border-line bg-white p-4 shadow-soft transition duration-150 " +
  "hover:-translate-y-0.5 hover:shadow-card-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-canari-blue/25";

function Wrap({ href, onClick, children, className }: { href?: string; onClick?: () => void; children: ReactNode; className?: string }) {
  if (href) return <Link href={href} className={cn(cardCls, className)}>{children}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cn(cardCls, "w-full text-left", className)}>{children}</button>;
  return <div className={cn(cardCls, "hover:translate-y-0 hover:shadow-soft", className)}>{children}</div>;
}

export function JobCard({ title, company, logoUrl, meta, matchPercent, href, onClick, action, className }: {
  title: string; company?: string | null; logoUrl?: string | null; meta?: Array<string | null | undefined>; matchPercent?: number | null;
  href?: string; onClick?: () => void; action?: ReactNode; className?: string;
}) {
  const details = (meta ?? []).filter(Boolean).join(" · ");
  return (
    <Wrap href={href} onClick={onClick} className={className}>
      <div className="flex items-start gap-3">
        <Avatar src={logoUrl} name={company || title} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[15px] font-black leading-5 text-ink">{title}</h3>
          {company && <p className="mt-0.5 truncate text-xs font-bold text-canari-blue">{company}</p>}
          {details && <p className="mt-1 truncate text-xs text-muted">{details}</p>}
        </div>
        {typeof matchPercent === "number" && (
          <Badge tone={matchPercent >= 80 ? "green" : matchPercent >= 50 ? "yellow" : "slate"} className="shrink-0">{matchPercent}%</Badge>
        )}
      </div>
      {action && <div className="mt-3">{action}</div>}
    </Wrap>
  );
}

export function ProfileCard({ name, subtitle, avatarUrl, meta, badge, href, onClick, action, className }: {
  name: string; subtitle?: string | null; avatarUrl?: string | null; meta?: string | null; badge?: ReactNode;
  href?: string; onClick?: () => void; action?: ReactNode; className?: string;
}) {
  return (
    <Wrap href={href} onClick={onClick} className={className}>
      <div className="flex items-center gap-3">
        <Avatar src={avatarUrl} name={name} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><h3 className="truncate text-[15px] font-black text-ink">{name}</h3>{badge}</div>
          {subtitle && <p className="truncate text-xs font-bold text-canari-blue">{subtitle}</p>}
          {meta && <p className="truncate text-xs text-muted">{meta}</p>}
        </div>
        {action}
      </div>
    </Wrap>
  );
}

export function ApplicationCard({ title, subtitle, status, date, avatarUrl, href, onClick, action, score, className }: {
  title: string; subtitle?: string | null; status: string; date?: string | null; avatarUrl?: string | null;
  href?: string; onClick?: () => void; action?: ReactNode; score?: number | null; className?: string;
}) {
  const { t, formatDate } = useI18n();
  const key = `status.${status}` as DictKey;
  const label = t(key) === key ? status : t(key);
  return (
    <Wrap href={href} onClick={onClick} className={className}>
      <div className="flex items-start gap-3">
        <Avatar src={avatarUrl} name={title} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-black text-ink">{title}</h3>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[status] ?? "slate"} dot>{label}</Badge>
            {typeof score === "number" && <Badge tone="blue">ATS {score}</Badge>}
            {date && <span className="text-[11px] text-muted">{formatDate(date)}</span>}
          </div>
        </div>
        {action}
      </div>
    </Wrap>
  );
}
