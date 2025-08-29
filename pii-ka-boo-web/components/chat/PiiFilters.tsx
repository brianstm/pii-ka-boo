"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomPatternBuilder } from "./CustomPatternBuilder";
import { PatternComponent } from "@/services/patternService";

interface PiiFiltersProps {
  exclusions: string[];
  onChange: (exclusions: string[]) => void;
  customPatterns?: PatternComponent[];
  onCustomPatternsChange?: (patterns: PatternComponent[]) => void;
}

const GROUPS: Record<string, string[]> = {
  "I-*": [
    "I-ACCOUNTNUM",
    "I-BUILDINGNUM",
    "I-CITY",
    "I-CREDITCARDNUMBER",
    "I-DATEOFBIRTH",
    "I-DRIVERLICENSENUM",
    "I-EMAIL",
    "I-GIVENNAME",
    "I-SURNAME",
    "I-IDCARDNUM",
    "I-PASSWORD",
    "I-SOCIALNUM",
    "I-STREET",
    "I-TAXNUM",
    "I-TELEPHONENUM",
    "I-USERNAME",
    "I-ZIPCODE",
  ],
  PERSON: [
    "EMAIL_ADDRESS",
    "PHONE_NUMBER",
    "CREDIT_CARD",
    "IP_ADDRESS",
    "LOCATION",
  ],
  "SHORT TAGS": ["NAME", "EMAIL", "ADDRESS", "PHONE", "PERSONAL_URL"],
};

export function PiiFilters({
  exclusions,
  onChange,
  customPatterns = [],
  onCustomPatternsChange,
}: PiiFiltersProps) {
  const toggleItem = (item: string) => {
    const set = new Set(exclusions);
    if (set.has(item)) set.delete(item);
    else set.add(item);
    onChange(Array.from(set));
  };

  const isExcluded = (item: string) => exclusions.includes(item);

  return (
    <Tabs defaultValue="preset" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="preset">Preset Filters</TabsTrigger>
        <TabsTrigger value="custom">Custom Patterns</TabsTrigger>
      </TabsList>

      <TabsContent value="preset" className="space-y-4">
        {Object.entries(GROUPS).map(([group, items]) => (
          <div key={group} className="space-y-2">
            <div className="text-sm font-semibold opacity-80">{group}</div>
            <div className="grid grid-cols-2 gap-2">
              {items.map((item) => (
                <label
                  key={item}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={isExcluded(item)}
                    onCheckedChange={() => toggleItem(item)}
                  />
                  <span className="text-sm">{item}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="space-y-1">
          <div className="text-xs font-medium">Currently excluded</div>
          <div className="flex flex-wrap gap-2">
            {exclusions.length === 0 ? (
              <span className="text-xs text-muted-foreground">None</span>
            ) : (
              exclusions.map((x) => (
                <span key={x} className="text-xs px-2 py-0.5 rounded bg-muted">
                  {x}
                </span>
              ))
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="custom">
        <CustomPatternBuilder
          patterns={customPatterns}
          onPatternChange={onCustomPatternsChange || (() => {})}
        />
      </TabsContent>
    </Tabs>
  );
}

export default PiiFilters;
