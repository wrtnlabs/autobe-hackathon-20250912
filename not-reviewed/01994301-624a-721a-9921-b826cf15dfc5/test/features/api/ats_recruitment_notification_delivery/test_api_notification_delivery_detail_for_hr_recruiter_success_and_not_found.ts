import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotification";
import type { IAtsRecruitmentNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationDelivery";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates retrieval of notification delivery details for HR recruiter.
 *
 * 1. Register and authenticate a System Admin (to permit delivery creation).
 * 2. Register an HR recruiter and authenticate to retrieve their profile.
 * 3. Login as System Admin.
 * 4. Create a notification (with recipient_hrrecruiter_id set to HR's UUID).
 * 5. As System Admin, create a notification delivery for the above
 *    notification.
 * 6. Login as the HR recruiter.
 * 7. Successfully retrieve delivery details using correct
 *    notificationId/deliveryId; assert all response fields.
 * 8. Attempt to retrieve a delivery with a random non-existent deliveryId for
 *    the same notificationId (should error).
 */
export async function test_api_notification_delivery_detail_for_hr_recruiter_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. Register & login as System Admin (for delivery creation privileges).
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: "sysadm1npw!",
        name: RandomGenerator.name(),
        super_admin: false,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register HR recruiter profile.
  const hrEmail: string = typia.random<string & tags.Format<"email">>();
  const hrPassword = "recruiterPw8!";
  const hrRecruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hrEmail,
        password: hrPassword,
        name: RandomGenerator.name(),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(hrRecruiter);

  // 3. Login as System Admin for operational context.
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: "sysadm1npw!",
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });

  // 4. Create a notification for the HR recruiter (recipient_hrrecruiter_id).
  const notification: IAtsRecruitmentNotification =
    await api.functional.atsRecruitment.notifications.create(connection, {
      body: {
        recipient_hrrecruiter_id: hrRecruiter.id,
        event_type: "test-event-type",
        reference_table: "test_table",
        reference_id: typia.random<string & tags.Format<"uuid">>(),
        status: "pending",
      } satisfies IAtsRecruitmentNotification.ICreate,
    });
  typia.assert(notification);

  // 5. Create a delivery for this notification.
  const delivery: IAtsRecruitmentNotificationDelivery =
    await api.functional.atsRecruitment.systemAdmin.notifications.deliveries.create(
      connection,
      {
        notificationId: notification.id,
        body: {
          notification_id: notification.id,
          delivery_channel: "email",
          recipient_address: hrRecruiter.email,
          delivery_status: "sent",
          delivery_attempt: 1,
        } satisfies IAtsRecruitmentNotificationDelivery.ICreate,
      },
    );
  typia.assert(delivery);

  // 6. Login as HR recruiter again.
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 7. Retrieve delivery details as HR recruiter (success).
  const got: IAtsRecruitmentNotificationDelivery =
    await api.functional.atsRecruitment.hrRecruiter.notifications.deliveries.at(
      connection,
      {
        notificationId: notification.id,
        deliveryId: delivery.id,
      },
    );
  typia.assert(got);
  TestValidator.equals("delivery.id matches", got.id, delivery.id);
  TestValidator.equals(
    "notification_id matches",
    got.notification_id,
    delivery.notification_id,
  );
  TestValidator.equals(
    "delivery_channel matches",
    got.delivery_channel,
    delivery.delivery_channel,
  );
  TestValidator.equals(
    "recipient_address matches",
    got.recipient_address,
    delivery.recipient_address,
  );
  TestValidator.equals(
    "delivery_status matches",
    got.delivery_status,
    delivery.delivery_status,
  );
  TestValidator.equals(
    "delivery_attempt matches",
    got.delivery_attempt,
    delivery.delivery_attempt,
  );

  // 8. Attempt to fetch a delivery with a random non-existent deliveryId (expect error).
  await TestValidator.error(
    "should error for non-existent deliveryId",
    async () => {
      const fakeId = typia.random<string & tags.Format<"uuid">>();
      if (fakeId === delivery.id) {
        throw new Error("Generated fakeId should not match real deliveryId");
      }
      await api.functional.atsRecruitment.hrRecruiter.notifications.deliveries.at(
        connection,
        {
          notificationId: notification.id,
          deliveryId: fakeId,
        },
      );
    },
  );
}
