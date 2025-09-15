import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * E2E test for system admin notification deletion on healthcare platform.
 *
 * 1. Register as healthcare platform system admin via
 *    api.functional.auth.systemAdmin.join
 *    (IHealthcarePlatformSystemAdmin.IJoin)
 * 2. Login as the same system admin using
 *    api.functional.auth.systemAdmin.login
 *    (IHealthcarePlatformSystemAdmin.ILogin)
 * 3. Create a notification via
 *    api.functional.healthcarePlatform.systemAdmin.notifications.create
 *    (IHealthcarePlatformNotification.ICreate) and capture its id
 * 4. Delete the notification using
 *    api.functional.healthcarePlatform.systemAdmin.notifications.erase
 *    (notificationId)
 * 5. (Negative check) Attempt to delete the same notification again, and
 *    validate that an error is thrown
 * 6. Attempt to delete a random non-existent notificationId and validate that
 *    an error is thrown
 */
export async function test_api_notification_deletion_by_systemadmin(
  connection: api.IConnection,
) {
  // 1. Register as system admin (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Login as system admin
  const loginBody = {
    email: joinBody.email,
    provider: "local",
    provider_key: joinBody.provider_key,
    password: joinBody.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const loggedIn = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedIn);
  TestValidator.equals(
    "login returns same email as joined",
    loggedIn.email,
    joinBody.email,
  );

  // 3. Create a notification
  const notificationBody = {
    notificationType: RandomGenerator.pick([
      "appointment_reminder",
      "info",
      "system_alert",
    ]),
    notificationChannel: RandomGenerator.pick(["email", "in_app", "sms"]),
    body: RandomGenerator.paragraph({ sentences: 2 }),
    subject: RandomGenerator.name(5),
    critical: RandomGenerator.pick([true, false]),
  } satisfies IHealthcarePlatformNotification.ICreate;
  const notification =
    await api.functional.healthcarePlatform.systemAdmin.notifications.create(
      connection,
      { body: notificationBody },
    );
  typia.assert(notification);
  TestValidator.equals(
    "created notification subject matches input",
    notification.subject,
    notificationBody.subject,
  );

  // 4. Delete the notification by id
  await api.functional.healthcarePlatform.systemAdmin.notifications.erase(
    connection,
    { notificationId: notification.id },
  );

  // 5. Try to delete the same notification again, expect error
  await TestValidator.error(
    "deleting already deleted notification should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.notifications.erase(
        connection,
        { notificationId: notification.id },
      );
    },
  );

  // 6. Attempt to delete a random non-existent notification
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent notification should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.notifications.erase(
        connection,
        { notificationId: randomId },
      );
    },
  );
}
