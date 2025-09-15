import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Receptionist attempts to delete a reminder for an appointment they did not
 * create.
 *
 * Steps:
 *
 * 1. Receptionist A joins and logs in
 * 2. Receptionist B joins and logs in (as creator)
 * 3. Receptionist B creates an appointment
 * 4. Receptionist B schedules a reminder for the appointment
 * 5. Receptionist A (not the creator) attempts to delete B's reminder
 * 6. Validate that a 403 error is thrown and the reminder is not deleted
 *
 * Note: As per current allowed endpoints, there is no GET or LIST for
 * reminders, so only direct validation of error is possible.
 */
export async function test_api_receptionist_reminder_delete_unauthorized(
  connection: api.IConnection,
) {
  // 1. Receptionist A joins
  const receptionistA_email = typia.random<string & tags.Format<"email">>();
  const receptionistA_password = RandomGenerator.alphaNumeric(10);
  const receptionistA: IHealthcarePlatformReceptionist.IAuthorized =
    await api.functional.auth.receptionist.join(connection, {
      body: {
        email: receptionistA_email,
        full_name: RandomGenerator.name(),
        // phone is optional
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    });
  typia.assert(receptionistA);

  // 2. Receptionist B joins
  const receptionistB_email = typia.random<string & tags.Format<"email">>();
  const receptionistB_password = RandomGenerator.alphaNumeric(10);
  const receptionistB: IHealthcarePlatformReceptionist.IAuthorized =
    await api.functional.auth.receptionist.join(connection, {
      body: {
        email: receptionistB_email,
        full_name: RandomGenerator.name(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    });
  typia.assert(receptionistB);

  // B logs in (refresh authentication context)
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistB_email,
      password: receptionistB_password,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 3. Receptionist B creates an appointment
  const appointment: IHealthcarePlatformAppointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: typia.random<IHealthcarePlatformAppointment.ICreate>(),
      },
    );
  typia.assert(appointment);

  // 4. Receptionist B schedules a reminder for the appointment
  const reminder: IHealthcarePlatformAppointmentReminder =
    await api.functional.healthcarePlatform.receptionist.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          reminder_time: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          recipient_type: "patient",
          recipient_id: appointment.patient_id,
          delivery_channel: "email",
        } satisfies IHealthcarePlatformAppointmentReminder.ICreate,
      },
    );
  typia.assert(reminder);

  // 5. Switch to Receptionist A context (login A to set token)
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistA_email,
      password: receptionistA_password,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 6. Receptionist A attempts to delete B's reminder (should fail with 403)
  await TestValidator.error(
    "Receptionist A cannot delete B's reminder",
    async () => {
      await api.functional.healthcarePlatform.receptionist.appointments.reminders.erase(
        connection,
        {
          appointmentId: appointment.id,
          reminderId: reminder.id,
        },
      );
    },
  );
  // There is no GET or LIST endpoint for reminders to verify existence directly.
}
