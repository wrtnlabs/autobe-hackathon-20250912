import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceClaimStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceClaimStatus";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Add a new insurance claim status to an existing claim
 * (healthcare_platform_insurance_claim_statuses).
 *
 * This endpoint creates a new insurance claim status record for a given claim,
 * enabling audit/compliance and lifecycle tracking. Requires that the claim
 * exists, and that the user is a privileged system admin with access. All
 * status transitions are auditable and support business/regulatory reporting.
 *
 * @param props - Complete operation props
 * @param props.systemAdmin - The authenticated system admin user
 * @param props.insuranceClaimId - UUID of the insurance claim to which the
 *   status will be added
 * @param props.body - Details of the insurance claim status event to add
 * @returns Information about the newly created insurance claim status record
 * @throws {Error} If the insurance claim does not exist
 */
export async function posthealthcarePlatformSystemAdminInsuranceClaimsInsuranceClaimIdInsuranceClaimStatuses(props: {
  systemAdmin: SystemadminPayload;
  insuranceClaimId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformInsuranceClaimStatus.ICreate;
}): Promise<IHealthcarePlatformInsuranceClaimStatus> {
  const { systemAdmin, insuranceClaimId, body } = props;

  // 1. Ensure the insurance claim exists and is valid
  const claim =
    await MyGlobal.prisma.healthcare_platform_insurance_claims.findUnique({
      where: { id: insuranceClaimId },
    });
  if (!claim) throw new Error("Insurance claim not found");

  // 2. Prepare current timestamp and generate UUID
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();

  // 3. Insert new status
  const created =
    await MyGlobal.prisma.healthcare_platform_insurance_claim_statuses.create({
      data: {
        id,
        claim_id: insuranceClaimId,
        updated_by_id: systemAdmin.id,
        status_code: body.status_code,
        status_description: body.status_description,
        payment_amount: body.payment_amount ?? undefined,
        status_timestamp: body.status_timestamp,
        created_at: now,
      },
    });

  // 4. Return conforming DTO, converting all date fields as required
  return {
    id: created.id,
    claim_id: created.claim_id,
    updated_by_id: created.updated_by_id ?? undefined,
    status_code: created.status_code,
    status_description: created.status_description,
    payment_amount: created.payment_amount ?? undefined,
    status_timestamp: toISOStringSafe(created.status_timestamp),
    created_at: toISOStringSafe(created.created_at),
  };
}
