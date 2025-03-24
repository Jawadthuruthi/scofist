import * as React from "react";
import {
  CheckIcon,
  XCircle,
  ChevronDown,
  XIcon,
  Search,
  WandSparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Variants for the multi-select component to handle different styles.
 */
const multiSelectVariants = (variant) => {
  const baseClasses =
    "m-1 transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 duration-300";

  const variantClasses = {
    default: "border-foreground/10 text-foreground bg-card hover:bg-card/80",
    secondary:
      "border-foreground/10 bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive:
      "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
    inverted: "inverted",
  };

  return cn(baseClasses, variantClasses[variant || "default"]);
};

export const MultiSelect = React.forwardRef(
  (
    {
      options,
      onValueChange,
      variant,
      placeholder = "Select options",
      animation = 0,
      maxCount = Infinity,
      modalPopover = false,
      asChild = false,
      className,
      disableSearch = false,
      multiSelect = true,
      value = multiSelect ? [] : "",
      freeSolo = false,
      ...props
    },
    ref
  ) => {
    const [selectedValues, setSelectedValues] = React.useState(value);
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
    const [isAnimating, setIsAnimating] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");

    // Filter options based on search query
    const filteredOptions = React.useMemo(() => {
      if (!searchQuery) return options;
      return options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }, [options, searchQuery]);

    const handleSearchInputKeyDown = (event) => {
      if (event.key === "Enter" && freeSolo) {
        const newValue = event.target.value.trim();
        if (newValue && !selectedValues.includes(newValue)) {
          const newSelectedValues = [...selectedValues, newValue];
          setSelectedValues(newSelectedValues);
          onValueChange(newSelectedValues);
        }
        setSearchQuery("");
      } else if (event.key === "Backspace" && !searchQuery) {
        const newSelectedValues = [...selectedValues];
        newSelectedValues.pop();
        setSelectedValues(newSelectedValues);
        onValueChange(newSelectedValues);
      }
    };

    const toggleOption = (option) => {
      const newSelectedValues = multiSelect
        ? selectedValues.includes(option)
          ? selectedValues.filter((value) => value !== option)
          : [...selectedValues, option]
        : option; // Store as a single value when `multiSelect = false`

      setSelectedValues(newSelectedValues);
      onValueChange(newSelectedValues);

      if (!multiSelect) {
        setIsPopoverOpen(false); // Close popover after selecting one item
      }
    };

    const handleClear = () => {
      setSelectedValues(multiSelect ? [] : "");
      onValueChange(multiSelect ? [] : "");
    };

    const clearExtraOptions = () => {
      const newSelectedValues = multiSelect
        ? selectedValues.slice(0, maxCount)
        : selectedValues;

      setSelectedValues(newSelectedValues);
      onValueChange(newSelectedValues);
    };

    const toggleAll = () => {
      if (selectedValues.length === options.length) {
        handleClear();
      } else {
        const allValues = options.map((option) => option.value);
        setSelectedValues(allValues);
        onValueChange(allValues);
      }
    };

    return (
      <Popover
        open={isPopoverOpen}
        onOpenChange={setIsPopoverOpen}
        modal={modalPopover}
      >
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            {...props}
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            className={cn(
              "flex w-full p-1 rounded-md border min-h-10 h-auto items-center justify-between bg-inherit hover:bg-inherit [&_svg]:pointer-events-auto",
              className
            )}
          >
            {selectedValues &&
            (multiSelect
              ? selectedValues.length > 0
              : selectedValues !== "" &&
                selectedValues !== null &&
                selectedValues !== undefined) ? (
              <div className="flex justify-between items-center w-full">
                <div className="flex flex-wrap items-center">
                  {/* Handle multiSelect = true (array) */}
                  {multiSelect
                    ? selectedValues.slice(0, maxCount).map((value) => {
                        const option = options.find((o) => o.value === value);
                        const IconComponent = option?.icon;
                        return (
                          <Badge
                            key={value}
                            className={cn(
                              isAnimating ? "animate-bounce" : "",
                              multiSelectVariants(variant)
                            )}
                            style={{ animationDuration: `${animation}s` }}
                          >
                            {IconComponent && (
                              <IconComponent className="h-4 w-4 mr-2" />
                            )}
                            {option?.label}
                            <XCircle
                              className="ml-2 h-4 w-4 cursor-pointer"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleOption(value);
                              }}
                            />
                          </Badge>
                        );
                      })
                    : // Handle multiSelect = false (single value)
                      (() => {
                        const option = options.find(
                          (o) => o.value === selectedValues
                        );
                        if (!option) return null;
                        const IconComponent = option?.icon;
                        return (
                          <Badge
                            className={cn(
                              isAnimating ? "animate-bounce" : "",
                              multiSelectVariants(variant)
                            )}
                            style={{ animationDuration: `${animation}s` }}
                          >
                            {IconComponent && (
                              <IconComponent className="h-4 w-4 mr-2" />
                            )}
                            {option?.label}
                            <XCircle
                              className="ml-2 h-4 w-4 cursor-pointer"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleClear(); // Clear single value
                              }}
                            />
                          </Badge>
                        );
                      })()}
                  {/* Show `+ more` badge only for multiSelect mode */}
                  {multiSelect && selectedValues.length > maxCount && (
                    <Badge
                      className={cn(
                        "bg-transparent text-foreground border-foreground/1 hover:bg-transparent",
                        isAnimating ? "animate-bounce" : "",
                        multiSelectVariants(variant)
                      )}
                      style={{ animationDuration: `${animation}s` }}
                    >
                      {`${selectedValues.length - maxCount} selected`}
                      <XCircle
                        className="ml-2 h-4 w-4 cursor-pointer"
                        onClick={(event) => {
                          event.stopPropagation();
                          clearExtraOptions();
                        }}
                      />
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <XIcon
                    className="h-4 mx-2 cursor-pointer text-muted-foreground"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleClear();
                    }}
                  />
                  <Separator
                    orientation="vertical"
                    className="flex min-h-6 h-full"
                  />
                  <ChevronDown className="h-4 mx-2 cursor-pointer text-muted-foreground" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full mx-auto">
                <span className="text-sm text-muted-foreground mx-3">
                  {placeholder}
                </span>
                <ChevronDown className="h-4 cursor-pointer text-muted-foreground mx-2" />
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
          onEscapeKeyDown={() => setIsPopoverOpen(false)}
        >
          <div className="flex flex-col">
            {/* Search input */}
            {!disableSearch && (
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <input
                  className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchInputKeyDown}
                />
              </div>
            )}

            {/* Options list */}
            <div
              className="overflow-y-auto max-h-60"
              style={{
                WebkitOverflowScrolling: "touch",
                touchAction: "pan-y",
                overscrollBehavior: "contain",
              }}
            >
              {filteredOptions.length === 0 && (
                <div className="py-6 text-center text-sm">
                  No results found.
                </div>
              )}

              <div className="p-1">
                {multiSelect && (
                  <div
                    className="flex items-center rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                    onClick={toggleAll}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        selectedValues.length === options.length
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50"
                      )}
                    >
                      {selectedValues.length === options.length && (
                        <CheckIcon className="h-4 w-4" />
                      )}
                    </div>
                    <span>(Select All)</span>
                  </div>
                )}
                {filteredOptions.map((option) => {
                  const isSelected = multiSelect
                    ? selectedValues.includes(option.value)
                    : option.value === selectedValues;
                  return (
                    <div
                      key={option.value}
                      className="flex items-center rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                      onClick={() => toggleOption(option.value)}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50"
                        )}
                      >
                        {isSelected && <CheckIcon className="h-4 w-4" />}
                      </div>
                      {option.icon && (
                        <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      )}
                      <span>{option.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer actions */}
            <div className="border-t">
              <div className="flex items-center">
                {selectedValues.length > 0 && (
                  <>
                    <button
                      className="flex-1 py-2 text-sm justify-center cursor-pointer hover:bg-accent hover:text-accent-foreground"
                      onClick={handleClear}
                    >
                      Clear
                    </button>
                    <Separator orientation="vertical" className="h-8" />
                  </>
                )}
                <button
                  className="flex-1 py-2 text-sm justify-center cursor-pointer hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setIsPopoverOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </PopoverContent>
        {animation > 0 && selectedValues.length > 0 && (
          <WandSparkles
            className={cn(
              "cursor-pointer my-2 text-foreground bg-background w-3 h-3",
              isAnimating ? "" : "text-muted-foreground"
            )}
            onClick={() => setIsAnimating(!isAnimating)}
          />
        )}
      </Popover>
    );
  }
);

MultiSelect.displayName = "MultiSelect";
