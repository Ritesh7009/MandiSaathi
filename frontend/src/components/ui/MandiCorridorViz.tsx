import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { MapPin, Trophy, TrendUp } from '@phosphor-icons/react';
import { PriceRecord } from '../../types';

interface MandiCorridorVizProps {
  records: PriceRecord[];
  bestRecord: PriceRecord;
  commodityLabel: string;
  getMandiLabel: (r: PriceRecord) => string;
  title: string;
  subtitle: string;
}

/**
 * ThreeUI-inspired APMC Market Corridor Arc Visualizer.
 * Plots comparative price spread flow arcs from participating mandis into the highest-realization hub,
 * keeping labels tabular, crisp, and interactive across light & dark themes without multiple WebGL contexts.
 */
export const MandiCorridorViz: React.FC<MandiCorridorVizProps> = ({
  records,
  bestRecord,
  commodityLabel,
  getMandiLabel,
  title,
  subtitle,
}) => {
  const reduce = useReducedMotion();
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  if (!records || records.length < 2) return null;

  const peers = records.filter((r) => r.id !== bestRecord.id);
  const svgW = 680;
  const svgH = 210;
  const hubX = svgW - 115;
  const hubY = svgH / 2;

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card space-y-4 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <TrendUp weight="duotone" className="w-4 h-4 text-canopy dark:text-canopy-bright shrink-0" />
            <h2 className="font-display text-sm sm:text-base font-bold text-ink">{title}</h2>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-canopy-soft text-canopy dark:text-canopy-bright border border-canopy/20 self-start sm:self-auto">
          {commodityLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Interactive Market Arc Topology Canvas */}
        <div className="lg:col-span-7 rounded-xl bg-surface-subtle/70 border border-line p-3 overflow-hidden">
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="w-full h-auto block select-none"
            role="img"
            aria-label={`${title}: ${commodityLabel}`}
          >
            <defs>
              <linearGradient id="msCorridorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--ms-saffron)" stopOpacity="0.85" />
                <stop offset="100%" stopColor="var(--ms-emerald-bright)" stopOpacity="0.95" />
              </linearGradient>
              <radialGradient id="msHubGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--ms-emerald-bright)" stopOpacity="0.32" />
                <stop offset="100%" stopColor="var(--ms-emerald-bright)" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Subtle latitudinal hairline grid */}
            {[42, 105, 168].map((y) => (
              <line
                key={y}
                x1={16}
                y1={y}
                x2={svgW - 16}
                y2={y}
                stroke="var(--ms-border)"
                strokeDasharray="3 5"
              />
            ))}

            {/* Hub glow halo */}
            <circle cx={hubX} cy={hubY} r={54} fill="url(#msHubGlow)" />

            {/* Flow paths from peer mandis -> best mandi hub */}
            {peers.map((peer, idx) => {
              const stepY = peers.length === 1 ? hubY : 36 + (idx * (svgH - 72)) / Math.max(peers.length - 1, 1);
              const startX = 115;
              const ctrlX = (startX + hubX) * 0.52;
              const ctrlY = stepY < hubY ? stepY - 26 : stepY + 26;
              const pathD = `M ${startX} ${stepY} Q ${ctrlX} ${ctrlY} ${hubX} ${hubY}`;
              const spread = bestRecord.modalPrice - peer.modalPrice;
              const isHighlighted = hoveredId === peer.id;

              return (
                <g
                  key={peer.id}
                  onMouseEnter={() => setHoveredId(peer.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="cursor-pointer"
                >
                  <motion.path
                    d={pathD}
                    fill="none"
                    stroke="url(#msCorridorGrad)"
                    strokeWidth={isHighlighted ? 3.2 : 2}
                    strokeLinecap="round"
                    initial={reduce ? false : { pathLength: 0, opacity: 0.3 }}
                    animate={{ pathLength: 1, opacity: isHighlighted ? 1 : 0.78 }}
                    transition={{ duration: 0.65, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  />

                  {/* Origin Node */}
                  <circle
                    cx={startX}
                    cy={stepY}
                    r={isHighlighted ? 7 : 5.5}
                    fill="var(--ms-surface)"
                    stroke="var(--ms-saffron)"
                    strokeWidth="2.5"
                  />

                  {/* Left Label */}
                  <text
                    x={startX - 12}
                    y={stepY - 4}
                    textAnchor="end"
                    fill="var(--ms-text)"
                    fontSize="11"
                    fontWeight="600"
                    fontFamily="Outfit, sans-serif"
                  >
                    {getMandiLabel(peer).slice(0, 16)}
                  </text>
                  <text
                    x={startX - 12}
                    y={stepY + 11}
                    textAnchor="end"
                    fill="var(--ms-text-muted)"
                    fontSize="10"
                    fontFamily="Fira Code, monospace"
                  >
                    ₹{peer.modalPrice.toLocaleString('en-IN')} ({spread > 0 ? `-₹${spread}` : 'Equal'})
                  </text>
                </g>
              );
            })}

            {/* Winning Mandi Target Hub Node */}
            <circle
              cx={hubX}
              cy={hubY}
              r={12}
              fill="var(--ms-emerald)"
              stroke="var(--ms-surface)"
              strokeWidth="3"
            />
            <text
              x={hubX + 18}
              y={hubY - 4}
              textAnchor="start"
              fill="var(--ms-text)"
              fontSize="12"
              fontWeight="700"
              fontFamily="Outfit, sans-serif"
            >
              {getMandiLabel(bestRecord).slice(0, 15)}
            </text>
            <text
              x={hubX + 18}
              y={hubY + 12}
              textAnchor="start"
              fontSize="11"
              fontWeight="700"
              fontFamily="Fira Code, monospace"
              className="fill-canopy dark:fill-canopy-bright"
            >
              ₹{bestRecord.modalPrice.toLocaleString('en-IN')}
            </text>
          </svg>
        </div>

        {/* Interactive Node Delta Chips */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="p-3.5 rounded-xl bg-canopy-soft border border-canopy/25 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Trophy weight="fill" className="w-4 h-4 text-canopy dark:text-canopy-bright shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-ink truncate">{getMandiLabel(bestRecord)}</div>
                <div className="text-[11px] text-ink-muted truncate">{bestRecord.state}</div>
              </div>
            </div>
            <span className="font-mono tnum text-sm font-bold text-canopy dark:text-canopy-bright shrink-0">
              ₹{bestRecord.modalPrice.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {peers.map((peer) => {
              const delta = bestRecord.modalPrice - peer.modalPrice;
              const isHighlighted = hoveredId === peer.id;
              return (
                <button
                  key={peer.id}
                  type="button"
                  onMouseEnter={() => setHoveredId(peer.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(peer.id)}
                  onBlur={() => setHoveredId(null)}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isHighlighted
                      ? 'bg-saffron-soft border-saffron/40'
                      : 'bg-surface-subtle/70 border-line hover:border-line-strong'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin weight="duotone" className="w-3.5 h-3.5 text-saffron shrink-0" />
                    <span className="text-xs font-medium text-ink truncate">{getMandiLabel(peer)}</span>
                  </div>
                  <div className="text-right font-mono tnum text-[11px] shrink-0">
                    <span className="text-ink font-semibold">
                      ₹{peer.modalPrice.toLocaleString('en-IN')}
                    </span>{' '}
                    <span className="text-saffron-text font-semibold">
                      ({delta > 0 ? `-₹${delta}` : '₹0'})
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
