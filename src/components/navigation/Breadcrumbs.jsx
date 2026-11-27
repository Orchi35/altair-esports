// The trail is drawn as a short constellation path: every step is a node,
// the page you are on is the bright one at the end.
export function Breadcrumbs({ items, label }) {
  return (
    <nav className="content-breadcrumbs" aria-label={label}>
      <ol>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className={isCurrent ? "is-current" : undefined}>
              <span className="crumb-node" aria-hidden="true"/>
              {item.href && !isCurrent
                ? <a href={item.href}>{item.label}</a>
                : <span aria-current={isCurrent ? "page" : undefined}>{item.label}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
