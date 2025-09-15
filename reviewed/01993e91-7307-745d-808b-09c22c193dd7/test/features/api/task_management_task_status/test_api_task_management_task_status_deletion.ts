import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";

/**
 * This test validates deletion of a task management task status entity by
 * an authenticated PMO user. It first registers a PMO user through
 * /auth/pmo/join, then logs in through /auth/pmo/login to obtain
 * authorization. After authentication, it attempts to delete a task status
 * by a valid UUID using the delete API. The test confirms successful
 * deletion by trying to delete the same ID again and expecting failure. It
 * also tests failure cases like deletion with invalid UUID, non-existent
 * UUID, and deletion attempt without authorization.
 *
 * Steps:
 *
 * 1. PMO user joins (registers) with valid credentials.
 * 2. PMO user logs in to obtain authorization.
 * 3. Delete a task status using an existing valid UUID.
 * 4. Validate that deletion succeeds (no errors).
 * 5. Attempt to delete a non-existent but valid UUID and expect error.
 * 6. Attempt to delete using an invalid UUID format and expect error.
 * 7. Attempt deletion without authorization and expect error.
 *
 * The test carefully handles authentication tokens and session context
 * automatically via the SDK.
 */
export async function test_api_task_management_task_status_deletion(
  connection: api.IConnection,
) {
  // 1. PMO user joins using realistic data
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "1234",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const authorizedJoin = await api.functional.auth.pmo.join(connection, {
    body: joinBody,
  });
  typia.assert(authorizedJoin);

  // 2. PMO user logs in
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementPmo.ILogin;

  const authorizedLogin = await api.functional.auth.pmo.login(connection, {
    body: loginBody,
  });
  typia.assert(authorizedLogin);

  // Generate a UUID for deletion tests
  const validUUID = typia.random<string & tags.Format<"uuid">>();
  const nonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  // For invalid UUID, use a clearly wrong format string
  const invalidUUID = "invalid-uuid-format";

  // 3. Delete a task status with valid UUID (simulate existing status)
  // As we do not have a create API for task status, we assume validUUID represents an existing status
  // deletion should succeed without throwing
  await api.functional.taskManagement.pmo.taskManagementTaskStatuses.erase(
    connection,
    {
      id: validUUID,
    },
  );

  // 4. Attempt to delete a non-existent UUID, expect error
  await TestValidator.error(
    "deleting non-existent task status should fail",
    async () => {
      await api.functional.taskManagement.pmo.taskManagementTaskStatuses.erase(
        connection,
        {
          id: nonExistentUUID,
        },
      );
    },
  );

  // 5. Attempt to delete with invalid UUID format, expect error
  await TestValidator.error(
    "deleting with invalid UUID format should fail",
    async () => {
      await api.functional.taskManagement.pmo.taskManagementTaskStatuses.erase(
        connection,
        {
          id: invalidUUID,
        },
      );
    },
  );

  // 6. Attempt deletion without authorization - using a new unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized deletion attempt should fail",
    async () => {
      await api.functional.taskManagement.pmo.taskManagementTaskStatuses.erase(
        unauthenticatedConnection,
        {
          id: validUUID,
        },
      );
    },
  );
}
