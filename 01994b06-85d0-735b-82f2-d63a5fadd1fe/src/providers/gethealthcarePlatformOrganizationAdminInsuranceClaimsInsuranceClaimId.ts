import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceClaim } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceClaim";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Fetch full details of an insurance claim record by claim ID from
 * healthcare_platform_insurance_claims.
 *
 * This operation retrieves detailed information about a specific insurance
 * claim by its unique claim ID. It enforces strict organization-based access
 * control using the organizationAdmin role. Only active (not-deleted) claims
 * can be fetched. The API returns comprehensive data for billing, compliance,
 * and audit workflows, including status, service dates, invoice/policy linkage,
 * payer responses, and audit fields.
 *
 * @param props - Operation params
 * @param props.organizationAdmin - The authenticated organization admin
 *   requesting access (OrganizationadminPayload)
 * @param props.insuranceClaimId - The UUID of the insurance claim to fetch
 * @returns Full record of the insurance claim: status, policy/invoice refs,
 *   amounts, audit data
 * @throws {Error} If the insurance claim does not exist or is not accessible by
 *   this admin (not found/forbidden)
 */
export async function gethealthcarePlatformOrganizationAdminInsuranceClaimsInsuranceClaimId(props: {
  organizationAdmin: OrganizationadminPayload;
  insuranceClaimId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformInsuranceClaim> {
  const { organizationAdmin, insuranceClaimId } = props;

  // Fetch insurance claim record (must be active)
  const claim =
    await MyGlobal.prisma.healthcare_platform_insurance_claims.findFirst({
      where: {
        id: insuranceClaimId,
        deleted_at: null,
      },
    });
  if (!claim) throw new Error("Insurance claim not found");

  // Fetch the insurance policy associated with this claim
  const policy =
    await MyGlobal.prisma.healthcare_platform_insurance_policies.findFirst({
      where: {
        id: claim.insurance_policy_id,
      },
    });
  if (!policy) throw new Error("Associated insurance policy not found");

  // Fetch organization admin record (ensure still valid/not deleted)
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: {
        id: organizationAdmin.id,
        deleted_at: null,
      },
    });
  if (!admin)
    throw new Error("Unauthorized: Organization admin not found or deleted");

  // Authorization: ensure that the admin is allowed to access claims within the organization owning the policy
  if (policy.organization_id !== admin.id) {
    throw new Error(
      "Forbidden: You do not have access to this insurance claim",
    );
  }

  // Convert all date fields to string & tags.Format<'date-time'> as required
  return {
    id: claim.id,
    insurance_policy_id: claim.insurance_policy_id,
    invoice_id: claim.invoice_id,
    claim_number: claim.claim_number,
    service_start_date: toISOStringSafe(claim.service_start_date),
    service_end_date: claim.service_end_date
      ? toISOStringSafe(claim.service_end_date)
      : undefined,
    total_claimed_amount: claim.total_claimed_amount,
    submission_status: claim.submission_status,
    last_payer_response_code: claim.last_payer_response_code ?? undefined,
    last_payer_response_description:
      claim.last_payer_response_description ?? undefined,
    created_at: toISOStringSafe(claim.created_at),
    updated_at: toISOStringSafe(claim.updated_at),
    deleted_at: claim.deleted_at
      ? toISOStringSafe(claim.deleted_at)
      : undefined,
  };
}
