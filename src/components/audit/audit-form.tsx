"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X, Loader2, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import {
  DEPTH_CONFIG,
  auditDepthSchema,
  type AuditDepth,
} from "@/lib/validation/audit";

// Internal form schema using objects for useFieldArray compatibility
const formSchema = z.object({
  brandName: z.string().min(1, "Brand name is required").max(100),
  competitors: z
    .array(z.object({ value: z.string().max(100) }))
    .max(10, "Maximum 10 competitors allowed"),
  industryIntent: z
    .string()
    .min(10, "Industry intent must be at least 10 characters")
    .max(500),
  depth: auditDepthSchema,
});

type FormValues = z.infer<typeof formSchema>;

export function AuditForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      brandName: "",
      competitors: [], // Start empty, user adds competitors
      industryIntent: "",
      depth: "STANDARD",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "competitors",
  });

  const competitorInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const prevFieldsLengthRef = useRef(fields.length);

  // Focus the new input when a competitor is added
  useEffect(() => {
    if (fields.length > prevFieldsLengthRef.current) {
      const lastInput = competitorInputsRef.current[fields.length - 1];
      if (lastInput) {
        lastInput.focus();
      }
    }
    prevFieldsLengthRef.current = fields.length;
  }, [fields.length]);

  const createAudit = trpc.audit.create.useMutation({
    onSuccess: (data) => {
      router.push(`/audit/${data.id}`);
    },
    onError: (error) => {
      setIsSubmitting(false);
      console.error("Failed to create audit:", error);
    },
  });

  const onSubmit = (data: FormValues) => {
    // Transform competitors from objects to strings, filtering empty values
    const competitors = data.competitors
      .map((c) => c.value.trim())
      .filter((c) => c !== "");

    setIsSubmitting(true);
    createAudit.mutate({
      brandName: data.brandName,
      competitors,
      industryIntent: data.industryIntent,
      depth: data.depth,
    });
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>New GEO Audit</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="brandName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your brand name" {...field} />
                  </FormControl>
                  <FormDescription>
                    The brand you want to audit for AI visibility.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex items-center gap-1.5">
                <FormLabel>Competitors</FormLabel>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[280px]">
                    <p>Optional. Add competitors to unlock citation gap analysis — sources mentioning them but not you.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <FormDescription>
                Add up to 10 competitors to compare against.
              </FormDescription>
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
                            ref={(el) => {
                              competitorInputsRef.current[index] = el;
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
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
              {form.formState.errors.competitors?.root?.message && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.competitors.root.message}
                </p>
              )}
            </div>

            <FormField
              control={form.control}
              name="industryIntent"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-1.5">
                    <FormLabel>Industry Intent Query</FormLabel>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[280px]">
                        <p>A natural language question like &ldquo;What are the best CRM tools for mid-size companies?&rdquo; — this guides AI source discovery.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="What are the best B2B commerce platforms for enterprise companies in 2025?"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A natural language query that describes what users might ask
                    AI about your industry. This simulates how AI models search
                    for information.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="depth"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-1.5">
                    <FormLabel>Scan Depth</FormLabel>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[280px]">
                        <p>More sources = more accurate but slower. Quick for exploration, Deep for comprehensive analysis.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-3 gap-4"
                    >
                      {(Object.keys(DEPTH_CONFIG) as AuditDepth[]).map((key) => {
                        const config = DEPTH_CONFIG[key];
                        return (
                          <div key={key}>
                            <RadioGroupItem
                              value={key}
                              id={key}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={key}
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                              <span className="font-semibold">{config.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {config.sources} sources
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {config.description}
                              </span>
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    More sources = more accurate but slower. Quick is good for
                    initial exploration, Deep for comprehensive analysis.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Audit...
                </>
              ) : (
                "Start Audit"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
