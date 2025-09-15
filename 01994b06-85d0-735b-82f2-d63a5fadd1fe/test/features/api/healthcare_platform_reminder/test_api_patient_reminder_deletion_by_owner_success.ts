import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";

/**
 * Verifies that an authenticated patient can delete their own scheduled
 * reminder.
 *
 * Test scenario steps:
 *
 * 1. Register a new patient and authenticate them
 * 2. Create a scheduled reminder as that patient
 * 3. Delete the reminder successfully by owner
 * 4. Attempt to delete the same reminder again (should fail)
 * 5. Register and authenticate another patient
 * 6. Second patient attempts to delete the first patient's reminder (should fail)
 */
export async function test_api_patient_reminder_deletion_by_owner_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate the primary patient
  const patient_email =
    RandomGenerator.name(1) +
    "_" +
    RandomGenerator.alphaNumeric(5) +
    "@test.com";
  const patient_password = RandomGenerator.alphaNumeric(10);
  const patient_join = await api.functional.auth.patient.join(connection, {
    body: {
      email: patient_email,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(2000, 1, 1).toISOString(),
      password: patient_password,
    },
  });
  typia.assert(patient_join);

  const authenticated = await api.functional.auth.patient.login(connection, {
    body: {
      email: patient_email,
      password: patient_password,
    },
  });
  typia.assert(authenticated);

  // 2. Create a scheduled reminder for the patient
  const reminder_input = {
    reminder_type: "appointment",
    reminder_message: RandomGenerator.paragraph({ sentences: 2 }),
    scheduled_for: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  } satisfies IHealthcarePlatformReminder.ICreate;
  const created =
    await api.functional.healthcarePlatform.patient.reminders.create(
      connection,
      {
        body: reminder_input,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "reminder type matches",
    created.reminder_type,
    reminder_input.reminder_type,
  );

  // 3. Delete the reminder by owner
  await api.functional.healthcarePlatform.patient.reminders.erase(connection, {
    reminderId: created.id,
  });

  // 4. Attempt repeated deletion (should return error)
  await TestValidator.error(
    "Deleting already-deleted reminder fails",
    async () => {
      await api.functional.healthcarePlatform.patient.reminders.erase(
        connection,
        {
          reminderId: created.id,
        },
      );
    },
  );

  // 5. Register and authenticate another patient
  const other_email =
    RandomGenerator.name(1) +
    "_" +
    RandomGenerator.alphaNumeric(5) +
    "@test.com";
  const other_password = RandomGenerator.alphaNumeric(10);
  const other_patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: other_email,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1990, 2, 2).toISOString(),
      password: other_password,
    },
  });
  typia.assert(other_patient);

  const second_auth = await api.functional.auth.patient.login(connection, {
    body: {
      email: other_email,
      password: other_password,
    },
  });
  typia.assert(second_auth);

  // 6. Second patient tries to delete first patient's reminder (should fail)
  await TestValidator.error(
    "Second patient cannot delete another patient's reminder",
    async () => {
      await api.functional.healthcarePlatform.patient.reminders.erase(
        connection,
        {
          reminderId: created.id,
        },
      );
    },
  );
}
