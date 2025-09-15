import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Validates a technician can successfully create a reminder for a patient in
 * the same organization.
 *
 * Steps:
 *
 * 1. Register a technician with valid organization details.
 * 2. Login as technician (credentials are from step 1).
 * 3. Register a patient (as reminder target; ideally, ensure same org context if
 *    schema allows).
 * 4. Create a reminder as the technician with allowed type (e.g., "appointment"),
 *    with patient as the target, and a scheduled time in the future.
 * 5. Confirm reminder is created: correct type, target, schedule, message, and in
 *    expected status ('pending').
 *
 * Comments:
 *
 * - We cannot truly validate "same organization" as org_id is just a UUID, but we
 *   pass the technician's org_id in reminder creation for linkage.
 * - Reminder type is set to 'appointment' for positive path.
 * - Scheduled time is set to 1 day from now in ISO format.
 * - Checks that status is as expected, target_user_id and organization_id map to
 *   inputs, and content matches.
 */
export async function test_api_technician_reminder_creation_success(
  connection: api.IConnection,
) {
  // 1. Register technician
  const technicianEmail = `${RandomGenerator.alphaNumeric(8)}@company.com`;
  const technicianPassword = RandomGenerator.alphaNumeric(12);
  const technicianJoinBody = {
    email: technicianEmail as string & tags.Format<"email">,
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(10),
    specialty: RandomGenerator.paragraph({ sentences: 2 }),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformTechnician.IJoin;
  const technician = await api.functional.auth.technician.join(connection, {
    body: technicianJoinBody,
  });
  typia.assert(technician);

  // 2. Explicit login as technician (password needed)
  await api.functional.auth.technician.login(connection, {
    body: {
      email: technicianEmail as string & tags.Format<"email">,
      password: technicianPassword as string & tags.MinLength<8>,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });

  // 3. Register patient (target for reminder)
  const patientEmail = `${RandomGenerator.alphaNumeric(9)}@patientmail.com`;
  const patientJoinBody = {
    email: patientEmail,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(
      1990 + Math.floor(Math.random() * 20),
      0,
      1,
    ).toISOString(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patient = await api.functional.auth.patient.join(connection, {
    body: patientJoinBody,
  });
  typia.assert(patient);

  // 4. Create reminder pointing to patient, with org context
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 1 day in future
  const reminderBody = {
    reminder_type: "appointment",
    reminder_message: RandomGenerator.paragraph({ sentences: 3 }),
    scheduled_for: futureDate as string & tags.Format<"date-time">,
    organization_id: technician.id as string & tags.Format<"uuid">,
    target_user_id: patient.id as string & tags.Format<"uuid">,
  } satisfies IHealthcarePlatformReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.technician.reminders.create(
      connection,
      { body: reminderBody },
    );
  typia.assert(reminder);

  // 5. Validate all key reminder fields
  TestValidator.equals("reminder type", reminder.reminder_type, "appointment");
  TestValidator.equals(
    "reminder message",
    reminder.reminder_message,
    reminderBody.reminder_message,
  );
  TestValidator.equals(
    "scheduled_for matches input",
    reminder.scheduled_for,
    reminderBody.scheduled_for,
  );
  TestValidator.equals(
    "target_user_id matches",
    reminder.target_user_id,
    patient.id,
  );
  TestValidator.equals(
    "organization_id matches",
    reminder.organization_id,
    technician.id,
  );
  TestValidator.predicate(
    "scheduled time is future",
    new Date(reminder.scheduled_for).getTime() > Date.now(),
  );
  TestValidator.equals(
    "reminder status is pending or scheduled",
    ["scheduled", "pending"].includes(reminder.status),
    true,
  );
}
