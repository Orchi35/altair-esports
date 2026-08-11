export function ClubBadge({ className, isAltair, label, ariaHidden = false }) {
  return (
    <div className={className} aria-hidden={ariaHidden || undefined}>
      {isAltair ? (
        <img src="/logo-ui.png" alt="" aria-hidden="true" className="club-badge-logo" width="256" height="256" loading="lazy" decoding="async" />
      ) : (
        label
      )}
    </div>
  );
}
