import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Validate technician can update a scheduled appointment reminder successfully
 * (happy path).
 *
 * 1. Receptionist registration and login
 * 2. Receptionist creates appointment
 * 3. Technician registration and login
 * 4. Technician creates an appointment reminder
 * 5. Technician updates the reminder's allowed updatable fields (e.g.
 *    reminder_time, recipient, channel, status)
 * 6. Validate the update response is correct, forbidden fields unmodified, and
 *    business logic is enforced.
 */
export async function test_api_appointment_reminder_update_by_technician_success(
  connection: api.IConnection,
) {
  // -- Receptionist registration & login --
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistPassword = RandomGenerator.alphaNumeric(10);

  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: {
      email: receptionistEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(receptionist);

  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword,
    },
  });

  // -- Appointment creation --
  // These UUIDs are random as valid stand-ins for other related entities
  const appointmentRequest = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: "in-person",
    start_time: new Date(Date.now() + 604800000).toISOString(), // 1 week from now
    end_time: new Date(Date.now() + 604800000 + 1800000).toISOString(), // 30 min after start
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      { body: appointmentRequest },
    );
  typia.assert(appointment);

  // -- Technician registration & login --
  const technicianEmail = typia.random<string & tags.Format<"email">>();
  const technicianPassword = RandomGenerator.alphaNumeric(10);
  const technician = await api.functional.auth.technician.join(connection, {
    body: {
      email: technicianEmail,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(8),
      specialty: "Radiology",
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(technician);

  await api.functional.auth.technician.login(connection, {
    body: {
      email: technicianEmail,
      password: technicianPassword,
    },
  });

  // -- Reminder creation by technician --
  const reminderCreate = {
    reminder_time: new Date(Date.now() + 600000).toISOString(), // 10 min from now
    recipient_type: "patient",
    recipient_id: appointment.patient_id,
    delivery_channel: "email",
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.technician.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: reminderCreate,
      },
    );
  typia.assert(reminder);
  TestValidator.equals(
    "reminder appointment_id links to appointment",
    reminder.appointment_id,
    appointment.id,
  );

  // -- Reminder update by technician (change fields)
  // Only supply IUpdate-allowed fields
  const updatedReminderInput = {
    reminder_time: new Date(Date.now() + 1800000).toISOString(), // 30 min from now
    delivery_status: "pending",
    delivery_channel: "sms",
  } satisfies IHealthcarePlatformAppointmentReminder.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.technician.appointments.reminders.update(
      connection,
      {
        appointmentId: appointment.id,
        reminderId: reminder.id,
        body: updatedReminderInput,
      },
    );
  typia.assert(updated);

  // -- Validate update worked (all changed fields updated)
  TestValidator.equals(
    "updated reminder_time",
    updated.reminder_time,
    updatedReminderInput.reminder_time,
  );
  TestValidator.equals(
    "updated delivery_status",
    updated.delivery_status,
    updatedReminderInput.delivery_status,
  );
  TestValidator.equals(
    "updated delivery_channel",
    updated.delivery_channel,
    updatedReminderInput.delivery_channel,
  );
  TestValidator.equals("static reminder id", updated.id, reminder.id);
  TestValidator.equals(
    "static appointment_id",
    updated.appointment_id,
    reminder.appointment_id,
  );
}
