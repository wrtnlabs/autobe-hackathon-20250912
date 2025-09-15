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
 * Validate creation of insurance eligibility check by system admin across
 * organizations.
 *
 * 1. Register and login as system admin
 * 2. Register and login as two organization admins (each in diff org)
 * 3. Each org admin: create a test insurance policy
 * 4. Switch to system admin
 * 5. For each created insurance policy, as system admin, create an eligibility
 *    check
 * 6. Validate eligibility check links to proper policy and performer, and is
 *    accessible
 * 7. For negative test: try to create eligibility check on invalid insurance
 *    policy id, ensure error
 */
export async function test_api_systemadmin_create_insurance_eligibility_check_with_cross_org_context(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const sysadminEmail =
    RandomGenerator.name(2).replace(/ /g, ".") + "@corp-test.com";
  const sysadminPassword = RandomGenerator.alphaNumeric(12);
  const sysadmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysadminEmail,
      full_name: RandomGenerator.name(2),
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysadmin);

  // login not strictly needed (token set by join), but log out/in for completeness
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 2. Register & login as org admins for 2 orgs
  const orgAdminInputs = ArrayUtil.repeat(2, (i) => {
    const orgAdminEmail =
      RandomGenerator.name(2).replace(/ /g, ".") + `@org${i}-test.com`;
    return {
      email: orgAdminEmail,
      full_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(10),
    };
  });

  const orgAdmins = await ArrayUtil.asyncMap(orgAdminInputs, async (input) => {
    const adminJoin = await api.functional.auth.organizationAdmin.join(
      connection,
      {
        body: {
          email: input.email,
          full_name: input.full_name,
          phone: null,
          password: input.password,
          provider: "local",
          provider_key: input.email,
        } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
      },
    );
    typia.assert(adminJoin);
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: input.email,
        password: input.password,
        provider: "local",
        provider_key: input.email,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    });
    return adminJoin;
  });

  // 3. For each org admin, create an insurance policy in their org
  const insurancePolicies = await ArrayUtil.asyncMap(
    orgAdmins,
    async (orgAdmin, i) => {
      // Minimal random data
      const policyCreate = {
        patient_id: typia.random<string & tags.Format<"uuid">>(),
        organization_id: orgAdmin.id,
        policy_number: RandomGenerator.alphaNumeric(12),
        payer_name: RandomGenerator.name(2),
        group_number: null,
        coverage_start_date: new Date().toISOString().slice(0, 10),
        coverage_end_date: null,
        plan_type: "commercial",
        policy_status: "active",
      } satisfies IHealthcarePlatformInsurancePolicy.ICreate;
      const insurancePolicy =
        await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
          connection,
          {
            body: policyCreate,
          },
        );
      typia.assert(insurancePolicy);
      return insurancePolicy;
    },
  );

  // 4. Switch back to system admin context
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 5. For each insurance policy, create eligibility check as system admin
  for (const policy of insurancePolicies) {
    const eligibilityCheckCreate = {
      insurance_policy_id: policy.id,
      performed_by_id: sysadmin.id,
      check_timestamp: new Date().toISOString(),
      status: "verified",
      payer_response_code: RandomGenerator.alphaNumeric(6),
      payer_response_description: RandomGenerator.paragraph({ sentences: 5 }),
    } satisfies IHealthcarePlatformInsuranceEligibilityCheck.ICreate;
    const eligibilityCheck =
      await api.functional.healthcarePlatform.systemAdmin.insurancePolicies.insuranceEligibilityChecks.create(
        connection,
        {
          insurancePolicyId: policy.id,
          body: eligibilityCheckCreate,
        },
      );
    typia.assert(eligibilityCheck);
    TestValidator.equals(
      "eligibility check policy link",
      eligibilityCheck.insurance_policy_id,
      policy.id,
    );
    TestValidator.equals(
      "eligibility check performer",
      eligibilityCheck.performed_by_id,
      sysadmin.id,
    );
    TestValidator.equals(
      "eligibility check status",
      eligibilityCheck.status,
      eligibilityCheckCreate.status,
    );
  }

  // 6. Attempt error case: invalid insurance policy id
  await TestValidator.error(
    "system admin cannot create eligibility check for nonexistent policy",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.insurancePolicies.insuranceEligibilityChecks.create(
        connection,
        {
          insurancePolicyId: typia.random<string & tags.Format<"uuid">>(), // random UUID, not real
          body: {
            insurance_policy_id: typia.random<string & tags.Format<"uuid">>(),
            performed_by_id: sysadmin.id,
            check_timestamp: new Date().toISOString(),
            status: "verified",
          } satisfies IHealthcarePlatformInsuranceEligibilityCheck.ICreate,
        },
      );
    },
  );
}
