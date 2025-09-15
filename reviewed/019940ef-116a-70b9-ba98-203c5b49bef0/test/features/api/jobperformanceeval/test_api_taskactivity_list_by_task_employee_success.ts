import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalTaskActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskActivity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalTaskActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalTaskActivity";

export async function test_api_taskactivity_list_by_task_employee_success(
  connection: api.IConnection,
) {
  // Step 1: Employee user creation and authentication
  const employeeCreateBody = {
    email: RandomGenerator.alphaNumeric(10) + "@company.com",
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employee);

  // Step 2: Construct a valid taskId (UUID format string) for listing
  const taskId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Prepare request body with pagination and optional filters
  const requestBody = {
    page: 1,
    limit: 10,
    search: null, // explicit null to test nullability
    orderBy: null, // explicit null to test nullability
  } satisfies IJobPerformanceEvalTaskActivity.IRequest;

  // Step 4: Call the task activities listing API
  const output: IPageIJobPerformanceEvalTaskActivity.ISummary =
    await api.functional.jobPerformanceEval.employee.tasks.taskActivities.index(
      connection,
      {
        taskId,
        body: requestBody,
      },
    );
  typia.assert(output);

  // Step 5: Validate pagination structure
  TestValidator.predicate(
    "pagination current page is 1 or more",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    output.pagination.limit === requestBody.limit,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );

  // Step 6: Validate data array and items
  TestValidator.predicate("data is array", Array.isArray(output.data));
  TestValidator.predicate(
    "data length not exceed limit",
    output.data.length <= requestBody.limit,
  );
  for (const activity of output.data) {
    typia.assert(activity);
    TestValidator.predicate(
      "activity id is non-empty string",
      typeof activity.id === "string" && activity.id.length > 0,
    );
    TestValidator.predicate(
      "activity name is non-empty string",
      typeof activity.name === "string" && activity.name.length > 0,
    );
    TestValidator.predicate(
      "activity code is non-empty string",
      typeof activity.code === "string" && activity.code.length > 0,
    );
  }
}
