import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate system admin appointment reminder creation and business rules.
 *
 * 1. Create system admin user (join, login)
 * 2. Create receptionist user (join, login)
 * 3. Receptionist creates appointment with all valid field linkages
 * 4. Switch login to system admin
 * 5. System admin creates appointment reminder, referencing appointment/patient
 * 6. Validate response (IDs match, time/channel are correct)
 * 7. Validate duplicate reminder is rejected by business logic
 */
export async function test_api_create_reminder_systemadmin_valid(
  connection: api.IConnection,
) {
  // System admin creation and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(admin);

  // System admin login (simulate context switch, ensure session is valid)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // Receptionist creation and login
  const recepEmail = typia.random<string & tags.Format<"email">>();
  const recepPassword = RandomGenerator.alphaNumeric(10);
  const recep: IHealthcarePlatformReceptionist.IAuthorized =
    await api.functional.auth.receptionist.join(connection, {
      body: {
        email: recepEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    });
  typia.assert(recep);

  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: recepEmail,
      password: recepPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // Create an appointment (using receptionist credentials)
  // Generate necessary UUIDs for provider, patient, status, org
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const providerId = typia.random<string & tags.Format<"uuid">>();
  const patientId = typia.random<string & tags.Format<"uuid">>();
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const start = new Date(Date.now() + 3600 * 1000); // One hour from now
  const end = new Date(Date.now() + 2 * 3600 * 1000); // Two hours from now
  const appointmentCreate = {
    healthcare_platform_organization_id: organizationId,
    provider_id: providerId,
    patient_id: patientId,
    status_id: statusId,
    appointment_type: RandomGenerator.pick([
      "in-person",
      "telemedicine",
      "consultation",
    ] as const),
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment: IHealthcarePlatformAppointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: appointmentCreate,
      },
    );
  typia.assert(appointment);
  TestValidator.equals(
    "created appointment organization",
    appointment.healthcare_platform_organization_id,
    organizationId,
  );
  TestValidator.equals(
    "created appointment provider",
    appointment.provider_id,
    providerId,
  );
  TestValidator.equals(
    "created appointment patient",
    appointment.patient_id,
    patientId,
  );
  TestValidator.equals(
    "created appointment status",
    appointment.status_id,
    statusId,
  );

  // Switch back to system admin context (login to set correct credentials)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // Create appointment reminder for the patient
  const reminderTime = new Date(start.getTime() - 15 * 60 * 1000).toISOString(); // 15min before start
  const reminderCreate = {
    reminder_time: reminderTime,
    recipient_type: "patient",
    recipient_id: appointment.patient_id,
    delivery_channel: RandomGenerator.pick(["email", "sms", "in_app"] as const),
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;
  const reminder: IHealthcarePlatformAppointmentReminder =
    await api.functional.healthcarePlatform.systemAdmin.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: reminderCreate,
      },
    );
  typia.assert(reminder);
  TestValidator.equals(
    "associated appointment id matches",
    reminder.appointment_id,
    appointment.id,
  );
  TestValidator.equals(
    "reminder recipient id matches",
    reminder.recipient_id,
    appointment.patient_id,
  );
  TestValidator.equals(
    "reminder recipient type matches",
    reminder.recipient_type,
    "patient",
  );
  TestValidator.equals(
    "reminder time matches",
    reminder.reminder_time,
    reminderTime,
  );
  TestValidator.equals(
    "reminder delivery channel matches",
    reminder.delivery_channel,
    reminderCreate.delivery_channel,
  );

  // Try to create a duplicate reminder with the same parameters (should reject)
  await TestValidator.error(
    "duplicate reminder for same appointment/recipient/time should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.appointments.reminders.create(
        connection,
        {
          appointmentId: appointment.id,
          body: reminderCreate,
        },
      );
    },
  );
}
