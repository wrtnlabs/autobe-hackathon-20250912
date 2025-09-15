import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";

/**
 * Validate reminder update error and boundary conditions.
 *
 * 1. Register two patients (A and B), login as A.
 * 2. Patient A creates a reminder.
 * 3. Attempt update with missing fields (empty body) - expect error.
 * 4. Attempt to set scheduled_for in the past - expect validation error.
 * 5. Patient A attempts update on patient B's reminder - expect error (not
 *    found/forbidden).
 * 6. Soft delete reminder (simulate by updating status to "cancelled" or similar)
 *    then try to update - expect error.
 * 7. Successful update as owner - for comparison.
 */
export async function test_api_patient_reminder_update_validation_and_boundary_cases(
  connection: api.IConnection,
) {
  // Register Patient A
  const patientA_email = `${RandomGenerator.alphaNumeric(12)}@test.com`;
  const patientA_password = RandomGenerator.alphaNumeric(10);
  const patientA: IHealthcarePlatformPatient.IAuthorized =
    await api.functional.auth.patient.join(connection, {
      body: {
        email: patientA_email,
        full_name: RandomGenerator.name(),
        date_of_birth: new Date("1990-01-01").toISOString(),
        password: patientA_password,
      },
    });
  typia.assert(patientA);
  // Login as Patient A (token set automatically)
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientA_email,
      password: patientA_password,
    },
  });
  // Register Patient B
  const patientB_email = `${RandomGenerator.alphaNumeric(12)}@test.com`;
  const patientB_password = RandomGenerator.alphaNumeric(10);
  const patientB: IHealthcarePlatformPatient.IAuthorized =
    await api.functional.auth.patient.join(connection, {
      body: {
        email: patientB_email,
        full_name: RandomGenerator.name(),
        date_of_birth: new Date("1991-01-01").toISOString(),
        password: patientB_password,
      },
    });
  typia.assert(patientB);
  // Patient B creates a reminder for ownership test
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientB_email,
      password: patientB_password,
    },
  });
  const reminderB: IHealthcarePlatformReminder =
    await api.functional.healthcarePlatform.patient.reminders.create(
      connection,
      {
        body: {
          reminder_type: "test-ownership",
          reminder_message: "patient b's reminder",
          scheduled_for: new Date(
            Date.now() + 1000 * 60 * 60 * 24,
          ).toISOString(),
        },
      },
    );
  typia.assert(reminderB);
  // Switch back to Patient A and create a reminder
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientA_email,
      password: patientA_password,
    },
  });
  const reminderA: IHealthcarePlatformReminder =
    await api.functional.healthcarePlatform.patient.reminders.create(
      connection,
      {
        body: {
          reminder_type: "test-reminder",
          reminder_message: "patient a's reminder",
          scheduled_for: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 2,
          ).toISOString(),
        },
      },
    );
  typia.assert(reminderA);

  // 3. Attempt empty body update
  await TestValidator.error("empty update body triggers error", async () => {
    await api.functional.healthcarePlatform.patient.reminders.update(
      connection,
      {
        reminderId: reminderA.id,
        body: {},
      },
    );
  });

  // 4. Attempt schedule in past
  await TestValidator.error("cannot schedule in the past", async () => {
    await api.functional.healthcarePlatform.patient.reminders.update(
      connection,
      {
        reminderId: reminderA.id,
        body: {
          scheduled_for: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        },
      },
    );
  });

  // 5. Patient A attempts to update B's reminder (not owner)
  await TestValidator.error(
    "cannot update another user's reminder",
    async () => {
      await api.functional.healthcarePlatform.patient.reminders.update(
        connection,
        {
          reminderId: reminderB.id,
          body: {
            reminder_message: "hack attempt",
          },
        },
      );
    },
  );

  // 6. Try to "delete" reminderA by updating status to cancelled, then update again
  const cancelled =
    await api.functional.healthcarePlatform.patient.reminders.update(
      connection,
      {
        reminderId: reminderA.id,
        body: {
          status: "cancelled",
        },
      },
    );
  typia.assert(cancelled);
  await TestValidator.error(
    "cannot update a cancelled/deleted reminder",
    async () => {
      await api.functional.healthcarePlatform.patient.reminders.update(
        connection,
        {
          reminderId: reminderA.id,
          body: {
            reminder_message: "should fail after cancelled",
          },
        },
      );
    },
  );

  // 7. Valid successful update for patient B's reminder (owner)
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientB_email,
      password: patientB_password,
    },
  });
  const updatedB: IHealthcarePlatformReminder =
    await api.functional.healthcarePlatform.patient.reminders.update(
      connection,
      {
        reminderId: reminderB.id,
        body: {
          reminder_message: "b updated message",
        },
      },
    );
  typia.assert(updatedB);
  TestValidator.equals(
    "reminder message updated by owner",
    updatedB.reminder_message,
    "b updated message",
  );
}
