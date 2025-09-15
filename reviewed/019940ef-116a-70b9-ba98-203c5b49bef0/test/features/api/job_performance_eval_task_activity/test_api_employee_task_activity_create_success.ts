import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalTaskActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskActivity";

export async function test_api_employee_task_activity_create_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate employee user
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(64);

  const newEmployee: IJobPerformanceEvalEmployee.ICreate = {
    email: employeeEmail,
    password_hash: passwordHash,
    name: RandomGenerator.name(),
  };

  const authorizedEmployee =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: newEmployee,
    });
  typia.assert(authorizedEmployee);

  // 2. Prepare task activity creation data
  const taskId = typia.random<string & tags.Format<"uuid">>();
  const code = RandomGenerator.alphaNumeric(10);
  const name = RandomGenerator.name();

  const useDescription = RandomGenerator.pick([true, false]);
  const description = useDescription
    ? RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 })
    : null;

  const createBody = {
    task_id: taskId,
    code,
    name,
    description,
  } satisfies IJobPerformanceEvalTaskActivity.ICreate;

  // 3. Call create task activity API with authenticated connection
  const createdActivity =
    await api.functional.jobPerformanceEval.employee.tasks.taskActivities.create(
      connection,
      {
        taskId: taskId,
        body: createBody,
      },
    );
  typia.assert(createdActivity);

  // 4. Validate response fields
  TestValidator.predicate(
    "createdActivity has non-empty id",
    createdActivity.id.length > 0,
  );
  TestValidator.equals("task_id matches", createdActivity.task_id, taskId);
  TestValidator.equals("code matches", createdActivity.code, code);
  TestValidator.equals("name matches", createdActivity.name, name);

  if (
    createdActivity.description === null ||
    createdActivity.description === undefined
  ) {
    TestValidator.equals(
      "description is null",
      createdActivity.description,
      null,
    );
  } else {
    TestValidator.predicate(
      "description is non-empty string",
      typeof createdActivity.description === "string" &&
        createdActivity.description.length > 0,
    );
  }

  TestValidator.predicate(
    "created_at is valid ISO 8601 date-time string",
    !isNaN(Date.parse(createdActivity.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 date-time string",
    !isNaN(Date.parse(createdActivity.updated_at)),
  );

  TestValidator.predicate(
    "deleted_at is null or undefined or valid ISO string",
    createdActivity.deleted_at === null ||
      createdActivity.deleted_at === undefined ||
      (typeof createdActivity.deleted_at === "string" &&
        !isNaN(Date.parse(createdActivity.deleted_at))),
  );

  // 5. Negative test: unauthenticated call must throw error
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthenticated create throws error", async () => {
    await api.functional.jobPerformanceEval.employee.tasks.taskActivities.create(
      unauthConn,
      {
        taskId: taskId,
        body: createBody,
      },
    );
  });
}
