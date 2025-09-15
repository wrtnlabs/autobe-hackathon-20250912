import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceClaimStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceClaimStatus";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing insurance claim status entry in a claim
 * (healthcare_platform_insurance_claim_statuses).
 *
 * This endpoint updates a specific insurance claim status inside a given claim.
 * Organization admins can correct or amend status history for compliance,
 * reconciliation, or workflow clarifications. The function enforces that the
 * claim status exists and belongs to the specified claim, and updates only
 * provided fields. All field and type conversions are handled per corporate API
 * conventions. Authorization is enforced through middleware/decorator.
 *
 * @param props - Properties for claim status update
 * @param props.organizationAdmin - Organization admin performing the update
 * @param props.insuranceClaimId - UUID of the claim containing the status to
 *   update
 * @param props.insuranceClaimStatusId - UUID of the claim status record to
 *   update
 * @param props.body - Update fields for the claim status event
 * @returns The updated insurance claim status record, with full auditability
 * @throws {Error} If the claim status record does not exist or does not belong
 *   to the specified claim
 */
export async function puthealthcarePlatformOrganizationAdminInsuranceClaimsInsuranceClaimIdInsuranceClaimStatusesInsuranceClaimStatusId(props: {
  organizationAdmin: OrganizationadminPayload;
  insuranceClaimId: string & tags.Format<"uuid">;
  insuranceClaimStatusId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformInsuranceClaimStatus.IUpdate;
}): Promise<IHealthcarePlatformInsuranceClaimStatus> {
  const { organizationAdmin, insuranceClaimId, insuranceClaimStatusId, body } =
    props;

  // Step 1: Ensure the claim status exists and matches the given claim
  const claimStatus =
    await MyGlobal.prisma.healthcare_platform_insurance_claim_statuses.findFirstOrThrow(
      {
        where: {
          id: insuranceClaimStatusId,
          claim_id: insuranceClaimId,
        },
      },
    );

  // Step 2: Perform the update with only provided values
  const updated =
    await MyGlobal.prisma.healthcare_platform_insurance_claim_statuses.update({
      where: {
        id: insuranceClaimStatusId,
      },
      data: {
        status_code: body.status_code ?? undefined,
        status_description: body.status_description ?? undefined,
        payment_amount: body.payment_amount ?? undefined,
        status_timestamp: body.status_timestamp ?? undefined,
        updated_by_id: organizationAdmin.id,
      },
    });

  // Step 3: Return the updated record conforming to DTO, converting dates appropriately
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
