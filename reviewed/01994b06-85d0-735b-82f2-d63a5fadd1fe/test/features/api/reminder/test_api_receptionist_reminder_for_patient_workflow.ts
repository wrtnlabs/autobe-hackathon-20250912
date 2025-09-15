import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";

/**
 * Validate receptionist-created patient reminder workflow, business logic, and
 * edge conditions.
 *
 * 1. Register receptionist and login; verify JWT/authorization is returned.
 * 2. Register a patient in the same org, get their user id.
 * 3. Receptionist creates a reminder for this patient for an upcoming time; verify
 *    reminder returned is valid, contains correct data (target_user_id,
 *    content, time, pending status).
 * 4. Attempt to create a reminder with a past scheduled time (should fail—error
 *    expected).
 * 5. Attempt to create a reminder for a user in a different org (should fail—error
 *    expected).
 * 6. (If testable) Attempt to create a reminder for another receptionist, not a
 *    patient (should fail if system validates roles).
 */
export async function test_api_receptionist_reminder_for_patient_workflow(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a receptionist
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const commonPassword = RandomGenerator.alphaNumeric(8);
  const receptionistFullName = RandomGenerator.name();
  const receptionistPhone = RandomGenerator.mobile();

  const receptionistAuth = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: receptionistEmail,
        full_name: receptionistFullName,
        phone: receptionistPhone,
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    },
  );
  typia.assert(receptionistAuth);

  // Re-login explicitly (simulate session restoration)
  const receptionistSession = await api.functional.auth.receptionist.login(
    connection,
    {
      body: {
        email: receptionistEmail,
        password: commonPassword,
      } satisfies IHealthcarePlatformReceptionist.ILogin,
    },
  );
  typia.assert(receptionistSession);
  TestValidator.equals(
    "receptionist ID consistent",
    receptionistSession.id,
    receptionistAuth.id,
  );

  // 2. Register a patient in the same organization
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientFullName = RandomGenerator.name();
  const patientDOB = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 365 * 20,
  ).toISOString();

  const patientAuth = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: patientFullName,
      date_of_birth: patientDOB,
      phone: RandomGenerator.mobile(),
      password: commonPassword,
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patientAuth);

  // 3. Receptionist creates a reminder for the patient
  const futureDate = new Date(Date.now() + 1000 * 60 * 60).toISOString();
  const reminderType = "appointment";
  const reminderMessage = RandomGenerator.paragraph({ sentences: 5 });
  const reminderCreateReq = {
    reminder_type: reminderType,
    reminder_message: reminderMessage,
    scheduled_for: futureDate,
    target_user_id: patientAuth.id,
  } satisfies IHealthcarePlatformReminder.ICreate;

  const reminder =
    await api.functional.healthcarePlatform.receptionist.reminders.create(
      connection,
      {
        body: reminderCreateReq,
      },
    );
  typia.assert(reminder);
  TestValidator.equals(
    "reminder type correct",
    reminder.reminder_type,
    reminderType,
  );
  TestValidator.equals(
    "reminder content correct",
    reminder.reminder_message,
    reminderMessage,
  );
  TestValidator.equals(
    "reminder scheduled_for correct",
    reminder.scheduled_for,
    futureDate,
  );
  TestValidator.equals(
    "reminder target_user_id correct",
    reminder.target_user_id,
    patientAuth.id,
  );

  // 4. Attempt to create with a scheduled time in the past (should fail)
  const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString();
  await TestValidator.error(
    "creating reminder in the past must fail",
    async () => {
      await api.functional.healthcarePlatform.receptionist.reminders.create(
        connection,
        {
          body: {
            reminder_type: reminderType,
            reminder_message: RandomGenerator.paragraph({ sentences: 4 }),
            scheduled_for: pastDate,
            target_user_id: patientAuth.id,
          } satisfies IHealthcarePlatformReminder.ICreate,
        },
      );
    },
  );

  // 5. Attempt to create a reminder for another patient from a different receptionist (simulate different org by re-registering)
  const receptionist2Email = typia.random<string & tags.Format<"email">>();
  const receptionist2FullName = RandomGenerator.name();
  const receptionist2Phone = RandomGenerator.mobile();

  await api.functional.auth.receptionist.join(connection, {
    body: {
      email: receptionist2Email,
      full_name: receptionist2FullName,
      phone: receptionist2Phone,
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });

  // Now try to create a reminder for the first patient with the new receptionist
  await TestValidator.error(
    "receptionist cannot create reminder for a patient outside their organization",
    async () => {
      await api.functional.healthcarePlatform.receptionist.reminders.create(
        connection,
        {
          body: {
            reminder_type: reminderType,
            reminder_message: RandomGenerator.paragraph({ sentences: 4 }),
            scheduled_for: futureDate,
            target_user_id: patientAuth.id,
          } satisfies IHealthcarePlatformReminder.ICreate,
        },
      );
    },
  );

  // 6. Receptionist attempts to create reminder for another receptionist (role violation, if allowed/testable)
  await TestValidator.error(
    "cannot create reminder for another receptionist user",
    async () => {
      await api.functional.healthcarePlatform.receptionist.reminders.create(
        connection,
        {
          body: {
            reminder_type: reminderType,
            reminder_message: RandomGenerator.paragraph({ sentences: 3 }),
            scheduled_for: futureDate,
            target_user_id: receptionistSession.id,
          } satisfies IHealthcarePlatformReminder.ICreate,
        },
      );
    },
  );
}
