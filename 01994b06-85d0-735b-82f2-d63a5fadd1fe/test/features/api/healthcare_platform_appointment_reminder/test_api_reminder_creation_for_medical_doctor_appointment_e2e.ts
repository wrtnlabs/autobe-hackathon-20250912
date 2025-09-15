import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";

/**
 * E2E test for appointment reminder creation by a medical doctor.
 *
 * This test executes the following business scenario:
 *
 * 1. Doctor self-registers with unique credentials.
 * 2. Doctor logs in to obtain authorization.
 * 3. Doctor books an appointment using their own provider_id as the doctor and
 *    a random patient ID.
 * 4. Doctor creates a reminder for this appointment, with themselves as the
 *    recipient (recipient_type: 'provider').
 * 5. TestValidator used to confirm correct creation (fields and ownership
 *    match, 201 status).
 * 6. Negative test 1: attempt to create reminder for non-existent appointment,
 *    expect error.
 * 7. Negative test 2: attempt to create reminder with unrelated recipient_id,
 *    expect error (403 or 400, since not related).
 */
export async function test_api_reminder_creation_for_medical_doctor_appointment_e2e(
  connection: api.IConnection,
) {
  // 1. Register a new medical doctor.
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(2),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: joinInput,
  });
  typia.assert(doctor);

  // 2. Medical doctor login to validate session/token
  const doctorLogin = await api.functional.auth.medicalDoctor.login(
    connection,
    {
      body: {
        email: joinInput.email,
        password: joinInput.password,
      },
    },
  );
  typia.assert(doctorLogin);

  // 3. Create an appointment as this doctor
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const patientId = typia.random<string & tags.Format<"uuid">>();
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const start_time = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(); // 3 hours from now
  const end_time = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours from now
  const appointmentInput = {
    healthcare_platform_organization_id: orgId,
    provider_id: doctor.id,
    patient_id: patientId,
    status_id: statusId,
    appointment_type: "in-person",
    start_time,
    end_time,
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.create(
      connection,
      { body: appointmentInput },
    );
  typia.assert(appointment);

  // 4. Create a reminder for this appointment by the doctor, for themselves
  const reminder_time = new Date(
    now.getTime() + 2 * 60 * 60 * 1000,
  ).toISOString(); // 2 hours from now
  const reminderInput1 = {
    reminder_time,
    recipient_type: "provider",
    recipient_id: doctor.id,
    delivery_channel: "email",
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;
  const reminder1 =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: reminderInput1,
      },
    );
  typia.assert(reminder1);
  TestValidator.equals(
    "reminder appointment id",
    reminder1.appointment_id,
    appointment.id,
  );
  TestValidator.equals(
    "reminder recipient id is doctor",
    reminder1.recipient_id,
    doctor.id,
  );

  // 5. Negative case: use invalid appointment id
  const invalidAppointmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail when appointment does not exist",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.reminders.create(
        connection,
        {
          appointmentId: invalidAppointmentId,
          body: reminderInput1,
        },
      );
    },
  );

  // 6. Negative case: unrelated recipient id
  const unrelatedRecipientId = typia.random<string & tags.Format<"uuid">>();
  const reminderInput2 = {
    ...reminderInput1,
    recipient_id: unrelatedRecipientId,
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;
  await TestValidator.error(
    "should fail when recipient is unrelated to appointment",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.reminders.create(
        connection,
        {
          appointmentId: appointment.id,
          body: reminderInput2,
        },
      );
    },
  );
}
