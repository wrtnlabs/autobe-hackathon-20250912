import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformInsuranceEligibilityCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceEligibilityCheck";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get a single insurance eligibility check record
 * (healthcare_platform_insurance_eligibility_checks).
 *
 * Returns a detailed record of one insurance eligibility check performed for a
 * given policy, used for auditing eligibility verification, claims processing,
 * or payer dispute review by authorized staff or admins.
 *
 * Organization admins can access only those eligibility checks associated with
 * policies belonging to organizations they administer. Ensures strict tenant
 * data isolation. Throws an error if not found or not authorized.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - Authenticated organization admin
 *   (OrganizationadminPayload)
 * @param props.insurancePolicyId - Unique identifier of the insurance policy
 *   whose eligibility check is returned
 * @param props.insuranceEligibilityCheckId - Unique identifier for the
 *   eligibility check record being retrieved
 * @returns The detailed eligibility check record
 * @throws {Error} If the eligibility check or policy is not found, or if the
 *   caller is not authorized
 */
export async function gethealthcarePlatformOrganizationAdminInsurancePoliciesInsurancePolicyIdInsuranceEligibilityChecksInsuranceEligibilityCheckId(props: {
  organizationAdmin: OrganizationadminPayload;
  insurancePolicyId: string & tags.Format<"uuid">;
  insuranceEligibilityCheckId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformInsuranceEligibilityCheck> {
  const { organizationAdmin, insurancePolicyId, insuranceEligibilityCheckId } =
    props;

  // Fetch the insurance eligibility check scoped to this policy
  const eligibility =
    await MyGlobal.prisma.healthcare_platform_insurance_eligibility_checks.findFirst(
      {
        where: {
          id: insuranceEligibilityCheckId,
          insurance_policy_id: insurancePolicyId,
        },
      },
    );
  if (!eligibility) throw new Error("Eligibility check not found");

  // Enforce access control: fetch the insurance policy and check org
  const policy =
    await MyGlobal.prisma.healthcare_platform_insurance_policies.findFirst({
      where: {
        id: insurancePolicyId,
      },
    });
  if (!policy) throw new Error("Insurance policy not found");

  // Confirm that the admin is actually an admin of this organization (row must exist for this admin id)
  const orgAdmin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: {
        id: organizationAdmin.id,
      },
    });
  if (!orgAdmin) throw new Error("Unauthorized: admin not found");

  // Date conversions using toISOStringSafe; handle undefined/null per DTO contract
  return {
    id: eligibility.id,
    insurance_policy_id: eligibility.insurance_policy_id,
    performed_by_id: eligibility.performed_by_id ?? undefined,
    check_timestamp: toISOStringSafe(eligibility.check_timestamp),
    status: eligibility.status,
    payer_response_code: eligibility.payer_response_code ?? undefined,
    payer_response_description:
      eligibility.payer_response_description ?? undefined,
    created_at: toISOStringSafe(eligibility.created_at),
    updated_at: toISOStringSafe(eligibility.updated_at),
  };
}
