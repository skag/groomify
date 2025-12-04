/**
 * Agreement Types
 * Request and response types for agreement management endpoints
 */

export type SigningOption = "once" | "every" | "manual";
export type AgreementStatus = "active" | "draft" | "archived";

export interface Agreement {
  id: number;
  business_id: number;
  name: string;
  content: string; // Rich text/HTML content
  signing_option: SigningOption;
  status: AgreementStatus;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface CreateAgreementRequest {
  name: string;
  content: string; // Rich text/HTML content
  signing_option: SigningOption;
  status?: AgreementStatus;
}

export interface UpdateAgreementRequest {
  name?: string;
  content?: string; // Rich text/HTML content
  signing_option?: SigningOption;
  status?: AgreementStatus;
}
