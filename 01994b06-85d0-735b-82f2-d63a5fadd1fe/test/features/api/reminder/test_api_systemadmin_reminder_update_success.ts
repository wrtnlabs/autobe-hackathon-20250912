import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * E2E test that a system admin can update an existing reminder’s schedule,
 * content, or type.
 *
 * Steps:
 *
 * 1. Register and login as a system admin (with unique admin email).
 * 2. Register a new patient user (create unique target for reminder).
 * 3. As system admin, create an initial reminder using the patient's user id as
 *    target.
 * 4. Update the reminder’s schedule and message.
 * 5. Verify the returned reminder matches the update payload and the id is
 *    unchanged.
 */
export async function test_api_systemadmin_reminder_update_success(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const adminEmail = RandomGenerator.alphaNumeric(8) + "@company.com";
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminProvider = "local";
  const adminFullName = RandomGenerator.name();
  const adminProviderKey = adminEmail;

  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: adminFullName,
      phone: RandomGenerator.mobile(),
      provider: adminProvider,
      provider_key: adminProviderKey,
      password: adminPassword,
    },
  });
  typia.assert(adminAuth);

  const _adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: adminProvider,
      provider_key: adminProviderKey,
      password: adminPassword,
    },
  });
  typia.assert(_adminLogin);

  // 2. Register patient user
  const patientEmail = RandomGenerator.alphaNumeric(8) + "@testpatient.com";
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(
        Date.now() - 25 * 365 * 24 * 3600 * 1000,
      ).toISOString(), // 25 years old
      phone: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(10),
    },
  });
  typia.assert(patient);

  // 3. Create an initial reminder for patient
  const reminderCreateBody = {
    reminder_type: "compliance",
    reminder_message: RandomGenerator.paragraph({ sentences: 5 }),
    scheduled_for: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(), // 5 days later
    target_user_id: patient.id,
  } satisfies IHealthcarePlatformReminder.ICreate;
  const createdReminder =
    await api.functional.healthcarePlatform.systemAdmin.reminders.create(
      connection,
      {
        body: reminderCreateBody,
      },
    );
  typia.assert(createdReminder);

  // 4. Update the reminder
  const updatePayload = {
    reminder_type: "appointment",
    reminder_message: RandomGenerator.paragraph({ sentences: 3 }),
    scheduled_for: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(), // 10 days later
  } satisfies IHealthcarePlatformReminder.IUpdate;
  const updatedReminder =
    await api.functional.healthcarePlatform.systemAdmin.reminders.update(
      connection,
      {
        reminderId: createdReminder.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedReminder);

  // 5. Validate the update
  TestValidator.equals(
    "reminder id remains unchanged",
    updatedReminder.id,
    createdReminder.id,
  );
  TestValidator.equals(
    "reminder_type updated",
    updatedReminder.reminder_type,
    updatePayload.reminder_type,
  );
  TestValidator.equals(
    "reminder_message updated",
    updatedReminder.reminder_message,
    updatePayload.reminder_message,
  );
  TestValidator.equals(
    "scheduled_for updated",
    updatedReminder.scheduled_for,
    updatePayload.scheduled_for,
  );
}
