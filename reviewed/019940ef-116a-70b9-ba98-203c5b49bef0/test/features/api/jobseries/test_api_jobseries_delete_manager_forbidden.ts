import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalJobGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroup";
import type { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * This test function verifies that a manager user is forbidden from
 * deleting a job series that belongs to an employee. The test covers
 * authentication and role switching between manager and employee accounts,
 * the creation of necessary entities (job group and job series), and the
 * authorization failure when attempting deletion.
 *
 * Steps:
 *
 * 1. Create manager user and authenticate.
 * 2. Create employee user and authenticate.
 * 3. Manager creates a job group.
 * 4. Employee creates a job series under the job group.
 * 5. Manager attempts to delete the employee’s job series.
 * 6. Assertion verifies that deletion is forbidden by expecting an HTTP error.
 *
 * This confirms that deletion operations respect role-based access controls
 * and prevent unauthorized data modifications.
 */
export async function test_api_jobseries_delete_manager_forbidden(
  connection: api.IConnection,
) {
  // 1. Manager user creation
  const managerEmail: string = typia.random<string & tags.Format<"email">>();
  const managerPassword = "P@ssw0rd!";
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail,
        password: managerPassword,
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager);

  // 2. Employee user creation
  const employeeEmail: string = typia.random<string & tags.Format<"email">>();
  const employeePassword = "E@mployee1";
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: {
        email: employeeEmail,
        password_hash: employeePassword, // The password_hash should be hashed; assuming plain here because test context is stubbed.
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalEmployee.ICreate,
    });
  typia.assert(employee);

  // 3. Manager login to confirm authorization
  await api.functional.auth.manager.login(connection, {
    body: {
      email: managerEmail,
      password: managerPassword,
    } satisfies IJobPerformanceEvalManager.ILogin,
  });

  // 4. Manager creates a job group
  const jobGroup: IJobPerformanceEvalJobGroup =
    await api.functional.jobPerformanceEval.manager.jobGroups.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IJobPerformanceEvalJobGroup.ICreate,
      },
    );
  typia.assert(jobGroup);

  // 5. Employee login to establish employee auth context
  await api.functional.auth.employee.login.loginEmployee(connection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
    } satisfies IJobPerformanceEvalEmployee.ILogin,
  });

  // 6. Employee creates a job series under the job group
  const jobSeriesCreateBody: IJobPerformanceEvalJobSeries.ICreate = {
    job_group_id: typia.random<string & tags.Format<"uuid">>(),
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  };

  // Use a valid job_group_id (UUID) for job series creation
  typia.assert<string & tags.Format<"uuid">>(jobSeriesCreateBody.job_group_id);

  const jobSeries: IJobPerformanceEvalJobSeries =
    await api.functional.jobPerformanceEval.employee.jobGroups.jobSeries.create(
      connection,
      {
        jobGroupId: jobSeriesCreateBody.job_group_id,
        body: jobSeriesCreateBody,
      },
    );
  typia.assert(jobSeries);

  // 7. Switch to manager authentication again
  await api.functional.auth.manager.login(connection, {
    body: {
      email: managerEmail,
      password: managerPassword,
    } satisfies IJobPerformanceEvalManager.ILogin,
  });

  // 8. Manager attempts to delete employee's job series - expect error
  await TestValidator.error(
    "Manager deletion of employee job series is forbidden",
    async () => {
      await api.functional.jobPerformanceEval.employee.jobGroups.jobSeries.erase(
        connection,
        {
          jobGroupId: jobSeries.job_group_id,
          jobSeriesId: jobSeries.id,
        },
      );
    },
  );
}
