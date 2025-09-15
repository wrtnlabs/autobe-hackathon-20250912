import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsurancePolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * E2E test to verify insurance policy details can be retrieved by ID including
 * authentication, data isolation, and error scenarios.
 *
 * 1. Register and login an organization admin (capture credentials for repeat-use)
 * 2. Create a new patient as the organization admin
 * 3. Create an insurance policy (linked to patient/org), capture insurancePolicyId
 * 4. Retrieve insurance policy by ID and validate response matches creation
 * 5. Attempt retrieval with a random invalid insurancePolicyId and expect error
 */
export async function test_api_insurance_policy_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Organization admin join (creates/authorizes org admin)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: adminFullName,
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);

  // Optionally log in again (session retrieval) - ensures valid token if needed
  const adminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminLogin);

  // 2. Create a patient for assignment
  const dob = new Date("1990-01-11T00:00:00Z").toISOString();
  const patientInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    date_of_birth: dob,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.ICreate;
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      { body: patientInput },
    );
  typia.assert(patient);

  // 3. Create an insurance policy linked to patient/org context
  const today = new Date();
  const startDate = today.toISOString().slice(0, 10); // YYYY-MM-DD
  const endDate = new Date(today.getTime() + 1e9).toISOString().slice(0, 10); // about 11 days later
  const insuranceCreate = {
    patient_id: patient.id,
    organization_id: adminJoin.id,
    policy_number: RandomGenerator.alphaNumeric(12),
    payer_name: RandomGenerator.name(2),
    group_number: RandomGenerator.alphabets(8),
    coverage_start_date: startDate,
    coverage_end_date: endDate,
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
  const insurance =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      { body: insuranceCreate },
    );
  typia.assert(insurance);

  // 4. Retrieve by ID and compare
  const insuranceRetrieved =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.at(
      connection,
      {
        insurancePolicyId: insurance.id,
      },
    );
  typia.assert(insuranceRetrieved);
  // All fields except: created_at, updated_at, deleted_at should match (allow for system timestamps)
  TestValidator.equals(
    "insurance policy retrieval matches creation",
    {
      ...insuranceRetrieved,
      created_at: undefined,
      updated_at: undefined,
      deleted_at: undefined,
    },
    {
      ...insurance,
      created_at: undefined,
      updated_at: undefined,
      deleted_at: undefined,
    },
  );

  // 5. Negative: attempt to GET nonexistent insurancePolicyId
  await TestValidator.error(
    "nonexistent insurancePolicyId returns error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.at(
        connection,
        {
          insurancePolicyId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
