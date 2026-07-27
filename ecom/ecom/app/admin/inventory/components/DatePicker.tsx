"use client";

import * as React from "react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "./Calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
interface DatePickerProps {
  date: Date | null;
  setDate: React.Dispatch<React.SetStateAction<Date | null>>;
}
export function DatePicker({ date, setDate }: DatePickerProps) {
  const handleSelect = React.useCallback(
    (selectedDate?: Date) => {
      setDate(selectedDate ?? null);
    },
    [setDate]
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"ghost"}
          className={cn(
            " justify-start text-left  w-fit bg-gray-100 ",
            !date && "text-muted-foreground"
          )}
        >
          {date ? format(date, "dd/MM/yyyy") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date ?? undefined}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
