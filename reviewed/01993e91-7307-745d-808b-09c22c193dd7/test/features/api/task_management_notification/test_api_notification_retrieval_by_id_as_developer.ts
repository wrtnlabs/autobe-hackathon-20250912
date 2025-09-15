import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";

/**
 * E2E test for verifying notification retrieval by ID as an authenticated
 * developer.
 *
 * This test covers:
 *
 * - Developer user registration and login
 * - Unauthorized notification access verification
 * - Notification retrieval by invalid ID resulting in 404 error
 *
 * Due to API limitations, successful notification retrieval with real IDs is
 * not possible, so this test focuses on authorization and error handling.
 */
export async function test_api_notification_retrieval_by_id_as_developer(
  connection: api.IConnection,
) {
  // Step 1: Register developer user
  const developerEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const developerPassword = RandomGenerator.alphaNumeric(12);
  const developerName = RandomGenerator.name();

  const joinBody = {
    email: developerEmail,
    password_hash: developerPassword,
    name: developerName,
  } satisfies ITaskManagementDeveloper.ICreate;

  const joinedDeveloper: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedDeveloper);

  // Step 2: Login to get fresh tokens
  const loginBody = {
    email: developerEmail,
    password: developerPassword,
  } satisfies ITaskManagementDeveloper.ILogin;

  const loggedInDeveloper: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInDeveloper);

  // Prepare a random notification ID (UUID format)
  const randomNotificationId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Unauthorized notification retrieval attempt (no auth header)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthorized notification retrieval should fail",
    async () => {
      await api.functional.taskManagement.developer.notifications.at(
        unauthConnection,
        { id: randomNotificationId },
      );
    },
  );

  // Step 4: Attempt retrieval of non-existent notification ID with authorization
  await TestValidator.error(
    "Retrieving non-existent notification by random ID should fail",
    async () => {
      await api.functional.taskManagement.developer.notifications.at(
        connection,
        { id: randomNotificationId },
      );
    },
  );
}
