"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Edit, Trash2, Plus, Settings } from "lucide-react";
import { PatternComponent } from "@/services/patternService";
import { CustomPatternBuilder } from "./CustomPatternBuilder";

interface CustomPreset {
  id: string;
  name: string;
  patterns: PatternComponent[];
  enabled: boolean;
}

interface PiiFiltersProps {
  exclusions: string[];
  onChange: (exclusions: string[]) => void;
  customPatterns?: PatternComponent[];
  onCustomPatternsChange?: (patterns: PatternComponent[]) => void;
  onEnabledPresetsChange?: (enabledPresets: CustomPreset[]) => void;
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
  onEnabledPresetsChange,
}: PiiFiltersProps) {
  const [presets, setPresets] = useState<CustomPreset[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<CustomPreset | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isEditingName, setIsEditingName] = useState<string | null>(null);
  const [currentPatterns, setCurrentPatterns] = useState<PatternComponent[]>(
    []
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedPresets = localStorage.getItem("customPatternPresets");
    if (savedPresets) {
      try {
        const parsed = JSON.parse(savedPresets);
        setPresets(parsed);
      } catch (error) {
        console.error("Error loading presets from localStorage:", error);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("customPatternPresets", JSON.stringify(presets));
    }
  }, [presets, isLoaded]);

  useEffect(() => {
    const enabledPresets = presets.filter((preset) => preset.enabled);
    if (onEnabledPresetsChange) {
      onEnabledPresetsChange(enabledPresets);
    }
  }, [presets, onEnabledPresetsChange]);

  const toggleItem = (item: string) => {
    const set = new Set(exclusions);
    if (set.has(item)) set.delete(item);
    else set.add(item);
    onChange(Array.from(set));
  };

  const isExcluded = (item: string) => exclusions.includes(item);

  const createNewPreset = () => {
    setEditingPreset(null);
    setEditingName("");
    setCurrentPatterns([]);
    setIsDialogOpen(true);
  };

  const editPreset = (preset: CustomPreset) => {
    setEditingPreset(preset);
    setEditingName(preset.name);
    setCurrentPatterns([...preset.patterns]);
    setIsDialogOpen(true);
  };

  const savePreset = () => {
    if (!editingName.trim() || currentPatterns.length === 0) return;

    if (editingPreset) {
      const updatedPresets = presets.map((preset) =>
        preset.id === editingPreset.id
          ? { ...preset, name: editingName.trim(), patterns: currentPatterns }
          : preset
      );
      setPresets(updatedPresets);
    } else {
      const newPreset: CustomPreset = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        name: editingName.trim(),
        patterns: currentPatterns,
        enabled: false,
      };
      setPresets([...presets, newPreset]);
    }

    setIsDialogOpen(false);
    setEditingPreset(null);
    setEditingName("");
    setCurrentPatterns([]);
  };

  const deletePreset = (id: string) => {
    const updatedPresets = presets.filter((preset) => preset.id !== id);
    setPresets(updatedPresets);
  };

  const togglePreset = (id: string) => {
    const updatedPresets = presets.map((preset) =>
      preset.id === id ? { ...preset, enabled: !preset.enabled } : preset
    );
    setPresets(updatedPresets);
  };

  const startEditName = (preset: CustomPreset) => {
    setIsEditingName(preset.id);
    setEditingName(preset.name);
  };

  const saveEditName = () => {
    if (!editingName.trim() || !isEditingName) return;

    const updatedPresets = presets.map((preset) =>
      preset.id === isEditingName
        ? { ...preset, name: editingName.trim() }
        : preset
    );
    setPresets(updatedPresets);

    setIsEditingName(null);
    setEditingName("");
  };

  const cancelEditName = () => {
    setIsEditingName(null);
    setEditingName("");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Preset Filters</h3>
          <Button onClick={createNewPreset} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Custom Pattern
          </Button>
        </div>

        <div className="h-[250px] overflow-y-auto">
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
                      checked={!isExcluded(item)}
                      onCheckedChange={() => toggleItem(item)}
                    />
                    <span className="text-sm">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

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
      </div>

      {presets.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Custom Pattern Presets</h3>
          <div className="space-y-3 overflow-y-auto max-h-[100px]">
            {presets.map((preset) => (
              <Card key={preset.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={preset.enabled}
                        onCheckedChange={() => togglePreset(preset.id)}
                      />
                      {isEditingName === preset.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            size={20}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEditName();
                              if (e.key === "Escape") cancelEditName();
                            }}
                          />
                          <Button size="sm" onClick={saveEditName}>
                            ✓
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditName}
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <span className="font-medium flex items-center justify-center h-full">
                          {preset.name}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      ({preset.patterns.length} component
                      {preset.patterns.length !== 1 ? "s" : ""})
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => editPreset(preset)}
                      title="Edit preset"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEditName(preset)}
                      title="Rename preset"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deletePreset(preset.id)}
                      title="Delete preset"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {presets.filter((p) => p.enabled).length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium">Enabled custom presets</div>
              <div className="flex flex-wrap gap-2">
                {presets
                  .filter((preset) => preset.enabled)
                  .map((preset) => (
                    <span
                      key={preset.id}
                      className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800"
                    >
                      {preset.name}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPreset ? "Edit Custom Pattern" : "Create Custom Pattern"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Preset Name *</Label>
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                placeholder="Enter preset name..."
                className="mt-1 text-sm"
              />
            </div>

            <CustomPatternBuilder
              patterns={currentPatterns}
              onPatternChange={setCurrentPatterns}
            />

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={savePreset}
                disabled={!editingName.trim() || currentPatterns.length === 0}
              >
                {editingPreset ? "Update Preset" : "Save Preset"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PiiFilters;
