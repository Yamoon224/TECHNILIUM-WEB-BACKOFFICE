/**
 * The menu now lives in the application shell (AppShell: sidebar or
 * horizontal menu, top bar), drawn around every page from the root layout.
 * Pages still render this component; it deliberately draws nothing so they
 * need no change.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function BackofficeNav(_props: { onLogout?: () => void; roles?: readonly string[] }) {
  return null;
}
