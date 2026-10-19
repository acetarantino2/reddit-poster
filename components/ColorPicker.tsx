'use client';

import { PRESET_COLORS } from '@/lib/constants';
import { cx } from './ui';

export default function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Colour">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className={cx('size-7 rounded-md transition-transform', value === c ? 'ring-2 ring-offset-2 ring-offset-panel ring-ink scale-95' : 'hover:scale-105')}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}
