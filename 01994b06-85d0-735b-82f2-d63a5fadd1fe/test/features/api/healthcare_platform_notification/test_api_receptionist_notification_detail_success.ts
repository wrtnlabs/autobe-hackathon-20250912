import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test successful receptionist retrieval of notification details.
 *
 * This test checks whether a receptionist, after proper account creation
 * and authentication, is able to retrieve details about a notification
 * targeted specifically at them and their organization. The workflow
 * validates both data correctness and appropriate access control boundaries
 * in a multi-actor context. All major business logic paths—for account
 * creation, authentication, notification generation by an admin, role
 * switching, and notification detail retrieval—are covered.
 *
 * Steps:
 *
 * 1. System admin creates their account (using unique email and full_name)
 * 2. System admin logs in (for correct token context)
 * 3. Receptionist registers (unique email, full_name)
 * 4. Receptionist logs in and captures user ID/organizationId
 * 5. Switch auth context back to system admin
 * 6. System admin issues a notification to the receptionist and their org
 *    using /healthcarePlatform/systemAdmin/notifications (recipientUserId=
 *    receptionistId, organizationId)
 * 7. Switch context to receptionist (log in to ensure auth context is
 *    receptionist)
 * 8. Receptionist queries
 *    /healthcarePlatform/receptionist/notifications/{notificationId} using
 *    the notification's ID
 * 9. Validate the API response: data must match the notification created,
 *    ensure all business key fields are present, and validate that proper
 *    context access was granted.
 */
export async function test_api_receptionist_notification_detail_success(
  connection: api.IConnection,
) {
  // Password constants for account consistency:
  const sysAdminPassword = "P@ssw0rd123";
  const receptionistPassword = RandomGenerator.alphaNumeric(12);

  // 1. System admin creates account
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminJoin);

  // 2. System admin logs in (tokens might be auto-set but reinforce for deterministic context)
  const sysAdminLogin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: sysAdminEmail,
        provider: "local",
        provider_key: sysAdminEmail,
        password: sysAdminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    },
  );
  typia.assert(sysAdminLogin);

  // 3. Receptionist registers
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistJoin = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: receptionistEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    },
  );
  typia.assert(receptionistJoin);

  // 4. Receptionist logs in (login requires a password; in a true flow, password would be set by receptionist, here we pick one for test and use consistently)
  const receptionistLogin = await api.functional.auth.receptionist.login(
    connection,
    {
      body: {
        email: receptionistEmail,
        password: receptionistPassword,
      } satisfies IHealthcarePlatformReceptionist.ILogin,
    },
  );
  typia.assert(receptionistLogin);
  const receptionistId = receptionistLogin.id;

  // 5. Switch back to system admin for notification issuance
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 6. System admin creates notification for this receptionist
  const notificationBody = {
    recipientUserId: receptionistId,
    notificationType: "appointment_reminder",
    notificationChannel: "in_app",
    subject: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    critical: false,
  } satisfies IHealthcarePlatformNotification.ICreate;
  const notification =
    await api.functional.healthcarePlatform.systemAdmin.notifications.create(
      connection,
      {
        body: notificationBody,
      },
    );
  typia.assert(notification);

  // 7. Switch context to receptionist
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 8. Receptionist fetches notification detail
  const detail =
    await api.functional.healthcarePlatform.receptionist.notifications.at(
      connection,
      {
        notificationId: notification.id,
      },
    );
  typia.assert(detail);

  // 9. Validate returned notification matches original
  TestValidator.equals("notification id matches", detail.id, notification.id);
  TestValidator.equals(
    "recipient matches receptionist",
    detail.recipientUserId,
    receptionistId,
  );
  TestValidator.equals("content matches", detail.body, notificationBody.body);
  TestValidator.equals(
    "subject matches",
    detail.subject,
    notificationBody.subject,
  );
  TestValidator.equals(
    "notification type matches",
    detail.notificationType,
    notificationBody.notificationType,
  );
  TestValidator.equals(
    "channel matches",
    detail.notificationChannel,
    notificationBody.notificationChannel,
  );
  TestValidator.equals(
    "critical flag matches",
    detail.critical,
    notificationBody.critical,
  );
  TestValidator.equals(
    "delivery status is string",
    typeof detail.deliveryStatus,
    "string",
  );
  TestValidator.predicate(
    "delivery attempts is int32",
    Number.isInteger(detail.deliveryAttempts),
  );
}
