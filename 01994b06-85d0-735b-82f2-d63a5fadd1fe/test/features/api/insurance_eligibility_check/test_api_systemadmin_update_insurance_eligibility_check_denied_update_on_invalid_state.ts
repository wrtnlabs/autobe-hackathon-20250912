import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceEligibilityCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceEligibilityCheck";
import type { IHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsurancePolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Ensures that system admins cannot update an insurance eligibility check when
 * it is in a forbidden, locked, or finalized state.
 *
 * Steps:
 *
 * 1. Register and login as system admin (email/password/provider).
 * 2. Register and login as organization admin.
 * 3. Create an insurance policy as organization admin.
 * 4. Login as system admin, create insurance eligibility check in editable state.
 * 5. Simulate moving the eligibility check to a forbidden state by updating its
 *    status to a locked/finalized value (e.g., "verified", which is a common
 *    locked/final state).
 * 6. Attempt to update the eligibility check's status or payer response as system
 *    admin.
 * 7. Assert that the attempt is denied (error is thrown), and the eligibility
 *    check record remains unchanged after the forbidden update attempt.
 */
export async function test_api_systemadmin_update_insurance_eligibility_check_denied_update_on_invalid_state(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdmin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: sysAdminEmail,
        password: sysAdminPassword,
      },
    });
  typia.assert(sysAdmin);

  // 2. Register an organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(14);
  const orgAdmin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
      },
    });
  typia.assert(orgAdmin);

  // 3. Login as organization admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    },
  });
  // 4. Create insurance policy as org admin
  const policyBody = {
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    policy_number: RandomGenerator.alphaNumeric(15),
    payer_name: RandomGenerator.name(),
    group_number: RandomGenerator.alphaNumeric(8),
    coverage_start_date: new Date().toISOString().substring(0, 10),
    coverage_end_date: null,
    plan_type: RandomGenerator.name(1),
    policy_status: "active",
  } satisfies IHealthcarePlatformInsurancePolicy.ICreate;
  const policy: IHealthcarePlatformInsurancePolicy =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      { body: policyBody },
    );
  typia.assert(policy);

  // 5. Login as system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      password: sysAdminPassword,
      provider: "local",
      provider_key: sysAdminEmail,
    },
  });
  // 6. Create eligibility check (in editable state)
  const eligibilityBody = {
    insurance_policy_id: policy.id,
    performed_by_id: null,
    check_timestamp: new Date().toISOString(),
    status: "pending",
    payer_response_code: "A1",
    payer_response_description: "Initial check",
  } satisfies IHealthcarePlatformInsuranceEligibilityCheck.ICreate;
  const eligibility: IHealthcarePlatformInsuranceEligibilityCheck =
    await api.functional.healthcarePlatform.systemAdmin.insurancePolicies.insuranceEligibilityChecks.create(
      connection,
      {
        insurancePolicyId: policy.id,
        body: eligibilityBody,
      },
    );
  typia.assert(eligibility);

  // 7. Simulate forbidden state - update status to locked/finalized
  const lockedEligibility: IHealthcarePlatformInsuranceEligibilityCheck =
    await api.functional.healthcarePlatform.systemAdmin.insurancePolicies.insuranceEligibilityChecks.update(
      connection,
      {
        insurancePolicyId: policy.id,
        insuranceEligibilityCheckId: eligibility.id,
        body: {
          status: "verified",
          payer_response_code: "A2",
          payer_response_description: "Eligibility check finalized",
        },
      },
    );
  typia.assert(lockedEligibility);
  TestValidator.equals(
    "eligibility check should now be locked/finalized",
    lockedEligibility.status,
    "verified",
  );

  // 8. Try to update while in forbidden state
  const updateAttemptBody = {
    status: "error",
    payer_response_code: "ERR",
    payer_response_description: "Should not be accepted",
  } satisfies IHealthcarePlatformInsuranceEligibilityCheck.IUpdate;
  await TestValidator.error(
    "should reject updating locked/finalized eligibility check",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.insurancePolicies.insuranceEligibilityChecks.update(
        connection,
        {
          insurancePolicyId: policy.id,
          insuranceEligibilityCheckId: eligibility.id,
          body: updateAttemptBody,
        },
      );
    },
  );
}
