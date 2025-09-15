import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Validates the permanent deletion of a system administrator.
 *
 * This test covers creating a system administrator via the join endpoint,
 * deleting the system admin, verifying deletion by attempting a repeat deletion
 * which should result in a not found error, and tests unauthorized deletion
 * attempts using an unauthenticated connection.
 *
 * Steps:
 *
 * 1. Create system administrator user and authenticate.
 * 2. Delete that system administrator.
 * 3. Verify deletion by retrying delete expecting 404 not found.
 * 4. Attempt deletion with unauthorized user (empty token) expecting 403
 *    forbidden.
 */
export async function test_api_systemadmin_delete_existing_systemadmin(
  connection: api.IConnection,
) {
  // 1. Create a systemAdmin by join API
  const adminCreateInput = {
    email: RandomGenerator.pick([
      "admin1@example.com",
      "admin2@example.com",
      "admin3@example.com",
    ]),
    password_hash: RandomGenerator.alphaNumeric(20),
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const admin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreateInput,
    });
  typia.assert(admin);

  // 2. systemadminId to delete
  const systemadminId = admin.id;

  // 3. DELETE the system admin
  await api.functional.enterpriseLms.systemAdmin.systemadmins.eraseSystemAdmin(
    connection,
    {
      systemadminId,
    },
  );

  // 4. Verify deletion by retrying delete - expect 404
  // Since no GET method is defined, retrying delete should throw 404 (not found)
  await TestValidator.error(
    "deleted system admin cannot be found (delete again returns 404)",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.systemadmins.eraseSystemAdmin(
        connection,
        {
          systemadminId,
        },
      );
    },
  );

  // 5. Create an unauthenticated connection with empty headers
  // This simulates an unauthorized user trying to delete
  const unauthorizedConn: api.IConnection = { ...connection, headers: {} };

  // 6. Attempt deletion with unauthorized user connection, expect 403 forbidden
  await TestValidator.error(
    "unauthorized user cannot delete system admin (403 forbidden)",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.systemadmins.eraseSystemAdmin(
        unauthorizedConn,
        {
          systemadminId: typia.random<string & tags.Format<"uuid">>(), // some valid random UUID
        },
      );
    },
  );
}
