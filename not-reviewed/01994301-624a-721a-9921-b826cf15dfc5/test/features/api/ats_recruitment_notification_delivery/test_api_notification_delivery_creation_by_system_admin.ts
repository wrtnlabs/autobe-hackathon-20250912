import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotification";
import type { IAtsRecruitmentNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationDelivery";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate system admin ability to create notification delivery attempts.
 *
 * End-to-end workflow:
 *
 * 1. Register and log in as a system administrator.
 * 2. Create a notification record (as the parent notification).
 * 3. Register a new delivery attempt under this notificationId as system
 *    admin.
 * 4. Confirm the return value matches the request and is properly persisted.
 * 5. Attempt to create a delivery with a random, invalid notificationId and
 *    expect error.
 * 6. All delivered entities are checked with full typia.assert().
 * 7. All required delivery fields are set (delivery_channel,
 *    recipient_address, delivery_status, delivery_attempt), and audit
 *    persistence is confirmed by checking the result fields.
 * 8. Negative error scenario is validated to ensure referential integrity is
 *    enforced when notification does not exist.
 */
export async function test_api_notification_delivery_creation_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const adminRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
    super_admin: true,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminRequest,
  });
  typia.assert(admin);

  // 2. Create a notification (for the admin itself as recipient_systemadmin_id)
  const notificationRequest = {
    recipient_systemadmin_id: admin.id,
    event_type: RandomGenerator.alphaNumeric(8),
    reference_table: RandomGenerator.alphaNumeric(8),
    reference_id: typia.random<string & tags.Format<"uuid">>(),
    status: "pending",
  } satisfies IAtsRecruitmentNotification.ICreate;
  const notification = await api.functional.atsRecruitment.notifications.create(
    connection,
    {
      body: notificationRequest,
    },
  );
  typia.assert(notification);
  TestValidator.equals(
    "notification created for system admin",
    notification.recipient_systemadmin_id,
    admin.id,
  );

  // 3. Register a delivery attempt for the notification
  const deliveryRequest = {
    notification_id: notification.id,
    delivery_channel: RandomGenerator.pick([
      "email",
      "sms",
      "app_push",
      "webhook",
    ] as const),
    recipient_address: RandomGenerator.alphaNumeric(10) + "@integration.test",
    delivery_status: RandomGenerator.pick([
      "initiated",
      "sent",
      "delivered",
      "failed",
    ] as const),
    delivery_attempt: 1,
  } satisfies IAtsRecruitmentNotificationDelivery.ICreate;
  const delivery =
    await api.functional.atsRecruitment.systemAdmin.notifications.deliveries.create(
      connection,
      {
        notificationId: notification.id,
        body: deliveryRequest,
      },
    );
  typia.assert(delivery);
  TestValidator.equals(
    "delivery notification_id matches",
    delivery.notification_id,
    notification.id,
  );
  TestValidator.equals(
    "delivery channel matches",
    delivery.delivery_channel,
    deliveryRequest.delivery_channel,
  );
  TestValidator.equals(
    "delivery recipient address matches",
    delivery.recipient_address,
    deliveryRequest.recipient_address,
  );
  TestValidator.equals(
    "delivery attempt matches",
    delivery.delivery_attempt,
    deliveryRequest.delivery_attempt,
  );
  TestValidator.equals(
    "delivery status matches",
    delivery.delivery_status,
    deliveryRequest.delivery_status,
  );

  // 4. Attempt to create a delivery with invalid notificationId and expect error
  await TestValidator.error(
    "error when notificationId does not exist",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.notifications.deliveries.create(
        connection,
        {
          notificationId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            ...deliveryRequest,
            notification_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );
}
