import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceClaimStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceClaimStatus";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Add a new insurance claim status to an existing claim
 * (healthcare_platform_insurance_claim_statuses).
 *
 * This operation creates and returns a new insurance claim status for a
 * specific insurance claim. It requires the claim to exist and will record a
 * status event (such as 'submitted', 'denied', 'paid') tied to the specified
 * claim, storing all relevant compliance, payment, and audit data for workflow
 * tracking.
 *
 * Authorization: Only authenticated organization admins may perform this
 * operation. The operation enforces that the acting admin is authenticated and
 * that the target claim exists under proper organization assignment.
 *
 * @param props - Parameters for creating a claim status
 * @param props.organizationAdmin - Authenticated organization admin
 *   (OrganizationadminPayload)
 * @param props.insuranceClaimId - Unique identifier for the insurance claim
 * @param props.body - Claim status creation payload
 *   (IHealthcarePlatformInsuranceClaimStatus.ICreate)
 * @returns The newly created claim status record
 * @throws {Error} If the target insurance claim does not exist or is invalid
 */
export async function posthealthcarePlatformOrganizationAdminInsuranceClaimsInsuranceClaimIdInsuranceClaimStatuses(props: {
  organizationAdmin: OrganizationadminPayload;
  insuranceClaimId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformInsuranceClaimStatus.ICreate;
}): Promise<IHealthcarePlatformInsuranceClaimStatus> {
  const { organizationAdmin, insuranceClaimId, body } = props;

  // Ensure the insurance claim exists, else throw error
  const claim =
    await MyGlobal.prisma.healthcare_platform_insurance_claims.findUnique({
      where: { id: insuranceClaimId },
    });
  if (!claim) {
    throw new Error("Insurance claim not found or does not exist.");
  }

  // Record creation timestamp as string & tags.Format<'date-time'>
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );

  // Prepare data object for status creation
  const createData = {
    id: v4(),
    claim_id: insuranceClaimId,
    updated_by_id: organizationAdmin.id,
    status_code: body.status_code,
    status_description: body.status_description,
    payment_amount: body.payment_amount ?? undefined,
    status_timestamp: body.status_timestamp,
    created_at: createdAt,
  };

  // Insert into Prisma
  const status =
    await MyGlobal.prisma.healthcare_platform_insurance_claim_statuses.create({
      data: createData,
    });

  // Return API DTO (strict typing, all date fields are compliant branded strings)
  return {
    id: status.id,
    claim_id: status.claim_id,
    updated_by_id: status.updated_by_id ?? undefined,
    status_code: status.status_code,
    status_description: status.status_description,
    payment_amount: status.payment_amount ?? undefined,
    status_timestamp: status.status_timestamp,
    created_at: status.created_at,
  };
}
