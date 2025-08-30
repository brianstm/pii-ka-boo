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
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
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
    setTouchedFields((prev) => {
      const newTouched = { ...prev };
      delete newTouched[`literal_${index}`];
      delete newTouched[`quantity_${index}`];
      delete newTouched[`range_min_${index}`];
      delete newTouched[`range_max_${index}`];

      Object.keys(newTouched).forEach((key) => {
        const match = key.match(/(literal|quantity|range_min|range_max)_(\d+)/);
        if (match) {
          const [, fieldType, keyIndex] = match;
          const keyNum = parseInt(keyIndex);
          if (keyNum > index) {
            const newKey = `${fieldType}_${keyNum - 1}`;
            newTouched[newKey] = newTouched[key];
            delete newTouched[key];
          }
        }
      });
      return newTouched;
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

  const validatePatterns = (): string | null => {
    if (patterns.length === 0) {
      return "No pattern components added. Please add at least one component.";
    }

    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];

      if (!pattern.type) {
        return `Component ${i + 1}: Missing pattern type.`;
      }

      const validTypes = TYPE_OPTIONS.map((opt) => opt.value);
      if (!validTypes.includes(pattern.type)) {
        return `Component ${i + 1}: Invalid pattern type "${pattern.type}".`;
      }

      const literalFieldKey = `literal_${i}`;
      if (
        pattern.type === "literal" &&
        touchedFields[literalFieldKey] &&
        (!pattern.value || pattern.value.trim() === "")
      ) {
        return `Component ${i + 1}: Literal type requires a value.`;
      }

      const quantityFieldKey = `quantity_${i}`;
      if (
        typeof pattern.quantity === "number" &&
        pattern.quantity < 0 &&
        touchedFields[quantityFieldKey]
      ) {
        return `Component ${i + 1}: Quantity must be non-negative, got ${
          pattern.quantity
        }.`;
      }

      const rangeMinFieldKey = `range_min_${i}`;
      const rangeMaxFieldKey = `range_max_${i}`;
      if (Array.isArray(pattern.quantity)) {
        const [min, max] = pattern.quantity;
        if (
          (touchedFields[rangeMinFieldKey] && min < 0) ||
          (touchedFields[rangeMaxFieldKey] && max < min)
        ) {
          return `Component ${
            i + 1
          }: Range must have min >= 0 and max >= min, got [${min}, ${max}].`;
        }
      }

      const validQuantities = ["one_or_more", "zero_or_more", "optional"];
      if (
        typeof pattern.quantity === "string" &&
        !validQuantities.includes(pattern.quantity)
      ) {
        return `Component ${i + 1}: Invalid quantity type "${
          pattern.quantity
        }".`;
      }
    }

    return null;
  };

  const testPattern = async () => {
    if (!testText || patterns.length === 0) return;

    const validationError = validatePatterns();
    if (validationError) {
      setTestResult(`Validation Error: ${validationError}`);
      return;
    }

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

      const responseData = await response.json();

      if (response.ok) {
        console.log("Pattern test result:", responseData);
        setTestResult(responseData.processed);
      } else {
        console.error("Pattern test failed:", responseData);
        if (responseData.error) {
          if (responseData.error.includes("Missing required fields")) {
            setTestResult(
              "Error: Missing required fields (text and pattern_sequence)"
            );
          } else if (responseData.error.includes("Invalid JSON input")) {
            setTestResult("Error: Invalid request format");
          } else if (responseData.error.includes("Pattern processing error")) {
            setTestResult(
              `Error: ${responseData.error.replace(
                "Pattern processing error: ",
                ""
              )}`
            );
          } else if (responseData.error.includes("Unexpected error")) {
            setTestResult("Error: Unexpected server error occurred");
          } else {
            setTestResult(`Error: ${responseData.error}`);
          }
        } else {
          setTestResult("Error: Pattern processing failed");
        }
      }
    } catch (error) {
      console.error("Pattern test error:", error);
      if (error instanceof TypeError && error.message.includes("fetch")) {
        setTestResult("Error: Network error - unable to connect to server");
      } else {
        setTestResult("Error: Failed to test pattern");
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pattern Components</h3>
        <Button onClick={addComponent} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Component
        </Button>
      </div>

      <div className="space-y-3 max-h-[200px] overflow-y-auto">
        {patterns.map((pattern, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-3">
                <div
                  className={`grid gap-3 ${
                    pattern.type === "literal" ? "grid-cols-1" : "grid-cols-2"
                  }`}
                >
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={pattern.type || ""}
                      onValueChange={(value) => {
                        const newType = value as PatternComponent["type"];

                        const updatedComponent: Partial<PatternComponent> = {
                          type: newType,
                        };

                        if (newType === "literal") {
                          updatedComponent.quantity = 1;
                          updatedComponent.value = "";
                          setQuantityTypes((prev) => ({
                            ...prev,
                            [index]: "1",
                          }));
                        } else {
                          updatedComponent.value = "";
                        }
                        updateComponent(index, updatedComponent);
                      }}
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

                  {pattern.type !== "literal" && (
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
                  )}
                </div>

                {pattern.type === "literal" && (
                  <div>
                    <Label>Literal Value *</Label>
                    <Input
                      value={pattern.value || ""}
                      onChange={(e) => {
                        updateComponent(index, { value: e.target.value });
                        setTouchedFields((prev) => ({
                          ...prev,
                          [`literal_${index}`]: true,
                        }));
                      }}
                      onBlur={() =>
                        setTouchedFields((prev) => ({
                          ...prev,
                          [`literal_${index}`]: true,
                        }))
                      }
                      placeholder="Enter exact text to match"
                      className={
                        touchedFields[`literal_${index}`] &&
                        (!pattern.value || pattern.value.trim() === "")
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {touchedFields[`literal_${index}`] &&
                      (!pattern.value || pattern.value.trim() === "") && (
                        <p className="text-xs text-red-500 mt-1">
                          Literal type requires a value
                        </p>
                      )}
                  </div>
                )}

                {pattern.type !== "literal" &&
                  quantityTypes[index] === "exactly" && (
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
                          if (newQuantity < 0) return;
                          updateComponent(index, { quantity: newQuantity });
                          setQuantityTypes((prev) => ({
                            ...prev,
                            [index]: "exactly",
                          }));
                          setTouchedFields((prev) => ({
                            ...prev,
                            [`quantity_${index}`]: true,
                          }));
                        }}
                        onBlur={() =>
                          setTouchedFields((prev) => ({
                            ...prev,
                            [`quantity_${index}`]: true,
                          }))
                        }
                        min="0"
                        className={
                          touchedFields[`quantity_${index}`] &&
                          typeof pattern.quantity === "number" &&
                          pattern.quantity < 0
                            ? "border-red-500"
                            : ""
                        }
                      />
                      {touchedFields[`quantity_${index}`] &&
                        typeof pattern.quantity === "number" &&
                        pattern.quantity < 0 && (
                          <p className="text-xs text-red-500 mt-1">
                            Quantity must be non-negative
                          </p>
                        )}
                    </div>
                  )}

                {pattern.type !== "literal" &&
                  Array.isArray(pattern.quantity) && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Min Count</Label>
                          <Input
                            type="number"
                            value={pattern.quantity[0]}
                            onChange={(e) => {
                              const min = parseInt(e.target.value) || 0;
                              if (min < 0) return;
                              const max = Array.isArray(pattern.quantity)
                                ? pattern.quantity[1]
                                : min;
                              updateComponent(index, { quantity: [min, max] });
                              setTouchedFields((prev) => ({
                                ...prev,
                                [`range_min_${index}`]: true,
                              }));
                            }}
                            onBlur={() =>
                              setTouchedFields((prev) => ({
                                ...prev,
                                [`range_min_${index}`]: true,
                              }))
                            }
                            min="0"
                            className={
                              touchedFields[`range_min_${index}`] &&
                              pattern.quantity[0] < 0
                                ? "border-red-500"
                                : ""
                            }
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
                              if (max < min) return;
                              updateComponent(index, { quantity: [min, max] });
                              setTouchedFields((prev) => ({
                                ...prev,
                                [`range_max_${index}`]: true,
                              }));
                            }}
                            onBlur={() =>
                              setTouchedFields((prev) => ({
                                ...prev,
                                [`range_max_${index}`]: true,
                              }))
                            }
                            min={pattern.quantity[0]}
                            className={
                              touchedFields[`range_max_${index}`] &&
                              pattern.quantity[1] < pattern.quantity[0]
                                ? "border-red-500"
                                : ""
                            }
                          />
                        </div>
                      </div>
                      {((touchedFields[`range_min_${index}`] &&
                        pattern.quantity[0] < 0) ||
                        (touchedFields[`range_max_${index}`] &&
                          pattern.quantity[1] < pattern.quantity[0])) && (
                        <p className="text-xs text-red-500">
                          {pattern.quantity[0] < 0
                            ? "Min count must be non-negative"
                            : "Max count must be greater than or equal to min count"}
                        </p>
                      )}
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
                disabled={!testText || isTesting || validatePatterns() !== null}
                size="sm"
                variant={validatePatterns() !== null ? "secondary" : "default"}
              >
                {isTesting ? "Testing..." : "Test Pattern"}
              </Button>
              {validatePatterns() !== null && (
                <p className="text-xs text-amber-600 mt-1">
                  Fix validation errors before testing
                </p>
              )}
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
