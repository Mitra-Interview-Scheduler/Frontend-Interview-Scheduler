import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTimeFormat } from '@/context/TimeFormatContext';

const TimePicker = ({ value, onChange, label, isEnd = false, minTime = null, maxTime = null }) => {
  const { is12h, is24h } = useTimeFormat();

  // Safely parse the incoming value from the parent
  const [parentHours, parentMinutes] = useMemo(() => {
    const parts = (value || '09:00').split(':');
    return [parts[0] || '00', parts[1] || '00'];
  }, [value]);

  // Local state allows the user to freely type and delete characters
  const [localHour, setLocalHour] = useState('');
  const [localMinute, setLocalMinute] = useState('');

  // Sync local display state with parent value on mount or external change
  useEffect(() => {
    if (is12h) {
      const hInt = parseInt(parentHours, 10) || 0;
      setLocalHour(String((hInt % 12) || 12));
    } else {
      setLocalHour(parentHours);
    }
    setLocalMinute(parentMinutes);
  }, [parentHours, parentMinutes, is12h]);

  // --- HOUR HANDLERS ---
  const handleHourChange = (e) => {
    // Strip out any character that is NOT a digit
    const onlyNumbers = e.target.value.replace(/\D/g, '');
    setLocalHour(onlyNumbers);
  };

  const handleHourBlur = () => {
    let hInt = parseInt(localHour, 10);

    // If they left it blank or typed nonsense, revert to previous valid parent state
    if (isNaN(hInt)) {
      onChange(`${parentHours}:${parentMinutes}`);
      return;
    }

    // Validate and push to parent
    if (is12h) {
      hInt = Math.max(1, Math.min(12, hInt));
      const currentHours = parseInt(parentHours, 10);
      const isPM = currentHours >= 12;

      let finalH = hInt === 12 ? (isPM ? 12 : 0) : hInt + (isPM ? 12 : 0);
      finalH = Math.max(0, Math.min(23, finalH));
      onChange(`${String(finalH).padStart(2, '0')}:${parentMinutes}`);
    } else {
      hInt = Math.max(0, Math.min(23, hInt));
      onChange(`${String(hInt).padStart(2, '0')}:${parentMinutes}`);
    }
  };

  // --- MINUTE HANDLERS ---
  const handleMinuteChange = (e) => {
    // Strip out any character that is NOT a digit
    const onlyNumbers = e.target.value.replace(/\D/g, '');
    setLocalMinute(onlyNumbers);
  };

  const handleMinuteBlur = () => {
    let mInt = parseInt(localMinute, 10);
    if (isNaN(mInt)) {
      onChange(`${parentHours}:${parentMinutes}`);
      return;
    }
    mInt = Math.max(0, Math.min(59, mInt));
    onChange(`${parentHours}:${String(mInt).padStart(2, '0')}`);
  };

  const period = is12h ? (parseInt(parentHours, 10) >= 12 ? 'PM' : 'AM') : '';

  return (
    <div className="space-y-2">
      <label className="font-semibold text-sm">{label}</label>
      <div className="flex items-center justify-evenly gap-1 p-2 border-2 border-indigo-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-indigo-400">
        
        {/* Hour Input */}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={localHour}
          onChange={handleHourChange}
          onBlur={handleHourBlur}
          className="w-12 text-center font-bold text-lg border-0 bg-transparent focus:outline-none"
          placeholder={is12h ? '12' : '09'}
        />

        {/* Separator */}
        <span className="text-2xl font-bold text-indigo-400">:</span>

        {/* Minute Input */}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={localMinute}
          onChange={handleMinuteChange}
          onBlur={handleMinuteBlur}
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
                const h = parseInt(parentHours, 10);
                const newHours = h >= 12 ? h - 12 : h + 12;
                onChange(`${String(newHours).padStart(2, '0')}:${parentMinutes}`);
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