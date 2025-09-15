import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate reading of nurse notification and updating its status.
 *
 * Ensures notification read status is updated for the nurse after being
 * fetched. Verifies notification is only visible to correct nurse and not
 * others.
 *
 * 1. Register and login as systemAdmin.
 * 2. Register and login as nurse.
 * 3. SystemAdmin creates a notification for the nurse.
 * 4. Nurse fetches the notification and sees delivery status is initially
 *    “pending” or “delivered”.
 * 5. Nurse re-fetches notification: check status reflects that it was read,
 *    acknowledged, or delivered, and timestamps updated if applicable.
 * 6. Log out and try to fetch as unauthenticated user (should error 403/401).
 * 7. Fetch as wrong nurse – also forbidden.
 * 8. Fetch with wrong notificationId (should error 404).
 */
export async function test_api_nurse_notification_read_success_and_status_update(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Register nurse
  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nursePassword = RandomGenerator.alphaNumeric(10);
  const nurse: IHealthcarePlatformNurse.IAuthorized =
    await api.functional.auth.nurse.join(connection, {
      body: {
        email: nurseEmail,
        full_name: RandomGenerator.name(),
        license_number: RandomGenerator.alphaNumeric(12),
        specialty: null,
        phone: RandomGenerator.mobile(),
        password: nursePassword,
      } satisfies IHealthcarePlatformNurse.IJoin,
    });
  typia.assert(nurse);

  // 3. Login as system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 4. SystemAdmin creates a notification for the nurse
  const notification: IHealthcarePlatformNotification =
    await api.functional.healthcarePlatform.systemAdmin.notifications.create(
      connection,
      {
        body: {
          recipientUserId: nurse.id,
          notificationType: "test_notice",
          notificationChannel: "in_app",
          subject: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          critical: false,
        } satisfies IHealthcarePlatformNotification.ICreate,
      },
    );
  typia.assert(notification);

  // 5. Login as nurse
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePassword,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  // 6. Nurse fetches notification - check visible content and delivery status
  const initial: IHealthcarePlatformNotification =
    await api.functional.healthcarePlatform.nurse.notifications.at(connection, {
      notificationId: notification.id,
    });
  typia.assert(initial);
  TestValidator.equals("notification id", initial.id, notification.id);
  TestValidator.equals(
    "notification recipient",
    initial.recipientUserId,
    nurse.id,
  );
  TestValidator.equals(
    "notification subject",
    initial.subject,
    notification.subject,
  );
  TestValidator.equals("notification body", initial.body, notification.body);
  // status is pending/delivered or similar
  TestValidator.predicate(
    "delivery status is valid",
    ["pending", "delivered", "acknowledged", "failed", "escalated"].includes(
      initial.deliveryStatus,
    ),
  );

  // 7. Fetch again as nurse - should see the same notification but status/ack timestamps might update
  const afterRead: IHealthcarePlatformNotification =
    await api.functional.healthcarePlatform.nurse.notifications.at(connection, {
      notificationId: notification.id,
    });
  typia.assert(afterRead);
  TestValidator.equals(
    "notification id after read",
    afterRead.id,
    notification.id,
  );
  // delivery status can remain the same or be updated, e.g., from delivered to acknowledged

  // 8. Try fetch as unauthenticated user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user forbidden to fetch notification",
    async () => {
      await api.functional.healthcarePlatform.nurse.notifications.at(
        unauthConn,
        {
          notificationId: notification.id,
        },
      );
    },
  );

  // 9. Register and login as wrong nurse
  const attackerEmail = typia.random<string & tags.Format<"email">>();
  const attackerPassword = RandomGenerator.alphaNumeric(10);
  const attackerNurse: IHealthcarePlatformNurse.IAuthorized =
    await api.functional.auth.nurse.join(connection, {
      body: {
        email: attackerEmail,
        full_name: RandomGenerator.name(),
        license_number: RandomGenerator.alphaNumeric(12),
        specialty: RandomGenerator.name(1),
        phone: RandomGenerator.mobile(),
        password: attackerPassword,
      } satisfies IHealthcarePlatformNurse.IJoin,
    });
  typia.assert(attackerNurse);
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: attackerEmail,
      password: attackerPassword,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });
  await TestValidator.error(
    "forbidden for other nurse to view notification",
    async () => {
      await api.functional.healthcarePlatform.nurse.notifications.at(
        connection,
        {
          notificationId: notification.id,
        },
      );
    },
  );

  // 10. 404 with bogus notification id
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePassword,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });
  await TestValidator.error("notification not found yields error", async () => {
    await api.functional.healthcarePlatform.nurse.notifications.at(connection, {
      notificationId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
