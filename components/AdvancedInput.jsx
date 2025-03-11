// AdvancedInput.jsx
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, X, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * AdvancedInput is a versatile input component that combines the functionality of
 * Material UI's Select and Autocomplete components.
 *
 * @param {Object} props - Component props
 * @param {string} props.label - Input label (optional)
 * @param {string} props.placeholder - Placeholder text
 * @param {Array} props.options - Array of options to select from
 * @param {string|Array} props.value - Current value(s)
 * @param {Function} props.onChange - Function called when value changes
 * @param {string} props.type - Input type ('select', 'multiSelect', or 'autocomplete')
 * @param {boolean} props.freeSolo - Whether to allow custom values (for autocomplete)
 * @param {boolean} props.disableSearch - Whether to disable search functionality
 * @param {boolean} props.disableCloseOnSelect - Whether to keep popover open after selection
 * @param {Function} props.renderOption - Function to customize option rendering
 * @param {Function} props.getOptionLabel - Function to get the display label for an option
 * @param {Function} props.getOptionValue - Function to get the value for an option
 * @param {string} props.valueKey - Key to use for getting option value
 * @param {boolean} props.required - Whether the input is required
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {Object} props.className - Additional CSS classes
 * @returns {JSX.Element} The advanced input component
 */
export const AdvancedInput = ({
  label,
  placeholder = "Select...",
  options = [],
  value,
  onChange,
  type = "select", // 'select', 'multiSelect', or 'autocomplete'
  freeSolo = false,
  disableSearch = false,
  disableCloseOnSelect,
  renderOption,
  valueKey = "_id",
  getOptionLabel = (option) => {
    if (typeof option === "object" && option !== null) {
      return option.label || option.name || String(option);
    }
    return String(option);
  },
  getOptionValue = (option) => {
    if (typeof option === "object" && option !== null) {
      return option[valueKey] || option;
    }
    return option;
  },
  required = false,
  disabled = false,
  className,
  ...props
}) => {
  // Determine if we should keep the popover open after selection
  // For multiSelect, default to keeping it open unless explicitly set to false
  const keepOpenAfterSelect = React.useMemo(
    () => disableCloseOnSelect || type === "multiSelect",
    [disableCloseOnSelect, type]
  );
  // State for popover open status
  const [open, setOpen] = React.useState(false);

  // State for search query
  const [searchQuery, setSearchQuery] = React.useState("");

  // State for tracking custom entries (for freeSolo autocomplete)
  const [customEntries, setCustomEntries] = React.useState([]);

  // Reference to track if an option was selected
  const optionSelectedRef = React.useRef(false);

  // Helper to find an option by its value
  const findOptionByValue = (val) => {
    // Search in regular options
    const regularOption = options.find(
      (option) => getOptionValue(option) === val
    );
    if (regularOption) return regularOption;

    // Search in custom entries if not found
    return customEntries.find((entry) => getOptionValue(entry) === val);
  };

  // Combined options (regular + custom)
  const allOptions = React.useMemo(() => {
    return [...options, ...customEntries];
  }, [options, customEntries]);

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return allOptions;

    return allOptions.filter((option) => {
      const label = getOptionLabel(option).toLowerCase();
      return label.includes(searchQuery.toLowerCase());
    });
  }, [allOptions, searchQuery, getOptionLabel]);

  // Handle adding custom option (for freeSolo)
  const handleAddCustomOption = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!searchQuery.trim()) return;

    // Check if the value already exists in options
    const exists = allOptions.some(
      (option) =>
        getOptionLabel(option).toLowerCase() === searchQuery.toLowerCase()
    );

    if (!exists) {
      // Create a new entry - either string or object depending on valueKey
      const newEntry =
        valueKey === "_id" || typeof options[0] === "string"
          ? searchQuery
          : { [valueKey]: searchQuery, label: searchQuery };

      setCustomEntries([...customEntries, newEntry]);

      // If it's a single selection, select it automatically
      if (type === "autocomplete" && !type.startsWith("multi")) {
        onChange(getOptionValue(newEntry));
        setOpen(false);
      }
    }

    setSearchQuery("");
  };

  // Handle when user leaves input and didn't select an option (autocomplete with freeSolo)
  const handleInputBlur = () => {
    if (
      type === "autocomplete" &&
      freeSolo &&
      searchQuery.trim() &&
      !optionSelectedRef.current
    ) {
      handleAddCustomOption({
        preventDefault: () => {},
        stopPropagation: () => {},
      });
    }
    optionSelectedRef.current = false;
  };

  // Custom handler for CommandItem's onSelect
  const handleCommandSelect = (optionValue) => {
    optionSelectedRef.current = true;

    if (type === "multiSelect" || type === "multiAutocomplete") {
      // For multiSelect, toggle the selected item
      const isSelected = Array.isArray(value) && value.includes(optionValue);
      const newValue = isSelected
        ? value.filter((v) => v !== optionValue)
        : [...(Array.isArray(value) ? value : []), optionValue];

      onChange(newValue);
      // Keep popover open for multiselect
      return ""; // Return empty string to prevent CommandItem's default behavior
    } else {
      // For single select, close after selection
      onChange(optionValue);
      setSearchQuery("");
      if (!keepOpenAfterSelect) {
        setOpen(false);
      }
      return String(optionValue);
    }
  };

  // Custom rendering of options if provided
  const renderOptionContent = (option) => {
    if (renderOption) {
      return renderOption(option);
    }
    return getOptionLabel(option);
  };

  // Function to clear all selections
  const clearAllSelections = (e) => {
    e.stopPropagation();
    onChange(type.startsWith("multi") ? [] : "");
  };

  // Function to remove a specific selected item
  const removeSelectedItem = (valueToRemove, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const newValue = Array.isArray(value)
      ? value.filter((v) => v !== valueToRemove)
      : "";

    onChange(newValue);
  };

  // Render selected values as badges for multiselect modes
  const renderSelectedValues = () => {
    if (
      (type === "multiSelect" || type === "multiAutocomplete") &&
      Array.isArray(value) &&
      value.length > 0
    ) {
      return (
        <div className="flex flex-wrap gap-1 mt-1">
          {value.map((val) => {
            const option = findOptionByValue(val);
            const displayValue = option ? getOptionLabel(option) : val;

            return (
              <Badge
                key={val}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {displayValue}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={(e) => removeSelectedItem(val, e)}
                />
              </Badge>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Display text for the trigger button
  const getDisplayText = () => {
    if (type === "multiSelect" || type === "multiAutocomplete") {
      if (Array.isArray(value) && value.length > 0) {
        return `${value.length} selected`;
      }
      return placeholder;
    } else {
      // For autocomplete, if the popover is open, show the search query
      if (type === "autocomplete" && open && searchQuery) {
        return searchQuery;
      }

      const selectedOption = value ? findOptionByValue(value) : null;
      if (selectedOption) {
        return getOptionLabel(selectedOption);
      }
      return placeholder;
    }
  };

  // Handle click on option manually to prevent popover closing
  const handleOptionClick = (optionValue, e) => {
    e.preventDefault();
    e.stopPropagation();

    optionSelectedRef.current = true;

    if (type === "multiSelect" || type === "multiAutocomplete") {
      const isSelected = Array.isArray(value) && value.includes(optionValue);
      const newValue = isSelected
        ? value.filter((v) => v !== optionValue)
        : [...(Array.isArray(value) ? value : []), optionValue];

      onChange(newValue);
      // Do not close popover for multiselect modes
    } else {
      onChange(optionValue);
      setSearchQuery("");
      setOpen(false); // Close for single select
    }
  };

  // Render the select input
  return (
    <div className={cn("w-full space-y-1", className)}>
      {label && (
        <div className="text-sm font-medium leading-none mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate">{getDisplayText()}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={`${
                type.includes("auto")
                  ? "Type to search or add..."
                  : `Search ${label ? label.toLowerCase() : "options"}...`
              }`}
              value={searchQuery}
              onValueChange={setSearchQuery}
              onBlur={freeSolo ? handleInputBlur : undefined}
              disabled={disableSearch && !type.includes("auto")}
            />

            {filteredOptions.length === 0 && (
              <CommandEmpty>
                {freeSolo && searchQuery.trim() ? (
                  <div className="flex items-center justify-between py-1 px-2">
                    <span>Add "{searchQuery}"</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      onClick={handleAddCustomOption}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add
                    </Button>
                  </div>
                ) : (
                  "No options found."
                )}
              </CommandEmpty>
            )}

            <CommandList className="max-h-60 overflow-y-auto">
              {freeSolo &&
                searchQuery.trim() &&
                !filteredOptions.some(
                  (option) =>
                    getOptionLabel(option).toLowerCase() ===
                    searchQuery.toLowerCase()
                ) && (
                  <div className="border-b">
                    <CommandItem
                      value={searchQuery}
                      onSelect={handleAddCustomOption}
                    >
                      <div className="flex items-center">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span>Add "{searchQuery}"</span>
                      </div>
                    </CommandItem>
                  </div>
                )}

              <CommandGroup>
                {filteredOptions.map((option) => {
                  const optionValue = getOptionValue(option);
                  const isSelected =
                    type === "multiSelect" || type === "multiAutocomplete"
                      ? Array.isArray(value) && value.includes(optionValue)
                      : value === optionValue;

                  return (
                    <CommandItem
                      key={optionValue}
                      value={String(optionValue)}
                      onSelect={
                        type.startsWith("multi")
                          ? undefined
                          : () => handleCommandSelect(optionValue)
                      }
                    >
                      <div
                        className="flex items-center space-x-2 w-full"
                        onClick={(e) =>
                          type.startsWith("multi") &&
                          handleOptionClick(optionValue, e)
                        }
                      >
                        {(type === "multiSelect" ||
                          type === "multiAutocomplete") && (
                          <div
                            className={cn(
                              "flex-shrink-0 mr-2 h-4 w-4",
                              isSelected ? "text-primary" : "text-transparent"
                            )}
                          >
                            <Check
                              className={cn(
                                "h-4 w-4",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </div>
                        )}
                        <span>{renderOptionContent(option)}</span>
                        {!(
                          type === "multiSelect" || type === "multiAutocomplete"
                        ) &&
                          isSelected && <Check className="ml-auto h-4 w-4" />}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>

            {(type === "multiSelect" || type === "multiAutocomplete") && (
              <div className="border-t p-2 flex justify-between">
                <Button variant="ghost" size="sm" onClick={clearAllSelections}>
                  Clear All
                </Button>
                <Button size="sm" onClick={() => setOpen(false)}>
                  Done
                </Button>
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>

      {renderSelectedValues()}
    </div>
  );
};
