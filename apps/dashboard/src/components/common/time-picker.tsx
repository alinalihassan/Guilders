import { ChangeEvent, useEffect, useState } from "react";

import { Input } from "@/components/ui/input";

function toTimeString(date: Date, includeSeconds: boolean): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  if (includeSeconds) {
    const s = date.getSeconds().toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  return `${h}:${m}`;
}

export interface TimePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date) => void;
  /** When true, time input shows seconds. Default false. */
  showSeconds?: boolean;
  disabled?: boolean;
}

export function TimePicker({
  date,
  onDateChange,
  showSeconds = false,
  disabled = false,
}: TimePickerProps) {
  const [time, setTime] = useState(() => toTimeString(new Date(), showSeconds));

  // Sync time display when date changes from parent
  useEffect(() => {
    if (date) {
      setTime(toTimeString(date, showSeconds));
    }
  }, [date, showSeconds]);

  const handleTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) return;
    setTime(value);
    const parts = value.split(":").map((x) => Number.parseInt(x || "0", 10));
    const base = date ? new Date(date) : new Date();
    base.setHours(parts[0] ?? 0, parts[1] ?? 0, showSeconds ? (parts[2] ?? 0) : 0);
    onDateChange(base);
  };

  return (
    <Input
      type="time"
      step={showSeconds ? "1" : "60"}
      value={time}
      onChange={handleTimeChange}
      disabled={disabled}
      className="w-full appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
    />
  );
}
