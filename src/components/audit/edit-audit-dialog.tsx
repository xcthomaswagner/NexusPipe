"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X, Loader2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  DEPTH_CONFIG,
  type AuditDepth,
} from "@/lib/validation/audit";

const formSchema = z.object({
  competitors: z.array(z.object({ value: z.string().max(100) })).max(10),
  industryIntent: z.string().min(10).max(500),
  depth: z.enum(["QUICK", "STANDARD", "DEEP"]),
});

type FormValues = z.infer<typeof formSchema>;

interface EditAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audit: {
    id: string;
    brandName: string;
    industryIntent: string;
    depth?: string | null;
    competitors: Array<{ name: string }>;
    excludedDomains: string[];
  };
  onSubmit: (data: {
    competitors: string[];
    industryIntent: string;
    depth: AuditDepth;
  }) => void;
  isSubmitting: boolean;
}

export function EditAuditDialog({
  open,
  onOpenChange,
  audit,
  onSubmit,
  isSubmitting,
}: EditAuditDialogProps) {
  const [showExclusions, setShowExclusions] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      competitors: audit.competitors.map((c) => ({ value: c.name })),
      industryIntent: audit.industryIntent,
      depth: (audit.depth as AuditDepth) || "STANDARD",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "competitors",
  });

  // Reset form when audit changes
  useEffect(() => {
    form.reset({
      competitors: audit.competitors.map((c) => ({ value: c.name })),
      industryIntent: audit.industryIntent,
      depth: (audit.depth as AuditDepth) || "STANDARD",
    });
  }, [audit, form]);

  const handleSubmit = (data: FormValues) => {
    const competitors = data.competitors
      .map((c) => c.value.trim())
      .filter((c) => c !== "");

    onSubmit({
      competitors,
      industryIntent: data.industryIntent,
      depth: data.depth,
    });
  };

  const exclusionCount = audit.excludedDomains.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit & Rerun Audit</DialogTitle>
          <DialogDescription>
            Update the audit settings for <strong>{audit.brandName}</strong> and rerun with the new configuration.
          </DialogDescription>
        </DialogHeader>

        {exclusionCount > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>
                  <strong>{exclusionCount}</strong> domain{exclusionCount !== 1 ? "s" : ""} will be excluded from this audit.
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExclusions(!showExclusions)}
                  className="ml-2"
                >
                  {showExclusions ? (
                    <>
                      Hide <ChevronUp className="ml-1 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Show <ChevronDown className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
              {showExclusions && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {audit.excludedDomains.map((domain) => (
                    <Badge key={domain} variant="secondary" className="text-xs">
                      {domain}
                    </Badge>
                  ))}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Brand Name (read-only) */}
            <div className="space-y-2">
              <Label>Brand Name</Label>
              <Input value={audit.brandName} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                Brand name cannot be changed. Create a new audit if needed.
              </p>
            </div>

            {/* Competitors */}
            <div className="space-y-4">
              <FormLabel>Competitors (optional)</FormLabel>
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <FormField
                    control={form.control}
                    name={`competitors.${index}.value`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder={`Competitor ${index + 1}`}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => remove(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {fields.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ value: "" })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Competitor
                </Button>
              )}
            </div>

            {/* Industry Intent */}
            <FormField
              control={form.control}
              name="industryIntent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry Intent Query</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What are the best B2B commerce platforms for enterprise companies in 2025?"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Scan Depth */}
            <FormField
              control={form.control}
              name="depth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scan Depth</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-3 gap-4"
                    >
                      {(Object.keys(DEPTH_CONFIG) as AuditDepth[]).map((key) => {
                        const config = DEPTH_CONFIG[key];
                        return (
                          <div key={key}>
                            <RadioGroupItem
                              value={key}
                              id={`edit-${key}`}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={`edit-${key}`}
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                              <span className="font-semibold text-sm">{config.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {config.sources} sources
                              </span>
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rerunning...
                  </>
                ) : (
                  "Save & Rerun Audit"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
