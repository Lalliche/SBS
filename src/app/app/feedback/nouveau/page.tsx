"use client";
import { Guard } from "@/components/app/Guard";
import { Wizard } from "@/components/feedback/Wizard";

export default function NewFeedbackPage() {
  return (
    <Guard action="feedback.give">
      <Wizard />
    </Guard>
  );
}
