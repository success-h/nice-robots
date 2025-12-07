import { PlanData } from '@/zustand/useStore';

// Helper function to safely get plan attributes
export function getPlanAttribute<T>(
  plan: PlanData | null | undefined,
  attribute: keyof NonNullable<PlanData['attributes']>,
  defaultValue?: T
): T | undefined {
  if (!plan) return defaultValue;
  
  // Handle both wrapped (plan.data.attributes) and flattened (plan.attributes) forms
  const attributes = (plan as { data?: { attributes?: PlanData['attributes'] }; attributes?: PlanData['attributes'] }).data?.attributes 
    ?? (plan as { attributes?: PlanData['attributes'] }).attributes;
  
  if (!attributes) return defaultValue;
  return (attributes[attribute] as T) ?? defaultValue;
}

// Helper function to get plan name
export function getPlanName(plan: PlanData | null | undefined): string {
  return getPlanAttribute(plan, 'name', 'Plan') ?? 'Plan';
}

// Helper function to get plan description
export function getPlanDescription(plan: PlanData | null | undefined): string | undefined {
  return getPlanAttribute(plan, 'description');
}

// Helper function to get plan slug
export function getPlanSlug(plan: PlanData | null | undefined): string | undefined {
  return getPlanAttribute(plan, 'slug');
}

// Helper function to get plan price
export function getPlanPrice(plan: PlanData | null | undefined): string | number | undefined {
  return getPlanAttribute(plan, 'price');
}

// Helper function to get plan duration
export function getPlanDuration(plan: PlanData | null | undefined): number | undefined {
  return getPlanAttribute(plan, 'duration');
}

// Helper function to get plan duration unit
export function getPlanDurationUnit(plan: PlanData | null | undefined): string | undefined {
  return getPlanAttribute(plan, 'duration_unit');
}

// Helper function to check if plan is free or bonus
export function isFreeOrBonusPlan(plan: PlanData | null | undefined): boolean {
  const slug = getPlanSlug(plan);
  return slug === 'free' || slug === 'bonus';
}

// Helper function to get user plan attributes (for dates)
export interface UserPlanAttributes {
  start_date?: string;
  end_date?: string;
}

export function getUserPlanAttributes(userPlan: PlanData | null | undefined): UserPlanAttributes | null {
  if (!userPlan) return null;
  
  // Handle both wrapped and flattened forms
  const attributes = (userPlan as { data?: { attributes?: UserPlanAttributes }; attributes?: UserPlanAttributes }).data?.attributes 
    ?? (userPlan as { attributes?: UserPlanAttributes }).attributes;
  
  if (!attributes) return null;
  
  return {
    start_date: attributes.start_date,
    end_date: attributes.end_date,
  };
}

