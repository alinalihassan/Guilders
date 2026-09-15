import { Check, ChevronsUpDown, Loader2, Plus, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { inputTriggerStyles } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAddTag, useTags } from "@/lib/queries/useTags";
import { cn } from "@/lib/utils";

type TagSelectorProps = {
  value?: number[];
  onChange: (value: number[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export function TagSelector({
  value = [],
  onChange,
  disabled,
  placeholder = "Select tags",
  className,
}: TagSelectorProps) {
  const { data: tags, isLoading } = useTags();
  const { mutate: addTag, isPending: isCreating } = useAddTag();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedTags = (tags ?? []).filter((tag) => value.includes(tag.id));

  const trimmedSearch = search.trim();
  const canCreate =
    trimmedSearch.length > 0 &&
    !tags?.some((tag) => tag.name.toLowerCase() === trimmedSearch.toLowerCase());

  const toggleTag = (tagId: number) => {
    if (value.includes(tagId)) {
      onChange(value.filter((id) => id !== tagId));
    } else {
      onChange([...value, tagId]);
    }
  };

  const handleCreateTag = () => {
    if (!trimmedSearch) return;
    addTag(
      { name: trimmedSearch },
      {
        onSuccess: (createdTag) => {
          onChange([...value, createdTag.id]);
          setSearch("");
        },
      },
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            inputTriggerStyles,
            "h-auto min-h-10 font-normal hover:bg-card hover:text-foreground",
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-left">
            {selectedTags.length > 0 ? (
              selectedTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="gap-1 font-normal"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleTag(tag.id);
                  }}
                >
                  {tag.name}
                  <X className="size-3 opacity-60" />
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-[min(400px,80vh)] w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command shouldFilter>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search tags..."
            disabled={disabled || isCreating}
          />
          <CommandList className="max-h-[300px] overflow-x-hidden overflow-y-auto">
            <CommandEmpty className="p-2">
              {canCreate ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleCreateTag}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Add "{trimmedSearch}"
                </Button>
              ) : (
                "No tags found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {isLoading ? (
                <CommandItem disabled>Loading tags...</CommandItem>
              ) : (
                tags?.map((tag) => {
                  const selected = value.includes(tag.id);
                  return (
                    <CommandItem key={tag.id} value={tag.name} onSelect={() => toggleTag(tag.id)}>
                      <Check
                        className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")}
                      />
                      <span className="truncate">{tag.name}</span>
                    </CommandItem>
                  );
                })
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
