import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceEligibilityCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceEligibilityCheck";
import type { IHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsurancePolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformInsuranceEligibilityCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformInsuranceEligibilityCheck";

/**
 * Validates that a system admin can perform advanced search and access controls
 * over insurance eligibility checks. Covers setup of orgs, policies, and checks
 * with multi-actor roles, verifies filtering, data separation, audit, and
 * negative cases for access/isolation and invalid queries.
 */
export async function test_api_systemadmin_eligibility_check_search_and_access_control(
  connection: api.IConnection,
) {
  // 1. Register org admin (orgA)
  const orgAEmail = RandomGenerator.alphaNumeric(8) + "@orgA.com";
  const orgAAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "password1!",
        provider: "local",
        provider_key: orgAEmail,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAAdmin);
  const organizationAId = typia.assert<string & tags.Format<"uuid">>(
    orgAAdmin.id,
  );

  // 2. Create insurance policy under orgA
  const policy =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      {
        body: {
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          organization_id: organizationAId,
          policy_number: RandomGenerator.alphaNumeric(10),
          payer_name: RandomGenerator.paragraph({ sentences: 2 }),
          group_number: RandomGenerator.alphaNumeric(6),
          coverage_start_date: new Date().toISOString().slice(0, 10),
          plan_type: "commercial",
          policy_status: "active",
        } satisfies IHealthcarePlatformInsurancePolicy.ICreate,
      },
    );
  typia.assert(policy);

  // 3. Register and login as system admin
  const sysAdminEmail = RandomGenerator.alphaNumeric(8) + "@sysadmin.com";
  await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: "password2!",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  const sysAdminAuth = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: "password2!",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(sysAdminAuth);
  const sysAdminId = sysAdminAuth.id;

  // 4. Create multiple eligibility check records as system admin
  const statuses = ["verified", "expired", "pending"] as const;
  const checks = await ArrayUtil.asyncMap([0, 1, 2, 3, 4], async (i) => {
    const status = statuses[i % statuses.length];
    const check =
      await api.functional.healthcarePlatform.systemAdmin.insurancePolicies.insuranceEligibilityChecks.create(
        connection,
        {
          insurancePolicyId: policy.id,
          body: {
            insurance_policy_id: policy.id,
            performed_by_id: sysAdminId,
            check_timestamp: new Date(
              Date.now() - i * 1000 * 60 * 60,
            ).toISOString(),
            status,
            payer_response_code: "100" + i,
            payer_response_description: RandomGenerator.paragraph({
              sentences: 3,
            }),
          } satisfies IHealthcarePlatformInsuranceEligibilityCheck.ICreate,
        },
      );
    typia.assert(check);
    TestValidator.equals(
      "created eligibility check has correct policy",
      check.insurance_policy_id,
      policy.id,
    );
    return check;
  });

  // 5. Search eligibility checks using PATCH with filters and validate pagination/data
  const results =
    await api.functional.healthcarePlatform.systemAdmin.insurancePolicies.insuranceEligibilityChecks.index(
      connection,
      {
        insurancePolicyId: policy.id,
        body: {
          status: "verified",
          performed_by_id: sysAdminId,
          insurance_policy_id: policy.id,
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(results);
  TestValidator.equals(
    "pagination.limit=2 yields at most 2 records",
    results.data.length <= 2,
    true,
  );
  TestValidator.predicate(
    "all search results have status 'verified'",
    results.data.every((c) => c.status === "verified"),
  );
  TestValidator.predicate(
    "all results are for correct policy",
    results.data.every((c) => c.insurance_policy_id === policy.id),
  );

  // 6. Data isolation: Register orgB, create policy/check for orgB
  const orgBEmail = RandomGenerator.alphaNumeric(8) + "@orgB.com";
  const orgBAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgBEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "password1!",
        provider: "local",
        provider_key: orgBEmail,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgBAdmin);
  const orgBPolicy =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      {
        body: {
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          organization_id: orgBAdmin.id,
          policy_number: RandomGenerator.alphaNumeric(10),
          payer_name: RandomGenerator.paragraph({ sentences: 2 }),
          group_number: RandomGenerator.alphaNumeric(6),
          coverage_start_date: new Date().toISOString().slice(0, 10),
          plan_type: "commercial",
          policy_status: "active",
        } satisfies IHealthcarePlatformInsurancePolicy.ICreate,
      },
    );
  typia.assert(orgBPolicy);
  // Create eligibility check for orgB's policy
  const orgBCheck =
    await api.functional.healthcarePlatform.systemAdmin.insurancePolicies.insuranceEligibilityChecks.create(
      connection,
      {
        insurancePolicyId: orgBPolicy.id,
        body: {
          insurance_policy_id: orgBPolicy.id,
          performed_by_id: sysAdminId,
          check_timestamp: new Date().toISOString(),
          status: "verified",
        } satisfies IHealthcarePlatformInsuranceEligibilityCheck.ICreate,
      },
    );
  typia.assert(orgBCheck);

  // 7. Confirm admin can view checks for both policies, but policies belong to separate orgs.
  const orgACheckResults =
    await api.functional.healthcarePlatform.systemAdmin.insurancePolicies.insuranceEligibilityChecks.index(
      connection,
      {
        insurancePolicyId: policy.id,
        body: {},
      },
    );
  typia.assert(orgACheckResults);
  TestValidator.predicate(
    "orgA policy checks all have correct policy_id",
    orgACheckResults.data.every((c) => c.insurance_policy_id === policy.id),
  );

  const orgBCheckResults =
    await api.functional.healthcarePlatform.systemAdmin.insurancePolicies.insuranceEligibilityChecks.index(
      connection,
      {
        insurancePolicyId: orgBPolicy.id,
        body: {},
      },
    );
  typia.assert(orgBCheckResults);
  TestValidator.predicate(
    "orgB policy checks have correct policy_id",
    orgBCheckResults.data.every((c) => c.insurance_policy_id === orgBPolicy.id),
  );

  // 8. Negative: invalid input (bad status string)
  await TestValidator.error(
    "search with invalid status should error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.insurancePolicies.insuranceEligibilityChecks.index(
        connection,
        {
          insurancePolicyId: policy.id,
          body: {
            status: "notarealstatus",
          },
        },
      );
    },
  );

  // 9. Negative: organization admin attempts system admin search (should not see other org's records)
  // OrgA admin logs in (setup already done), switching role
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAEmail,
      password: "password1!",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "org admin cannot search via system admin endpoint",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.insurancePolicies.insuranceEligibilityChecks.index(
        connection,
        {
          insurancePolicyId: policy.id,
          body: {},
        },
      );
    },
  );
}
