
import { format } from "date-fns";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { inputTriggerStyles } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  disabled?: boolean;
  /** When true, preserves the time from the current date when selecting a new date. Default true. */
  preserveTime?: boolean;
}

export function DatePicker({
  date,
  onDateChange,
  disabled = false,
  preserveTime = true,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      onDateChange(undefined);
      setIsOpen(false);
      return;
    }
    if (preserveTime && date) {
      const result = new Date(selectedDate);
      result.setHours(
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds(),
      );
      onDateChange(result);
    } else {
      onDateChange(selectedDate);
    }
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            inputTriggerStyles,
            "font-normal hover:bg-card hover:text-foreground",
            !date && "text-muted-foreground",
          )}
        >
          {date ? format(date, "PPP") : "Select date"}
          <ChevronDownIcon className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={date}
          defaultMonth={date}
          onSelect={handleSelect}
          autoFocus={true}
        />
      </PopoverContent>
    </Popover>
  );
}
