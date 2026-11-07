export const GITHUB_REPO_URL = 'https://github.com/buddypia/SitRight.me';

export function GitHubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 1.8a10.2 10.2 0 0 0-3.22 19.88c.51.1.7-.22.7-.49v-1.72c-2.85.62-3.45-1.37-3.45-1.37-.46-1.18-1.14-1.5-1.14-1.5-.93-.63.07-.62.07-.62 1.03.07 1.57 1.05 1.57 1.05.91 1.57 2.4 1.11 2.98.85.09-.66.36-1.11.65-1.37-2.27-.26-4.66-1.14-4.66-5.06 0-1.12.4-2.03 1.05-2.75-.1-.26-.46-1.3.1-2.71 0 0 .86-.28 2.81 1.05a9.76 9.76 0 0 1 5.12 0c1.95-1.33 2.81-1.05 2.81-1.05.56 1.41.2 2.45.1 2.71.65.72 1.05 1.63 1.05 2.75 0 3.93-2.4 4.8-4.68 5.05.37.32.7.94.7 1.9v2.82c0 .27.18.6.7.49A10.2 10.2 0 0 0 12 1.8Z" />
    </svg>
  );
}

export function GitHubLink({
  label = 'GitHub',
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={GITHUB_REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-2 transition hover:bg-white/5 hover:text-ink-1 ${className}`}
    >
      <GitHubIcon />
    </a>
  );
}
