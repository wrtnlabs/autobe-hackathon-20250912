import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate patient notification detail retrieval by recipient patient
 *
 * This e2e test covers registration of admin and patient, admin sending a
 * notification to the patient, and the patient retrieving its detail:
 *
 * 1. Register a system admin user (with local provider)
 * 2. Register a patient
 * 3. Login as patient (to set patient session)
 * 4. Login as admin (to get admin tokens for notification creation)
 * 5. Admin sends notification to new patient
 * 6. Switch back to patient (login) to retrieve (GET) notification detail
 * 7. Validate notification fields and context
 */
export async function test_api_patient_notification_detail_success(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const adminEmail = `${RandomGenerator.alphabets(12)}@business-health.com`;
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(admin);

  // 2. Register a patient
  const patientEmail = `${RandomGenerator.alphabets(10)}@patientmail.com`;
  const patientPassword = RandomGenerator.alphaNumeric(10);
  const patientName = RandomGenerator.name();
  const patientDOB = new Date(
    Date.now() - 24 * 60 * 60 * 1000 * 3500,
  ).toISOString(); // ~9.5 years old
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: patientName,
      date_of_birth: patientDOB,
      phone: RandomGenerator.mobile(),
      password: patientPassword,
    },
  });
  typia.assert(patient);

  // 3. Login as patient
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientEmail,
      password: patientPassword,
    },
  });

  // 4. Login as admin (for notification creation)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      provider: "local",
      provider_key: adminEmail,
    },
  });

  // 5. Admin creates notification assigned to patient
  const notificationSubject = RandomGenerator.paragraph({ sentences: 2 });
  const notificationBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const notification =
    await api.functional.healthcarePlatform.systemAdmin.notifications.create(
      connection,
      {
        body: {
          recipientUserId: patient.id,
          notificationType: "info",
          notificationChannel: "in_app",
          subject: notificationSubject,
          body: notificationBody,
          critical: false,
        },
      },
    );
  typia.assert(notification);
  TestValidator.equals(
    "recipient matches patient",
    notification.recipientUserId,
    patient.id,
  );
  TestValidator.equals(
    "subject matches request",
    notification.subject,
    notificationSubject,
  );

  // 6. Login as patient (for notification detail retrieval)
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientEmail,
      password: patientPassword,
    },
  });

  // 7. Patient queries notification detail
  const notificationDetail =
    await api.functional.healthcarePlatform.patient.notifications.at(
      connection,
      {
        notificationId: notification.id,
      },
    );
  typia.assert(notificationDetail);

  // Cross-field assertions
  TestValidator.equals(
    "notification detail id matches",
    notificationDetail.id,
    notification.id,
  );
  TestValidator.equals(
    "notification subject matches",
    notificationDetail.subject,
    notificationSubject,
  );
  TestValidator.equals(
    "body matches",
    notificationDetail.body,
    notificationBody,
  );
  TestValidator.equals(
    "recipient user id matches",
    notificationDetail.recipientUserId,
    patient.id,
  );
  TestValidator.equals(
    "channel matches",
    notificationDetail.notificationChannel,
    "in_app",
  );
  TestValidator.equals(
    "notification type matches",
    notificationDetail.notificationType,
    "info",
  );
  // meta: deliveredAt/acknowledgedAt can remain undefined or be validated by typia.assert
}
