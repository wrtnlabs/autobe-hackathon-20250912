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
 * Technician attempts to delete a reminder for an appointment not belonging to
 * them. Should receive permission denied.
 *
 * 1. Register two technicians (A, B)
 * 2. Login as A (store credentials)
 * 3. Create a receptionist (since only receptionist can create appointments)
 * 4. Receptionist logins and creates an appointment for technician B
 * 5. Technician B login, create a reminder for own appointment
 * 6. Switch to Technician A session
 * 7. Technician A attempts to delete Technician B's reminder, expect permission
 *    denied (forbidden), and error thrown
 */
export async function test_api_technician_reminder_delete_permission_denied(
  connection: api.IConnection,
) {
  // 1. Register Technician A
  const technicianAEmail = typia.random<string & tags.Format<"email">>();
  const technicianA = await api.functional.auth.technician.join(connection, {
    body: {
      email: technicianAEmail,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(12),
      specialty: RandomGenerator.paragraph({ sentences: 1 }),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  typia.assert(technicianA);

  // 2. Register Technician B
  const technicianBEmail = typia.random<string & tags.Format<"email">>();
  const technicianB = await api.functional.auth.technician.join(connection, {
    body: {
      email: technicianBEmail,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(12),
      specialty: RandomGenerator.paragraph({ sentences: 1 }),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  typia.assert(technicianB);

  // 3. Login as Technician A (to later switch back for the test)
  await api.functional.auth.technician.login(connection, {
    body: {
      email: technicianAEmail,
      password: "password123",
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });

  // 4. Register receptionist
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: {
      email: receptionistEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });
  typia.assert(receptionist);

  // 5. Login as receptionist
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: "password123",
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 6. Create appointment for Technician B (as receptionist)
  const appointmentBody = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    provider_id: technicianB.id,
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: RandomGenerator.pick([
      "in-person",
      "telemedicine",
    ] as const),
    start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    recurrence_rule: null,
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: appointmentBody,
      },
    );
  typia.assert(appointment);

  // 7. Login as Technician B to create the reminder
  await api.functional.auth.technician.login(connection, {
    body: {
      email: technicianBEmail,
      password: "password123",
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });

  const reminderBody = {
    reminder_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    recipient_type: "provider",
    recipient_id: technicianB.id,
    delivery_channel: RandomGenerator.pick(["email", "sms", "in_app"] as const),
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.technician.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: reminderBody,
      },
    );
  typia.assert(reminder);

  // 8. Switch to Technician A (who is unauthorized to the appointment)
  await api.functional.auth.technician.login(connection, {
    body: {
      email: technicianAEmail,
      password: "password123",
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });

  // 9. Attempt to delete the reminder belonging to appointment for Technician B
  await TestValidator.error(
    "technician cannot delete another technician's appointment reminder",
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
