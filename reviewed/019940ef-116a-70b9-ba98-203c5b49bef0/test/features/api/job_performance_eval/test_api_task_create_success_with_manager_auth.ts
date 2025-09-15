import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTask";

export async function test_api_task_create_success_with_manager_auth(
  connection: api.IConnection,
) {
  // 1. Manager join and authenticate
  const managerEmail: string = typia.random<string & tags.Format<"email">>();
  const managerCreateBody = {
    email: managerEmail,
    password: "StrongP@ssw0rd!",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const authorizedManager = await api.functional.auth.manager.join(connection, {
    body: managerCreateBody,
  });
  typia.assert(authorizedManager);

  // 2. Prepare new task creation request
  // Generate a realistic UUID as taskGroupId
  const taskGroupId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const newTaskBody = {
    task_group_id: taskGroupId,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }).trim(),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 5,
      wordMax: 12,
    }),
  } satisfies IJobPerformanceEvalTask.ICreate;

  // 3. Create the task via API
  const createdTask =
    await api.functional.jobPerformanceEval.manager.taskGroups.tasks.create(
      connection,
      {
        taskGroupId,
        body: newTaskBody,
      },
    );

  // Assert the response matches expected type
  typia.assert(createdTask);

  // 4. Verify created task properties
  TestValidator.equals(
    "task_group_id matches input",
    createdTask.task_group_id,
    taskGroupId,
  );
  TestValidator.equals(
    "code matches input",
    createdTask.code,
    newTaskBody.code,
  );
  TestValidator.equals(
    "name matches input",
    createdTask.name,
    newTaskBody.name,
  );
  TestValidator.equals(
    "description matches input",
    createdTask.description ?? null,
    newTaskBody.description ?? null,
  );
  TestValidator.predicate(
    "id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdTask.id,
    ),
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    !Number.isNaN(Date.parse(createdTask.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    !Number.isNaN(Date.parse(createdTask.updated_at)),
  );
}
