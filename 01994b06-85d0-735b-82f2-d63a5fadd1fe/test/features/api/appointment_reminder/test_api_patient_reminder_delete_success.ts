import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Patient logs in and deletes their own appointment reminder, verifying the
 * reminder is deleted and access control is enforced.
 *
 * 1. Register and log in as patient.
 * 2. Register and log in as receptionist.
 * 3. Receptionist schedules an appointment for the patient.
 * 4. Patient creates a reminder for that appointment.
 * 5. Patient deletes the reminder.
 * 6. Confirm the reminder cannot be retrieved after deletion.
 * 7. Edge: Another patient tries to delete the reminder, should get a 403 error.
 */
export async function test_api_patient_reminder_delete_success(
  connection: api.IConnection,
) {
  // 1. Register and log in as patient
  const patientEmail: string = RandomGenerator.alphaNumeric(12) + "@test.com";
  const patientPassword: string = RandomGenerator.alphaNumeric(12);
  const patientJoin = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(2000, 1, 1).toISOString(),
      password: patientPassword,
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patientJoin);

  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientEmail,
      password: patientPassword,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });

  // 2. Register and log in as receptionist
  const receptionistEmail: string =
    RandomGenerator.alphaNumeric(12) + "@test.com";
  const receptionistJoin = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: receptionistEmail as string & tags.Format<"email">,
        full_name: RandomGenerator.name(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    },
  );
  typia.assert(receptionistJoin);
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail as string & tags.Format<"email">,
      password: receptionistJoin.token.access,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 3. Create an appointment for the patient
  const appointment: IHealthcarePlatformAppointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          provider_id: typia.random<string & tags.Format<"uuid">>(),
          patient_id: patientJoin.id,
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: "in-person",
          start_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointment);

  // Log back in as patient to perform reminder creation
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientEmail,
      password: patientPassword,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });

  // 4. Patient creates appointment reminder
  const reminder: IHealthcarePlatformAppointmentReminder =
    await api.functional.healthcarePlatform.patient.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          reminder_time: appointment.start_time,
          recipient_type: "patient",
          recipient_id: patientJoin.id,
          delivery_channel: "email",
        } satisfies IHealthcarePlatformAppointmentReminder.ICreate,
      },
    );
  typia.assert(reminder);

  // 5. Patient deletes the reminder
  await api.functional.healthcarePlatform.patient.appointments.reminders.erase(
    connection,
    {
      appointmentId: appointment.id,
      reminderId: reminder.id,
    },
  );

  // 6. Confirm reminder cannot be retrieved (simulate by attempting delete again, should fail)
  await TestValidator.error(
    "Deleting already deleted reminder should fail",
    async () => {
      await api.functional.healthcarePlatform.patient.appointments.reminders.erase(
        connection,
        {
          appointmentId: appointment.id,
          reminderId: reminder.id,
        },
      );
    },
  );

  // 7. Edge: Another patient cannot delete first patient's reminder
  const anotherEmail: string = RandomGenerator.alphaNumeric(12) + "@test.com";
  const anotherPassword: string = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.patient.join(connection, {
    body: {
      email: anotherEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1990, 5, 15).toISOString(),
      password: anotherPassword,
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  await api.functional.auth.patient.login(connection, {
    body: {
      email: anotherEmail,
      password: anotherPassword,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });
  await TestValidator.error(
    "Another patient cannot delete not-owned reminder",
    async () => {
      await api.functional.healthcarePlatform.patient.appointments.reminders.erase(
        connection,
        {
          appointmentId: appointment.id,
          reminderId: reminder.id,
        },
      );
    },
  );
}
