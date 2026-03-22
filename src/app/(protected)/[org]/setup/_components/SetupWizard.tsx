"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { listVerticals, getVertical } from "~/verticals/registry";
import type { VerticalDefinition } from "~/verticals/types";
import { Button } from "~/components/ui/button";
import { VerticalPicker } from "./VerticalPicker";
import { ReviewApply } from "./ReviewApply";

type WizardPhase = "pick-vertical" | "vertical-steps" | "review";

export function SetupWizard({ org }: { org: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<WizardPhase>("pick-vertical");
  const [selectedVertical, setSelectedVertical] =
    useState<VerticalDefinition | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  const verticals = useMemo(() => listVerticals(), []);

  const dismissMutation = api.onboarding.dismiss.useMutation({
    onSuccess: () => router.push(`/${org}`),
  });

  const applyMutation = api.onboarding.applySetup.useMutation({
    onSuccess: () => router.push(`/${org}`),
  });

  const totalSteps = selectedVertical
    ? 1 + selectedVertical.steps.length + 1
    : 1;
  const currentGlobalStep =
    phase === "pick-vertical"
      ? 0
      : phase === "vertical-steps"
        ? 1 + stepIndex
        : totalSteps - 1;

  const handlePickVertical = useCallback(
    (key: string) => {
      const v = getVertical(key);
      if (!v) return;
      setSelectedVertical(v);
      setAnswers({});
      if (v.steps.length === 0) {
        applyMutation.mutate({ verticalKey: key, answers: {} });
      } else {
        setPhase("vertical-steps");
        setStepIndex(0);
      }
    },
    [applyMutation],
  );

  const handleStepNext = useCallback(
    (stepAnswers: Record<string, unknown>) => {
      const merged = { ...answers, ...stepAnswers };
      setAnswers(merged);

      if (selectedVertical && stepIndex < selectedVertical.steps.length - 1) {
        setStepIndex((i) => i + 1);
      } else {
        setPhase("review");
      }
    },
    [answers, selectedVertical, stepIndex],
  );

  const handleStepBack = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
    } else {
      setPhase("pick-vertical");
      setSelectedVertical(null);
    }
  }, [stepIndex]);

  const handleReviewBack = useCallback(() => {
    if (selectedVertical && selectedVertical.steps.length > 0) {
      setPhase("vertical-steps");
      setStepIndex(selectedVertical.steps.length - 1);
    } else {
      setPhase("pick-vertical");
    }
  }, [selectedVertical]);

  const handleDismiss = useCallback(() => {
    dismissMutation.mutate();
  }, [dismissMutation]);

  const StepComponent =
    phase === "vertical-steps" && selectedVertical
      ? selectedVertical.steps[stepIndex]?.component
      : null;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col px-6 py-10">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all duration-300"
            style={{
              width: `${totalSteps > 1 ? (currentGlobalStep / (totalSteps - 1)) * 100 : 0}%`,
            }}
          />
        </div>
        <div className="text-muted-foreground mt-2 flex justify-between text-xs">
          <span>
            Step {currentGlobalStep + 1} of {totalSteps}
          </span>
          {selectedVertical && (
            <span className="font-medium">{selectedVertical.name}</span>
          )}
        </div>
      </div>

      {/* Phase content */}
      <div className="flex-1">
        {phase === "pick-vertical" && (
          <VerticalPicker
            verticals={[...verticals]}
            onSelect={handlePickVertical}
          />
        )}

        {phase === "vertical-steps" && StepComponent && (
          <StepComponent
            answers={answers}
            onNext={handleStepNext}
            onBack={handleStepBack}
          />
        )}

        {phase === "review" && selectedVertical && (
          <ReviewApply
            org={org}
            vertical={selectedVertical}
            answers={answers}
            onBack={handleReviewBack}
          />
        )}
      </div>

      {/* Dismiss */}
      <div className="mt-8 border-t pt-4 text-center">
        <Button
          variant="link"
          className="text-muted-foreground text-xs"
          onClick={handleDismiss}
          disabled={dismissMutation.isPending}
        >
          {dismissMutation.isPending ? (
            <Loader2 className="mr-1.5 size-3 animate-spin" />
          ) : null}
          I&apos;ll set this up later
        </Button>
      </div>
    </div>
  );
}
