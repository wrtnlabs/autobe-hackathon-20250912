import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";

/**
 * Validates the successful retrieval of a specific taskManagementTaskStatus
 * detail by its unique ID for an authenticated Project Manager (PM) user.
 *
 * This test covers:
 *
 * 1. Registration of a new PM user with valid credentials.
 * 2. Login of the newly created PM user to obtain authentication token.
 * 3. Retrieval of taskManagementTaskStatus details using the authenticated
 *    session.
 * 4. Verification of the response's key properties for correctness and format.
 *
 * Business rules:
 *
 * - Only authenticated PM users can access task status details.
 * - The status must exist and have valid properties.
 */
export async function test_api_task_management_task_status_get_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new PM user
  const pmCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPassword123!",
    name: RandomGenerator.name(3),
  } satisfies ITaskManagementPm.ICreate;
  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmCreateBody });
  typia.assert(pmAuthorized);

  // Step 2: Login as the same PM user
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;
  const pmLoginAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, { body: pmLoginBody });
  typia.assert(pmLoginAuthorized);

  // Step 3: Retrieve taskManagementTaskStatus detail by valid UUID
  const taskStatusId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.pm.taskManagementTaskStatuses.at(
      connection,
      { id: taskStatusId },
    );
  typia.assert(taskStatus);

  // Step 4: Verify that response properties exist and are valid
  TestValidator.predicate(
    "taskStatus.id is a valid UUID",
    typeof taskStatus.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        taskStatus.id,
      ),
  );
  TestValidator.predicate(
    "taskStatus.code is non-empty string",
    typeof taskStatus.code === "string" && taskStatus.code.length > 0,
  );
  TestValidator.predicate(
    "taskStatus.name is non-empty string",
    typeof taskStatus.name === "string" && taskStatus.name.length > 0,
  );
  TestValidator.predicate(
    "taskStatus.created_at is ISO 8601 date-time format",
    typeof taskStatus.created_at === "string" &&
      !Number.isNaN(Date.parse(taskStatus.created_at)),
  );
  TestValidator.predicate(
    "taskStatus.updated_at is ISO 8601 date-time format",
    typeof taskStatus.updated_at === "string" &&
      !Number.isNaN(Date.parse(taskStatus.updated_at)),
  );
}
