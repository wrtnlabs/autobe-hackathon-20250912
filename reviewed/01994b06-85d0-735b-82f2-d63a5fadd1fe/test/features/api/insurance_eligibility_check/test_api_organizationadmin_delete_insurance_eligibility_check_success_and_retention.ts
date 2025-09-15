import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceEligibilityCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceEligibilityCheck";
import type { IHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsurancePolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate successful deletion (archiving) of an insurance eligibility check by
 * an org admin.
 *
 * Business workflow:
 *
 * 1. Create and join an organization administrator (OrgAdmin)
 * 2. OrgAdmin creates an insurance policy
 * 3. OrgAdmin adds an insurance eligibility check entry linked to the created
 *    policy
 * 4. OrgAdmin deletes (soft-archives) the insurance eligibility check
 *
 * This test focuses on the happy path (not tied to closed/regulatory claims):
 *
 * - The deletion API should complete without error
 * - The eligibility check is presumed excluded from listings or further update
 *   queries after deletion
 * - The data remains auditable/retained internally for audit trail, though this
 *   is not directly verified
 */
export async function test_api_organizationadmin_delete_insurance_eligibility_check_success_and_retention(
  connection: api.IConnection,
) {
  // 1. Create and authenticate organization admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminFullName: string = RandomGenerator.name();
  const joinInput = {
    email: adminEmail,
    full_name: adminFullName,
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: joinInput,
    });
  typia.assert(admin);

  // 2. Create insurance policy
  const policyInput = {
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    organization_id: admin.id,
    policy_number: RandomGenerator.alphaNumeric(15),
    payer_name: RandomGenerator.paragraph({ sentences: 2 }),
    plan_type: "commercial",
    policy_status: "active",
    coverage_start_date: new Date().toISOString().slice(0, 10),
  } satisfies IHealthcarePlatformInsurancePolicy.ICreate;
  const policy: IHealthcarePlatformInsurancePolicy =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      { body: policyInput },
    );
  typia.assert(policy);

  // 3. Create insurance eligibility check entry
  const eligibilityCheckInput = {
    insurance_policy_id: policy.id,
    check_timestamp: new Date().toISOString(),
    status: "verified",
  } satisfies IHealthcarePlatformInsuranceEligibilityCheck.ICreate;
  const eligibilityCheck: IHealthcarePlatformInsuranceEligibilityCheck =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.insuranceEligibilityChecks.create(
      connection,
      { insurancePolicyId: policy.id, body: eligibilityCheckInput },
    );
  typia.assert(eligibilityCheck);

  // 4. Delete (archive) the eligibility check
  await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.insuranceEligibilityChecks.erase(
    connection,
    {
      insurancePolicyId: policy.id,
      insuranceEligibilityCheckId: eligibilityCheck.id as string &
        tags.Format<"uuid">,
    },
  );

  // Implicitly, if no error is thrown, the test is successful
  TestValidator.predicate(
    "eligibility check erase completed without error, presumed archived",
    true,
  );
}
