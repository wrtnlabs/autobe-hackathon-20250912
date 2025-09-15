import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";

/**
 * Comprehensive end-to-end test for retrieving task management task status
 * details by authenticated Designer user.
 *
 * Scenario steps:
 *
 * 1. Register a new Designer user.
 * 2. Login as the Designer user to obtain authentication tokens.
 * 3. Retrieve a valid existing task status by ID.
 * 4. Validate all properties of the retrieved task status.
 * 5. Test retrieval with invalid ID to confirm error handling.
 * 6. Test access denial for unauthenticated users.
 *
 * Business constraints ensure only authenticated Designers can access this
 * resource.
 */
export async function test_api_task_management_task_status_designer_get_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new Designer user.
  const designerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDesigner.ICreate;

  const designer: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: designerCreate,
    });
  typia.assert(designer);

  // Step 2: Login with the Designer user credentials.
  const loginData = {
    email: designerCreate.email,
    password: designerCreate.password_hash,
  } satisfies ITaskManagementDesigner.ILogin;
  const loggedIn: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.login(connection, {
      body: loginData,
    });
  typia.assert(loggedIn);

  // Step 3: Retrieve a valid existing task status ID.
  // NOTE: Since the existence of data cannot be guaranteed, we use a placeholder UUID.
  // Replace this with a known valid task status ID in the test environment.
  // This is necessary because no listing endpoint is provided.
  const validTaskStatusId =
    "00000000-0000-0000-0000-000000000001" satisfies string &
      tags.Format<"uuid">;

  // Step 4: Retrieve the task status details using the valid ID.
  const validStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.designer.taskManagementTaskStatuses.at(
      connection,
      { id: validTaskStatusId },
    );
  typia.assert(validStatus);

  TestValidator.equals(
    "id matches requested id",
    validStatus.id,
    validTaskStatusId,
  );
  TestValidator.equals("code is string", typeof validStatus.code, "string");
  TestValidator.equals("name is string", typeof validStatus.name, "string");
  if (validStatus.description !== null && validStatus.description !== undefined)
    TestValidator.predicate(
      "description is string",
      typeof validStatus.description === "string",
    );
  TestValidator.predicate(
    "created_at has ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      validStatus.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at has ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      validStatus.updated_at,
    ),
  );

  // Step 5: Test retrieval with an invalid random UUID that should not exist, expect error.
  await TestValidator.error("invalid ID returns error", async () => {
    await api.functional.taskManagement.designer.taskManagementTaskStatuses.at(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // Step 6: Test unauthenticated user access is denied.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthenticated user access denied", async () => {
    await api.functional.taskManagement.designer.taskManagementTaskStatuses.at(
      unauthenticatedConnection,
      { id: validTaskStatusId },
    );
  });
}
