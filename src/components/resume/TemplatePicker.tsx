'use client';

import * as React from 'react';
import { RESUME_TEMPLATES, type TemplateTag } from './templateMeta';
import type { ResumeTemplate, ResumeMode } from '@/lib/adminApi';

/**
 * Visual template chooser. Reads the registry, so a new template appears here
 * automatically — no changes to this component.
 */

const TAG_COLORS: Record<TemplateTag, { bg: string; fg: string }> = {
  Employee:  { bg: 'rgba(59,130,246,0.14)',  fg: '#60a5fa' },
  Client:    { bg: 'rgba(168,85,247,0.14)',  fg: '#c084fc' },
  ATS:       { bg: 'rgba(34,197,94,0.14)',   fg: '#4ade80' },
  Executive: { bg: 'rgba(251,191,36,0.14)',  fg: '#fbbf24' },
  Corporate: { bg: 'rgba(148,163,184,0.16)', fg: '#cbd5e1' },
};

interface Props {
  value: ResumeTemplate;
  onChange: (id: ResumeTemplate) => void;
  /** When set, templates that don't support the mode are shown as unavailable. */
  mode?: ResumeMode;
}

export default function TemplatePicker({ value, onChange, mode }: Props) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
        gap: 12,
      }}
    >
      {RESUME_TEMPLATES.map((t) => {
        const selected = t.id === value;
        const unsupported = !!mode && !t.modeSupported.includes(mode);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => !unsupported && onChange(t.id)}
            disabled={unsupported}
            aria-pressed={selected}
            title={unsupported ? `Not available for ${mode} mode` : t.description}
            style={{
              textAlign: 'left',
              padding: 0,
              overflow: 'hidden',
              background: 'var(--bg-2)',
              border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--line)'}`,
              borderRadius: 'var(--r-md)',
              cursor: unsupported ? 'not-allowed' : 'pointer',
              opacity: unsupported ? 0.45 : 1,
              transition: 'border-color var(--t-fast)',
            }}
          >
            {/* Thumbnail — falls back to a neutral block if the asset is missing */}
            <div
              style={{
                position: 'relative',
                height: 132,
                background: '#fff',
                borderBottom: '1px solid var(--line)',
                overflow: 'hidden',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.thumbnail}
                alt={`${t.name} preview`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
              />
              {selected && (
                <span
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'var(--accent)', color: '#fff',
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                  }}
                >
                  SELECTED
                </span>
              )}
            </div>

            <div style={{ padding: '10px 12px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{t.name}</span>
                {t.atsOptimised && <span style={{ fontSize: 10, color: '#4ade80' }}>★</span>}
              </div>

              <p style={{ margin: '4px 0 8px', fontSize: 11, lineHeight: 1.45, color: 'var(--fg-4)' }}>
                {t.description}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {t.recommendedFor.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                      background: TAG_COLORS[tag].bg, color: TAG_COLORS[tag].fg,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
