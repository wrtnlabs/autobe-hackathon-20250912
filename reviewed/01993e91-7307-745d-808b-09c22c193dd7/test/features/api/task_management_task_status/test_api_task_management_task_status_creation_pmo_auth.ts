import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";

/**
 * Test task status creation endpoint for PMO user role authorization and
 * validation.
 *
 * This test performs the following steps in order:
 *
 * 1. Register a new PMO user with a realistic email, password, and name.
 * 2. Login with the registered PMO user to authenticate.
 * 3. Create a new task status record with a unique code and name, optionally
 *    adding a description.
 * 4. Validate that the API returns a fully populated task status including id,
 *    timestamps, and provided values.
 * 5. Attempt to create another task status with the same unique code and
 *    expect an error due to code duplication.
 *
 * The test ensures the business logic of uniqueness, authorization, data
 * integrity, and required fields is properly handled. It uses typia and
 * RandomGenerator for data creation and validation. The connection object’s
 * headers are never manipulated directly; authentication tokens are handled
 * internally by the SDK.
 */
export async function test_api_task_management_task_status_creation_pmo_auth(
  connection: api.IConnection,
) {
  // 1. Register a new PMO user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: joinBody });
  typia.assert(pmoUser);

  // 2. Login with the registered PMO user
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const loggedInUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: loginBody });
  typia.assert(loggedInUser);

  // Prepare unique code and name for task status creation
  const uniqueCode = `code_${RandomGenerator.alphaNumeric(8)}`;
  const statusCreateBody = {
    code: uniqueCode,
    name: `Name ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 })}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementTaskStatus.ICreate;

  // 3. Create a new task status
  const createdStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.pmo.taskManagementTaskStatuses.create(
      connection,
      { body: statusCreateBody },
    );
  typia.assert(createdStatus);

  TestValidator.equals(
    "task status code matches input",
    createdStatus.code,
    statusCreateBody.code,
  );
  TestValidator.equals(
    "task status name matches input",
    createdStatus.name,
    statusCreateBody.name,
  );
  TestValidator.equals(
    "task status description matches input",
    createdStatus.description,
    statusCreateBody.description,
  );

  // 4. Attempt to create another task status with same code (should error)
  await TestValidator.error("should not allow duplicate code", async () => {
    await api.functional.taskManagement.pmo.taskManagementTaskStatuses.create(
      connection,
      { body: statusCreateBody },
    );
  });
}
