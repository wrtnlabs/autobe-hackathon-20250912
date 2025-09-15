import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";

export async function test_api_employee_retrieve_by_id_success(
  connection: api.IConnection,
) {
  // Step 1: Create an employee user establishing authentication context
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: createBody,
    });
  typia.assert(employee);

  // Step 2: Retrieve detailed employee info by ID
  const retrieved: IJobPerformanceEvalEmployee =
    await api.functional.jobPerformanceEval.employee.employees.at(connection, {
      id: employee.id,
    });
  typia.assert(retrieved);

  // Step 3: Validate retrieved data against created employee
  TestValidator.equals("employee id matches", retrieved.id, employee.id);
  TestValidator.equals(
    "employee email matches",
    retrieved.email,
    employee.email,
  );
  TestValidator.equals("employee name matches", retrieved.name, employee.name);
  TestValidator.predicate(
    "created_at is a valid string",
    typeof retrieved.created_at === "string" && retrieved.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is a valid string",
    typeof retrieved.updated_at === "string" && retrieved.updated_at.length > 0,
  );
}
