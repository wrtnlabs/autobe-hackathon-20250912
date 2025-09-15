import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotificationPreference";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate that a patient can update their own notification preference record
 * but cannot update another user's notification preference.
 *
 * 1. Register a system admin (systemAdmin join)
 * 2. Register patient A (patient join)
 * 3. Register patient B (for negative permission test)
 * 4. Login as system admin, create notificationPreference for patient A
 * 5. Login as patient A, update their own notificationPreference (success)
 * 6. Login as patient B, attempt to update patient A's notificationPreference
 *    (expect failure)
 *
 * Verifies auth boundaries for notification preference update API.
 */
export async function test_api_patient_update_notification_preference_success_for_self(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const sysAdminEmail = RandomGenerator.alphaNumeric(10) + "@company.com";
  const sysAdmin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysAdminEmail,
        full_name: RandomGenerator.name(),
        provider: "local",
        provider_key: sysAdminEmail,
        password: "Admin!12345",
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(sysAdmin);

  // 2. Register patient A
  const patientA_email = RandomGenerator.alphaNumeric(10) + "@testmail.com";
  const patientA_password = "PatientA!123";
  const patientA: IHealthcarePlatformPatient.IAuthorized =
    await api.functional.auth.patient.join(connection, {
      body: {
        email: patientA_email,
        full_name: RandomGenerator.name(),
        date_of_birth: new Date("2000-01-01").toISOString(),
        password: patientA_password,
      } satisfies IHealthcarePlatformPatient.IJoin,
    });
  typia.assert(patientA);

  // 3. Register patient B
  const patientB_email = RandomGenerator.alphaNumeric(10) + "@testmail.com";
  const patientB_password = "PatientB!123";
  const patientB: IHealthcarePlatformPatient.IAuthorized =
    await api.functional.auth.patient.join(connection, {
      body: {
        email: patientB_email,
        full_name: RandomGenerator.name(),
        date_of_birth: new Date("1990-01-01").toISOString(),
        password: patientB_password,
      } satisfies IHealthcarePlatformPatient.IJoin,
    });
  typia.assert(patientB);

  // 4. Login as systemAdmin (token already set from join)
  // 5. Create notification preference for patientA
  const notifChannel = RandomGenerator.pick([
    "email",
    "sms",
    "in_app",
  ] as const);
  const notifType = RandomGenerator.pick([
    "appointment_reminder",
    "billing_alert",
    "general_update",
  ] as const);
  const createPrefBody = {
    user_id: patientA.id,
    notification_channel: notifChannel,
    notification_type: notifType,
    enabled: true,
    escalation_policy: "escalate_immediately",
    mute_start: null,
    mute_end: null,
  } satisfies IHealthcarePlatformNotificationPreference.ICreate;
  const notificationPreference: IHealthcarePlatformNotificationPreference =
    await api.functional.healthcarePlatform.systemAdmin.notificationPreferences.create(
      connection,
      {
        body: createPrefBody,
      },
    );
  typia.assert(notificationPreference);

  // 6. Login as patientA (to ensure patient context)
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientA_email,
      password: patientA_password,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });

  // 7. Update notification preference as patientA (success)
  const updatePrefBody = {
    enabled: false,
    mute_start: new Date(Date.now() + 3600000).toISOString(), // 1 hour in future
    mute_end: new Date(Date.now() + 7200000).toISOString(), // 2 hours in future
    escalation_policy: "do_not_escalate",
  } satisfies IHealthcarePlatformNotificationPreference.IUpdate;
  const updatedPreference: IHealthcarePlatformNotificationPreference =
    await api.functional.healthcarePlatform.patient.notificationPreferences.update(
      connection,
      {
        notificationPreferenceId: notificationPreference.id,
        body: updatePrefBody,
      },
    );
  typia.assert(updatedPreference);
  TestValidator.equals(
    "update reflected in enabled field",
    updatedPreference.enabled,
    false,
  );
  TestValidator.equals(
    "update reflected in escalation_policy",
    updatedPreference.escalation_policy,
    "do_not_escalate",
  );

  // 8. Login as patientB (for access denial test)
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientB_email,
      password: patientB_password,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });

  // 9. Attempt to update patientA's preference as patientB (should fail)
  await TestValidator.error(
    "patientB cannot update patientA's preference",
    async () => {
      await api.functional.healthcarePlatform.patient.notificationPreferences.update(
        connection,
        {
          notificationPreferenceId: notificationPreference.id,
          body: {
            enabled: true,
          } satisfies IHealthcarePlatformNotificationPreference.IUpdate,
        },
      );
    },
  );
}
