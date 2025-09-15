import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";

/**
 * This E2E test validates the PMO (Project Management Officer) role-based
 * authentication and the deletion of a Developer user.
 *
 * It performs the following steps:
 *
 * 1. Registers a PMO user via /auth/pmo/join
 * 2. Logs in the PMO user via /auth/pmo/login
 * 3. Creates a Developer user via /taskManagement/pmo/taskManagement/developers
 * 4. Deletes the created Developer user via DELETE
 *    /taskManagement/pmo/taskManagement/developers/{id}
 * 5. Verifies invalid deletion scenarios:
 *
 * - Deletion with non-existent ID
 * - Deletion without authentication
 * - Deletion with invalid authentication token
 *
 * Throughout the test, all response data is validated with typia.assert. Error
 * conditions are validated using TestValidator.error with proper descriptive
 * titles.
 */
export async function test_api_developer_deletion_with_pmo_authentication_and_error_handling(
  connection: api.IConnection,
) {
  // 1. PMO user registration
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPass123@",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const pmoAuthorized = await api.functional.auth.pmo.join(connection, {
    body: pmoJoinBody,
  });
  typia.assert(pmoAuthorized);

  // 2. PMO user login
  const pmoLoginBody = {
    email: pmoJoinBody.email,
    password: pmoJoinBody.password,
  } satisfies ITaskManagementPmo.ILogin;

  const pmoLoginAuthorized = await api.functional.auth.pmo.login(connection, {
    body: pmoLoginBody,
  });
  typia.assert(pmoLoginAuthorized);

  // 3. Create Developer user for deletion
  const developerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: typia.random<string>(),
    name: RandomGenerator.name(),
    deleted_at: null,
  } satisfies ITaskManagementDeveloper.ICreate;

  const developer =
    await api.functional.taskManagement.pmo.taskManagement.developers.create(
      connection,
      { body: developerCreateBody },
    );
  typia.assert(developer);

  // 4. Delete the created Developer user by ID
  await api.functional.taskManagement.pmo.taskManagement.developers.erase(
    connection,
    { id: developer.id },
  );

  // 5a. Negative test - delete with non-existent UUID should error
  await TestValidator.error(
    "deletion with non-existent developer ID should fail",
    async () => {
      await api.functional.taskManagement.pmo.taskManagement.developers.erase(
        connection,
        { id: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );

  // 5b. Negative test - deletion without auth token should throw error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "deletion without authentication should fail",
    async () => {
      await api.functional.taskManagement.pmo.taskManagement.developers.erase(
        unauthConn,
        { id: developer.id },
      );
    },
  );

  // 5c. Negative test - deletion with invalid token should throw error
  const badTokenConn: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer invalidtoken" },
  };
  await TestValidator.error(
    "deletion with invalid token should fail",
    async () => {
      await api.functional.taskManagement.pmo.taskManagement.developers.erase(
        badTokenConn,
        { id: developer.id },
      );
    },
  );
}
