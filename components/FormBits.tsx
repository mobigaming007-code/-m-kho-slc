"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Card({
  children,
  span,
}: {
  children: ReactNode;
  span?: 5 | 6 | 7;
}) {
  return <section className={span ? `card span-${span}` : "card"}>{children}</section>;
}

export function Field({
  label,
  size,
  children,
}: {
  label: string;
  size?: "half" | "third";
  children: ReactNode;
}) {
  return (
    <div className={size ? `field ${size}` : "field"}>
      <label>{label}</label>
      {children}
    </div>
  );
}

export function NumberField({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const input = (
    <input
      type="number"
      min="0"
      step="0.1"
      value={value}
      onChange={(event) => onChange(Number(event.target.value || 0))}
    />
  );
  return (
    <Field label={label} size="half">
      {unit ? (
        <div className="input-row">
          {input}
          <div className="unit">{unit}</div>
        </div>
      ) : (
        input
      )}
    </Field>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} />;
}
