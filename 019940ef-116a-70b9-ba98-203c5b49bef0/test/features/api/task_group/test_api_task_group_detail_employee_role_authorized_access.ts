import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalTaskGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskGroup";

/**
 * Validate authorized employee access to task group details.
 *
 * This E2E test performs the following steps:
 *
 * 1. Employee user joins and obtains authentication tokens.
 * 2. Uses the authenticated connection to fetch a task group detail by valid
 *    jobRoleId and taskGroupId UUIDs.
 * 3. Asserts that the returned task group matches the expected structure.
 * 4. Tests error cases: a. Access with non-existent UUIDs to check 'not found'
 *    behavior. b. Access with invalid UUID format strings to check
 *    validation errors. c. Access without authentication to confirm
 *    unauthorized error.
 */
export async function test_api_task_group_detail_employee_role_authorized_access(
  connection: api.IConnection,
) {
  // Step 1: Employee joins and authenticates
  const employeeCreateBody = {
    email: `user${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(40), // Assume hashed password
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employee);

  // Step 2: Fetch task group detail with valid UUIDs
  const validJobRoleId: string = typia.random<string & tags.Format<"uuid">>();
  const validTaskGroupId: string = typia.random<string & tags.Format<"uuid">>();

  // Successful access
  const taskGroup: IJobPerformanceEvalTaskGroup =
    await api.functional.jobPerformanceEval.employee.jobRoles.taskGroups.at(
      connection,
      {
        jobRoleId: validJobRoleId,
        taskGroupId: validTaskGroupId,
      },
    );
  typia.assert(taskGroup);

  TestValidator.equals(
    "returned taskGroup job_role_id matches request",
    taskGroup.job_role_id,
    validJobRoleId,
  );
  TestValidator.equals(
    "returned taskGroup id matches taskGroupId request",
    taskGroup.id,
    validTaskGroupId,
  );

  TestValidator.predicate(
    "taskGroup deleted_at is null or undefined or string",
    taskGroup.deleted_at === null ||
      taskGroup.deleted_at === undefined ||
      typeof taskGroup.deleted_at === "string",
  );

  // Step 3a: Attempt access with non-existent UUIDs
  const nonExistentUUID1 = typia.random<string & tags.Format<"uuid">>();
  const nonExistentUUID2 = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent task group returns error",
    async () => {
      await api.functional.jobPerformanceEval.employee.jobRoles.taskGroups.at(
        connection,
        {
          jobRoleId: nonExistentUUID1,
          taskGroupId: nonExistentUUID2,
        },
      );
    },
  );

  // Step 3b: Attempt access with invalid UUID format
  const invalidUUID = "invalid-uuid-format-string";
  await TestValidator.error("invalid UUID format throws error", async () => {
    await api.functional.jobPerformanceEval.employee.jobRoles.taskGroups.at(
      connection,
      {
        jobRoleId: invalidUUID,
        taskGroupId: invalidUUID,
      },
    );
  });

  // Step 3c: Attempt access without authentication (unauthorized)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access without auth fails",
    async () => {
      await api.functional.jobPerformanceEval.employee.jobRoles.taskGroups.at(
        unauthConn,
        {
          jobRoleId: validJobRoleId,
          taskGroupId: validTaskGroupId,
        },
      );
    },
  );
}
