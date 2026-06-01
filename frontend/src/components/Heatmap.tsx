import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import type { HeatmapDay } from '../lib/types';
import styles from './Heatmap.module.css';

interface Props {
  data: HeatmapDay[];
}

function intensity(hours: number, topicCount: number): number {
  if (hours > 0) return Math.min(1, 0.2 + hours / 6);
  if (topicCount > 0) return 0.18;
  return 0;
}

function cellColor(hours: number, topicCount: number): string {
  const t = intensity(hours, topicCount);
  if (t === 0) return '#2a2a35';
  return `color-mix(in srgb, var(--amber) ${(t * 100).toFixed(0)}%, #2a2a35)`;
}

const LEGEND_STEPS: Array<[number, number]> = [
  [0, 0],
  [1, 0],
  [3, 0],
  [5, 0],
  [8, 0],
];

/**
 * One contiguous month rendered as its own mini-grid. Columns are weeks
 * (length 7, day-of-week aligned). A week that straddles two months produces
 * a partial column at the end of one block and another partial column at the
 * start of the next — so cells under a month label only ever belong to that
 * month.
 */
interface MonthBlock {
  monthName: string;
  startsNew: boolean;
  columns: (HeatmapDay | null)[][];
}

export default function Heatmap({ data }: Props) {
  const [hover, setHover] = useState<HeatmapDay | null>(null);

  const monthBlocks = useMemo<MonthBlock[]>(() => {
    if (data.length === 0) return [];
    const blocks: Array<MonthBlock & { monthIdx: number; yearIdx: number }> = [];

    for (const day of data) {
      const dt = parseISO(day.date);
      const monthIdx = dt.getMonth();
      const yearIdx = dt.getFullYear();
      const dow = dt.getDay();

      let block = blocks[blocks.length - 1];
      const startingBlock =
        !block || block.monthIdx !== monthIdx || block.yearIdx !== yearIdx;

      if (startingBlock) {
        block = {
          monthName: format(dt, 'MMM'),
          monthIdx,
          yearIdx,
          startsNew: blocks.length > 0,
          columns: [],
        };
        blocks.push(block);
      }

      // Start a new column at the very start of a block, or whenever the
      // current day is a Sunday — that keeps every visible column aligned to
      // calendar weeks even when months split mid-week.
      if (startingBlock || dow === 0 || block.columns.length === 0) {
        block.columns.push(Array(7).fill(null));
      }

      const col = block.columns[block.columns.length - 1];
      col[dow] = day;
    }
    return blocks;
  }, [data]);

  return (
    <div className={styles.wrap}>
      <div className={styles.monthRow}>
        {monthBlocks.map((block, i) => (
          <span
            key={i}
            className={`${styles.monthLabel} ${block.startsNew ? styles.newMonth : ''}`}
            style={{ flex: block.columns.length }}
          >
            {block.monthName}
          </span>
        ))}
      </div>

      <div className={styles.grid}>
        {monthBlocks.map((block, bi) => (
          <div
            key={bi}
            className={`${styles.block} ${block.startsNew ? styles.newMonth : ''}`}
            style={{ flex: block.columns.length }}
          >
            {block.columns.map((col, ci) => (
              <div key={ci} className={styles.col}>
                {col.map((d, ri) =>
                  d === null ? (
                    <span
                      key={`pad-${bi}-${ci}-${ri}`}
                      className={`${styles.cell} ${styles.empty}`}
                    />
                  ) : (
                    <span
                      key={d.date}
                      className={styles.cell}
                      style={{ background: cellColor(d.hours, d.topic_count) }}
                      onMouseEnter={() => setHover(d)}
                      onMouseLeave={() => setHover((h) => (h === d ? null : h))}
                    />
                  ),
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className={styles.legend}>
        <span>less</span>
        <span className={styles.legendCells}>
          {LEGEND_STEPS.map(([h, t], i) => (
            <span
              key={i}
              className={styles.cell}
              style={{ background: cellColor(h, t) }}
              title={`${h}h`}
            />
          ))}
        </span>
        <span>more</span>
        <span className={`${styles.tooltip} ${hover ? '' : styles.empty}`}>
          {hover
            ? `${format(parseISO(hover.date), 'EEE, MMM d')} · ${hover.hours.toFixed(1)}h · ${hover.topic_count} topic${hover.topic_count === 1 ? '' : 's'}`
            : 'hover a cell'}
        </span>
      </div>
    </div>
  );
}
