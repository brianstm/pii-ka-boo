"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, TestTube } from "lucide-react";
import { PatternComponent } from "@/services/patternService";

interface CustomPatternBuilderProps {
  onPatternChange: (patterns: PatternComponent[]) => void;
  patterns: PatternComponent[];
}

const TYPE_OPTIONS = [
  { value: "literal", label: "Literal Text" },
  { value: "letters", label: "Letters (a-z, A-Z)" },
  { value: "uppercase_letters", label: "Uppercase Letters (A-Z)" },
  { value: "lowercase_letters", label: "Lowercase Letters (a-z)" },
  { value: "digits", label: "Digits (0-9)" },
  { value: "any_char", label: "Any Character (.)" },
  { value: "whitespace", label: "Whitespace (\\s)" },
  { value: "non_whitespace", label: "Non-Whitespace (\\S)" },
  { value: "word_char", label: "Word Character (\\w)" },
  { value: "non_word_char", label: "Non-Word Character (\\W)" },
];

const QUANTITY_OPTIONS = [
  { value: "1", label: "Exactly 1 time" },
  { value: "exactly", label: "Exactly N times" },
  { value: "one_or_more", label: "One or more (+)" },
  { value: "zero_or_more", label: "Zero or more (*)" },
  { value: "optional", label: "Optional (?)" },
  { value: "range", label: "Range (min, max)" },
];

export function CustomPatternBuilder({
  onPatternChange,
  patterns,
}: CustomPatternBuilderProps) {
  const [testText, setTestText] = useState("");
  const [testResult, setTestResult] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [quantityTypes, setQuantityTypes] = useState<Record<number, string>>(
    {}
  );

  const addComponent = () => {
    const newComponent: PatternComponent = {
      type: "literal",
      value: "",
      quantity: 1,
    };
    const newIndex = patterns.length;
    setQuantityTypes((prev) => ({ ...prev, [newIndex]: "1" }));
    onPatternChange([...patterns, newComponent]);
  };

  const removeComponent = (index: number) => {
    const newPatterns = patterns.filter((_, i) => i !== index);
    setQuantityTypes((prev) => {
      const newTypes = { ...prev };
      delete newTypes[index];
      Object.keys(newTypes).forEach((key) => {
        const keyNum = parseInt(key);
        if (keyNum > index) {
          newTypes[keyNum - 1] = newTypes[keyNum];
          delete newTypes[keyNum];
        }
      });
      return newTypes;
    });
    onPatternChange(newPatterns);
  };

  const updateComponent = (
    index: number,
    updates: Partial<PatternComponent>
  ) => {
    const newPatterns = [...patterns];
    newPatterns[index] = { ...newPatterns[index], ...updates };
    onPatternChange(newPatterns);
  };

  const updateQuantity = (
    index: number,
    quantityType: string,
    value?: string
  ) => {
    let quantity: number | string | [number, number] = 1;

    setQuantityTypes((prev) => ({ ...prev, [index]: quantityType }));

    switch (quantityType) {
      case "1":
        quantity = 1;
        break;
      case "exactly":
        if (value) {
          quantity = parseInt(value);
        } else {
          const currentQuantity = patterns[index]?.quantity;
          quantity = typeof currentQuantity === "number" ? currentQuantity : 1;
        }
        break;
      case "one_or_more":
        quantity = "one_or_more";
        break;
      case "zero_or_more":
        quantity = "zero_or_more";
        break;
      case "optional":
        quantity = "optional";
        break;
      case "range":
        const [min, max] = (value || "1,10")
          .split(",")
          .map((v) => parseInt(v.trim()));
        quantity = [min, max];
        break;
      default:
        quantity = 1;
    }

    updateComponent(index, { quantity });
  };

  const testPattern = async () => {
    if (!testText || patterns.length === 0) return;

    setIsTesting(true);
    try {
      console.log("Current patterns state:", patterns);
      console.log("Current quantity types state:", quantityTypes);

      const requestBody = {
        text: testText,
        pattern_sequence: patterns,
        replace_by: "[BLURRED]",
      };

      console.log("Sending pattern test request:", requestBody);

      const response = await fetch("/api/pattern", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Pattern test result:", result);
        setTestResult(result.processed);
      } else {
        const errorText = await response.text();
        console.error("Pattern test failed:", errorText);
        setTestResult("Error: Pattern processing failed");
      }
    } catch (error) {
      console.error("Pattern test error:", error);
      setTestResult("Error: Failed to test pattern");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Custom Pattern Builder</h3>
        <Button onClick={addComponent} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Component
        </Button>
      </div>

      <div className="space-y-3">
        {patterns.map((pattern, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={pattern.type}
                      onValueChange={(value) =>
                        updateComponent(index, {
                          type: value as PatternComponent["type"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Quantity</Label>
                    <Select
                      value={
                        quantityTypes[index] ||
                        (typeof pattern.quantity === "number"
                          ? "exactly"
                          : Array.isArray(pattern.quantity)
                          ? "range"
                          : (pattern.quantity as string) || "1")
                      }
                      onValueChange={(value) => updateQuantity(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUANTITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {pattern.type === "literal" && (
                  <div>
                    <Label>Literal Value</Label>
                    <Input
                      value={pattern.value || ""}
                      onChange={(e) =>
                        updateComponent(index, { value: e.target.value })
                      }
                      placeholder="Enter exact text to match"
                    />
                  </div>
                )}

                {quantityTypes[index] === "exactly" && (
                  <div>
                    <Label>Exact Count</Label>
                    <Input
                      type="number"
                      value={
                        typeof pattern.quantity === "number"
                          ? pattern.quantity
                          : 1
                      }
                      onChange={(e) => {
                        const newQuantity = parseInt(e.target.value) || 1;
                        updateComponent(index, { quantity: newQuantity });
                        setQuantityTypes((prev) => ({
                          ...prev,
                          [index]: "exactly",
                        }));
                      }}
                      min="1"
                    />
                  </div>
                )}

                {Array.isArray(pattern.quantity) && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Min Count</Label>
                      <Input
                        type="number"
                        value={pattern.quantity[0]}
                        onChange={(e) => {
                          const min = parseInt(e.target.value) || 0;
                          const max = Array.isArray(pattern.quantity)
                            ? pattern.quantity[1]
                            : min;
                          updateComponent(index, { quantity: [min, max] });
                        }}
                        min="0"
                      />
                    </div>
                    <div>
                      <Label>Max Count</Label>
                      <Input
                        type="number"
                        value={pattern.quantity[1]}
                        onChange={(e) => {
                          const min = Array.isArray(pattern.quantity)
                            ? pattern.quantity[0]
                            : 0;
                          const max = parseInt(e.target.value) || min;
                          updateComponent(index, { quantity: [min, max] });
                        }}
                        min={pattern.quantity[0]}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeComponent(index)}
                className="text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {patterns.length > 0 && (
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TestTube className="w-4 h-4" />
              <Label>Test Pattern</Label>
            </div>

            <div className="space-y-2">
              <Input
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Enter text to test your pattern on..."
              />

              <Button
                onClick={testPattern}
                disabled={!testText || isTesting}
                size="sm"
              >
                {isTesting ? "Testing..." : "Test Pattern"}
              </Button>
            </div>

            {testResult && (
              <div className="space-y-2">
                <Label>Result:</Label>
                <div className="p-3 bg-muted rounded-md text-sm">
                  {testResult}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {patterns.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          <p>No pattern components added yet.</p>
          <p className="text-sm">
            Click &quot;Add Component&quot; to start building your custom
            pattern.
          </p>
        </div>
      )}
    </div>
  );
}
