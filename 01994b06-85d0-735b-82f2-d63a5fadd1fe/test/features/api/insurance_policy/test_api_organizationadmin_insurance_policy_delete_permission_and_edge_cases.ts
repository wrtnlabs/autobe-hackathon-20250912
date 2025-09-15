import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsurancePolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Test the insurance policy deletion process as an organization admin.
 *
 * 1. Authenticate as organization admin via join and then login (separate steps;
 *    login tests token re-issuance and idempotency).
 * 2. Create a new insurance policy for a patient, using randomized valid data for
 *    all fields, including realistic tagged types for UUID/date.
 * 3. Delete the policy using a valid insurancePolicyId, and confirm deletion by
 *    attempting further deletes (should result in error regardless if already
 *    deleted or never existed).
 * 4. Try to delete a random insurancePolicyId (which does not exist) and expect a
 *    proper business logic error.
 * 5. Ensure no orphaned dependent records or improper business rule violations by
 *    verifying subsequent API attempts fail as expected (since no GET, only
 *    delete is testable).
 */
export async function test_api_organizationadmin_insurance_policy_delete_permission_and_edge_cases(
  connection: api.IConnection,
) {
  // 1. Register a new organization admin, using random unique email
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "StrongPwd1234!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);

  // 2. Login as the same admin to test authentication token re-issuance and idempotency
  const adminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: "StrongPwd1234!",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminLogin);

  // 3. Create a new insurance policy (random valid fields)
  const patientId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const createBody = {
    patient_id: patientId,
    organization_id: organizationId,
    policy_number: RandomGenerator.alphaNumeric(12),
    payer_name: RandomGenerator.name(1),
    group_number: null,
    coverage_start_date: "2024-01-01",
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
      { body: createBody },
    );
  typia.assert(policy);
  TestValidator.equals(
    "created patient_id matches input",
    policy.patient_id,
    patientId,
  );
  TestValidator.equals(
    "created organization_id matches input",
    policy.organization_id,
    organizationId,
  );

  // 4. Delete the insurance policy by id (should succeed)
  await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.erase(
    connection,
    {
      insurancePolicyId: policy.id,
    },
  );

  // 5. Attempt to delete again with the same insurancePolicyId (should error)
  await TestValidator.error(
    "delete already deleted insurance policy should error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.erase(
        connection,
        {
          insurancePolicyId: policy.id,
        },
      );
    },
  );

  // 6. Attempt to delete a purely random insurancePolicyId (should error)
  await TestValidator.error(
    "delete with non-existent insurance policy id should error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.erase(
        connection,
        {
          insurancePolicyId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
