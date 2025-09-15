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
 * Receptionist user fetches the details of a reminder associated with an
 * appointment in their organization.
 *
 * Steps:
 *
 * 1. Receptionist user is created and joined.
 * 2. Receptionist logs in.
 * 3. Receptionist creates an appointment and stores appointmentId.
 * 4. System admin registers and logs in, then creates a reminder for the
 *    appointment (returns reminderId).
 * 5. Receptionist logs back in.
 * 6. Receptionist fetches the reminder details with GET to confirm full visibility
 *    to all allowed fields.
 *
 * Validate that all relevant attributes (status, delivery channel, schedule,
 * recipient) are present and correct.
 */
export async function test_api_reminder_detail_receptionist_role_valid(
  connection: api.IConnection,
) {
  // 1. Receptionist registration (join)
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistPassword = RandomGenerator.alphaNumeric(12);
  const receptionist: IHealthcarePlatformReceptionist.IAuthorized =
    await api.functional.auth.receptionist.join(connection, {
      body: {
        email: receptionistEmail,
        full_name: RandomGenerator.name(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    });
  typia.assert(receptionist);

  // 2. Receptionist login
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 3. Receptionist creates appointment
  const appointmentBody = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: "in-person",
    start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment: IHealthcarePlatformAppointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      { body: appointmentBody },
    );
  typia.assert(appointment);

  // 4. SystemAdmin registration and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        provider: "local",
        provider_key: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(admin);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  // 4b. System admin creates reminder for appointment
  const reminderPayload = {
    reminder_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    recipient_type: "patient",
    recipient_id: appointment.patient_id,
    delivery_channel: "email",
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;
  const reminder: IHealthcarePlatformAppointmentReminder =
    await api.functional.healthcarePlatform.systemAdmin.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: reminderPayload,
      },
    );
  typia.assert(reminder);

  // 5. Receptionist login (restore role)
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 6. Receptionist fetches reminder details
  const reminderDetail: IHealthcarePlatformAppointmentReminder =
    await api.functional.healthcarePlatform.receptionist.appointments.reminders.at(
      connection,
      {
        appointmentId: appointment.id,
        reminderId: reminder.id,
      },
    );
  typia.assert(reminderDetail);

  // Validation of reminder fields and logic
  TestValidator.equals(
    "reminder appointment_id matches",
    reminderDetail.appointment_id,
    appointment.id,
  );
  TestValidator.equals("reminder id matches", reminderDetail.id, reminder.id);
  TestValidator.equals(
    "reminder recipient_id matches",
    reminderDetail.recipient_id,
    reminderPayload.recipient_id,
  );
  TestValidator.equals(
    "reminder delivery_channel matches",
    reminderDetail.delivery_channel,
    reminderPayload.delivery_channel,
  );
  TestValidator.equals(
    "reminder recipient_type matches",
    reminderDetail.recipient_type,
    reminderPayload.recipient_type,
  );
  TestValidator.equals(
    "reminder reminder_time matches",
    reminderDetail.reminder_time,
    reminderPayload.reminder_time,
  );
  TestValidator.predicate(
    "reminder delivery_status is present string",
    typeof reminderDetail.delivery_status === "string" &&
      !!reminderDetail.delivery_status.length,
  );
  TestValidator.predicate(
    "reminder created_at is valid ISO string",
    typeof reminderDetail.created_at === "string" &&
      !isNaN(new Date(reminderDetail.created_at).getTime()),
  );
  TestValidator.predicate(
    "reminder updated_at is valid ISO string",
    typeof reminderDetail.updated_at === "string" &&
      !isNaN(new Date(reminderDetail.updated_at).getTime()),
  );
}
