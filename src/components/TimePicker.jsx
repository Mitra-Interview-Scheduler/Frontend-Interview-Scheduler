import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTimeFormat } from '@/context/TimeFormatContext';

const  TimePicker = ({ value, onChange, label, isEnd = false, minTime = null, maxTime = null }) => {
  const { is12h, is24h } = useTimeFormat();

  // Parse time string (HH:mm format)
  const [hours, minutes] = useMemo(() => {
    const parts = (value || '09:00').split(':');
    return [parts[0] || '00', parts[1] || '00'];
  }, [value]);

  // Handle hour input change
  const handleHourChange = (e) => {
    const inputValue = e.target.value;
    let displayH = parseInt(inputValue) || (is12h ? 12 : 0);

    // Validate based on format
    if (is12h) {
      displayH = Math.max(1, Math.min(12, displayH));
      // Convert 12h to 24h: preserve current AM/PM
      const currentHours = parseInt(hours);
      const isPM = currentHours >= 12;
      let h = displayH === 12 ? (isPM ? 12 : 0) : displayH + (isPM ? 12 : 0);
      h = Math.max(0, Math.min(23, h));
      const newTime = `${String(h).padStart(2, '0')}:${minutes}`;
      onChange(newTime);
    } else {
      displayH = Math.max(0, Math.min(23, displayH));
      const newTime = `${String(displayH).padStart(2, '0')}:${minutes}`;
      onChange(newTime);
    }
  };

  // Handle minute input change
  const handleMinuteChange = (e) => {
    const inputValue = e.target.value;
    const m = Math.max(0, Math.min(59, parseInt(inputValue) || 0));
    const newTime = `${hours}:${String(m).padStart(2, '0')}`;
    onChange(newTime);
  };

  // Convert 24h to 12h for display
  const displayHours = is12h ? ((parseInt(hours) % 12) || 12) : hours;
  const period = is12h ? (parseInt(hours) >= 12 ? 'PM' : 'AM') : '';

  return (
    <div className="space-y-2">
      <label className="font-semibold text-sm">{label}</label>
      <div className="flex items-center gap-1 p-2 border-2 border-indigo-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-indigo-400">
        {/* Hour Input */}
        <input
          type="number"
          min={is12h ? 1 : 0}
          max={is12h ? 12 : 23}
          value={displayHours}
          onChange={handleHourChange}
          className="w-12 text-center font-bold text-lg border-0 bg-transparent focus:outline-none"
          placeholder={is12h ? '12' : '09'}
        />

        {/* Separator */}
        <span className="text-2xl font-bold text-indigo-400">:</span>

        {/* Minute Input */}
        <input
          type="number"
          min="0"
          max="59"
          value={minutes}
          onChange={handleMinuteChange}
          className="w-12 text-center font-bold text-lg border-0 bg-transparent focus:outline-none"
          placeholder="00"
        />

        {/* AM/PM Toggle for 12h format */}
        {is12h && (
          <>
            <span className="text-sm text-muted-foreground mx-0">·</span>
            <button
              type="button"
              onClick={() => {
                const h = parseInt(hours);
                const newHours = h >= 12 ? h - 12 : h + 12;
                const newTime = `${String(newHours).padStart(2, '0')}:${minutes}`;
                onChange(newTime);
              }}
              className="px-2 py-1 text-xs font-semibold rounded bg-indigo-100 hover:bg-indigo-200 transition-colors text-indigo-700 whitespace-nowrap"
            >
              {period}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

TimePicker.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
  isEnd: PropTypes.bool,
  minTime: PropTypes.string,
  maxTime: PropTypes.string,
};

TimePicker.defaultProps = {
  label: 'Time',
  isEnd: false,
  minTime: null,
  maxTime: null,
};

export default TimePicker;
