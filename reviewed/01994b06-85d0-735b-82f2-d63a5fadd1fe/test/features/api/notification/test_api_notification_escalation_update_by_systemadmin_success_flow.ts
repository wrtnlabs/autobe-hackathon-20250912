import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEscalationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEscalationEvent";
import type { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * End-to-end test: System admin updates a notification to escalate it.
 * Validates successes and error scenarios by updating escalationEventId and
 * deliveryStatus.
 *
 * 1. Register and login system admin.
 * 2. Create a notification.
 * 3. Create escalation event with reference to notification.
 * 4. Update notification with escalationEventId and change delivery status.
 * 5. Retrieve updated notification and verify changes.
 * 6. Try updating with invalid escalationEventId (expect error).
 * 7. Try updating with invalid notificationId (expect error).
 */
export async function test_api_notification_escalation_update_by_systemadmin_success_flow(
  connection: api.IConnection,
) {
  // 1. System admin join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(2),
    provider: "local",
    provider_key: adminEmail,
    password: RandomGenerator.alphaNumeric(10),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  // 2. System admin login
  const adminLoginBody = {
    email: adminEmail,
    provider: "local",
    provider_key: adminEmail,
    password: adminJoinBody.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const adminSession = await api.functional.auth.systemAdmin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert(adminSession);
  // 3. Create notification
  const notificationCreateBody = {
    notificationType: RandomGenerator.pick([
      "appointment_reminder",
      "incident_alert",
      "audit_compliance_alert",
      "system_broadcast",
      "emergency_warning",
    ] as const),
    notificationChannel: RandomGenerator.pick([
      "in_app",
      "email",
      "sms",
      "push",
      "phone_call",
    ] as const),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    subject: RandomGenerator.paragraph({ sentences: 2 }),
    critical: RandomGenerator.pick([true, false] as const),
  } satisfies IHealthcarePlatformNotification.ICreate;
  const notification =
    await api.functional.healthcarePlatform.systemAdmin.notifications.create(
      connection,
      {
        body: notificationCreateBody,
      },
    );
  typia.assert(notification);
  // 4. Create escalation event (references notification.id)
  const escalationCreateBody = {
    source_notification_id: notification.id,
    escalation_type: "sla_violation",
    escalation_level: RandomGenerator.pick([
      "normal",
      "urgent",
      "critical",
      "info",
    ] as const),
    deadline_at: new Date(Date.now() + 3600 * 1000 * 6).toISOString(),
    resolution_status: "open",
  } satisfies IHealthcarePlatformEscalationEvent.ICreate;
  const escalation =
    await api.functional.healthcarePlatform.systemAdmin.escalationEvents.create(
      connection,
      {
        body: escalationCreateBody,
      },
    );
  typia.assert(escalation);
  // 5. Update notification with escalationEventId, deliveryStatus change, and audit timestamps
  const notificationUpdateBody = {
    escalationEventId: escalation.id,
    deliveryStatus: "escalated",
    acknowledgedAt: new Date().toISOString(),
    snoozedUntil: new Date(Date.now() + 3600 * 1000 * 2).toISOString(),
  } satisfies IHealthcarePlatformNotification.IUpdate;
  const updatedNotification =
    await api.functional.healthcarePlatform.systemAdmin.notifications.update(
      connection,
      {
        notificationId: notification.id,
        body: notificationUpdateBody,
      },
    );
  typia.assert(updatedNotification);
  // 6. Validate: escalationEventId is set, deliveryStatus is 'escalated', acknowledged/snoozed set, updatedAt > createdAt
  TestValidator.equals(
    "escalationEventId",
    updatedNotification.escalationEventId,
    escalation.id,
  );
  TestValidator.equals(
    "deliveryStatus updated",
    updatedNotification.deliveryStatus,
    "escalated",
  );
  TestValidator.equals(
    "acknowledgedAt set",
    updatedNotification.acknowledgedAt,
    notificationUpdateBody.acknowledgedAt,
  );
  TestValidator.equals(
    "snoozedUntil set",
    updatedNotification.snoozedUntil,
    notificationUpdateBody.snoozedUntil,
  );
  TestValidator.predicate(
    "updatedAt is newer than createdAt",
    new Date(updatedNotification.updatedAt).getTime() >
      new Date(updatedNotification.createdAt).getTime(),
  );
  // 7. Error: invalid escalationEventId
  await TestValidator.error(
    "update fails if escalationEventId does not exist",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.notifications.update(
        connection,
        {
          notificationId: notification.id,
          body: {
            escalationEventId: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IHealthcarePlatformNotification.IUpdate,
        },
      );
    },
  );
  // 8. Error: invalid notificationId
  await TestValidator.error(
    "update fails if notificationId does not exist",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.notifications.update(
        connection,
        {
          notificationId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            deliveryStatus: "escalated",
          } satisfies IHealthcarePlatformNotification.IUpdate,
        },
      );
    },
  );
}
