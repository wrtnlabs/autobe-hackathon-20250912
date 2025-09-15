import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceClaimStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceClaimStatus";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing insurance claim status entry in a claim
 * (healthcare_platform_insurance_claim_statuses).
 *
 * This endpoint allows authorized system administrators to update the status
 * history record of an insurance claim, such as correcting the status code,
 * clarifying descriptions, or posting an amended payment amount. The operation
 * ensures business rules by verifying claim and status linkage, restricts
 * changes to permissible fields, and logs changes for regulatory audit. All
 * updates are performed with strong type safety and proper ISO timestamp
 * conversion.
 *
 * @param props - Function properties
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the update
 * @param props.insuranceClaimId - Unique identifier of the insurance claim
 * @param props.insuranceClaimStatusId - Unique identifier of the insurance
 *   claim status to update
 * @param props.body - The patch body containing allowable fields to update
 * @returns The updated insurance claim status record
 * @throws {Error} If the claim status does not exist or does not belong to the
 *   specified claim
 */
export async function puthealthcarePlatformSystemAdminInsuranceClaimsInsuranceClaimIdInsuranceClaimStatusesInsuranceClaimStatusId(props: {
  systemAdmin: SystemadminPayload;
  insuranceClaimId: string & tags.Format<"uuid">;
  insuranceClaimStatusId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformInsuranceClaimStatus.IUpdate;
}): Promise<IHealthcarePlatformInsuranceClaimStatus> {
  const { systemAdmin, insuranceClaimId, insuranceClaimStatusId, body } = props;

  // 1. Fetch current claim status row; verify existence and correct linkage to claim
  const current =
    await MyGlobal.prisma.healthcare_platform_insurance_claim_statuses.findUnique(
      {
        where: { id: insuranceClaimStatusId },
      },
    );
  if (!current || current.claim_id !== insuranceClaimId) {
    throw new Error("Insurance claim status not found for this claim");
  }

  // 2. Prepare update fields. Only assign if present in body; updated_by_id always assigned
  const updateData: {
    status_code?: string;
    status_description?: string;
    payment_amount?: number | null;
    status_timestamp?: string;
    updated_by_id: string;
  } = {
    updated_by_id: systemAdmin.id,
    ...(body.status_code !== undefined
      ? { status_code: body.status_code }
      : {}),
    ...(body.status_description !== undefined
      ? { status_description: body.status_description }
      : {}),
    ...(body.payment_amount !== undefined
      ? { payment_amount: body.payment_amount }
      : {}),
    ...(body.status_timestamp !== undefined
      ? { status_timestamp: toISOStringSafe(body.status_timestamp) }
      : {}),
  };

  const updated =
    await MyGlobal.prisma.healthcare_platform_insurance_claim_statuses.update({
      where: { id: insuranceClaimStatusId },
      data: updateData,
    });

  // 3. Return DTO-compliant structure (dates as branded strings, optional fields converted)
  return {
    id: updated.id,
    claim_id: updated.claim_id,
    updated_by_id: updated.updated_by_id ?? undefined,
    status_code: updated.status_code,
    status_description: updated.status_description,
    payment_amount: updated.payment_amount ?? undefined,
    status_timestamp: toISOStringSafe(updated.status_timestamp),
    created_at: toISOStringSafe(updated.created_at),
  };
}
