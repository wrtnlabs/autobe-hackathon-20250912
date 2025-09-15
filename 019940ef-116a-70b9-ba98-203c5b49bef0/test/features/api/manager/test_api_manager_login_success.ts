import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

export async function test_api_manager_login_success(
  connection: api.IConnection,
) {
  // 1. Create a new manager user via join API with valid email, password, and name
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();

  const joinBody = {
    email: email,
    password: password,
    name: name,
  } satisfies IJobPerformanceEvalManager.ICreate;

  // Call the join API
  const joinResponse: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: joinBody,
    });
  typia.assert(joinResponse);

  // Validate join response fields
  TestValidator.equals(
    "join response email matches request",
    joinResponse.email,
    email,
  );
  TestValidator.equals(
    "join response name matches request",
    joinResponse.name,
    name,
  );
  TestValidator.predicate(
    "join response id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      joinResponse.id,
    ),
  );
  TestValidator.predicate(
    "join response token.access is non-empty string",
    typeof joinResponse.token.access === "string" &&
      joinResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "join response token.refresh is non-empty string",
    typeof joinResponse.token.refresh === "string" &&
      joinResponse.token.refresh.length > 0,
  );

  // 2. Login with the same manager credentials
  const loginBody = {
    email: email,
    password: password,
  } satisfies IJobPerformanceEvalManager.ILogin;

  const loginResponse: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResponse);

  // Validate login response fields
  TestValidator.equals(
    "login response id matches join response",
    loginResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "login response email matches join response",
    loginResponse.email,
    joinResponse.email,
  );
  TestValidator.predicate(
    "login response token.access is non-empty string",
    typeof loginResponse.token.access === "string" &&
      loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login response token.refresh is non-empty string",
    typeof loginResponse.token.refresh === "string" &&
      loginResponse.token.refresh.length > 0,
  );
}
