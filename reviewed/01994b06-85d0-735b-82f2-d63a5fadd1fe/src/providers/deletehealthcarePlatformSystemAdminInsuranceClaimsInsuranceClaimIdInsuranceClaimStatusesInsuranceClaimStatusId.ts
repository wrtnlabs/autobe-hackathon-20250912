import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Hard delete an insurance claim status event entry from a claim
 * (healthcare_platform_insurance_claim_statuses).
 *
 * Removes an insurance claim status record for a given claim, specifically
 * targeting a record identified by insuranceClaimStatusId under the claim
 * referenced by insuranceClaimId. This operation is restricted to
 * high-privilege roles (e.g., system admin), reflecting the sensitive nature of
 * changing an insurance claim's legal/audit state.
 *
 * The operation executes a hard delete, permanently erasing the status record
 * from the database without a recovery option. All delete actions are captured
 * in the financial audit log, with user attribution and timestamp, to ensure
 * regulatory traceability. Attempting to delete a non-existent or non-owned
 * claim status, or insufficient permissions, will result in an error.
 *
 * @param props - Object containing system admin payload and insurance
 *   claim/status IDs
 * @param props.systemAdmin - The authenticated system admin performing this
 *   operation
 * @param props.insuranceClaimId - Unique identifier of the insurance claim
 * @param props.insuranceClaimStatusId - Unique identifier of the insurance
 *   claim status record
 * @returns Void
 * @throws {Error} If the claim status does not exist or does not belong to the
 *   specified claim
 * @throws {Error} If the insurance claim or its related invoice does not exist
 */
export async function deletehealthcarePlatformSystemAdminInsuranceClaimsInsuranceClaimIdInsuranceClaimStatusesInsuranceClaimStatusId(props: {
  systemAdmin: SystemadminPayload;
  insuranceClaimId: string & tags.Format<"uuid">;
  insuranceClaimStatusId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, insuranceClaimId, insuranceClaimStatusId } = props;

  // 1. Find the claim status record and verify association to the claim
  const claimStatus =
    await MyGlobal.prisma.healthcare_platform_insurance_claim_statuses.findUnique(
      {
        where: { id: insuranceClaimStatusId },
      },
    );
  if (!claimStatus || claimStatus.claim_id !== insuranceClaimId) {
    throw new Error("Insurance claim status not found for this claim");
  }

  // 2. Find the parent claim
  const claim =
    await MyGlobal.prisma.healthcare_platform_insurance_claims.findUnique({
      where: { id: insuranceClaimId },
    });
  if (!claim) {
    throw new Error("Insurance claim not found");
  }

  // 2b. Find the related invoice for organization_id needed in the audit log
  let organization_id: (string & tags.Format<"uuid">) | undefined;
  if (claim.invoice_id) {
    const invoice =
      await MyGlobal.prisma.healthcare_platform_billing_invoices.findUnique({
        where: { id: claim.invoice_id },
        select: { organization_id: true },
      });
    if (!invoice) {
      throw new Error(
        "Related billing invoice not found for the insurance claim (cannot determine organization)",
      );
    }
    organization_id = invoice.organization_id as string & tags.Format<"uuid">;
  }
  if (!organization_id) {
    throw new Error(
      "Organization not determined from insurance claim for audit log",
    );
  }

  // 3. Hard delete the status record
  await MyGlobal.prisma.healthcare_platform_insurance_claim_statuses.delete({
    where: { id: insuranceClaimStatusId },
  });

  // 4. Write audit log for deletion
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_financial_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      organization_id: organization_id,
      entity_id: insuranceClaimStatusId,
      user_id: systemAdmin.id,
      entity_type: "insurance_claim_status",
      audit_action: "delete",
      action_description: `Deleted insurance claim status record by system admin (id: ${systemAdmin.id})`,
      action_timestamp: now,
      created_at: now,
    },
  });
}
