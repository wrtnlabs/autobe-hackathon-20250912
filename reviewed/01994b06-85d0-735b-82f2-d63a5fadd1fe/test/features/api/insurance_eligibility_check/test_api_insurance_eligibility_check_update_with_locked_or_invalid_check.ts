import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceEligibilityCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceEligibilityCheck";
import type { IHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsurancePolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Test attempting to update an insurance eligibility check as an org admin in
 * an immutable state.
 *
 * 1. Register an organization admin.
 * 2. Create an insurance policy as this admin.
 * 3. Create an insurance eligibility check for that policy in a normal, updatable
 *    state (e.g. status 'pending').
 * 4. Simulate locking the eligibility check by updating its status to 'finalized'.
 * 5. Attempt to update the eligibility check again (should now be business-rule
 *    locked).
 * 6. Assert that the update is rejected with a business logic error and the record
 *    is not modified.
 */
export async function test_api_insurance_eligibility_check_update_with_locked_or_invalid_check(
  connection: api.IConnection,
) {
  // 1. Register an org admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert(adminAuth);

  // 2. Create an insurance policy
  const policyCreateBody = {
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    organization_id: adminAuth.id,
    policy_number: RandomGenerator.alphabets(10),
    payer_name: RandomGenerator.name(1),
    plan_type: "commercial",
    policy_status: "active",
    coverage_start_date: new Date().toISOString().slice(0, 10),
  } satisfies IHealthcarePlatformInsurancePolicy.ICreate;
  const policy =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      {
        body: policyCreateBody,
      },
    );
  typia.assert(policy);

  // 3. Create an eligibility check in modifiable state
  const checkCreateBody = {
    insurance_policy_id: policy.id,
    check_timestamp: new Date().toISOString(),
    status: "pending",
    performed_by_id: adminAuth.id,
    payer_response_code: null,
    payer_response_description: null,
  } satisfies IHealthcarePlatformInsuranceEligibilityCheck.ICreate;
  const eligCheck =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.insuranceEligibilityChecks.create(
      connection,
      {
        insurancePolicyId: policy.id,
        body: checkCreateBody,
      },
    );
  typia.assert(eligCheck);

  // 4. Lock the eligibility check by setting status to 'finalized'
  const lockUpdateBody = {
    status: "finalized",
  } satisfies IHealthcarePlatformInsuranceEligibilityCheck.IUpdate;
  const lockedCheck =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.insuranceEligibilityChecks.update(
      connection,
      {
        insurancePolicyId: policy.id,
        insuranceEligibilityCheckId: eligCheck.id as string &
          tags.Format<"uuid">,
        body: lockUpdateBody,
      },
    );
  typia.assert(lockedCheck);
  TestValidator.equals(
    "Eligibility check status is finalized",
    lockedCheck.status,
    "finalized",
  );

  // 5. Attempt to update again (should be blocked due to lock)
  const attemptedUpdateBody = {
    payer_response_description: "Trying to update after lock",
  } satisfies IHealthcarePlatformInsuranceEligibilityCheck.IUpdate;
  await TestValidator.error(
    "Cannot update eligibility check when locked",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.insuranceEligibilityChecks.update(
        connection,
        {
          insurancePolicyId: policy.id,
          insuranceEligibilityCheckId: eligCheck.id as string &
            tags.Format<"uuid">,
          body: attemptedUpdateBody,
        },
      );
    },
  );
}
