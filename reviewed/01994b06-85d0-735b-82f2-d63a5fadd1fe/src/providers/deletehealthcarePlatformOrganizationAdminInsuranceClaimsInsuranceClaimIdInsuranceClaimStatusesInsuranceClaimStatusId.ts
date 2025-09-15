import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Hard delete an insurance claim status event entry from a claim
 * (healthcare_platform_insurance_claim_statuses).
 *
 * Removes an insurance claim status record for a given claim, specifically
 * targeting a record identified by insuranceClaimStatusId under the claim
 * referenced by insuranceClaimId. This operation is restricted to
 * high-privilege roles (organization admin), reflecting the sensitive nature of
 * changing an insurance claim's legal/audit state.
 *
 * The operation executes a hard delete, permanently erasing the status record
 * from the database without a recovery option. All delete actions are captured
 * in the financial audit log, with user attribution and timestamp, to ensure
 * regulatory traceability. Attempting to delete a non-existent or non-owned
 * claim status, or insufficient permissions, will result in an error.
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.organizationAdmin - Authenticated organization admin performing
 *   the operation
 * @param props.insuranceClaimId - The insurance claim UUID under which the
 *   claim status exists
 * @param props.insuranceClaimStatusId - The insurance claim status UUID to
 *   delete
 * @returns Void
 * @throws {Error} If status not found or claim not found or not belonging to
 *   claim
 */
export async function deletehealthcarePlatformOrganizationAdminInsuranceClaimsInsuranceClaimIdInsuranceClaimStatusesInsuranceClaimStatusId(props: {
  organizationAdmin: OrganizationadminPayload;
  insuranceClaimId: string & tags.Format<"uuid">;
  insuranceClaimStatusId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Lookup the status
  const status =
    await MyGlobal.prisma.healthcare_platform_insurance_claim_statuses.findUnique(
      {
        where: { id: props.insuranceClaimStatusId },
      },
    );
  if (!status) throw new Error("Insurance claim status not found");

  // Step 2: Validate claim_id
  if (status.claim_id !== props.insuranceClaimId)
    throw new Error("Claim status does not belong to the given claim");

  // Step 3: Lookup the parent claim
  const claim =
    await MyGlobal.prisma.healthcare_platform_insurance_claims.findUnique({
      where: { id: props.insuranceClaimId },
    });
  if (!claim) throw new Error("Parent insurance claim not found");

  // Step 4: Lookup associated invoice for organization_id
  const invoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findUnique({
      where: { id: claim.invoice_id },
    });
  if (!invoice)
    throw new Error("Associated billing invoice for claim not found");

  // Step 5: Delete status (hard delete)
  await MyGlobal.prisma.healthcare_platform_insurance_claim_statuses.delete({
    where: { id: props.insuranceClaimStatusId },
  });

  // Step 6: Write audit log
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_financial_audit_logs.create({
    data: {
      id: v4(),
      organization_id: invoice.organization_id,
      entity_id: props.insuranceClaimStatusId,
      user_id: props.organizationAdmin.id,
      entity_type: "claim_status",
      audit_action: "delete",
      action_description: `Deleted claim status ${props.insuranceClaimStatusId} from claim ${props.insuranceClaimId}`,
      action_timestamp: now,
      created_at: now,
    },
  });
}
