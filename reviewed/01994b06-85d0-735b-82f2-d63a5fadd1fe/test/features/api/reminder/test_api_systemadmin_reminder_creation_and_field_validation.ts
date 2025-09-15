import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Validate system admin scheduling reminders and reminder input field
 * enforcement.
 *
 * 1. Register system admin with unique credentials and log in. Save the system
 *    admin's org/user id context.
 * 2. Register a technician, receptionist, and patient (each with unique info for
 *    later assignment as reminder target).
 * 3. As system admin, create a reminder targeting the technician account. Confirm
 *    the reminder is correctly scheduled (future date), has the expected
 *    message/type, and is assigned to the correct target_user_id.
 * 4. Attempt to create a reminder for a random/invalid target_user_id: expect
 *    error.
 * 5. (Edge) Attempt to schedule a reminder far in the past: expect error.
 */
export async function test_api_systemadmin_reminder_creation_and_field_validation(
  connection: api.IConnection,
) {
  // 1. Register system admin and log in
  const sysAdminEmail = RandomGenerator.name(1) + "@business.org";
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminJoin);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  // 2. Register technician, receptionist, and patient
  const techEmail = RandomGenerator.name(1) + "@business.org";
  const tech = await api.functional.auth.technician.join(connection, {
    body: {
      email: techEmail,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(12),
      specialty: "Radiology",
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  typia.assert(tech);

  const recEmail = RandomGenerator.name(1) + "@business.org";
  const rec = await api.functional.auth.receptionist.join(connection, {
    body: {
      email: recEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });
  typia.assert(rec);

  const patientEmail = RandomGenerator.name(1) + "@business.org";
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1980, 4, 24).toISOString() satisfies string &
        tags.Format<"date-time">,
      phone: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(10),
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patient);

  // 3. Schedule a valid reminder for technician
  const scheduledFor = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour in the future
  const reminderBody = {
    reminder_type: "appointment",
    reminder_message: RandomGenerator.paragraph({ sentences: 2 }),
    scheduled_for: scheduledFor,
    target_user_id: tech.id,
  } satisfies IHealthcarePlatformReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.systemAdmin.reminders.create(
      connection,
      {
        body: reminderBody,
      },
    );
  typia.assert(reminder);
  TestValidator.equals(
    "reminder target matches technician",
    reminder.target_user_id,
    tech.id,
  );
  TestValidator.equals(
    "reminder type matches",
    reminder.reminder_type,
    reminderBody.reminder_type,
  );
  TestValidator.equals(
    "reminder message matches",
    reminder.reminder_message,
    reminderBody.reminder_message,
  );
  TestValidator.equals(
    "reminder scheduled_for matches",
    reminder.scheduled_for,
    scheduledFor,
  );

  // 4. Attempt to create reminder for invalid target_user_id
  await TestValidator.error(
    "reminder with nonexistent target_user_id triggers not found error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.reminders.create(
        connection,
        {
          body: {
            reminder_type: "appointment",
            reminder_message: "Fake assignment",
            scheduled_for: new Date(Date.now() + 9000 * 1000).toISOString(),
            target_user_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IHealthcarePlatformReminder.ICreate,
        },
      );
    },
  );

  // 5. Attempt scheduling far in the past
  await TestValidator.error(
    "reminder scheduled far in the past triggers error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.reminders.create(
        connection,
        {
          body: {
            reminder_type: "compliance",
            reminder_message: "Past reminder should not be created.",
            scheduled_for: new Date(2001, 1, 1).toISOString() satisfies string &
              tags.Format<"date-time">,
            target_user_id: rec.id,
          } satisfies IHealthcarePlatformReminder.ICreate,
        },
      );
    },
  );
}
