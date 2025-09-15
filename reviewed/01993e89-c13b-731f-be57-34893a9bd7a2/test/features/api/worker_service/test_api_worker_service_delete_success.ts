import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";

/**
 * Test successful deletion of a WorkerService user account by unique ID.
 *
 * This test follows a scenario requiring first the creation of a system
 * administrator user to establish necessary role-based authentication
 * context. The system admin joins the system via the join endpoint.
 * Subsequently, the test deletes a WorkerService user account by calling
 * the delete endpoint with a generated UUID representing the WorkerService
 * ID. The test ensures no errors are thrown and deletion is successful.
 */
export async function test_api_worker_service_delete_success(
  connection: api.IConnection,
) {
  // 1. Create system administrator to establish authentication context
  const systemAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: `${RandomGenerator.name(1).toLowerCase()}${RandomGenerator.alphaNumeric(5)}@example.com`,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    });
  typia.assert(systemAdmin);

  // 2. Delete a WorkerService user account by ID
  const workerServiceId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await api.functional.notificationWorkflow.systemAdmin.workerServices.erase(
    connection,
    {
      id: workerServiceId,
    },
  );
}
