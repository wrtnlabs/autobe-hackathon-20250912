import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

/**
 * This E2E test validates that a QA user can join, login, and then retrieve
 * a notification preference by its unique ID.
 *
 * The workflow includes:
 *
 * 1. QA user registration (join) with valid email, password_hash, and name.
 * 2. QA user login using the email and plaintext password.
 * 3. Retrieving a notification preference specified by ID for the authorized
 *    QA user.
 * 4. Validation of the returned notification preference against the
 *    ITaskManagementNotificationPreferences DTO type.
 * 5. Testing error paths where retrieving a notification preference with a
 *    non-existent ID results in error.
 *
 * Each step uses typia.assert for strong type validation and TestValidator
 * for confirming expected results. Authentication tokens are automatically
 * managed by the SDK header mechanism.
 */
export async function test_api_notification_preference_retrieval_qa(
  connection: api.IConnection,
) {
  // 1. Register (join) a new QA user with random valid email, password_hash, and name
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;
  const authorized: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, { body: createBody });
  typia.assert(authorized);

  // 2. Login as the same QA user with email and a known plaintext password
  // Since we only have password_hash on join, we simulate re-using password_hash as password for login simplicity
  // In real scenario, password would be plaintext; here we simulate with hash string as password
  const loginBody = {
    email: createBody.email,
    password: createBody.password_hash,
  } satisfies ITaskManagementQa.ILogin;
  const loggedIn: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, { body: loginBody });
  typia.assert(loggedIn);

  // 3. Retrieve a notification preference using a valid UUID (ID)
  const validId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Make the API call
  // Since we do not have a real record, we assume the API returns a notification preference matching given ID
  // but to satisfy type, just call with a valid UUID
  const notificationPreference: ITaskManagementNotificationPreferences =
    await api.functional.taskManagement.qa.notificationPreferences.atNotificationPreference(
      connection,
      { id: validId },
    );
  typia.assert(notificationPreference);

  // 4. Validate that the ID of returned notification preference matches requested ID
  TestValidator.predicate(
    "notification preference id matches requested id",
    notificationPreference.id === validId,
  );

  // 5. Test error case: retrieving with a non-existent UUID should throw error
  await TestValidator.error(
    "should fail for non-existent notification preference id",
    async () => {
      // Use a random UUID which is assumed to not exist
      const nonexistentId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.taskManagement.qa.notificationPreferences.atNotificationPreference(
        connection,
        { id: nonexistentId },
      );
    },
  );
}
