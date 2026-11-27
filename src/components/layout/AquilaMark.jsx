// Aquila, the Eagle, plotted from its brightest stars (east on the left, as on a star chart).
// Altair (alpha) is drawn in ALTAIR blue: it is the club's namesake.
const STARS = {
  alpha:[72, 83],
  gamma:[84, 66],
  beta:[61, 108],
  eta:[68, 162],
  theta:[21, 180],
  delta:[135, 141],
  iota:[107, 185],
  lambda:[184, 221],
  zeta:[186, 33],
  epsilon:[200, 21],
};

const SEGMENTS = [
  ["epsilon", "zeta"], ["zeta", "delta"], ["delta", "lambda"], ["delta", "iota"], ["delta", "alpha"],
  ["gamma", "alpha"], ["alpha", "beta"], ["beta", "eta"], ["eta", "theta"],
];

const MINOR_SIZE = { gamma:2.6, beta:2.4, delta:2.4, zeta:2.4, lambda:2, epsilon:2, theta:2, eta:1.8, iota:1.6 };

export function AquilaMark({ className = "", label = "Altair", missing = false }) {
  const [ax, ay] = STARS.alpha;
  return (
    <svg className={`aquila-mark ${className}`} viewBox="0 0 212 232" aria-hidden="true" focusable="false">
      <g className="aquila-lines">
        {SEGMENTS.map(([from, to]) => (
          <line key={`${from}-${to}`} x1={STARS[from][0]} y1={STARS[from][1]} x2={STARS[to][0]} y2={STARS[to][1]}/>
        ))}
      </g>
      {missing && (
        <g className="aquila-missing">
          <line x1={STARS.delta[0]} y1={STARS.delta[1]} x2="160" y2="92"/>
          <circle cx="160" cy="92" r="7"/>
        </g>
      )}
      <g className="aquila-stars">
        {Object.entries(MINOR_SIZE).map(([name, radius]) => (
          <circle key={name} cx={STARS[name][0]} cy={STARS[name][1]} r={radius}/>
        ))}
      </g>
      <g className="aquila-altair">
        <circle className="aquila-altair-halo" cx={ax} cy={ay} r="13"/>
        <path className="aquila-altair-spark" d={`M${ax} ${ay - 15}V${ay + 15}M${ax - 15} ${ay}H${ax + 15}`}/>
        <circle className="aquila-altair-core" cx={ax} cy={ay} r="4.6"/>
        {label && <text className="aquila-altair-label" x={ax - 18} y={ay + 4} textAnchor="end">{label}</text>}
      </g>
    </svg>
  );
}
