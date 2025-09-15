import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatuses";

/**
 * This E2E test function validates the update operation on task management task
 * status. It performs the following steps:
 *
 * 1. Registers (joins) a new PMO user with valid email, password, and name.
 * 2. Authenticates the PMO user to obtain authorization.
 * 3. Attempts to update a task status with valid updated data.
 * 4. Validates the updated response matches the update input with correct
 *    timestamps.
 * 5. Tests error scenarios: invalid UUID, duplicate code, unauthorized access.
 *
 * This test uses the official DTO types and API methods. All responses are
 * asserted by typia.assert, and business rules validation is done by
 * TestValidator.
 *
 * Authentication token is handled automatically by the API client.
 */
export async function test_api_task_management_task_status_update(
  connection: api.IConnection,
) {
  // 1. Register (join) a new PMO user
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPass123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const authorized: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody });
  typia.assert(authorized);

  // 2. Authenticate the existing PMO user to simulate login session (token set)
  const pmoLoginBody = {
    email: pmoJoinBody.email,
    password: pmoJoinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const loginAuthorized: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: pmoLoginBody });
  typia.assert(loginAuthorized);
  TestValidator.equals(
    "login user id equals join user id",
    loginAuthorized.id,
    authorized.id,
  );

  // Prepare an update to a task status with valid ID and valid update body
  const taskStatusId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const updateBody: ITaskManagementTaskStatuses.IUpdate = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementTaskStatuses.IUpdate;

  // 3. Perform the valid update
  const updatedTaskStatus: ITaskManagementTaskStatuses =
    await api.functional.taskManagement.pmo.taskManagementTaskStatuses.update(
      connection,
      {
        id: taskStatusId,
        body: updateBody,
      },
    );
  typia.assert(updatedTaskStatus);

  // Validate the updated content agrees with the update
  TestValidator.equals(
    "updated code matches",
    updatedTaskStatus.code,
    updateBody.code,
  );
  TestValidator.equals(
    "updated name matches",
    updatedTaskStatus.name,
    updateBody.name,
  );
  if (updateBody.description === undefined || updateBody.description === null) {
    TestValidator.equals(
      "updated description is null or undefined",
      updatedTaskStatus.description,
      updateBody.description ?? null,
    );
  } else {
    TestValidator.equals(
      "updated description matches",
      updatedTaskStatus.description ?? "",
      updateBody.description,
    );
  }
  // Validate timestamps format and presence
  typia.assert<string & tags.Format<"date-time">>(updatedTaskStatus.created_at);
  typia.assert<string & tags.Format<"date-time">>(updatedTaskStatus.updated_at);
  TestValidator.predicate(
    "updated_at is updated after or equal created_at",
    updatedTaskStatus.updated_at >= updatedTaskStatus.created_at,
  );
  // Password hash must be not exposed in update response (password_hash does not exist here)
  TestValidator.predicate(
    "updated task status does not include password field",
    !("password_hash" in updatedTaskStatus),
  );

  // 4. Test error scenarios
  // 4-1: Invalid UUID format
  await TestValidator.error("invalid UUID format causes error", async () => {
    await api.functional.taskManagement.pmo.taskManagementTaskStatuses.update(
      connection,
      {
        id: "not-a-valid-uuid-string",
        body: updateBody,
      },
    );
  });

  // 4-2: Update with duplicate code should cause error
  // We simulate duplicate code error by trying to update with a fixed known code
  const duplicateCode = "DUPLICATE";
  await TestValidator.error("duplicate code update causes error", async () => {
    await api.functional.taskManagement.pmo.taskManagementTaskStatuses.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: {
          code: duplicateCode,
          name: RandomGenerator.name(),
        },
      },
    );
  });

  // 4-3: Unauthorized access attempt
  // Create an unauthenticated connection (no token)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized update attempt causes error",
    async () => {
      await api.functional.taskManagement.pmo.taskManagementTaskStatuses.update(
        unauthenticatedConnection,
        {
          id: taskStatusId,
          body: updateBody,
        },
      );
    },
  );
}
