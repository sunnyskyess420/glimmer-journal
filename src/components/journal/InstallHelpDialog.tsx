'use client';

import { THEMES, type ThemeColors } from '@/lib/constants';
import { useJournalStore } from '@/store/journal-store';

interface InstallHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function InstallHelpDialog({ open, onClose }: InstallHelpDialogProps) {
  const { theme } = useJournalStore();
  const t: ThemeColors = THEMES[theme];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: t.cardBg,
          border: `1px solid ${t.lightLine}`,
          boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 sticky top-0"
          style={{
            backgroundColor: t.cardBg,
            borderBottom: `1px solid ${t.lightLine}`,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>📲</span>
            <h2 className="text-base font-semibold" style={{ color: t.text }}>
              Install on your phone
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg"
            style={{ color: t.muted, minHeight: 36, minWidth: 36 }}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-5">
          <p className="text-sm" style={{ color: t.muted }}>
            Installing Glimmer Journal to your home screen lets it open full-screen
            like a real app — no browser address bar, no clutter. Pick your browser below.
          </p>

          {/* Android Brave */}
          <section>
            <h3 className="text-sm font-semibold mb-2" style={{ color: t.text }}>
              Brave (Android)
            </h3>
            <ol className="flex flex-col gap-2 text-sm" style={{ color: t.text }}>
              <li className="flex gap-2">
                <span className="font-bold shrink-0" style={{ color: t.btnBg }}>1.</span>
                <span>Tap the <strong>three-dot menu</strong> (⋮) at the top right of Brave.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0" style={{ color: t.btnBg }}>2.</span>
                <span>Tap <strong>"Add to Home screen"</strong> (or <strong>"Install app"</strong> on some Brave versions).</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0" style={{ color: t.btnBg }}>3.</span>
                <span>A dialog appears with the sunrise icon and "Glimmer Journal" name. Tap <strong>Add</strong> / <strong>Install</strong>.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0" style={{ color: t.btnBg }}>4.</span>
                <span>The sunrise icon appears on your home screen. Tap it to open Glimmer Journal full-screen.</span>
              </li>
            </ol>
          </section>

          {/* Android Chrome */}
          <section>
            <h3 className="text-sm font-semibold mb-2" style={{ color: t.text }}>
              Chrome (Android)
            </h3>
            <ol className="flex flex-col gap-2 text-sm" style={{ color: t.text }}>
              <li className="flex gap-2">
                <span className="font-bold shrink-0" style={{ color: t.btnBg }}>1.</span>
                <span>Tap the <strong>three-dot menu</strong> (⋮) at the top right of Chrome.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0" style={{ color: t.btnBg }}>2.</span>
                <span>Tap <strong>"Add to Home screen"</strong> (or <strong>"Install app"</strong>).</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0" style={{ color: t.btnBg }}>3.</span>
                <span>Tap <strong>Add</strong> / <strong>Install</strong> when the dialog appears.</span>
              </li>
            </ol>
          </section>

          {/* iPhone/iPad */}
          <section>
            <h3 className="text-sm font-semibold mb-2" style={{ color: t.text }}>
              iPhone / iPad (Safari only)
            </h3>
            <ol className="flex flex-col gap-2 text-sm" style={{ color: t.text }}>
              <li className="flex gap-2">
                <span className="font-bold shrink-0" style={{ color: t.btnBg }}>1.</span>
                <span>Open this site in <strong>Safari</strong> (PWA install only works from Safari on iOS — Chrome/Brave on iPhone won't work).</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0" style={{ color: t.btnBg }}>2.</span>
                <span>Tap the <strong>Share button</strong> (square with an arrow pointing up).</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0" style={{ color: t.btnBg }}>3.</span>
                <span>Scroll down and tap <strong>"Add to Home Screen"</strong>.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0" style={{ color: t.btnBg }}>4.</span>
                <span>Tap <strong>Add</strong> in the top right.</span>
              </li>
            </ol>
          </section>

          {/* Desktop */}
          <section>
            <h3 className="text-sm font-semibold mb-2" style={{ color: t.text }}>
              Desktop (Chrome, Edge, Brave)
            </h3>
            <ol className="flex flex-col gap-2 text-sm" style={{ color: t.text }}>
              <li className="flex gap-2">
                <span className="font-bold shrink-0" style={{ color: t.btnBg }}>1.</span>
                <span>Look for an <strong>install icon</strong> (⊕) in the right side of the address bar.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0" style={{ color: t.btnBg }}>2.</span>
                <span>Click it → <strong>Install</strong>. App opens in its own window.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0" style={{ color: t.btnBg }}>3.</span>
                <span>Or use the menu (⋮) → <strong>"Install Glimmer Journal..."</strong></span>
              </li>
            </ol>
          </section>

          <div
            className="rounded-lg p-3 mt-2"
            style={{ backgroundColor: t.hover, border: `1px solid ${t.lightLine}` }}
          >
            <p className="text-xs" style={{ color: t.muted }}>
              <strong style={{ color: t.text }}>Tip:</strong> If the install option isn't showing in Brave,
              tap the <strong>orange lion icon</strong> in the address bar and toggle
              <strong> Shields DOWN</strong> for this site, then refresh the page and try again.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 sticky bottom-0"
          style={{
            backgroundColor: t.cardBg,
            borderTop: `1px solid ${t.lightLine}`,
          }}
        >
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{
              backgroundColor: t.btnBg,
              color: t.btnFg,
              minHeight: 44,
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
