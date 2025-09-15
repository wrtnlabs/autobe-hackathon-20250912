import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceEligibilityCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceEligibilityCheck";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing insurance eligibility check record
 * (healthcare_platform_insurance_eligibility_checks).
 *
 * Updates selected metadata or review status of a single insurance eligibility
 * check record for a given insurance policy. Only system admin or authorized
 * staff can update; the operation enforces data isolation, business constraints
 * (forbidden state update block), and auditlogging. Only allowed fields
 * (status, payer_response_code, payer_response_description) are updatable.
 * Throws if eligibility check not found or if in finalized/locked state.
 * Returns the updated eligibility check record with all audit/date fields
 * properly formatted.
 *
 * @param props - Parameters for the update operation
 * @param props.systemAdmin - The authenticated system admin making this request
 * @param props.insurancePolicyId - The parent insurance policy UUID for record
 *   isolation
 * @param props.insuranceEligibilityCheckId - The eligibility check UUID (row
 *   being updated)
 * @param props.body - Fields to update; must only include updatable fields
 *   (status, payer_response_code, payer_response_description)
 * @returns The eligibility check record after update, with all current/updated
 *   fields and DTO formatting
 * @throws {Error} When eligibility check is not found or in forbidden/locked
 *   state for update
 */
export async function puthealthcarePlatformSystemAdminInsurancePoliciesInsurancePolicyIdInsuranceEligibilityChecksInsuranceEligibilityCheckId(props: {
  systemAdmin: SystemadminPayload;
  insurancePolicyId: string & tags.Format<"uuid">;
  insuranceEligibilityCheckId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformInsuranceEligibilityCheck.IUpdate;
}): Promise<IHealthcarePlatformInsuranceEligibilityCheck> {
  const { systemAdmin, insurancePolicyId, insuranceEligibilityCheckId, body } =
    props;

  // Fetch the eligibility check by its ID and insurance policy, enforcing data isolation
  const eligibilityCheck =
    await MyGlobal.prisma.healthcare_platform_insurance_eligibility_checks.findFirst(
      {
        where: {
          id: insuranceEligibilityCheckId,
          insurance_policy_id: insurancePolicyId,
        },
      },
    );
  if (!eligibilityCheck) {
    throw new Error("Eligibility check not found");
  }

  // Business rule: Block updates when status is in a locked/finalized state
  // For example, 'verified' is considered locked/finalized for this context
  if (eligibilityCheck.status === "verified") {
    throw new Error("Cannot update a finalized/locked eligibility check");
  }

  // Prepare update: Only allow changes to permitted fields and update audit field
  const updated =
    await MyGlobal.prisma.healthcare_platform_insurance_eligibility_checks.update(
      {
        where: { id: insuranceEligibilityCheckId },
        data: {
          status: body.status ?? undefined,
          payer_response_code: body.payer_response_code ?? undefined,
          payer_response_description:
            body.payer_response_description ?? undefined,
          updated_at: toISOStringSafe(new Date()),
        },
      },
    );

  // Return complete eligibility check DTO with date strings
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
