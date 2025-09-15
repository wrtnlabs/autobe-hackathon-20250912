import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";

/**
 * Test to verify that an authenticated admin user can delete widget scripts via
 * /flexOffice/admin/widgets/{widgetId}/scripts/{scriptId}.
 *
 * This test covers:
 *
 * - Admin user registration and login to establish authentication.
 * - Successful deletion of a widget script with valid IDs.
 * - 404 Not Found errors when deleting non-existent widgetId or scriptId.
 * - 401 Unauthorized error if deletion attempted without authentication.
 *
 * Each step uses proper type-safe data and checks for expected success/error
 * conditions.
 */
export async function test_api_admin_widget_script_deletion_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register new admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Login as admin
  const adminLoginAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(adminLoginAuthorized);

  // 3. Delete widget script with valid UUIDs - expect success (no error)
  await api.functional.flexOffice.admin.widgets.scripts.erase(connection, {
    widgetId: typia.random<string & tags.Format<"uuid">>(),
    scriptId: typia.random<string & tags.Format<"uuid">>(),
  });

  // 4. Delete with non-existent widgetId - expect 404 error
  await TestValidator.error(
    "deleting widget script with non-existent widgetId should fail with 404",
    async () => {
      await api.functional.flexOffice.admin.widgets.scripts.erase(connection, {
        widgetId: typia.random<string & tags.Format<"uuid">>(),
        scriptId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 5. Delete with non-existent scriptId - expect 404 error
  await TestValidator.error(
    "deleting widget script with non-existent scriptId should fail with 404",
    async () => {
      await api.functional.flexOffice.admin.widgets.scripts.erase(connection, {
        widgetId: typia.random<string & tags.Format<"uuid">>(),
        scriptId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 6. Delete without authentication - expect 401 error
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated deletion should fail with 401",
    async () => {
      await api.functional.flexOffice.admin.widgets.scripts.erase(
        unauthenticatedConnection,
        {
          widgetId: typia.random<string & tags.Format<"uuid">>(),
          scriptId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
