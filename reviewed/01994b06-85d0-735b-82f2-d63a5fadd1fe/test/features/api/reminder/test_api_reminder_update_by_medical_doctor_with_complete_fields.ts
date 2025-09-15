import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";

/**
 * Validate that a medical doctor can update a reminder for which they have
 * appropriate access.
 *
 * This test covers the full workflow for creating, then successfully updating,
 * a scheduled reminder by a medical doctor.
 *
 * Steps:
 *
 * 1. Register as a new medical doctor (using unique business email and valid NPI).
 * 2. Login as that medical doctor.
 * 3. Create a reminder to generate a real reminderId.
 * 4. Update that reminder using PUT
 *    /healthcarePlatform/medicalDoctor/reminders/{reminderId} with new fields.
 * 5. Validate that the update took effect and the response data matches the new
 *    update content.
 */
export async function test_api_reminder_update_by_medical_doctor_with_complete_fields(
  connection: api.IConnection,
) {
  // 1. Register as a new medical doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = RandomGenerator.alphaNumeric(12);
  const npiNumber = RandomGenerator.alphaNumeric(10);
  const doctorJoinBody = {
    email: doctorEmail,
    full_name: RandomGenerator.name(3),
    npi_number: npiNumber,
    password: doctorPassword satisfies string & tags.Format<"password">,
    specialty: RandomGenerator.paragraph({ sentences: 2 }),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: doctorJoinBody,
  });
  typia.assert(doctor);

  // 2. Login as that doctor (refresh token in context)
  const doctorLogin = await api.functional.auth.medicalDoctor.login(
    connection,
    {
      body: {
        email: doctorEmail,
        password: doctorPassword satisfies string & tags.Format<"password">,
      } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
    },
  );
  typia.assert(doctorLogin);

  // 3. Create a reminder
  const now = new Date();
  const reminderCreateBody = {
    reminder_type: "appointment",
    reminder_message: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
    }),
    scheduled_for: new Date(now.getTime() + 1000 * 60 * 60 * 12).toISOString(), // 12 hours from now
    organization_id: null,
    target_user_id: null,
    status: "pending",
    delivered_at: null,
    acknowledged_at: null,
    snoozed_until: null,
    failure_reason: null,
  } satisfies IHealthcarePlatformReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.medicalDoctor.reminders.create(
      connection,
      { body: reminderCreateBody },
    );
  typia.assert(reminder);

  // 4. Update the reminder with new fields
  const updateFields = {
    reminder_type: "follow-up",
    reminder_message: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 6,
    }),
    scheduled_for: new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours from now
    status: "snoozed",
    snoozed_until: new Date(now.getTime() + 1000 * 60 * 60 * 48).toISOString(), // snooze to +48h
    failure_reason: null,
  } satisfies IHealthcarePlatformReminder.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.medicalDoctor.reminders.update(
      connection,
      { reminderId: reminder.id, body: updateFields },
    );
  typia.assert(updated);

  // 5. Validate the update took effect (major update fields should match)
  TestValidator.equals(
    "updated reminder_type",
    updated.reminder_type,
    updateFields.reminder_type,
  );
  TestValidator.equals(
    "updated reminder_message",
    updated.reminder_message,
    updateFields.reminder_message,
  );
  TestValidator.equals(
    "updated scheduled_for",
    updated.scheduled_for,
    updateFields.scheduled_for,
  );
  TestValidator.equals("updated status", updated.status, updateFields.status);
  TestValidator.equals(
    "updated snoozed_until",
    updated.snoozed_until,
    updateFields.snoozed_until,
  );
}
