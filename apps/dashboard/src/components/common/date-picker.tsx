"use client";

import { format } from "date-fns";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function DatePicker({ value, onChange, disabled }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const date = value ? new Date(value + "T12:00:00") : undefined;
  const isValidDate = date && !Number.isNaN(date.getTime());

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between bg-card font-normal",
            !isValidDate && "text-muted-foreground",
          )}
        >
          {isValidDate ? format(date, "PPP") : "Select date"}
          <ChevronDownIcon className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={isValidDate ? date : undefined}
          defaultMonth={isValidDate ? date : undefined}
          onSelect={(selectedDate) => {
            if (selectedDate) {
              onChange(format(selectedDate, "yyyy-MM-dd"));
              setIsOpen(false);
            }
          }}
          fromYear={2000}
          toYear={new Date().getFullYear() + 1}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
