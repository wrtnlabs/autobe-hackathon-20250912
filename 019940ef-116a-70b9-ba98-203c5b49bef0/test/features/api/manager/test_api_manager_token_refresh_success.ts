import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

export async function test_api_manager_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Manager joins the system with valid credentials
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const managerPassword = "securePass1234";
  const managerName = RandomGenerator.name();

  const joinBody = {
    email: managerEmail,
    password: managerPassword,
    name: managerName,
  } satisfies IJobPerformanceEvalManager.ICreate;

  const joinedManager = await api.functional.auth.manager.join(connection, {
    body: joinBody,
  });
  typia.assert(joinedManager);

  // 2. Manager logs in to obtain initial access and refresh tokens
  const loginBody = {
    email: managerEmail,
    password: managerPassword,
  } satisfies IJobPerformanceEvalManager.ILogin;

  const loggedInManager = await api.functional.auth.manager.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedInManager);

  // Validate tokens exist
  TestValidator.predicate(
    "login returns access token",
    loggedInManager.token.access.length > 0,
  );
  TestValidator.predicate(
    "login returns refresh token",
    loggedInManager.token.refresh.length > 0,
  );

  // 3. Use refresh token to refresh manager's JWT tokens
  const refreshBody = {
    refresh_token: loggedInManager.token.refresh,
  } satisfies IJobPerformanceEvalManager.IRefresh;

  const refreshedManager = await api.functional.auth.manager.refresh(
    connection,
    {
      body: refreshBody,
    },
  );
  typia.assert(refreshedManager);

  // Validate refreshed tokens exist
  TestValidator.predicate(
    "refresh returns new access token",
    refreshedManager.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh returns new refresh token",
    refreshedManager.token.refresh.length > 0,
  );

  // Validate tokens have changed; typically refreshed tokens should differ from original
  TestValidator.notEquals(
    "access token should differ after refresh",
    refreshedManager.token.access,
    loggedInManager.token.access,
  );
  TestValidator.notEquals(
    "refresh token should differ after refresh",
    refreshedManager.token.refresh,
    loggedInManager.token.refresh,
  );
}
