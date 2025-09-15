import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * This end-to-end test function validates the behavior of deleting a billing
 * code by an organization administrator, including proper access control
 * enforcement and error handling scenarios.
 *
 * Test steps:
 *
 * 1. Register and authenticate as organization admin (orgA-admin)
 * 2. [Simulated] Create a billing code belonging to orgA (billingCodeA)
 * 3. Successfully delete billingCodeA as orgA-admin, confirm no error thrown
 * 4. Attempt to delete a non-existent billing code - expect error
 * 5. Register and authenticate as another organization admin (orgB-admin)
 * 6. [Simulated] Try to delete billingCodeA as orgB-admin, expect error (cross-org
 *    boundary)
 * 7. Attempt to delete as unauthenticated (unprivileged) - expect error
 *
 * Notes:
 *
 * - BillingCode creation is simulated as API does not exist; use random UUID.
 * - Test validates only organization scoping, authentication, and error
 *   propagation, not existence in DB (due to absence of create/read APIs).
 * - Non-existent billing code is simulated by a new random UUID.
 * - Each error validation uses an async function with await TestValidator.error.
 */
export async function test_api_billing_code_deletion_org_admin_success_and_restrictions(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as orgA admin
  const orgAAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        password: "TestPassword1234!",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAAdminJoin);

  // Note: join sets Authorization automatically on connection for this session

  // 2. Simulate billingCode belonging to orgA (simulate via UUID)
  const billingCodeIdA: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Successfully delete billingCodeA as orgA-admin
  await api.functional.healthcarePlatform.organizationAdmin.billingCodes.erase(
    connection,
    {
      billingCodeId: billingCodeIdA,
    },
  );

  // 4. Attempt to delete a non-existent billing code (simulate with a separate UUID)
  const nonExistentBillingCodeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "error when deleting non-existent billing code",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingCodes.erase(
        connection,
        {
          billingCodeId: nonExistentBillingCodeId,
        },
      );
    },
  );

  // 5. Register and authenticate as another organization admin (orgB-admin)
  const orgBConn: api.IConnection = { ...connection, headers: {} };
  const orgBAdminJoin = await api.functional.auth.organizationAdmin.join(
    orgBConn,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        password: "TestPassword5678!",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgBAdminJoin);

  // 6. Attempt to delete billingCodeA as orgB-admin (should fail, cross-organization)
  await TestValidator.error(
    "cannot delete billing code from outside org",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingCodes.erase(
        orgBConn,
        {
          billingCodeId: billingCodeIdA,
        },
      );
    },
  );

  // 7. Attempt deletion without authentication (simulate by clearing headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "cannot delete billing code without authentication",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingCodes.erase(
        unauthConn,
        {
          billingCodeId: billingCodeIdA,
        },
      );
    },
  );
}
