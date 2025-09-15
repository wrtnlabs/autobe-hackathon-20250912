import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTask";

export async function test_api_task_update_success_with_employee_auth(
  connection: api.IConnection,
) {
  // 1. Perform employee join to create and authenticate employee user
  const employeeBody: IJobPerformanceEvalEmployee.ICreate = {
    email: `employee.${RandomGenerator.alphaNumeric(5)}@company.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  };
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeBody,
    });
  typia.assert(employee);

  // 2. Prepare update data for a task
  const updateBody: IJobPerformanceEvalTask.IUpdate = {
    code: `TASK-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 8,
    }),
  };

  // 3. Provide existing valid UUIDs for taskGroupId and taskId
  const taskGroupId = typia.random<string & tags.Format<"uuid">>();
  const taskId = typia.random<string & tags.Format<"uuid">>();

  // 4. Perform task update under employee auth context
  const updatedTask: IJobPerformanceEvalTask =
    await api.functional.jobPerformanceEval.employee.taskGroups.tasks.update(
      connection,
      {
        taskGroupId,
        taskId,
        body: updateBody,
      },
    );
  typia.assert(updatedTask);

  // 5. Validate that updated values are correctly reflected
  TestValidator.equals("code matches", updatedTask.code, updateBody.code);
  TestValidator.equals("name matches", updatedTask.name, updateBody.name);
  TestValidator.equals(
    "description matches",
    updatedTask.description,
    updateBody.description,
  );

  // 6. Validate the task IDs match input
  TestValidator.equals(
    "taskGroupId matches",
    updatedTask.task_group_id,
    taskGroupId,
  );
  TestValidator.equals("taskId matches", updatedTask.id, taskId);

  // 7. Validate timestamps are proper ISO 8601 strings and updated_at is not older than created_at
  typia.assert<string & tags.Format<"date-time">>(updatedTask.created_at);
  typia.assert<string & tags.Format<"date-time">>(updatedTask.updated_at);
  const createdAt = new Date(updatedTask.created_at);
  const updatedAt = new Date(updatedTask.updated_at);
  TestValidator.predicate(
    "updated_at is same or after created_at",
    updatedAt.getTime() >= createdAt.getTime(),
  );
}
