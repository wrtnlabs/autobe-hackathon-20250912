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
 * Validate the ability of an authenticated technician to delete a reminder for
 * a specific appointment.
 *
 * 1. Receptionist joins.
 * 2. Technician joins.
 * 3. Receptionist creates an appointment.
 * 4. Technician creates a reminder for the appointment.
 * 5. Technician deletes the reminder successfully.
 * 6. Try to delete the same reminder again (should fail).
 */
export async function test_api_technician_reminder_delete_success(
  connection: api.IConnection,
) {
  // Create receptionist
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistJoin = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: receptionistEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    },
  );
  typia.assert(receptionistJoin);
  // Create technician
  const technicianEmail = typia.random<string & tags.Format<"email">>();
  const technicianJoin = await api.functional.auth.technician.join(connection, {
    body: {
      email: technicianEmail,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(8),
      specialty: RandomGenerator.pick([
        "Radiology",
        "Phlebotomy",
        "Cardiology",
      ]),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  typia.assert(technicianJoin);
  // Receptionist creates an appointment
  const appointmentReq = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: RandomGenerator.pick(["in-person", "telemedicine"]),
    start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: appointmentReq,
      },
    );
  typia.assert(appointment);
  // Technician creates the reminder
  const reminderReq = {
    reminder_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    recipient_type: "provider",
    recipient_id: appointment.provider_id,
    delivery_channel: RandomGenerator.pick(["email", "sms"]),
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.technician.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: reminderReq,
      },
    );
  typia.assert(reminder);
  // Delete reminder (success)
  await api.functional.healthcarePlatform.technician.appointments.reminders.erase(
    connection,
    {
      appointmentId: appointment.id,
      reminderId: reminder.id,
    },
  );
  // Delete again (should fail)
  await TestValidator.error(
    "deleting the same reminder twice should fail",
    async () => {
      await api.functional.healthcarePlatform.technician.appointments.reminders.erase(
        connection,
        {
          appointmentId: appointment.id,
          reminderId: reminder.id,
        },
      );
    },
  );
}
