import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTask";
import type { IJobPerformanceEvalTaskActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskActivity";

/**
 * Validate successful retrieval of a detailed task activity by a manager user.
 *
 * This comprehensive E2E test performs the following sequence:
 *
 * 1. Create a manager user and authenticate.
 * 2. Generate a new UUID for a Task Group (external existence assumed).
 * 3. Create a Task under this Task Group with realistic data.
 * 4. Create a Task Activity under the created Task with appropriate properties.
 * 5. Retrieve the Task Activity by taskId and taskActivityId.
 * 6. Assert that the retrieved Task Activity exactly matches the created one.
 *
 * All returned objects are validated with typia.assert for perfect type-safety.
 * TestValidator is used to confirm key property equivalence.
 */
export async function test_api_taskactivity_at_successful_retrieval(
  connection: api.IConnection,
) {
  // 1. Manager user registration
  const managerJoinBody = {
    email: `manager_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongPa$$word123",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const managerAuthenticated: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerJoinBody,
    });
  typia.assert(managerAuthenticated);

  // 2. Create a Task Group ID (UUID). Actual Task Group creation is assumed.
  const taskGroupId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create a Task within the Task Group
  const taskCreateBody = {
    task_group_id: taskGroupId,
    code: `T-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    knowledge_area_id: null,
  } satisfies IJobPerformanceEvalTask.ICreate;
  const task: IJobPerformanceEvalTask =
    await api.functional.jobPerformanceEval.manager.taskGroups.tasks.create(
      connection,
      {
        taskGroupId: taskGroupId,
        body: taskCreateBody,
      },
    );
  typia.assert(task);

  // 4. Create a Task Activity under the created Task
  const taskActivityCreateBody = {
    task_id: task.id,
    code: `TA-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IJobPerformanceEvalTaskActivity.ICreate;
  const taskActivity: IJobPerformanceEvalTaskActivity =
    await api.functional.jobPerformanceEval.manager.tasks.taskActivities.create(
      connection,
      {
        taskId: task.id,
        body: taskActivityCreateBody,
      },
    );
  typia.assert(taskActivity);

  // 5. Retrieve the Task Activity by taskId and taskActivityId
  const retrievedActivity: IJobPerformanceEvalTaskActivity =
    await api.functional.jobPerformanceEval.manager.tasks.taskActivities.at(
      connection,
      {
        taskId: task.id,
        taskActivityId: taskActivity.id,
      },
    );
  typia.assert(retrievedActivity);

  // 6. Validate that the retrieved Task Activity matches the created one
  TestValidator.equals(
    "task activity id",
    retrievedActivity.id,
    taskActivity.id,
  );
  TestValidator.equals(
    "task activity task_id",
    retrievedActivity.task_id,
    taskActivity.task_id,
  );
  TestValidator.equals(
    "task activity code",
    retrievedActivity.code,
    taskActivity.code,
  );
  TestValidator.equals(
    "task activity name",
    retrievedActivity.name,
    taskActivity.name,
  );
  TestValidator.equals(
    "task activity description",
    retrievedActivity.description ?? null,
    taskActivity.description ?? null,
  );
}
