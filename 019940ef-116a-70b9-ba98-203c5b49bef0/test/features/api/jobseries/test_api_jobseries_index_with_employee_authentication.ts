import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalJobGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroup";
import type { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalJobSeries";

/**
 * This E2E test verifies the full workflow of listing job series under a
 * specific job group with employee authentication context in the Job
 * Performance Evaluation system. The test proceeds as follows:
 *
 * 1. Create a manager user and authenticate.
 * 2. Create a new job group using the manager context to obtain a jobGroupId (UUID
 *    string).
 * 3. Create an employee user and authenticate.
 * 4. Use the employee authentication context to call job series listing under the
 *    job group.
 * 5. Validate pagination metadata correctness, data structure, filtering by code
 *    and name, and pagination.
 *
 * The test ensures proper role-based authorization, business logic correctness,
 * and response type validation with typia.assert().
 */
export async function test_api_jobseries_index_with_employee_authentication(
  connection: api.IConnection,
) {
  // 1. Create a manager user
  const managerPlainPassword = RandomGenerator.alphaNumeric(12);
  const managerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: managerPlainPassword,
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, { body: managerBody });
  typia.assert(manager);

  // 2. Manager login
  const loginManagerBody = {
    email: managerBody.email,
    password: managerPlainPassword,
  } satisfies IJobPerformanceEvalManager.ILogin;

  const loggedInManager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.login(connection, {
      body: loginManagerBody,
    });
  typia.assert(loggedInManager);

  // Generate a UUID string to use as jobGroupId
  const jobGroupId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create a job group
  const jobGroupBody = {
    code: jobGroupId,
    name: `Group ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IJobPerformanceEvalJobGroup.ICreate;

  const jobGroup: IJobPerformanceEvalJobGroup =
    await api.functional.jobPerformanceEval.manager.jobGroups.create(
      connection,
      { body: jobGroupBody },
    );
  typia.assert(jobGroup);

  // 4. Create an employee user
  const employeePlainPassword = RandomGenerator.alphaNumeric(12);
  const employeeBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: employeePlainPassword, // simplified as plain for test
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeBody,
    });
  typia.assert(employee);

  // 5. Employee login
  const loginEmployeeBody = {
    email: employeeBody.email,
    password: employeePlainPassword,
  } satisfies IJobPerformanceEvalEmployee.ILogin;

  const loggedInEmployee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.login.loginEmployee(connection, {
      body: loginEmployeeBody,
    });
  typia.assert(loggedInEmployee);

  // Prepare request body for listing job series: empty search (pagination only)
  const baseRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IJobPerformanceEvalJobSeries.IRequest;

  // 6. Call the job series index endpoint with empty filters
  const resultPage1: IPageIJobPerformanceEvalJobSeries.ISummary =
    await api.functional.jobPerformanceEval.employee.jobGroups.jobSeries.index(
      connection,
      {
        jobGroupId: jobGroupId,
        body: baseRequestBody,
      },
    );
  typia.assert(resultPage1);

  TestValidator.predicate(
    "pagination must have positive current page",
    resultPage1.pagination.current >= 1,
  );

  TestValidator.predicate(
    "pagination must have positive limit",
    resultPage1.pagination.limit >= 1,
  );

  TestValidator.predicate(
    "pagination total pages cannot be zero",
    resultPage1.pagination.pages >= 1,
  );

  TestValidator.predicate(
    "pagination records must be non-negative",
    resultPage1.pagination.records >= 0,
  );

  TestValidator.predicate(
    "data array must be less or equal than limit",
    resultPage1.data.length <= resultPage1.pagination.limit,
  );

  for (const item of resultPage1.data) {
    typia.assert(item);
    TestValidator.predicate(
      "job series code is non-empty",
      typeof item.code === "string" && item.code.length > 0,
    );
    TestValidator.predicate(
      "job series name is non-empty",
      typeof item.name === "string" && item.name.length > 0,
    );
  }

  // 7. Filter by code (partial)
  if (resultPage1.data.length > 0) {
    const targetCodeFragment = resultPage1.data[0].code.substring(0, 3);

    const filteredRequestBody = {
      ...baseRequestBody,
      code: targetCodeFragment,
    } satisfies IJobPerformanceEvalJobSeries.IRequest;

    const filteredResult: IPageIJobPerformanceEvalJobSeries.ISummary =
      await api.functional.jobPerformanceEval.employee.jobGroups.jobSeries.index(
        connection,
        {
          jobGroupId: jobGroupId,
          body: filteredRequestBody,
        },
      );
    typia.assert(filteredResult);

    for (const item of filteredResult.data) {
      typia.assert(item);
      TestValidator.predicate(
        "filtered items code includes the code fragment",
        item.code.includes(targetCodeFragment),
      );
    }
  }

  // 8. Filter by name (partial)
  if (resultPage1.data.length > 0) {
    const targetNameFragment = resultPage1.data[0].name.substring(0, 3);

    const filteredByNameRequestBody = {
      ...baseRequestBody,
      name: targetNameFragment,
    } satisfies IJobPerformanceEvalJobSeries.IRequest;

    const filteredByNameResult: IPageIJobPerformanceEvalJobSeries.ISummary =
      await api.functional.jobPerformanceEval.employee.jobGroups.jobSeries.index(
        connection,
        {
          jobGroupId: jobGroupId,
          body: filteredByNameRequestBody,
        },
      );
    typia.assert(filteredByNameResult);

    for (const item of filteredByNameResult.data) {
      typia.assert(item);
      TestValidator.predicate(
        "filtered items name includes the name fragment",
        item.name.includes(targetNameFragment),
      );
    }
  }

  // 9. Test pagination by requesting next page (if applicable)
  if (resultPage1.pagination.pages > 1) {
    const page2RequestBody = {
      ...baseRequestBody,
      page: 2 as number & tags.Type<"int32">,
    } satisfies IJobPerformanceEvalJobSeries.IRequest;

    const resultPage2: IPageIJobPerformanceEvalJobSeries.ISummary =
      await api.functional.jobPerformanceEval.employee.jobGroups.jobSeries.index(
        connection,
        {
          jobGroupId: jobGroupId,
          body: page2RequestBody,
        },
      );
    typia.assert(resultPage2);

    TestValidator.predicate(
      "page 2 current page number correct",
      resultPage2.pagination.current === 2,
    );

    TestValidator.predicate(
      "page 2 data size correct",
      resultPage2.data.length <= resultPage2.pagination.limit,
    );

    for (const item of resultPage2.data) {
      typia.assert(item);
      TestValidator.predicate(
        "page 2 job series code is non-empty",
        typeof item.code === "string" && item.code.length > 0,
      );
      TestValidator.predicate(
        "page 2 job series name is non-empty",
        typeof item.name === "string" && item.name.length > 0,
      );
    }
  }
}
