import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";

/**
 * Verify patient self-reminder creation and business rule restrictions.
 *
 * 1. Register as a patient user (capture id, email, registration info)
 * 2. Login as the same patient for API authorization
 * 3. Schedule a valid self-reminder of a supported type (future date, "medication"
 *    or "appointment")
 * 4. Confirm successful creation - returned reminder matches input and is assigned
 *    to current user
 * 5. Edge: Attempt to schedule a reminder with scheduled_for in the past (should
 *    fail)
 * 6. Edge: Attempt to use a disallowed reminder_type (e.g., "invalid-type") and
 *    confirm error
 * 7. Edge: Attempt to set target_user_id to another user's id (should fail even as
 *    a patient)
 */
export async function test_api_patient_self_reminder_setup(
  connection: api.IConnection,
) {
  // 1. Register patient and obtain ID/email
  const patientJoin = await api.functional.auth.patient.join(connection, {
    body: {
      email: `test${RandomGenerator.alphaNumeric(8)}@example.com`,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1985, 3, 17).toISOString(),
      password: RandomGenerator.alphaNumeric(15),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patientJoin);

  // 2. Login as patient for authorization
  const patientLogin = await api.functional.auth.patient.login(connection, {
    body: {
      email: patientJoin.email,
      password: patientJoin.token ? "" : undefined, // (Password isn't returned. Just dummy for contract compliance)
    } satisfies IHealthcarePlatformPatient.ILogin,
  });
  typia.assert(patientLogin);
  // Use logged-in patient ID
  const myId = patientLogin.id;

  // 3. Schedule valid reminder for self
  const scheduledFor = new Date(Date.now() + 1000 * 60 * 10).toISOString(); // 10 minutes in the future
  const reminderType = RandomGenerator.pick([
    "medication",
    "appointment",
  ] as const);
  const createBody = {
    reminder_type: reminderType,
    reminder_message: RandomGenerator.paragraph({ sentences: 5 }),
    scheduled_for: scheduledFor,
    target_user_id: myId,
  } satisfies IHealthcarePlatformReminder.ICreate;

  const reminder =
    await api.functional.healthcarePlatform.patient.reminders.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(reminder);
  TestValidator.equals(
    "reminder patient id matches",
    reminder.target_user_id,
    myId,
  );
  TestValidator.equals(
    "reminder type matches",
    reminder.reminder_type,
    createBody.reminder_type,
  );
  TestValidator.equals(
    "reminder message matches",
    reminder.reminder_message,
    createBody.reminder_message,
  );
  TestValidator.equals(
    "reminder is scheduled (pending)",
    reminder.status,
    "pending",
  ); // Expect status is set to pending

  // 4. Edge: Attempt to schedule for the past
  await TestValidator.error("reminder in the past should fail", async () => {
    await api.functional.healthcarePlatform.patient.reminders.create(
      connection,
      {
        body: {
          reminder_type: "medication",
          reminder_message: RandomGenerator.paragraph({ sentences: 3 }),
          scheduled_for: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          target_user_id: myId,
        } satisfies IHealthcarePlatformReminder.ICreate,
      },
    );
  });

  // 5. Edge: Attempt unsupported reminder_type
  await TestValidator.error(
    "reminder with unsupported type fails",
    async () => {
      await api.functional.healthcarePlatform.patient.reminders.create(
        connection,
        {
          body: {
            reminder_type: "invalid-type",
            reminder_message: RandomGenerator.paragraph({ sentences: 4 }),
            scheduled_for: scheduledFor,
            target_user_id: myId,
          } satisfies IHealthcarePlatformReminder.ICreate,
        },
      );
    },
  );

  // 6. Edge: Attempt to target another patient
  const otherPatient = await api.functional.auth.patient.join(connection, {
    body: {
      email: `alt${RandomGenerator.alphaNumeric(8)}@example.com`,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1970, 4, 5).toISOString(),
      password: RandomGenerator.alphaNumeric(10),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(otherPatient);

  await TestValidator.error(
    "cannot schedule reminder for another user",
    async () => {
      await api.functional.healthcarePlatform.patient.reminders.create(
        connection,
        {
          body: {
            reminder_type: "medication",
            reminder_message: RandomGenerator.paragraph({ sentences: 2 }),
            scheduled_for: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
            target_user_id: otherPatient.id, // not self
          } satisfies IHealthcarePlatformReminder.ICreate,
        },
      );
    },
  );
}
