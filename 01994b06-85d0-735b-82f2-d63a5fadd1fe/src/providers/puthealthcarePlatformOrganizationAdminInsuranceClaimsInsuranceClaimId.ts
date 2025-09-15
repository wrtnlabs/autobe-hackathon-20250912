import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceClaim } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceClaim";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Updates an existing healthcare insurance claim record.
 *
 * This operation allows an authenticated organization admin to update mutable
 * fields (such as service_end_date, total_claimed_amount, submission_status,
 * last_payer_response_code, last_payer_response_description, and deleted_at) of
 * an insurance claim identified by insuranceClaimId. Immutable fields
 * (claim_number, insurance_policy_id, invoice_id, service_start_date,
 * created_at, id) cannot be changed. The operation enforces that only claims
 * for invoices belonging to the admin's organization may be updated, and
 * rejects updates to deleted/archived claims. Invalid status transitions (e.g.,
 * moving from denied to paid) are forbidden. All date fields are handled as ISO
 * 8601 strings. Any update is fully audited via separate mechanisms (not part
 * of this function).
 *
 * @param props - Object containing authorized organizationAdmin,
 *   insuranceClaimId, and update data for the claim.
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request (OrganizationadminPayload)
 * @param props.insuranceClaimId - UUID of the insurance claim to update
 * @param props.body - Insurance claim fields to update (mutable only)
 * @returns The updated insurance claim record
 * @throws {Error} If the claim does not exist, is deleted, does not belong to
 *   the admin's organization, or if status transition is invalid
 */
export async function puthealthcarePlatformOrganizationAdminInsuranceClaimsInsuranceClaimId(props: {
  organizationAdmin: OrganizationadminPayload;
  insuranceClaimId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformInsuranceClaim.IUpdate;
}): Promise<IHealthcarePlatformInsuranceClaim> {
  const { organizationAdmin, insuranceClaimId, body } = props;

  // Step 1: Fetch claim, including invoice.organization_id
  const claim =
    await MyGlobal.prisma.healthcare_platform_insurance_claims.findFirst({
      where: { id: insuranceClaimId },
      include: {
        invoice: {
          select: { organization_id: true },
        },
      },
    });
  if (!claim) throw new Error("Insurance claim not found");
  if (claim.deleted_at !== null && claim.deleted_at !== undefined)
    throw new Error("Claim is deleted/archived");

  // Authorization: Only allow updating for claim's invoice organization
  if (
    !claim.invoice ||
    claim.invoice.organization_id !== organizationAdmin.id
  ) {
    throw new Error("Forbidden: Claim does not belong to your organization");
  }

  // Business logic: Forbid status change from denied -> paid
  if (
    body.submission_status === "paid" &&
    claim.submission_status === "denied"
  ) {
    throw new Error(
      "Invalid status transition: cannot move claim from denied to paid",
    );
  }

  // Prepare update payload: Only mutable fields (typed to avoid 'as')
  const patch: Record<string, unknown> = {
    // Nullable field: service_end_date
    ...(body.service_end_date !== undefined && {
      service_end_date:
        body.service_end_date === null
          ? null
          : toISOStringSafe(body.service_end_date),
    }),
    // Nullable field: deleted_at
    ...(body.deleted_at !== undefined && {
      deleted_at:
        body.deleted_at === null ? null : toISOStringSafe(body.deleted_at),
    }),
    // All other fields, optional
    ...(body.total_claimed_amount !== undefined && {
      total_claimed_amount: body.total_claimed_amount,
    }),
    ...(body.submission_status !== undefined && {
      submission_status: body.submission_status,
    }),
    ...(body.last_payer_response_code !== undefined && {
      last_payer_response_code: body.last_payer_response_code,
    }),
    ...(body.last_payer_response_description !== undefined && {
      last_payer_response_description: body.last_payer_response_description,
    }),
    // Always update updated_at timestamp
    updated_at: toISOStringSafe(new Date()),
  };

  // Perform update
  const updated =
    await MyGlobal.prisma.healthcare_platform_insurance_claims.update({
      where: { id: insuranceClaimId },
      data: patch,
    });

  // Business rule: Make sure non-blank for required fields if client supplied
  if (
    ("submission_status" in body &&
      (!updated.submission_status ||
        updated.submission_status.trim().length === 0)) ||
    ("last_payer_response_code" in body &&
      body.last_payer_response_code !== undefined &&
      (!updated.last_payer_response_code ||
        updated.last_payer_response_code.trim().length === 0))
  ) {
    throw new Error("One or more mandatory fields are blank after update");
  }

  // Return value: Convert Date fields using toISOStringSafe, match DTO
  return {
    id: updated.id,
    insurance_policy_id: updated.insurance_policy_id,
    invoice_id: updated.invoice_id,
    claim_number: updated.claim_number,
    service_start_date: toISOStringSafe(updated.service_start_date),
    service_end_date:
      updated.service_end_date !== null &&
      updated.service_end_date !== undefined
        ? toISOStringSafe(updated.service_end_date)
        : undefined,
    total_claimed_amount: updated.total_claimed_amount,
    submission_status: updated.submission_status,
    last_payer_response_code: updated.last_payer_response_code ?? undefined,
    last_payer_response_description:
      updated.last_payer_response_description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
