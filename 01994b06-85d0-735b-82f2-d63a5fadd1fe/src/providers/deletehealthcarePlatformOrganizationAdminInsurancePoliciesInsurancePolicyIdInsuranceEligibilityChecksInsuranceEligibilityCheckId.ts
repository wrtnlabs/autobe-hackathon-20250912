import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Permanently delete an insurance eligibility check record for a specific
 * insurance policy from healthcare_platform_insurance_eligibility_checks
 * table.
 *
 * This operation removes an eligibility check used for verifying a patient's
 * insurance status before financial actions. Only organization-level admins
 * (OrganizationadminPayload) may perform this action. Permanent deletion is
 * only permitted if the record is not referenced by an immutable financial
 * operation (such as a claim transaction) and does not break retention/audit
 * requirements.
 *
 * @param props - Request parameters
 * @param props.organizationAdmin - Authenticated admin
 *   (OrganizationadminPayload)
 * @param props.insurancePolicyId - UUID of the insurance policy associated with
 *   the eligibility check
 * @param props.insuranceEligibilityCheckId - UUID of the eligibility check
 *   record to be deleted
 * @returns Void
 * @throws {Error} If the eligibility check does not exist, is not in the
 *   specified policy, or is referenced by immutable financial transactions
 */
export async function deletehealthcarePlatformOrganizationAdminInsurancePoliciesInsurancePolicyIdInsuranceEligibilityChecksInsuranceEligibilityCheckId(props: {
  organizationAdmin: OrganizationadminPayload;
  insurancePolicyId: string & tags.Format<"uuid">;
  insuranceEligibilityCheckId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, insurancePolicyId, insuranceEligibilityCheckId } =
    props;

  // Fetch eligibility check, verify policy association
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
    throw new Error(
      "Eligibility check not found or does not belong to the specified insurance policy.",
    );
  }

  // Check if any insurance claim (in this policy) might reference this eligibility check
  // [Schema does not store eligibility_check_id on claims, so we only check insurance_policy_id as a minimal guarantee]
  const referencingClaim =
    await MyGlobal.prisma.healthcare_platform_insurance_claims.findFirst({
      where: {
        insurance_policy_id: insurancePolicyId,
        deleted_at: null,
      },
    });
  if (referencingClaim) {
    throw new Error(
      "Cannot delete eligibility check: it is referenced by an insurance claim or subject to retention policy.",
    );
  }

  // Perform hard delete
  await MyGlobal.prisma.healthcare_platform_insurance_eligibility_checks.delete(
    {
      where: {
        id: insuranceEligibilityCheckId,
      },
    },
  );
}
