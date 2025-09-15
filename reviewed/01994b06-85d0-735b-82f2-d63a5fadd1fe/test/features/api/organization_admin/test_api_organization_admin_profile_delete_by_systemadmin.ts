import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates permanent (hard) deletion of an organization administrator by
 * System Admin, with error handling and security/authorization logic.
 *
 * Steps:
 *
 * 1. Register a new system administrator and authenticate to gain system
 *    privileges (POST /auth/systemAdmin/join)
 * 2. Register a new organization admin, obtain the organizationAdminId (POST
 *    /auth/organizationAdmin/join)
 * 3. Under system admin context, hard-delete the organization admin (DELETE
 *    /healthcarePlatform/systemAdmin/organizationadmins/{organizationAdminId})
 * 4. Attempt to delete again and validate that an error is returned (already
 *    deleted)
 * 5. Test deleting a random non-existent organizationAdminId: expect error
 * 6. (Security) Simulate unauthorized user (no systemAdmin join) and attempt
 *    deletion: expect error
 */
export async function test_api_organization_admin_profile_delete_by_systemadmin(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const sysAdminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminJoin,
  });
  typia.assert(sysAdmin);

  // 2. Register an organization admin
  const orgAdminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAdminJoin },
  );
  typia.assert(orgAdmin);
  const { id: organizationAdminId } = orgAdmin;

  // 3. Hard-delete the organization admin
  await api.functional.healthcarePlatform.systemAdmin.organizationadmins.erase(
    connection,
    {
      organizationAdminId,
    },
  );

  // 4. Attempt to delete again - should error (already deleted)
  await TestValidator.error(
    "cannot delete already deleted organizationAdminId",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.organizationadmins.erase(
        connection,
        {
          organizationAdminId,
        },
      );
    },
  );

  // 5. Attempt to delete a random non-existent org admin
  await TestValidator.error(
    "cannot delete non-existent organizationAdminId",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.organizationadmins.erase(
        connection,
        {
          organizationAdminId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Security: try deleting as unauthenticated (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized systemAdmin erase fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.organizationadmins.erase(
        unauthConn,
        {
          organizationAdminId,
        },
      );
    },
  );
}
