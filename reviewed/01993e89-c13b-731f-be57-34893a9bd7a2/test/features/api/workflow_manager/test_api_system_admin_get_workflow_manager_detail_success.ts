import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";

/**
 * Ensure successful retrieval of detailed information for a workflowManager
 * user by a systemAdmin user.
 *
 * This test performs the following steps:
 *
 * 1. Registers a systemAdmin user to obtain authentication tokens.
 * 2. Registers a workflowManager user to serve as the target.
 * 3. Retrieves the workflowManager details by its ID using systemAdmin
 *    authentication.
 * 4. Validates the retrieved data matches the created workflowManager user.
 *
 * This validates the endpoint
 * `/notificationWorkflow/systemAdmin/workflowManagers/{id}` can be accessed
 * by systemAdmin users to fetch detailed workflowManager info correctly and
 * securely.
 *
 * All API responses are strongly type-asserted with typia.assert().
 *
 * @param connection The API connection instance for making requests
 */
export async function test_api_system_admin_get_workflow_manager_detail_success(
  connection: api.IConnection,
) {
  // 1. Create a systemAdmin user to authenticate as systemAdmin
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: systemAdminEmail,
      password: "ValidPassword123!",
    } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
  });
  typia.assert(systemAdmin);

  // 2. Create a workflowManager user as the target
  const workflowManagerEmail = typia.random<string & tags.Format<"email">>();
  const workflowManager = await api.functional.auth.workflowManager.join(
    connection,
    {
      body: {
        email: workflowManagerEmail,
        password_hash: typia.random<string>(),
      } satisfies INotificationWorkflowWorkflowManager.ICreate,
    },
  );
  typia.assert(workflowManager);

  // 3. Retrieve workflowManager user details by ID with systemAdmin privileges
  const retrievedWorkflowManager =
    await api.functional.notificationWorkflow.systemAdmin.workflowManagers.at(
      connection,
      {
        id: workflowManager.id,
      },
    );
  typia.assert(retrievedWorkflowManager);

  // 4. Verify all important fields are equal
  TestValidator.equals(
    "retrieved workflowManager ID matches created ID",
    retrievedWorkflowManager.id,
    workflowManager.id,
  );
  TestValidator.equals(
    "retrieved workflowManager email matches created email",
    retrievedWorkflowManager.email,
    workflowManager.email,
  );
  TestValidator.equals(
    "retrieved workflowManager password_hash matches created password_hash",
    retrievedWorkflowManager.password_hash,
    workflowManager.password_hash,
  );
  TestValidator.equals(
    "retrieved workflowManager created_at matches created created_at",
    retrievedWorkflowManager.created_at,
    workflowManager.created_at,
  );
  TestValidator.equals(
    "retrieved workflowManager updated_at matches created updated_at",
    retrievedWorkflowManager.updated_at,
    workflowManager.updated_at,
  );
  TestValidator.equals(
    "retrieved workflowManager deleted_at matches created deleted_at",
    retrievedWorkflowManager.deleted_at ?? null,
    workflowManager.deleted_at ?? null,
  );
}
