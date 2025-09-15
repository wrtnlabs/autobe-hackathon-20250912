import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";

/**
 * Validate unauthorized access when attempting to update a system
 * administrator user.
 *
 * This test ensures that updating system administrator details without
 * proper authentication or with insufficient permissions is correctly
 * denied by the API.
 *
 * Workflow:
 *
 * 1. Register a new system administrator using the join endpoint to establish
 *    valid system admin credentials.
 * 2. Attempt to update system administrator data without any authentication,
 *    expecting a failure.
 * 3. Attempt to update with a separate unauthenticated connection (no
 *    systemAdmin auth), expecting failure.
 * 4. Validate that permission errors are correctly thrown and caught.
 */
export async function test_api_system_admin_update_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Register a systemAdmin to create a valid user and token
  const validSystemAdmin = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string>(),
        password: typia.random<string>(),
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    },
  );
  typia.assert(validSystemAdmin);

  // Prepare realistic update data for systemAdmin
  const updateBody = {
    email: typia.random<string>(),
    password_hash: typia.random<string>(),
    deleted_at: null,
  } satisfies INotificationWorkflowSystemAdmin.IUpdate;

  // 2. Attempt update without any authentication (empty headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "update without authentication should throw error",
    async () => {
      await api.functional.notificationWorkflow.systemAdmin.systemAdmins.update(
        unauthenticatedConnection,
        {
          id: validSystemAdmin.id,
          body: updateBody,
        },
      );
    },
  );

  // 3. Attempt update with another connection instance lacking systemAdmin auth
  const freshConnectionNoAuth: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "update with insufficient permissions should throw error",
    async () => {
      await api.functional.notificationWorkflow.systemAdmin.systemAdmins.update(
        freshConnectionNoAuth,
        {
          id: validSystemAdmin.id,
          body: updateBody,
        },
      );
    },
  );
}
