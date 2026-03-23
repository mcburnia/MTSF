/**
 * MTSF — Multi-Tenant SaaS Framework
 * Copyright (c) 2026 Loman Cavendish Limited (UK Company No. 06335037)
 * All rights reserved.
 *
 * Licensed under the MTSF Licence. See LICENCE file in the project root.
 */
export interface User {
  id: string;
  email: string;
  orgId: string | null;
  orgRole: string | null;
  preferredLanguage: string | null;
  isPlatformAdmin: boolean;
  orgPlan: string;
}

export interface Organisation {
  id: string;
  name: string;
  country: string | null;
  companySize: string | null;
  industry: string | null;
}

export interface BillingStatus {
  status: string;
  plan: string;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  graceEndsAt: string | null;
  seatCount: number;
  stripeCustomerId: string | null;
  exempt: boolean;
  exemptReason: string | null;
  billingEmail: string | null;
  vatNumber: string | null;
  monthlyAmountCents: number;
}

export interface Item {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  status: string;
  metadata: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}
