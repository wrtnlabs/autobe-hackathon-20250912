import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceEligibilityCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceEligibilityCheck";
import type { IHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsurancePolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate successful retrieval of insurance eligibility check details by
 * organization admin, and enforce access control boundaries.
 *
 * 1. Organization admin A is created & authenticated
 * 2. Admin A creates a patient and a corresponding insurance policy within their
 *    organization
 * 3. Admin A creates an insurance eligibility check for that policy
 * 4. Admin A retrieves the eligibility check by policy/check ID (should succeed)
 * 5. Organization admin B is created & authenticated
 * 6. Admin B attempts to retrieve admin A's eligibility check (should fail with
 *    error or not found)
 *
 * Validates that accessibility is strictly scoped to organization context.
 */
export async function test_api_get_insurance_eligibility_check_success_and_access_control(
  connection: api.IConnection,
) {
  // 1. Register org admin A
  const adminA_email = typia.random<string & tags.Format<"email">>();
  const adminA_password = RandomGenerator.alphaNumeric(12);
  const adminA: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: adminA_email,
        full_name: RandomGenerator.name(),
        password: adminA_password,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(adminA);

  // 2. Create insurance policy for admin A's org (simulate patient as new UUID)
  const patient_id = typia.random<string & tags.Format<"uuid">>();
  const policyCreate = {
    patient_id,
    organization_id: adminA.id, // use admin's id as org (assuming linkage)
    policy_number: RandomGenerator.alphaNumeric(10),
    payer_name: RandomGenerator.name(2),
    plan_type: "commercial",
    policy_status: "active",
    coverage_start_date: "2025-01-01",
  } satisfies IHealthcarePlatformInsurancePolicy.ICreate;
  const policy: IHealthcarePlatformInsurancePolicy =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      { body: policyCreate },
    );
  typia.assert(policy);

  // 3. Create insurance eligibility check for that policy
  const eligibilityCreate = {
    insurance_policy_id: policy.id,
    performed_by_id: adminA.id,
    check_timestamp: new Date().toISOString(),
    status: "verified",
    payer_response_code: RandomGenerator.alphaNumeric(6),
    payer_response_description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHealthcarePlatformInsuranceEligibilityCheck.ICreate;
  const eligibility: IHealthcarePlatformInsuranceEligibilityCheck =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.insuranceEligibilityChecks.create(
      connection,
      {
        insurancePolicyId: policy.id,
        body: eligibilityCreate,
      },
    );
  typia.assert(eligibility);

  // 4. Retrieve the eligibility check by composite ID (should match)
  const result =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.insuranceEligibilityChecks.at(
      connection,
      {
        insurancePolicyId: policy.id,
        insuranceEligibilityCheckId: eligibility.id,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "Eligibility check matches created",
    result,
    eligibility,
  );

  // 5. Register org admin B (different org)
  const adminB_email = typia.random<string & tags.Format<"email">>();
  const adminB_password = RandomGenerator.alphaNumeric(12);
  const adminB: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: adminB_email,
        full_name: RandomGenerator.name(),
        password: adminB_password,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(adminB);

  // 6. Authenticate as admin B for subsequent API call
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminB_email,
      password: adminB_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 7. Attempt to access admin A's eligibility check by admin B (expect error or not found)
  await TestValidator.error(
    "Access control - should not allow other org access",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.insuranceEligibilityChecks.at(
        connection,
        {
          insurancePolicyId: policy.id,
          insuranceEligibilityCheckId: eligibility.id,
        },
      );
    },
  );
}
