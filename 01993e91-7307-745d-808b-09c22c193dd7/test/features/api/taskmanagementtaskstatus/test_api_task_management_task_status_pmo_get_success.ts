import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";

/**
 * End-to-end test for retrieving a taskManagementTaskStatus by ID as a PMO
 * user.
 *
 * This test performs the following steps:
 *
 * 1. Register a new PMO user account via the PMO join API.
 * 2. Authenticate the PMO user using the login API.
 * 3. Retrieve a taskManagementTaskStatus by a valid UUID via the "at" GET API.
 * 4. Validate the response against ITaskManagementTaskStatus type.
 * 5. Test error condition for unauthorized access.
 *
 * The test ensures that only authenticated PMO users can access task status
 * details, and that valid UUIDs return the expected data.
 *
 * All calls are awaited and all responses are confirmed using typia.assert
 * to verify full type safety compliance.
 */
export async function test_api_task_management_task_status_pmo_get_success(
  connection: api.IConnection,
) {
  // 1. Register a new PMO user
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: "TestPassword123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: joinBody });
  typia.assert(pmoUser);

  // 2. Login the PMO user
  const loginBody = {
    email: pmoUser.email,
    password: "TestPassword123",
  } satisfies ITaskManagementPmo.ILogin;
  const loginUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: loginBody });
  typia.assert(loginUser);

  // 3. Retrieve a taskManagementTaskStatus using a valid UUID
  const validId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.pmo.taskManagementTaskStatuses.at(
      connection,
      { id: validId },
    );
  typia.assert(taskStatus);

  // 4. Validate expected properties (ID match)
  TestValidator.equals(
    "retrieved ID matches requested UUID",
    taskStatus.id,
    validId,
  );

  // 5. Test unauthorized access (unauthenticated connection)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized access with empty headers",
    async () => {
      await api.functional.taskManagement.pmo.taskManagementTaskStatuses.at(
        unauthenticatedConnection,
        { id: validId },
      );
    },
  );
}
