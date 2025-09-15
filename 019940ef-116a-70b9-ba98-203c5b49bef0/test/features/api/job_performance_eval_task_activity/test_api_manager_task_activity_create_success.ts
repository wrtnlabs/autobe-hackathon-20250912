import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalTaskActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskActivity";

/**
 * Test the successful creation of a task activity by an authenticated manager
 * user.
 *
 * This involves first creating a manager user account via the joinManager
 * authentication endpoint, establishing authentication. Then, creating a task
 * activity associated with a valid task UUID. The response is validated to
 * confirm the task activity was properly created with matching properties and
 * timestamps.
 *
 * Steps:
 *
 * 1. Create and authenticate a manager user.
 * 2. Generate a valid taskId for the task activity.
 * 3. Create a task activity with valid code, name, and optional description.
 * 4. Validate response type and contents against the request.
 */
export async function test_api_manager_task_activity_create_success(
  connection: api.IConnection,
) {
  // 1. Create a manager user and authenticate
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password123!";
  const name = RandomGenerator.name();
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: email,
        password: password,
        name: name,
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager);

  // 2. Generate a valid taskId as UUID
  const taskId = typia.random<string & tags.Format<"uuid">>();

  // 3. Compose a new task activity creation request
  const code = RandomGenerator.alphaNumeric(10);
  const taskActivityCreate = {
    task_id: taskId,
    code: code,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IJobPerformanceEvalTaskActivity.ICreate;

  // 4. Call the create task activity endpoint
  const response: IJobPerformanceEvalTaskActivity =
    await api.functional.jobPerformanceEval.manager.tasks.taskActivities.create(
      connection,
      {
        taskId: taskId,
        body: taskActivityCreate,
      },
    );
  typia.assert(response);

  // 5. Validate response data conforms to request
  TestValidator.predicate(
    "response contains id",
    typeof response.id === "string" && response.id.length > 0,
  );
  TestValidator.equals(
    "response task_id matches request",
    response.task_id,
    taskActivityCreate.task_id,
  );
  TestValidator.equals("response code matches request", response.code, code);
  TestValidator.equals(
    "response name matches request",
    response.name,
    taskActivityCreate.name,
  );
  TestValidator.equals(
    "response description matches request",
    response.description ?? null,
    taskActivityCreate.description ?? null,
  );
  TestValidator.predicate(
    "response has created_at",
    typeof response.created_at === "string" && response.created_at.length > 0,
  );
  TestValidator.predicate(
    "response has updated_at",
    typeof response.updated_at === "string" && response.updated_at.length > 0,
  );
}
