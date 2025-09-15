import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";

/**
 * Test that a designer user can retrieve a specific notification preference
 * by ID.
 *
 * The test must cover:
 *
 * 1. Registering a designer user.
 * 2. Logging in as the designer user.
 * 3. Fetching a notification preference by ID.
 * 4. Validating the returned notification preference data matches expected
 *    structure.
 *
 * Authentication tokens are managed automatically by the SDK.
 *
 * Only valid, schema-compliant data is used - no invalid requests or
 * type-errors.
 */
export async function test_api_notification_preference_retrieval_designer(
  connection: api.IConnection,
) {
  // 1. Register a new designer user
  const createBody = {
    email: `designer_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDesigner.ICreate;

  const authorizedDesigner: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, { body: createBody });
  typia.assert(authorizedDesigner);

  // 2. Login with the created designer user
  const loginBody = {
    email: authorizedDesigner.email,
    password: "validPassword123",
  } satisfies ITaskManagementDesigner.ILogin;

  const loggedInDesigner: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.login(connection, { body: loginBody });
  typia.assert(loggedInDesigner);

  // 3. Use the designer's ID as notification preference ID (no create API available)
  const notificationPreferenceId: string = authorizedDesigner.id;

  // 4. Retrieve the notification preference
  const notificationPreference: ITaskManagementNotificationPreferences =
    await api.functional.taskManagement.designer.notificationPreferences.atNotificationPreference(
      connection,
      { id: notificationPreferenceId },
    );
  typia.assert(notificationPreference);

  // 5. Validate the response properties
  TestValidator.equals(
    "Notification preference ID matches",
    notificationPreference.id,
    notificationPreferenceId,
  );
  TestValidator.predicate(
    "user_id is string",
    typeof notificationPreference.user_id === "string",
  );
  TestValidator.predicate(
    "preference_key is string",
    typeof notificationPreference.preference_key === "string",
  );
  TestValidator.predicate(
    "enabled is boolean",
    typeof notificationPreference.enabled === "boolean",
  );
  TestValidator.predicate(
    "delivery_method is string",
    typeof notificationPreference.delivery_method === "string",
  );
  TestValidator.predicate(
    "created_at is string",
    typeof notificationPreference.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is string",
    typeof notificationPreference.updated_at === "string",
  );
  TestValidator.predicate(
    "deleted_at is null or string",
    notificationPreference.deleted_at === null ||
      typeof notificationPreference.deleted_at === "string",
  );
}
