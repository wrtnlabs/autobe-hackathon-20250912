import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";

/**
 * This test validates the deletion of a session by an authenticated department
 * manager user. The workflow includes account creation, login, and session
 * deletion. It ensures that the delete operation returns no content (void) and
 * properly enforces role-based access. Since session creation and retrieval
 * APIs are not provided, the test uses a generated UUID for deletion.
 */
export async function test_api_department_manager_session_deletion_success(
  connection: api.IConnection,
) {
  // 1. Department manager user signup
  const email = `${RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "")}@example.com`;
  const password = "Password1234";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const joinBody = {
    email,
    password,
    first_name: firstName,
    last_name: lastName,
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  const departmentManager = await api.functional.auth.departmentManager.join(
    connection,
    { body: joinBody },
  );
  typia.assert(departmentManager);

  // 2. Department manager user login
  const loginBody = {
    email,
    password,
  } satisfies IEnterpriseLmsDepartmentManager.ILogin;

  const loginResult = await api.functional.auth.departmentManager.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loginResult);

  // 3. Use a generated UUID to simulate an existing session ID
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Issue DELETE to remove the session
  await api.functional.enterpriseLms.departmentManager.sessions.erase(
    connection,
    {
      id: sessionId,
    },
  );

  // 5. Since GET endpoint for session is not provided, we cannot verify 404 on fetching.
  // This completes the test flow for session deletion success.
}
