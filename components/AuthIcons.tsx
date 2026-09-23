export function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="white" aria-hidden="true">
      <path d="M16.004 3C9.008 3 3.334 8.641 3.334 15.6c0 2.45.68 4.738 1.86 6.69L3 29l6.897-1.807a12.74 12.74 0 0 0 6.107 1.548c6.996 0 12.67-5.64 12.67-12.6C28.674 8.64 23 3 16.004 3Zm0 23.04a10.5 10.5 0 0 1-5.36-1.47l-.385-.228-4.09.9.878-4-.25-.412a10.36 10.36 0 0 1-1.583-5.23c0-5.73 4.677-10.38 10.79-10.38 5.73 0 10.4 4.65 10.4 10.38 0 5.73-4.67 10.44-10.4 10.44Z" />
      <path d="M21.94 18.42c-.32-.16-1.88-.93-2.17-1.03-.29-.11-.5-.16-.72.16-.21.32-.83 1.03-1.02 1.24-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.74-.99-2.39-.26-.62-.53-.54-.72-.55l-.61-.01c-.21 0-.56.08-.85.4-.29.32-1.12 1.1-1.12 2.68 0 1.58 1.15 3.11 1.31 3.32.16.21 2.27 3.47 5.5 4.86.77.33 1.37.53 1.84.68.77.25 1.47.21 2.02.13.62-.09 1.88-.77 2.14-1.51.27-.75.27-1.39.19-1.52-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  );
}

export function GoogleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20c11.045 0 20-8.955 20-20 0-1.341-.138-2.65-.389-3.917Z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z"
      />
    </svg>
  );
}

export function PhoneIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 3.8 9 3.1c.7-.2 1.4.2 1.7.9l1 2.5c.2.6.1 1.2-.4 1.6l-1.5 1.2a13.8 13.8 0 0 0 4.9 4.9l1.2-1.5c.4-.5 1-.6 1.6-.4l2.5 1c.7.3 1.1 1 .9 1.7l-.7 2.5c-.2.7-.8 1.2-1.5 1.2C11.2 18.8 5.2 12.8 5.3 5.3c0-.7.5-1.3 1.2-1.5Z" />
    </svg>
  );
}

export function ShieldStarIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="shieldGrad" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#00458F" />
        </linearGradient>
      </defs>
      <path d="M24 4 40 9.6v12.6C40 33 33.2 40.3 24 44 14.8 40.3 8 33 8 22.2V9.6Z" fill="#DCE9FF" stroke="url(#shieldGrad)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M24 13.5 26.9 19.5 33.5 20.5 28.7 25.2 29.9 31.7 24 28.6 18.1 31.7 19.3 25.2 14.5 20.5 21.1 19.5Z" fill="url(#shieldGrad)" />
    </svg>
  );
}

export function PeopleStarIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="peopleGrad" x1="6" y1="6" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <path d="M13.2 4 14.6 7.2 17.8 8.6 14.6 10 13.2 13.2 11.8 10 8.6 8.6 11.8 7.2Z" fill="url(#peopleGrad)" />
      <circle cx="30.5" cy="17" r="5.2" fill="url(#peopleGrad)" opacity="0.9" />
      <path d="M30.5 24c-4.8 0-10 2.3-10.9 6.6 2 2.3 5.4 3.8 10.9 3.8 6.1 0 10.6-1.9 12.7-4.6v-1c0-4.9-7.8-6.9-12.7-4.8Z" fill="url(#peopleGrad)" opacity="0.9" />
      <circle cx="18" cy="20" r="6.6" fill="url(#peopleGrad)" />
      <path d="M18 28.4c-6.6 0-12.2 3.2-12.2 8.7V39h24.4v-1.9c0-5.5-5.6-8.7-12.2-8.7Z" fill="url(#peopleGrad)" />
    </svg>
  );
}

export function CheckCircleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="checkGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22D3A6" />
          <stop offset="1" stopColor="#0D9488" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="20" fill="url(#checkGrad)" />
      <path d="M15 24.8 20.6 30.4 33 17" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SparkleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M18 4 21 15 32 18 21 21 18 32 15 21 4 18 15 15Z" fill="#FBBF24" />
      <path d="M31 26 32.4 30.6 37 32 32.4 33.4 31 38 29.6 33.4 25 32 29.6 30.6Z" fill="#FBBF24" opacity="0.85" />
    </svg>
  );
}

export function ShieldMarkIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 19 5.4v5.8c0 4.6-3 8-7 9.8-4-1.8-7-5.2-7-9.8V5.4Z" />
      <path d="M9.2 12 11.3 14.1 15 10" strokeLinecap="round" />
    </svg>
  );
}
