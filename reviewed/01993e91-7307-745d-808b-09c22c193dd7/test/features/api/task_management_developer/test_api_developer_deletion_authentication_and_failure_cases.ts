import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Test the Developer user deletion API for TPM users.
 *
 * This E2E test validates the full lifecycle:
 *
 * 1. Register a new TPM user for authorization.
 * 2. Login as the TPM user to obtain valid JWT tokens.
 * 3. Create a new Developer user with valid fields.
 * 4. Delete the created Developer user with authentication.
 * 5. Attempt deletion of a non-existent Developer user ID, expecting a 404
 *    error.
 * 6. Attempt deletion without authentication, expecting an authorization
 *    failure.
 *
 * It ensures successful creation, proper deletion, and robust error
 * handling for invalid operations, enforcing system security and data
 * integrity.
 */
export async function test_api_developer_deletion_authentication_and_failure_cases(
  connection: api.IConnection,
) {
  // 1. TPM user join
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@test.com`,
    password: "TestPass123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: joinBody });
  typia.assert(tpmUser);

  // 2. TPM user login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const loggedInUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: loginBody });
  typia.assert(loggedInUser);

  // 3. Create Developer user
  const developerCreateBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@developer.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDeveloper.ICreate;
  const developer: ITaskManagementDeveloper =
    await api.functional.taskManagement.tpm.taskManagement.developers.create(
      connection,
      { body: developerCreateBody },
    );
  typia.assert(developer);

  // 4. Delete created Developer user
  await api.functional.taskManagement.tpm.taskManagement.developers.erase(
    connection,
    { id: developer.id },
  );

  // 5. Attempt to delete non-existent Developer user and expect 404 error
  await TestValidator.error(
    "delete non-existent developer should throw 404",
    async () => {
      await api.functional.taskManagement.tpm.taskManagement.developers.erase(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Attempt to delete Developer user without authentication
  // Create a connection that clears headers explicitly for auth removal
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "delete developer without authentication should throw authorization error",
    async () => {
      await api.functional.taskManagement.tpm.taskManagement.developers.erase(
        unauthenticatedConnection,
        { id: developer.id },
      );
    },
  );
}
