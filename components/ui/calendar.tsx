'use client'

import * as React from 'react'
import { DayPicker } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'buttons',
  buttonVariant = 'ghost',
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant']
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        'bg-background group/calendar p-3',
        className,
      )}
      captionLayout={captionLayout}
      classNames={{
        months: cn('flex gap-4 flex-col md:flex-row relative'),
        month: cn('flex flex-col w-full gap-4'),
        nav: cn(
          'flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between',
        ),
        nav_button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        ),
        nav_button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        ),
        caption_label: cn(
          'select-none font-medium text-sm',
        ),
        table: 'w-full border-collapse',
        head_row: cn('flex'),
        head_cell: cn(
          'text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none',
        ),
        row: cn('flex w-full mt-2'),
        cell: cn('relative w-full h-full p-0 text-center select-none aspect-square'),
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-7 w-7 p-0 font-normal aria-selected:opacity-100',
        ),
        day_range_start: 'rounded-l-md bg-accent',
        day_range_middle: 'rounded-none',
        day_range_end: 'rounded-r-md bg-accent',
        day_selected: cn(
          'bg-accent text-accent-foreground rounded-md',
        ),
        day_outside: cn(
          'text-muted-foreground',
        ),
        day_disabled: cn(
          'text-muted-foreground opacity-50',
        ),
        day_hidden: cn('invisible'),
        ...classNames,
      }}
      {...props}
    />
  )
}

export { Calendar }
