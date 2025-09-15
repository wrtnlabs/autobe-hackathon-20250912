import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceEligibilityCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceEligibilityCheck";
import type { IHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsurancePolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Insurance eligibility check creation business flow. This test performs the
 * following steps:
 *
 * 1. Registers as a new organization admin and authenticates.
 * 2. Creates a patient UUID (random, as no explicit endpoint is available).
 * 3. Creates an insurance policy under the admin's organization for that patient.
 * 4. As the same admin, creates a new insurance eligibility check for said policy
 *    (self as performed_by_id).
 * 5. Validates creation results, including error on duplicate.
 * 6. Attempts creation as an unauthenticated/unauthorized user, expecting error.
 */
export async function test_api_create_insurance_eligibility_check_business_flow(
  connection: api.IConnection,
) {
  // 1. Register as organization admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminPhone = RandomGenerator.mobile();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const joinOutput = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: adminFullName,
        phone: adminPhone,
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(joinOutput);

  // (Re-)login as admin to set token (verifies login endpoint too)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 2. Patient UUID for insurance policy (simulate, as there is no API for patient creation)
  const patientId = typia.random<string & tags.Format<"uuid">>();
  const organizationId = joinOutput.id; // The admin's id is used here as organization context

  // 3. Create insurance policy for patient under admin's org
  const policyInput = {
    patient_id: patientId,
    organization_id: organizationId,
    policy_number: RandomGenerator.alphaNumeric(10),
    payer_name: RandomGenerator.name(2),
    group_number: RandomGenerator.alphaNumeric(6),
    coverage_start_date: new Date().toISOString().slice(0, 10),
    coverage_end_date: null,
    plan_type: "commercial",
    policy_status: "active",
  } satisfies IHealthcarePlatformInsurancePolicy.ICreate;

  const policy =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      {
        body: policyInput,
      },
    );
  typia.assert(policy);

  // 4. Create a new insurance eligibility check for the policy
  const now = new Date().toISOString();
  const eligibilityCheckInput = {
    insurance_policy_id: policy.id,
    performed_by_id: organizationId,
    check_timestamp: now,
    status: "verified", // typical accepted status
    payer_response_code: "A1",
    payer_response_description: "Eligible and active as of check date.",
  } satisfies IHealthcarePlatformInsuranceEligibilityCheck.ICreate;

  const eligibilityCheck =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.insuranceEligibilityChecks.create(
      connection,
      {
        insurancePolicyId: policy.id,
        body: eligibilityCheckInput,
      },
    );
  typia.assert(eligibilityCheck);
  TestValidator.equals(
    "eligibility check id should match insurance policy id",
    eligibilityCheck.insurance_policy_id,
    policy.id,
  );
  TestValidator.equals(
    "performed_by_id is admin/organizationId",
    eligibilityCheck.performed_by_id,
    organizationId,
  );
  TestValidator.equals(
    "status matches input",
    eligibilityCheck.status,
    eligibilityCheckInput.status,
  );

  // 5. Attempt to submit a duplicate eligibility check (with the same data)
  await TestValidator.error(
    "duplicate eligibility check input should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.insuranceEligibilityChecks.create(
        connection,
        {
          insurancePolicyId: policy.id,
          body: eligibilityCheckInput,
        },
      );
    },
  );

  // 6. Try creating as unauthenticated/unauthorized user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot create insurance eligibility check",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.insuranceEligibilityChecks.create(
        unauthConn,
        {
          insurancePolicyId: policy.id,
          body: eligibilityCheckInput,
        },
      );
    },
  );
}
