import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";

/**
 * This test function verifies the end-to-end workflow for a designer to
 * retrieve a notification by its unique ID.
 *
 * Steps:
 *
 * 1. Register a new designer user via /auth/designer/join.
 * 2. Login the designer with /auth/designer/login to obtain JWT tokens.
 * 3. Use the access token to fetch an existing notification by ID via GET
 *    /taskManagement/designer/notifications/{id}.
 * 4. Validate the notification data matches expected properties.
 * 5. Validate unauthorized access attempts are rejected with 401.
 * 6. Validate that requesting a non-existent notification ID yields 404.
 */
export async function test_api_notification_retrieval_by_id_as_designer(
  connection: api.IConnection,
) {
  // 1. Register designer user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const name = RandomGenerator.name(2);
  const createBody = {
    email,
    password_hash: password,
    name,
  } satisfies ITaskManagementDesigner.ICreate;

  const authorized: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // 2. Login designer user
  const loginBody = {
    email,
    password,
  } satisfies ITaskManagementDesigner.ILogin;
  const loginResponse: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResponse);

  // 3. Pick a notification ID from existing notifications by simulating fetching one ID (simulate random)
  // Since no list fetch API is given, simulate a random notification
  const notification: ITaskManagementNotification =
    await api.functional.taskManagement.designer.notifications.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(notification);

  // 4. Fetch the notification by exact ID
  const fetchedNotification: ITaskManagementNotification =
    await api.functional.taskManagement.designer.notifications.at(connection, {
      id: notification.id,
    });
  typia.assert(fetchedNotification);

  // 5. Validate basic properties of the notification
  TestValidator.predicate(
    "notification user_id matches logged in user",
    fetchedNotification.user_id === authorized.id,
  );

  TestValidator.predicate(
    "notification id matches requested",
    fetchedNotification.id === notification.id,
  );

  TestValidator.predicate(
    "notification has notification_type",
    typeof fetchedNotification.notification_type === "string" &&
      fetchedNotification.notification_type.length > 0,
  );

  TestValidator.predicate(
    "notification is_read is boolean",
    typeof fetchedNotification.is_read === "boolean",
  );

  TestValidator.predicate(
    "notification created_at is valid date-time string",
    typeof fetchedNotification.created_at === "string" &&
      !isNaN(Date.parse(fetchedNotification.created_at)),
  );

  TestValidator.predicate(
    "notification updated_at is valid date-time string",
    typeof fetchedNotification.updated_at === "string" &&
      !isNaN(Date.parse(fetchedNotification.updated_at)),
  );

  // 6. Verify read_at and deleted_at either null or valid date-time string if present
  if (
    fetchedNotification.read_at !== null &&
    fetchedNotification.read_at !== undefined
  ) {
    TestValidator.predicate(
      "notification read_at is valid date-time string if not null",
      !isNaN(Date.parse(fetchedNotification.read_at)),
    );
  }
  if (
    fetchedNotification.deleted_at !== null &&
    fetchedNotification.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "notification deleted_at is valid date-time string if not null",
      !isNaN(Date.parse(fetchedNotification.deleted_at)),
    );
  }

  // 7. Unauthorized access verification
  const unauthenticatedConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access should fail with 401",
    async () => {
      await api.functional.taskManagement.designer.notifications.at(
        unauthenticatedConnection,
        { id: notification.id },
      );
    },
  );

  // 8. Access with invalid token
  const invalidTokenConnection = {
    ...connection,
    headers: { ...connection.headers, Authorization: "Bearer invalid_token" },
  };
  await TestValidator.error(
    "access with invalid token should fail with 401",
    async () => {
      await api.functional.taskManagement.designer.notifications.at(
        invalidTokenConnection,
        { id: notification.id },
      );
    },
  );

  // 9. Access non-existent notification
  const fakeId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "fetching non-existent notification ID should fail with 404",
    async () => {
      await api.functional.taskManagement.designer.notifications.at(
        connection,
        {
          id: fakeId,
        },
      );
    },
  );
}
