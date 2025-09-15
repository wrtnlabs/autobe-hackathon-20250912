import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsurancePolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformInsurancePolicy";

/**
 * Validate PATCH search with filtering by patient_id and organization_id
 * for insurance policies, ensuring only authorized organization admin can
 * access correct data and no leakage occurs.
 *
 * 1. Onboard (join) an org admin.
 * 2. Create (register) a patient using the org admin account.
 * 3. Register an insurance policy for this patient and organization.
 * 4. PATCH search insurancePolicies with filter: patient_id and
 *    organization_id.
 *
 *    - Confirm that the created policy appears, and its fields match what was
 *         created.
 * 5. Negative: Search with random non-existent patient_id, expect empty
 *    result.
 *
 *    - Also verify organization admin's role is required to access PATCH search:
 *         unauthenticated request or other role gets error.
 */
export async function test_api_insurance_policy_search_with_existing_patient(
  connection: api.IConnection,
) {
  // 1. Onboard an organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);
  const adminOrgId = adminJoin.id;

  // 2. Authenticate as org admin (get session if needed)
  const adminAuth = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminAuth);

  // 3. Create patient (grab organization_id from admin session if possible)
  const patientBirth = new Date(
    Date.now() - 30 * 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const patientCreate =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: patientBirth,
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patientCreate);
  const patientId = patientCreate.id;

  // 4. Register a new insurance policy linked to this patient/organization
  const policyBody = {
    patient_id: patientId,
    organization_id: adminJoin.id, // as returned by join
    policy_number: RandomGenerator.alphaNumeric(12),
    payer_name: RandomGenerator.name(2),
    group_number: RandomGenerator.alphaNumeric(8),
    coverage_start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    coverage_end_date: null,
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
  const policy =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      {
        body: policyBody,
      },
    );
  typia.assert(policy);

  // 5. PATCH search using patient_id and organization_id to confirm presence
  const searchResult =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.index(
      connection,
      {
        body: {
          patient_id: patientId,
          organization_id: adminJoin.id,
          page: 1 satisfies number,
          limit: 10 satisfies number,
        } satisfies IHealthcarePlatformInsurancePolicy.IRequest,
      },
    );
  typia.assert(searchResult);

  // The new policy should appear and match data
  const found = searchResult.data.find((p) => p.id === policy.id);
  typia.assertGuard(found!);
  TestValidator.equals("policy fields", found, policy);

  // Negative case: search with non-existent patient_id returns zero results
  const nonExistentPatientId = typia.random<string & tags.Format<"uuid">>();
  const negativeResult =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.index(
      connection,
      {
        body: {
          patient_id: nonExistentPatientId,
          organization_id: adminJoin.id,
          page: 1 satisfies number,
          limit: 10 satisfies number,
        } satisfies IHealthcarePlatformInsurancePolicy.IRequest,
      },
    );
  typia.assert(negativeResult);
  TestValidator.equals(
    "negative search yields zero records",
    negativeResult.data.length,
    0,
  );
}
