"use client";

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Option {
  label: string
  value: string
}

interface CreatableComboboxProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyMessage?: string
  onCreateNew?: (value: string) => void
}

export function CreatableCombobox({
  options = [],
  value,
  onChange,
  placeholder = "Seleccionar...",
  emptyMessage = "No se encontraron resultados.",
}: CreatableComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const selectedOption = options.find((opt) => opt.value === value) || { label: value, value };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value ? selectedOption?.label || value : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder={placeholder} 
            value={inputValue} 
            onValueChange={setInputValue} 
          />
          <CommandList>
            <CommandEmpty className="py-2">
              <div className="flex flex-col px-4 text-sm items-start gap-2">
                <span className="text-muted-foreground">{emptyMessage}</span>
                {inputValue && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full justify-start mt-2"
                    onClick={() => {
                      onChange(inputValue);
                      setOpen(false);
                      setInputValue("");
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Crear &quot;{inputValue}&quot;
                  </Button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value === value ? "" : option.value)
                    setOpen(false)
                    setInputValue("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {/* If there's input that doesn't exactly match an option, allow creating it */}
            {inputValue && !options.some(o => o.label.toLowerCase() === inputValue.toLowerCase()) && (
              <CommandGroup>
                <CommandItem
                  value={`create_${inputValue}`}
                  onSelect={() => {
                    onChange(inputValue);
                    setOpen(false);
                    setInputValue("");
                  }}
                  className="text-primary font-medium"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Crear &quot;{inputValue}&quot;
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
