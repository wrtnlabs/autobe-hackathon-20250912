import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotification";
import type { IAtsRecruitmentNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationDelivery";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate system administrator's ability to retrieve notification delivery
 * details (GET
 * /atsRecruitment/systemAdmin/notifications/{notificationId}/deliveries/{deliveryId})
 *
 * 1. Register and authenticate as a system administrator (super_admin: true).
 * 2. Create a notification as the admin and receive its UUID (notificationId).
 * 3. Under this notification, create a delivery record and get its deliveryId
 *    and associated data.
 * 4. Fetch the delivery detail via the system admin detail endpoint using
 *    valid IDs, asserting full correctness for audit fields and delivery
 *    properties.
 * 5. Attempt to fetch a non-existent deliveryId and assert a not-found error
 *    is raised.
 *
 * Checks both successful operational retrieval and error response for
 * traceability in audit compliance.
 */
export async function test_api_notification_delivery_detail_for_system_admin_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a system administrator
  const sysadminJoinReq = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    super_admin: true,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const sysadminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: sysadminJoinReq,
  });
  typia.assert(sysadminAuth);

  // 2. Create the notification as system admin
  const notificationReq = {
    recipient_systemadmin_id: sysadminAuth.id,
    event_type: RandomGenerator.pick([
      "system_alert",
      "application_status_update",
      "export_complete",
      "interview_scheduled",
    ] as const),
    reference_table: "ats_recruitment_applications",
    reference_id: typia.random<string & tags.Format<"uuid">>(),
    status: "pending",
    // Optionally include payload_json for richer cases
    payload_json: JSON.stringify({
      info: RandomGenerator.paragraph({ sentences: 2 }),
    }),
  } satisfies IAtsRecruitmentNotification.ICreate;
  const notification = await api.functional.atsRecruitment.notifications.create(
    connection,
    { body: notificationReq },
  );
  typia.assert(notification);

  // 3. Create delivery under that notification
  const deliveryReq = {
    notification_id: notification.id,
    delivery_channel: RandomGenerator.pick([
      "email",
      "sms",
      "app_push",
      "webhook",
    ] as const),
    recipient_address: RandomGenerator.alphabets(5) + "@company.com",
    delivery_status: RandomGenerator.pick([
      "initiated",
      "sent",
      "delivered",
      "failed",
      "cancelled",
    ] as const),
    delivery_result_detail: RandomGenerator.paragraph({ sentences: 2 }),
    delivered_at: null,
    failed_at: null,
    delivery_attempt: 1,
  } satisfies IAtsRecruitmentNotificationDelivery.ICreate;
  const delivery =
    await api.functional.atsRecruitment.systemAdmin.notifications.deliveries.create(
      connection,
      {
        notificationId: notification.id,
        body: deliveryReq,
      },
    );
  typia.assert(delivery);

  // 4. Fetch delivery detail with correct IDs, verify all properties
  const fetchedDelivery =
    await api.functional.atsRecruitment.systemAdmin.notifications.deliveries.at(
      connection,
      {
        notificationId: notification.id,
        deliveryId: delivery.id,
      },
    );
  typia.assert(fetchedDelivery);
  TestValidator.equals("delivery.id matches", fetchedDelivery.id, delivery.id);
  TestValidator.equals(
    "delivery.notification_id matches",
    fetchedDelivery.notification_id,
    notification.id,
  );
  TestValidator.equals(
    "delivery_channel matches",
    fetchedDelivery.delivery_channel,
    deliveryReq.delivery_channel,
  );
  TestValidator.equals(
    "recipient_address matches",
    fetchedDelivery.recipient_address,
    deliveryReq.recipient_address,
  );
  TestValidator.equals(
    "delivery_status matches",
    fetchedDelivery.delivery_status,
    deliveryReq.delivery_status,
  );
  TestValidator.equals(
    "delivery_result_detail matches",
    fetchedDelivery.delivery_result_detail,
    deliveryReq.delivery_result_detail,
  );
  TestValidator.equals(
    "delivery_attempt matches",
    fetchedDelivery.delivery_attempt,
    deliveryReq.delivery_attempt,
  );
  // Timestamps etc. present and non-null
  TestValidator.predicate(
    "created_at is present",
    typeof fetchedDelivery.created_at === "string" &&
      fetchedDelivery.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof fetchedDelivery.updated_at === "string" &&
      fetchedDelivery.updated_at.length > 0,
  );

  // 5. Attempt to fetch with incorrect (random) deliveryId: should fail
  await TestValidator.error(
    "fetching non-existent deliveryId triggers not-found",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.notifications.deliveries.at(
        connection,
        {
          notificationId: notification.id,
          deliveryId: typia.random<string & tags.Format<"uuid">>(), // Unrelated, random UUID
        },
      );
    },
  );
}
