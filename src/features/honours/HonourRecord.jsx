import { honourCount } from "./honourMarks.js";

/* One ALTAIR-blue node per title, joined in constellations of five; a hollow node for a final. */
export function HonourTally({ mark }) {
  const count = honourCount(mark);

  if (!count) {
    return (
      <span className="record-tally record-tally--final" aria-hidden="true">
        <span className="record-tally-group"><i/></span>
      </span>
    );
  }

  const groups = [];
  for (let start = 0; start < count; start += 5) groups.push(Math.min(5, count - start));

  return (
    <span className="record-tally" aria-hidden="true">
      {groups.map((size, groupIndex) => (
        <span className="record-tally-group" key={groupIndex}>
          {Array.from({ length:size }, (_, index) => <i key={index}/>)}
        </span>
      ))}
    </span>
  );
}

export function HonourMark({ mark, result }) {
  const count = honourCount(mark);

  if (!count) return <span className="record-mark record-mark--final">{result}</span>;

  return (
    <span className="record-mark">
      <span aria-hidden="true">{count}<small>×</small></span>
      <span className="sr-only">{count} {result}</span>
    </span>
  );
}
