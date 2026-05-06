'use client'

import * as React from 'react'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react'
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
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString('default', { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        months: cn('flex gap-4 flex-col md:flex-row relative'),
        month: cn('flex flex-col w-full gap-4'),
        nav: cn(
          'flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between',
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        ),
        month_caption: cn('flex items-center justify-center h-7 w-full px-2'),
        dropdowns: cn(
          'w-full flex items-center justify-center text-sm font-medium h-7 gap-1',
        ),
        dropdown_root: cn(
          'relative has-focus:border-ring border border-input shadow-xs rounded-md',
        ),
        dropdown: cn(
          'absolute bg-popover inset-0 opacity-0',
        ),
        caption_label: cn(
          'select-none font-medium text-sm',
        ),
        table: 'w-full border-collapse',
        weekdays: cn('flex'),
        weekday: cn(
          'text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none',
        ),
        week: cn('flex w-full mt-2'),
        week_number_header: cn(
          'select-none w-7',
        ),
        week_number: cn(
          'text-[0.8rem] select-none text-muted-foreground',
        ),
        day: cn('relative w-full h-full p-0 text-center select-none aspect-square'),
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-7 w-7 p-0 font-normal aria-selected:opacity-100',
        ),
        range_start: 'day_button:rounded-l-md bg-accent',
        range_middle: 'day_button:rounded-none',
        range_end: 'day_button:rounded-r-md bg-accent',
        today: cn(
          'bg-accent text-accent-foreground rounded-md',
        ),
        outside: cn(
          'text-muted-foreground',
        ),
        disabled: cn(
          'text-muted-foreground opacity-50',
        ),
        hidden: cn('invisible'),
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === 'left') {
            return (
              <ChevronLeftIcon className={cn('size-4', className)} {...props} />
            )
          }

          if (orientation === 'right') {
            return (
              <ChevronRightIcon
                className={cn('size-4', className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn('size-4', className)} {...props} />
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

export { Calendar }
