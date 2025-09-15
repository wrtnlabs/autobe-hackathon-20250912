import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceEligibilityCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceEligibilityCheck";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update metadata or status of a particular insurance eligibility check for a
 * policy.
 *
 * This operation updates selected metadata or review status of a single
 * insurance eligibility check record for a given insurance policy. Used by
 * billing, compliance, or admin staff, it restricts field updates to status,
 * payer_response_code, and payer_response_description, enforcing business
 * constraints and regulatory rules. The operation verifies that the requesting
 * admin controls the organization to which the policy belongs and blocks
 * updates on finalized (locked) records. All audit timestamps are updated
 * accordingly. Changes are written in-place and the new current record state is
 * returned.
 *
 * Authorization: Org admin may only update eligibility checks for policies
 * belonging to organizations they administer.
 *
 * @param props - Update input and authentication:
 * @param props.organizationAdmin - Authenticated organization admin payload
 * @param props.insurancePolicyId - Unique insurance policy UUID
 * @param props.insuranceEligibilityCheckId - Insurance eligibility check UUID
 * @param props.body - Update payload for permitted fields
 * @returns IHealthcarePlatformInsuranceEligibilityCheck - Updated eligibility
 *   check record with full audit details
 * @throws {Error} When not authorized, not found, or record is
 *   finalized/immutable
 */
export async function puthealthcarePlatformOrganizationAdminInsurancePoliciesInsurancePolicyIdInsuranceEligibilityChecksInsuranceEligibilityCheckId(props: {
  organizationAdmin: OrganizationadminPayload;
  insurancePolicyId: string & tags.Format<"uuid">;
  insuranceEligibilityCheckId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformInsuranceEligibilityCheck.IUpdate;
}): Promise<IHealthcarePlatformInsuranceEligibilityCheck> {
  const {
    organizationAdmin,
    insurancePolicyId,
    insuranceEligibilityCheckId,
    body,
  } = props;

  // Step 1: Fetch eligibility check
  const eligibilityCheck =
    await MyGlobal.prisma.healthcare_platform_insurance_eligibility_checks.findFirst(
      {
        where: {
          id: insuranceEligibilityCheckId,
          insurance_policy_id: insurancePolicyId,
        },
      },
    );
  if (!eligibilityCheck) throw new Error("Eligibility check not found");

  // Step 2: Fetch insurance policy for org ownership check
  const insurancePolicy =
    await MyGlobal.prisma.healthcare_platform_insurance_policies.findFirst({
      where: {
        id: insurancePolicyId,
      },
    });
  if (!insurancePolicy) throw new Error("Insurance policy not found");

  // Step 3: Authorize org admin
  if (insurancePolicy.organization_id !== organizationAdmin.id) {
    throw new Error(
      "Not authorized to update eligibility check for this organization",
    );
  }

  // Step 4: Block finalized records
  if (eligibilityCheck.status === "finalized") {
    throw new Error("Cannot update a finalized eligibility check");
  }

  // Step 5: Prepare allowed update fields
  const updateData: {
    status?: string;
    payer_response_code?: string;
    payer_response_description?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (typeof body.status !== "undefined") updateData.status = body.status;
  if (typeof body.payer_response_code !== "undefined")
    updateData.payer_response_code = body.payer_response_code;
  if (typeof body.payer_response_description !== "undefined")
    updateData.payer_response_description = body.payer_response_description;

  // Step 6: Perform the update
  const updated =
    await MyGlobal.prisma.healthcare_platform_insurance_eligibility_checks.update(
      {
        where: { id: insuranceEligibilityCheckId },
        data: updateData,
      },
    );

  // Step 7: Return normalized DTO (with all date fields as string)
  return {
    id: updated.id,
    insurance_policy_id: updated.insurance_policy_id,
    performed_by_id: updated.performed_by_id ?? undefined,
    check_timestamp: toISOStringSafe(updated.check_timestamp),
    status: updated.status,
    payer_response_code: updated.payer_response_code ?? undefined,
    payer_response_description: updated.payer_response_description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
