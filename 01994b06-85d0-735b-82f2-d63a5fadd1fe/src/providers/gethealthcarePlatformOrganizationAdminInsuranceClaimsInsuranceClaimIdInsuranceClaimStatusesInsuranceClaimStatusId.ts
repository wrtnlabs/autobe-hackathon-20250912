import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceClaimStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceClaimStatus";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get detailed information for a single insurance claim status entry by IDs.
 *
 * This operation fetches a specific insurance claim status event (row) by
 * unique ID and claim ID, providing a complete audit snapshot for drill-down
 * display and compliance review. Only organization admins may use this
 * endpoint; all access is subject to strict organization-level authorization.
 * Returns all status event data, including who updated, status code and
 * description, payment posted, and auditing timestamps; throws an error if not
 * found.
 *
 * @param props - Object containing path and authentication parameters
 * @param props.organizationAdmin - The authenticated organization admin user
 * @param props.insuranceClaimId - Parent insurance claim (UUID)
 * @param props.insuranceClaimStatusId - Status row to retrieve (UUID)
 * @returns Full insurance claim status row, or error if not found or not
 *   accessible
 * @throws {Error} If the claim status is not found for the IDs specified
 */
export async function gethealthcarePlatformOrganizationAdminInsuranceClaimsInsuranceClaimIdInsuranceClaimStatusesInsuranceClaimStatusId(props: {
  organizationAdmin: OrganizationadminPayload;
  insuranceClaimId: string & tags.Format<"uuid">;
  insuranceClaimStatusId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformInsuranceClaimStatus> {
  const { insuranceClaimId, insuranceClaimStatusId } = props;

  const row =
    await MyGlobal.prisma.healthcare_platform_insurance_claim_statuses.findFirst(
      {
        where: {
          id: insuranceClaimStatusId,
          claim_id: insuranceClaimId,
        },
      },
    );
  if (!row) {
    throw new Error("Insurance claim status not found");
  }
  return {
    id: row.id,
    claim_id: row.claim_id,
    updated_by_id: row.updated_by_id === null ? undefined : row.updated_by_id,
    status_code: row.status_code,
    status_description: row.status_description,
    payment_amount:
      row.payment_amount === null ? undefined : row.payment_amount,
    status_timestamp: toISOStringSafe(row.status_timestamp),
    created_at: toISOStringSafe(row.created_at),
  };
}
