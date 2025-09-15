import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";

/**
 * Test updating an appointment reminder as an authenticated medical doctor.
 *
 * Steps:
 *
 * 1. Register a medical doctor (join)
 * 2. Login as medical doctor
 * 3. Prepare random UUIDs for an appointment and for existing reminder (as the
 *    platform lacks endpoints for creation)
 * 4. Prepare reminder update body with new reminder_time and recipient (simulate a
 *    reschedule or text update)
 * 5. Call the update endpoint for the reminder
 * 6. Assert the return value matches IHealthcarePlatformAppointmentReminder
 */
export async function test_api_medicaldoctor_update_reminder_success(
  connection: api.IConnection,
) {
  // 1. Register a medical doctor
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(2),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: typia.random<string & tags.Format<"password">>(),
    specialty: RandomGenerator.paragraph({ sentences: 2 }),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: joinInput,
  });
  typia.assert(doctor);

  // 2. Login (not strictly needed as join sets token)
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IHealthcarePlatformMedicalDoctor.ILogin;
  const loginResult = await api.functional.auth.medicalDoctor.login(
    connection,
    { body: loginInput },
  );
  typia.assert(loginResult);

  // 3. Prepare random UUIDs for appointment and reminder, as only update endpoint exists
  const appointmentId = typia.random<string & tags.Format<"uuid">>();
  const reminderId = typia.random<string & tags.Format<"uuid">>();

  // 4. Prepare update body (simulate e.g., re-scheduling or escalated delivery)
  const updateBody = {
    reminder_time: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour from now
    recipient_type: "patient",
    recipient_id: typia.random<string & tags.Format<"uuid">>(),
    delivery_channel: RandomGenerator.pick(["sms", "email", "in_app"] as const),
    delivery_status: RandomGenerator.pick([
      "pending",
      "sent",
      "failed",
    ] as const),
  } satisfies IHealthcarePlatformAppointmentReminder.IUpdate;

  // 5. Perform the update
  const updated: IHealthcarePlatformAppointmentReminder =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.reminders.update(
      connection,
      {
        appointmentId,
        reminderId,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 6. Validate returned data matches update body for update fields
  TestValidator.equals(
    "reminder_time updated",
    updated.reminder_time,
    updateBody.reminder_time,
  );
  TestValidator.equals(
    "recipient_type updated",
    updated.recipient_type,
    updateBody.recipient_type,
  );
  TestValidator.equals(
    "recipient_id updated",
    updated.recipient_id,
    updateBody.recipient_id,
  );
  TestValidator.equals(
    "delivery_channel updated",
    updated.delivery_channel,
    updateBody.delivery_channel,
  );
  TestValidator.equals(
    "delivery_status updated",
    updated.delivery_status,
    updateBody.delivery_status,
  );
  TestValidator.equals(
    "appointment_id matches",
    updated.appointment_id,
    appointmentId,
  );
  TestValidator.equals("reminder_id matches", updated.id, reminderId);
}
