import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";

export async function test_api_notification_update_read_status_developer(
  connection: api.IConnection,
) {
  // 1. Register Developer user
  const developerEmail = typia.random<string & tags.Format<"email">>();
  const developerPassword = "password123";
  const developerCreate = {
    email: developerEmail,
    password_hash: developerPassword, // Simulate hashed password
    name: RandomGenerator.name(),
    deleted_at: null,
  } satisfies ITaskManagementDeveloper.ICreate;
  const developerAuthorized: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCreate,
    });
  typia.assert(developerAuthorized);

  // 2. Authenticate Developer user
  const developerLogin = {
    email: developerEmail,
    password: developerPassword,
  } satisfies ITaskManagementDeveloper.ILogin;
  const developerLoggedIn: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: developerLogin,
    });
  typia.assert(developerLoggedIn);

  // 3. Prepare a notification object (simulate existing notification)
  const notificationId = typia.random<string & tags.Format<"uuid">>();

  // 4. Update notification read status to true with current ISO datetime
  const updateBody = {
    is_read: true,
    read_at: new Date().toISOString(),
  } satisfies ITaskManagementNotification.IUpdate;

  const notificationUpdated: ITaskManagementNotification =
    await api.functional.taskManagement.developer.notifications.update(
      connection,
      {
        id: notificationId,
        body: updateBody,
      },
    );
  typia.assert(notificationUpdated);

  // Verify the notification has is_read = true and non-null read_at
  TestValidator.equals(
    "notification is_read flag updated to true",
    notificationUpdated.is_read,
    true,
  );
  TestValidator.predicate(
    "notification read_at timestamp is not null",
    notificationUpdated.read_at !== null &&
      notificationUpdated.read_at !== undefined,
  );

  // 5. Test error on invalid notification ID
  await TestValidator.error(
    "updating non-existent notification ID should return 404",
    async () => {
      const fakeId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.taskManagement.developer.notifications.update(
        connection,
        {
          id: fakeId,
          body: updateBody,
        },
      );
    },
  );

  // 6. Test error on unauthorized update attempt
  // Register another Developer
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherPassword = "password123";
  const otherCreate = {
    email: otherEmail,
    password_hash: otherPassword,
    name: RandomGenerator.name(),
    deleted_at: null,
  } satisfies ITaskManagementDeveloper.ICreate;
  const otherDeveloper: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, { body: otherCreate });
  typia.assert(otherDeveloper);

  // Login other Developer
  const otherLogin = {
    email: otherEmail,
    password: otherPassword,
  } satisfies ITaskManagementDeveloper.ILogin;
  const otherDevLoggedIn: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, { body: otherLogin });
  typia.assert(otherDevLoggedIn);

  // Attempt unauthorized update - expect error
  await TestValidator.error(
    "unauthorized developer cannot update another's notification",
    async () => {
      await api.functional.taskManagement.developer.notifications.update(
        connection,
        {
          id: notificationId,
          body: updateBody,
        },
      );
    },
  );
}
