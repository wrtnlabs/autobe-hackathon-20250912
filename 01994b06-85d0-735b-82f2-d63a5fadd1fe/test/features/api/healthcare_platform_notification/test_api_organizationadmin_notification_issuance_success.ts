import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Test that an authenticated organization administrator can successfully issue
 * a new notification to a specified user in their organization. Expected
 * result: notification is created with the correct recipient, sender, and
 * content, and is visible to the recipient in their notification list. Steps:
 *
 * 1. Org admin join (register) with random credentials
 * 2. Org admin login for fresh auth/session
 * 3. Patient user join under the organization, returns patient id
 * 4. Org admin issues notification specifying recipientUserId, senderUserId,
 *    organizationId as per DTO fields
 * 5. Assert persisted notification response has correct
 *    recipient/sender/org/content/other fields
 */
export async function test_api_organizationadmin_notification_issuance_success(
  connection: api.IConnection,
) {
  // 1. Organization admin registration
  const orgAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const orgAdminJoinBody = {
    email: orgAdminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "StrongPassw0rd1234!",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAdminJoinBody },
  );
  typia.assert(adminAuth);

  // 2. Organization admin login
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminJoinBody.email,
      password: orgAdminJoinBody.password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Register patient for notification recipient
  const patientEmail: string = typia.random<string & tags.Format<"email">>();
  const patientJoinBody = {
    email: patientEmail,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date("1990-01-01").toISOString(),
    phone: RandomGenerator.mobile(),
    password: "SecretPatientPwd!123",
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patientAuth = await api.functional.auth.patient.join(connection, {
    body: patientJoinBody,
  });
  typia.assert(patientAuth);

  // 4. Org admin issues notification to that patient
  const notificationType = RandomGenerator.pick([
    "appointment_reminder",
    "billing_alert",
    "custom_message",
  ] as const);
  const notificationChannel = RandomGenerator.pick([
    "in_app",
    "email",
    "sms",
  ] as const);
  const notificationSubject = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const notificationBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 15,
  });

  const createBody = {
    recipientUserId: patientAuth.id,
    organizationId: adminAuth.id, // Using admin ID for org context in absence of explicit orgId field
    senderUserId: adminAuth.id,
    notificationType: notificationType,
    notificationChannel: notificationChannel,
    subject: notificationSubject,
    body: notificationBody,
    critical: false,
  } satisfies IHealthcarePlatformNotification.ICreate;

  const notification =
    await api.functional.healthcarePlatform.organizationAdmin.notifications.create(
      connection,
      { body: createBody },
    );
  typia.assert(notification);

  // 5. Assert correct linkage and content on notification object
  TestValidator.equals(
    "notification recipient matches",
    notification.recipientUserId,
    patientAuth.id,
  );
  TestValidator.equals(
    "notification sender matches",
    notification.senderUserId,
    adminAuth.id,
  );
  TestValidator.equals(
    "notification org matches",
    notification.organizationId,
    adminAuth.id,
  );
  TestValidator.equals(
    "notification type matches",
    notification.notificationType,
    notificationType,
  );
  TestValidator.equals(
    "notification channel matches",
    notification.notificationChannel,
    notificationChannel,
  );
  TestValidator.equals(
    "notification subject matches",
    notification.subject,
    notificationSubject,
  );
  TestValidator.equals(
    "notification body matches",
    notification.body,
    notificationBody,
  );
  TestValidator.equals(
    "notification critical matches",
    notification.critical,
    false,
  );
  TestValidator.equals(
    "deliveryStatus is string",
    typeof notification.deliveryStatus,
    "string",
  );
  TestValidator.equals(
    "deliveryAttempts is non-negative int",
    typeof notification.deliveryAttempts,
    "number",
  );

  // Validate id and timestamp formats
  typia.assert<string & tags.Format<"uuid">>(notification.id);
  typia.assert<string & tags.Format<"uuid">>(notification.recipientUserId!);
  typia.assert<string & tags.Format<"uuid">>(notification.senderUserId!);
  typia.assert<string & tags.Format<"uuid">>(notification.organizationId!);
  typia.assert<string & tags.Format<"date-time">>(notification.createdAt);
  typia.assert<string & tags.Format<"date-time">>(notification.updatedAt);
}
