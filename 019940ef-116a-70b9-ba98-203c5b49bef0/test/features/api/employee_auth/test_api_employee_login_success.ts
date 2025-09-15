import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";

export async function test_api_employee_login_success(
  connection: api.IConnection,
) {
  // 1. Create new employee user (join operation) to obtain valid credentials
  const passwordPlain = "TestPassword123!";
  const passwordHash = await (async () => {
    // Simulate password hashing by generating a random UUID string
    return typia.random<string & tags.Format<"uuid">>();
  })();

  const employeeCreateBody = {
    email: `${RandomGenerator.name(1).toLowerCase()}@company.com`,
    password_hash: passwordHash,
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const joinedEmployee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(joinedEmployee);

  // 2. Use the previously created employee's email and plain password to login
  const loginBody = {
    email: joinedEmployee.email,
    password: passwordPlain,
  } satisfies IJobPerformanceEvalEmployee.ILogin;

  const loggedInEmployee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.login.loginEmployee(connection, {
      body: loginBody,
    });
  typia.assert(loggedInEmployee);

  // 3. Validate issued tokens and identity information
  TestValidator.equals(
    "login: email matches joined employee",
    loggedInEmployee.email,
    joinedEmployee.email,
  );

  TestValidator.predicate(
    "login: access token is a non-empty string",
    typeof loggedInEmployee.access_token === "string" &&
      loggedInEmployee.access_token.length > 0,
  );

  TestValidator.predicate(
    "login: refresh token is a non-empty string",
    typeof loggedInEmployee.refresh_token === "string" &&
      loggedInEmployee.refresh_token.length > 0,
  );

  TestValidator.predicate(
    "login: expires_at is a valid ISO date string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{3})?Z$/.test(
      loggedInEmployee.expires_at ?? "",
    ),
  );

  TestValidator.predicate(
    "login: token property contains access and refresh tokens",
    loggedInEmployee.token !== null &&
      typeof loggedInEmployee.token.access === "string" &&
      loggedInEmployee.token.access.length > 0 &&
      typeof loggedInEmployee.token.refresh === "string" &&
      loggedInEmployee.token.refresh.length > 0,
  );
}
