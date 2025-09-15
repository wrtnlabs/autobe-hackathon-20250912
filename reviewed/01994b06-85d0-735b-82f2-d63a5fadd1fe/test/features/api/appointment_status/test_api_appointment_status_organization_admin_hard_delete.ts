import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * E2E test for appointment status hard deletion by organization admin.
 *
 * 1. Register as organization admin with unique credentials.
 * 2. Generate a random statusId to use as a test subject (no status creation/list
 *    API is available).
 * 3. Call DELETE endpoint for this statusId. Success is assumed if no error is
 *    thrown (cannot verify from list/get).
 * 4. Attempt to delete the same statusId again, expecting an error due to
 *    nonexistence (repeated delete should fail).
 *
 * Limitations: Unable to verify post-delete state, actual status existence, or
 * audit due to missing APIs. This test focuses on validating delete endpoint
 * and error handling for double-deletion as allowed by currently available
 * SDK.
 */
export async function test_api_appointment_status_organization_admin_hard_delete(
  connection: api.IConnection,
) {
  // 1. Register as organization admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(admin);

  // 2. Generate a random UUID for the to-be-deleted statusId
  const statusId = typia.random<string & tags.Format<"uuid">>();

  // 3. Call the DELETE endpoint (should succeed)
  await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.erase(
    connection,
    { statusId },
  );

  // 4. Try deleting the same status again (should fail with error)
  await TestValidator.error(
    "second deletion of non-existent status should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.erase(
        connection,
        { statusId },
      );
    },
  );
}
