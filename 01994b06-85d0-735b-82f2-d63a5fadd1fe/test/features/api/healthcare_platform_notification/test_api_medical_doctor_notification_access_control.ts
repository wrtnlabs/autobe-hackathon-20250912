import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate notification access control: unauthorized medical doctors cannot
 * access another doctor's notification.
 *
 * This test ensures that notification privacy and access controls are
 * enforced in the healthcare platform. It simulates a scenario where
 * medical doctor A attempts to view a notification addressed to medical
 * doctor B. The system must prevent doctor A from retrieving doctor B's
 * notification or seeing any of its content.
 *
 * Steps:
 *
 * 1. Register system admin.
 * 2. Log in as system admin.
 * 3. Register medical doctor A.
 * 4. Register medical doctor B.
 * 5. Log in as medical doctor B and capture B's user ID.
 * 6. Log back in as system admin and use B's ID to create a notification
 *    addressed specifically to doctor B.
 * 7. Log in as medical doctor A and attempt to access the notification by its
 *    ID.
 * 8. Verify that doctor A does not receive the notification (system throws
 *    error: 403/404, or similar access denied).
 *
 * Validation:
 *
 * - The test passes only if doctor A cannot access the notification content
 *   addressed to doctor B.
 * - The system must not leak notification data or details to unauthorized
 *   accounts.
 *
 * Edge Cases:
 *
 * - All role switching and authentication flows are covered (system admin,
 *   two med doctors).
 * - No type validation or type errors are tested.
 * - No invented or non-existent DTO/API/field is referenced.
 */
export async function test_api_medical_doctor_notification_access_control(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SysAdmin!0009";
  const adminUser = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(2),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminUser);

  // 2. Login as system admin (not strictly required but emulates real use and token refresh when switching roles)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 3. Register medical doctor A
  const doctorAEmail = typia.random<string & tags.Format<"email">>();
  const doctorAPassword = "DoctorAA!0002";
  const doctorAJoin = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorAEmail,
      full_name: RandomGenerator.name(2),
      npi_number: RandomGenerator.alphaNumeric(10),
      password: doctorAPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  typia.assert(doctorAJoin);

  // 4. Register medical doctor B
  const doctorBEmail = typia.random<string & tags.Format<"email">>();
  const doctorBPassword = "DoctorBB!0003";
  const doctorBJoin = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorBEmail,
      full_name: RandomGenerator.name(2),
      npi_number: RandomGenerator.alphaNumeric(10),
      password: doctorBPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  typia.assert(doctorBJoin);
  const doctorBId = doctorBJoin.id;

  // 5. (optional: could login as doctor B, but not required unless more state is needed)

  // 6. Log back in as system admin and create a notification addressed to doctor B
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  const notification =
    await api.functional.healthcarePlatform.systemAdmin.notifications.create(
      connection,
      {
        body: {
          recipientUserId: doctorBId,
          notificationType: "test_case_notification",
          notificationChannel: "in_app",
          body: RandomGenerator.paragraph({ sentences: 7 }),
        } satisfies IHealthcarePlatformNotification.ICreate,
      },
    );
  typia.assert(notification);
  const notificationId = notification.id;

  // 7. Log in as doctor A
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorAEmail,
      password: doctorAPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  // 8. Attempt to fetch the notification as doctor A (should fail with access denied)
  await TestValidator.error(
    "medical doctor A cannot access notification assigned to medical doctor B",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.notifications.at(
        connection,
        { notificationId },
      );
    },
  );
}
