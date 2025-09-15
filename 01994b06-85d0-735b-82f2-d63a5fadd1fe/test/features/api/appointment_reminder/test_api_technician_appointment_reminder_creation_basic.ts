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
 * End-to-end test for creation of an appointment reminder by a technician in a
 * healthcare platform.
 *
 * Steps:
 *
 * 1. Register a receptionist and login (to create appointment).
 * 2. Register a technician and login (for reminder creation).
 * 3. Receptionist creates a valid appointment using required fields.
 * 4. Switch to technician and create a reminder for this appointment to provider
 *    using valid schedule and delivery details.
 * 5. Verify the reminder is correctly linked, all required fields are present, and
 *    response types are correct.
 * 6. Attempt to create reminder for nonexistent appointment and for invalid
 *    recipient - both must fail.
 */
export async function test_api_technician_appointment_reminder_creation_basic(
  connection: api.IConnection,
) {
  // 1. Receptionist registration
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionist: IHealthcarePlatformReceptionist.IAuthorized =
    await api.functional.auth.receptionist.join(connection, {
      body: {
        email: receptionistEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    });
  typia.assert(receptionist);

  // 2. Technician registration
  const technicianEmail = typia.random<string & tags.Format<"email">>();
  const technicianPassword = RandomGenerator.alphaNumeric(10);
  const technician: IHealthcarePlatformTechnician.IAuthorized =
    await api.functional.auth.technician.join(connection, {
      body: {
        email: technicianEmail,
        full_name: RandomGenerator.name(),
        license_number: RandomGenerator.alphaNumeric(12),
        specialty: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 4,
          wordMax: 10,
        }),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformTechnician.IJoin,
    });
  typia.assert(technician);

  // 3. Receptionist login
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: "password", // Password assumed to be set during join flow
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 4. Create a valid appointment - all UUIDs are generated as random, but in real systems lookup would be used
  const appointment: IHealthcarePlatformAppointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          provider_id: typia.random<string & tags.Format<"uuid">>(),
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: RandomGenerator.pick([
            "in-person",
            "telemedicine",
            "consultation",
          ] as const),
          start_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointment);

  // 5. Switch to technician login
  await api.functional.auth.technician.login(connection, {
    body: {
      email: technicianEmail,
      password: technicianPassword,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });

  // 6. Technician creates a reminder for the appointment (happy path)
  const reminderTime = new Date(Date.now() + 20 * 60 * 1000).toISOString();
  const reminder: IHealthcarePlatformAppointmentReminder =
    await api.functional.healthcarePlatform.technician.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          reminder_time: reminderTime,
          recipient_type: "provider",
          recipient_id: appointment.provider_id,
          delivery_channel: "email",
        } satisfies IHealthcarePlatformAppointmentReminder.ICreate,
      },
    );
  typia.assert(reminder);
  TestValidator.equals(
    "appointment_id linked",
    reminder.appointment_id,
    appointment.id,
  );
  TestValidator.equals(
    "reminder_time correct",
    reminder.reminder_time,
    reminderTime,
  );
  TestValidator.equals(
    "recipient_id correct",
    reminder.recipient_id,
    appointment.provider_id,
  );
  TestValidator.equals(
    "delivery_channel set",
    reminder.delivery_channel,
    "email",
  );
  TestValidator.equals(
    "recipient_type set",
    reminder.recipient_type,
    "provider",
  );
  TestValidator.predicate(
    "reminder creation status present",
    typeof reminder.delivery_status === "string" &&
      reminder.delivery_status.length > 0,
  );

  // 7. Attempt to create a reminder for a nonexistent appointment
  await TestValidator.error(
    "reminder for nonexistent appointment fails",
    async () => {
      await api.functional.healthcarePlatform.technician.appointments.reminders.create(
        connection,
        {
          appointmentId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            reminder_time: new Date(Date.now() + 600000).toISOString(),
            recipient_type: "provider",
            recipient_id: appointment.provider_id,
            delivery_channel: "email",
          } satisfies IHealthcarePlatformAppointmentReminder.ICreate,
        },
      );
    },
  );

  // 8. Attempt to create a reminder for invalid recipient_id (random UUID not related to appointment)
  await TestValidator.error(
    "reminder for unrelated recipient_id fails",
    async () => {
      await api.functional.healthcarePlatform.technician.appointments.reminders.create(
        connection,
        {
          appointmentId: appointment.id,
          body: {
            reminder_time: new Date(Date.now() + 1800000).toISOString(),
            recipient_type: "provider",
            recipient_id: typia.random<string & tags.Format<"uuid">>(),
            delivery_channel: "email",
          } satisfies IHealthcarePlatformAppointmentReminder.ICreate,
        },
      );
    },
  );
}
