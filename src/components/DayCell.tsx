import type { DayEntry, DayStatus, PublicHoliday } from '../types';
import { isWeekend, parseDate, todayStr } from '../utils/dateUtils';

interface Props {
  dateStr: string;
  entry?: DayEntry;
  holiday?: PublicHoliday;
  onClick: () => void;
}

type StyleKey = DayStatus | 'holiday' | 'weekend';

const STYLES: Record<StyleKey, string> = {
  wfo:     'bg-emerald-50  border-emerald-300 text-emerald-700',
  wfh:     'bg-sky-50      border-sky-300     text-sky-700',
  sick:    'bg-amber-50    border-amber-300   text-amber-700',
  annual:  'bg-purple-50   border-purple-300  text-purple-700',
  none:    'bg-white       border-gray-200    text-gray-600',
  holiday: 'bg-rose-50     border-rose-300    text-rose-600',
  weekend: 'bg-gray-50     border-gray-200    text-gray-400',
};

const EMOJI: Partial<Record<DayStatus, string>> = {
  wfo: '🏢', wfh: '🏠', sick: '🤒', annual: '🌴',
};

export default function DayCell({ dateStr, entry, holiday, onClick }: Props) {
  const today   = todayStr();
  const isToday = dateStr === today;
  const weekend = isWeekend(dateStr);
  const dayNum  = parseDate(dateStr).getDate();

  let key: StyleKey = 'none';
  if (weekend)                         key = 'weekend';
  else if (holiday && !entry)          key = 'holiday';
  else if (entry && entry.status !== 'none') key = entry.status;

  return (
    <button
      onClick={weekend ? undefined : onClick}
      disabled={weekend}
      title={holiday?.name}
      className={[
        'relative w-full min-h-15.5 rounded-xl border-2 flex flex-col items-center',
        'justify-center gap-0.5 py-1.5 transition-all duration-100 select-none',
        STYLES[key],
        !weekend
          ? 'hover:shadow-md hover:-translate-y-0.5 active:scale-95 cursor-pointer'
          : 'cursor-default opacity-70',
        isToday ? 'ring-2 ring-amber-400 ring-offset-1' : '',
      ].join(' ')}
    >
      {/* Day number */}
      <span className={`text-sm font-bold leading-none ${isToday ? 'text-amber-600' : ''}`}>
        {dayNum}
      </span>

      {/* Entry emoji */}
      {entry && entry.status !== 'none' && (
        <span className="text-base leading-none">{EMOJI[entry.status]}</span>
      )}

      {/* Holiday short name (only when no entry) */}
      {holiday && !entry && (
        <span className="text-[10px] leading-tight text-center px-1 font-medium line-clamp-2">
          {holiday.name.split(' ').slice(0, 2).join(' ')}
        </span>
      )}

      {/* Today indicator dot */}
      {isToday && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white" />
      )}
    </button>
  );
}