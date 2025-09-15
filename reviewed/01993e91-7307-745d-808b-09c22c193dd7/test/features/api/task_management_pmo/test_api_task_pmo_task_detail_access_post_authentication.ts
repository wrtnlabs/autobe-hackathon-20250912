import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";

/**
 * This E2E test validates complete PMO user registration, login, and task
 * detail retrieval workflow.
 *
 * It tests successful join, authentication, and retrieval of task details for
 * the PMO role. This ensures the security and correctness of task data access.
 */
export async function test_api_task_pmo_task_detail_access_post_authentication(
  connection: api.IConnection,
) {
  // 1. Create a new PMO user by registration
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPassword123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const authorizedJoin: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: joinBody });
  typia.assert(authorizedJoin);

  // 2. Login the PMO user to get authorization
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementPmo.ILogin;

  const authorizedLogin: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: loginBody });
  typia.assert(authorizedLogin);

  // 3. Retrieve an existing task detail by taskId
  // Use a valid UUID to simulate realistic call
  const taskId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const taskDetail: ITaskManagementTask =
    await api.functional.taskManagement.pmo.tasks.at(connection, { taskId });
  typia.assert(taskDetail);

  // 4. Validate critical fields of the task to ensure correct data retrieval
  TestValidator.predicate(
    "task id is uuid",
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      taskDetail.id,
    ),
  );
  TestValidator.predicate(
    "task title non-empty",
    typeof taskDetail.title === "string" && taskDetail.title.length > 0,
  );

  // Additional field validations can be elaborated if needed
}
