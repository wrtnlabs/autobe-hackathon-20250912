import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsurancePolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Full workflow for insurance policy registration by organization admin,
 * including success and business logic negative cases.
 *
 * 1. Register and login as a new organization admin
 * 2. Create a patient to obtain patient_id
 * 3. Create an insurance policy for this patient/organization (happy path)
 * 4. Confirm response matches submission and has valid audit fields
 * 5. Attempt to create policy with duplicate policy_number in org (expect error)
 */
export async function test_api_insurance_policy_creation_full_workflow(
  connection: api.IConnection,
) {
  // Step 1: Register new organization admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;

  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminJoinBody.email);

  // Step 2: Optionally login (should not be needed but covers token refresh)
  const adminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminJoinBody.email,
        password: adminJoinBody.password,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminLogin);
  TestValidator.equals(
    "re-logged in admin id matches",
    adminLogin.id,
    admin.id,
  );

  // Step 3: Create a new patient
  const patientBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(1990, 0, 1).toISOString(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.ICreate;

  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: patientBody,
      },
    );
  typia.assert(patient);
  TestValidator.equals(
    "patient email matches",
    patient.email,
    patientBody.email,
  );

  // Step 4: Create a new insurance policy - success
  const policyNumber = RandomGenerator.alphaNumeric(12);
  const policyBody = {
    patient_id: patient.id,
    organization_id: admin.id,
    policy_number: policyNumber,
    payer_name: RandomGenerator.paragraph({ sentences: 2 }),
    group_number: RandomGenerator.alphaNumeric(8),
    coverage_start_date: "2024-01-01",
    coverage_end_date: "2025-01-01",
    plan_type: RandomGenerator.pick([
      "commercial",
      "medicare",
      "medicaid",
      "self-pay",
      "worker_comp",
      "auto",
    ] as const),
    policy_status: RandomGenerator.pick([
      "active",
      "inactive",
      "expired",
      "pending verification",
    ] as const),
  } satisfies IHealthcarePlatformInsurancePolicy.ICreate;

  const createdPolicy =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      {
        body: policyBody,
      },
    );
  typia.assert(createdPolicy);
  // Validate content matches
  TestValidator.equals(
    "patient id in policy matches",
    createdPolicy.patient_id,
    policyBody.patient_id,
  );
  TestValidator.equals(
    "organization id in policy matches",
    createdPolicy.organization_id,
    policyBody.organization_id,
  );
  TestValidator.equals(
    "policy number matches",
    createdPolicy.policy_number,
    policyBody.policy_number,
  );
  TestValidator.equals(
    "payer name matches",
    createdPolicy.payer_name,
    policyBody.payer_name,
  );
  TestValidator.equals(
    "group number matches",
    createdPolicy.group_number || null,
    policyBody.group_number || null,
  );
  TestValidator.equals(
    "coverage start matches",
    createdPolicy.coverage_start_date,
    policyBody.coverage_start_date,
  );
  TestValidator.equals(
    "coverage end matches",
    createdPolicy.coverage_end_date || null,
    policyBody.coverage_end_date || null,
  );
  TestValidator.equals(
    "plan type matches",
    createdPolicy.plan_type,
    policyBody.plan_type,
  );
  TestValidator.equals(
    "policy status matches",
    createdPolicy.policy_status,
    policyBody.policy_status,
  );
  TestValidator.predicate(
    "created_at present",
    typeof createdPolicy.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at present",
    typeof createdPolicy.updated_at === "string",
  );

  // Step 5: Negative test - duplicate policy number (same organization_id and policy_number)
  await TestValidator.error(
    "duplicate policy number in organization",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
        connection,
        {
          body: policyBody,
        },
      );
    },
  );
}
