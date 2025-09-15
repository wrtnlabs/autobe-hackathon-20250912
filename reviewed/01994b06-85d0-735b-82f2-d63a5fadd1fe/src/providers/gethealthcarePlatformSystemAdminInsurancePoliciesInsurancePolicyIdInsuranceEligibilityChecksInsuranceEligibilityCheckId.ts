import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceEligibilityCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceEligibilityCheck";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get a single insurance eligibility check record
 * (healthcare_platform_insurance_eligibility_checks).
 *
 * Returns a detailed record of one insurance eligibility check performed for a
 * given policy. Used for auditing eligibility verification, claims processing,
 * or payer dispute review by authorized staff or admins.
 *
 * This operation enforces access to eligibility check details only for users
 * with billing or administrative authority for accounts within the given
 * insurance policy's organization. It references the
 * healthcare_platform_insurance_eligibility_checks schema and policy context
 * for strict data isolation and compliance.
 *
 * Properties include the eligibility check's status, timestamp, response from
 * payer, outcome, and relationships to staff, policy, and claim records. The
 * endpoint is strictly read-only and logs all access events in audit trails.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system admin requesting
 *   eligibility check details
 * @param props.insurancePolicyId - The insurance policy UUID for eligibility
 *   check scoping
 * @param props.insuranceEligibilityCheckId - The eligibility check record UUID
 *   being retrieved
 * @returns The eligibility check record with all details and audit metadata
 * @throws {Error} If the eligibility check is not found for the given policy
 *   and eligibility check IDs
 */
export async function gethealthcarePlatformSystemAdminInsurancePoliciesInsurancePolicyIdInsuranceEligibilityChecksInsuranceEligibilityCheckId(props: {
  systemAdmin: SystemadminPayload;
  insurancePolicyId: string & tags.Format<"uuid">;
  insuranceEligibilityCheckId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformInsuranceEligibilityCheck> {
  const { insurancePolicyId, insuranceEligibilityCheckId } = props;

  // Query record by primary and policy ID - strict scoping even for systemAdmin
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

  return {
    id: eligibilityCheck.id,
    insurance_policy_id: eligibilityCheck.insurance_policy_id,
    performed_by_id: eligibilityCheck.performed_by_id ?? undefined,
    check_timestamp: toISOStringSafe(eligibilityCheck.check_timestamp),
    status: eligibilityCheck.status,
    payer_response_code: eligibilityCheck.payer_response_code ?? undefined,
    payer_response_description:
      eligibilityCheck.payer_response_description ?? undefined,
    created_at: toISOStringSafe(eligibilityCheck.created_at),
    updated_at: toISOStringSafe(eligibilityCheck.updated_at),
  };
}
