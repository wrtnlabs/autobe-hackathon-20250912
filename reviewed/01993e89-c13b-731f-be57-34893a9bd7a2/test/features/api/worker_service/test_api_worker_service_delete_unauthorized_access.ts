import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";

/**
 * Test unauthorized access to delete WorkerService user account.
 *
 * 1. Register systemAdmin via join.
 * 2. Attempt delete without authentication - expect failure.
 * 3. Authenticate systemAdmin.
 * 4. Attempt delete with authentication - logically allowed.
 * 5. Logout (simulate unauthenticated).
 * 6. Attempt delete again without auth - expect failure.
 */
export async function test_api_worker_service_delete_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: System admin join (dependency)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;

  const admin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // Generate random UUID for delete attempts
  const targetId1 = typia.random<string & tags.Format<"uuid">>();
  const targetId2 = typia.random<string & tags.Format<"uuid">>();

  // Clone connection to simulate unauthenticated calls without authentication header
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 2: Attempt to delete without authentication, expect error
  await TestValidator.error(
    "Delete worker service fails without authentication",
    async () => {
      await api.functional.notificationWorkflow.systemAdmin.workerServices.erase(
        unauthConn,
        {
          id: targetId1,
        },
      );
    },
  );

  // Step 3: Already authenticated as admin (via join) - attempt a delete call to show usage (allowed scenario)
  await api.functional.notificationWorkflow.systemAdmin.workerServices.erase(
    connection,
    {
      id: targetId2,
    },
  );

  // Step 4: Simulate logout by clearing headers
  const loggedOutConn: api.IConnection = { ...connection, headers: {} };

  // Step 5: Attempt to delete again without authentication, expect error
  await TestValidator.error(
    "Delete worker service fails when unauthenticated after login",
    async () => {
      await api.functional.notificationWorkflow.systemAdmin.workerServices.erase(
        loggedOutConn,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
