"use client";

import { format } from "date-fns";
import { ChevronDownIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatTime } from "@/lib/format-time";
import { useUser } from "@/lib/queries/useUser";
import { cn } from "@/lib/utils";

function toTimeString(date: Date, includeSeconds: boolean): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  if (includeSeconds) {
    const s = date.getSeconds().toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  return `${h}:${m}`;
}

interface DateTimePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  /** Optional; when omitted, time changes still update the date via onDateChange. */
  onTimeChange?: (time: string) => void;
  /** When true, time input shows seconds. Default false. */
  showSeconds?: boolean;
  disabled?: boolean;
}

export function DateTimePicker({
  date,
  onDateChange,
  onTimeChange,
  showSeconds = false,
  disabled = false,
}: DateTimePickerProps) {
  const { data: user } = useUser();
  const timeFormat = user?.timeFormat ?? "24";
  const [isOpen, setIsOpen] = useState(false);
  const [time, setTime] = useState(() => toTimeString(new Date(), showSeconds));

  // Sync time display when date changes from parent
  useEffect(() => {
    if (date) {
      setTime(toTimeString(date, showSeconds));
    }
  }, [date, showSeconds]);

  // Set initial date and time when no date provided
  useEffect(() => {
    if (!date) {
      const initialDate = new Date();
      const ts = toTimeString(initialDate, showSeconds);
      setTime(ts);
      onDateChange(initialDate);
      onTimeChange?.(ts);
    }
  }, [date, showSeconds, onDateChange, onTimeChange]);

  // Notify when time changes; parse HH:mm or HH:mm:ss depending on showSeconds
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) return;
    setTime(value);
    onTimeChange?.(value);
    if (date) {
      const parts = value.split(":").map((x) => Number.parseInt(x || "0", 10));
      const newDate = new Date(date);
      newDate.setHours(parts[0] ?? 0, parts[1] ?? 0, showSeconds ? (parts[2] ?? 0) : 0);
      onDateChange(newDate);
    }
  };

  return (
    <div className="flex w-full flex-row gap-4">
      <div className="flex-1">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-between bg-card font-normal",
                !date && "text-muted-foreground",
              )}
            >
              {date
                ? `${format(date, "PPP")}, ${formatTime(date, timeFormat, { showSeconds })}`
                : "Select date"}
              <ChevronDownIcon className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              captionLayout="dropdown"
              selected={date}
              defaultMonth={date}
              onSelect={(selectedDate) => {
                if (selectedDate) {
                  const parts = time.split(":").map((x) => Number.parseInt(x || "0", 10));
                  selectedDate.setHours(
                    parts[0] ?? 0,
                    parts[1] ?? 0,
                    showSeconds ? (parts[2] ?? 0) : 0,
                  );
                  onDateChange(selectedDate);
                }
                setIsOpen(false);
              }}
              autoFocus={true}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="w-32 shrink-0">
        <Input
          type="time"
          step={showSeconds ? "1" : "60"}
          value={time}
          onChange={handleTimeChange}
          disabled={disabled}
          className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
    </div>
  );
}
