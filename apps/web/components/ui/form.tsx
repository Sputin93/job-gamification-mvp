"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import { Controller, ControllerProps, FieldPath, FieldValues, FormProvider, useFormContext } from "react-hook-form";

import { cn } from "@/lib/utils";

const Form = FormProvider;

const FormField = <TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({ ...props }: ControllerProps<TFieldValues, TName>) => {
  return <Controller {...props} />;
};
FormField.displayName = "FormField";

const FormItemContext = React.createContext<{ id: string }>({ id: "" });
FormItemContext.displayName = "FormItemContext";

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  );
});
FormItem.displayName = "FormItem";

const useFormField = () => {
  const fieldContext = React.useContext(FormItemContext);
  const itemContext = useFormContext();
  const { getFieldState, formState } = itemContext;

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormItem>");
  }

  const fieldState = getFieldState(fieldContext.id, formState);

  return {
    id: fieldContext.id,
    name: fieldContext.id,
    formItemId: `${fieldContext.id}-form-item`,
    formDescriptionId: `${fieldContext.id}-form-item-description`,
    formMessageId: `${fieldContext.id}-form-item-message`,
    ...fieldState
  };
};

const FormLabel = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(
  ({ className, ...props }, ref) => {
    const { formItemId } = useFormField();

    return <LabelPrimitive.Root ref={ref} className={cn("text-sm font-medium leading-none", className)} htmlFor={formItemId} {...props} />;
  }
);
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<React.ElementRef<typeof Slot>, React.ComponentPropsWithoutRef<typeof Slot>>(({ ...props }, ref) => {
  const { formItemId } = useFormField();

  return <Slot ref={ref} id={formItemId} aria-describedby={`${formItemId}-description ${formItemId}-message`} {...props} />;
});
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField();

  return <p ref={ref} id={formDescriptionId} className={cn("text-xs text-muted-foreground", className)} {...props} />;
});
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, children, ...props }, ref) => {
  const { formMessageId } = useFormField();
  const body = children ?? props.children;

  return (
    <p ref={ref} id={formMessageId} className={cn("text-xs font-medium text-destructive", className)} {...props}>
      {body}
    </p>
  );
});
FormMessage.displayName = "FormMessage";

export { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage };