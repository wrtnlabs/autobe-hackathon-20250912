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
 * Validate system admin deletion of appointment reminders (audit & compliance).
 *
 * The scenario does the following:
 *
 * 1. Registers and logs in a system admin account.
 * 2. Registers a receptionist account (login not strictly required since join
 *    returns valid auth), and uses that context to create an appointment and
 *    reminder.
 * 3. Receptionist creates an appointment.
 * 4. Receptionist creates a reminder for the appointment.
 * 5. Switch admin user (login as admin again).
 * 6. Admin deletes the reminder by appointment/reminder id.
 * 7. Attempt to delete again (should error, already deleted or not found).
 * 8. Attempt to delete clearly non-existent reminder (should error).
 */
export async function test_api_appointment_reminder_delete_by_system_admin_success_audit_and_compliance(
  connection: api.IConnection,
) {
  // 1. Register and login a system admin account
  const sysEmail = typia.random<string & tags.Format<"email">>();
  const sysAdmin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysEmail,
        full_name: RandomGenerator.name(),
        provider: "local",
        provider_key: sysEmail,
        password: "Password1!",
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(sysAdmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysEmail,
      provider: "local",
      provider_key: sysEmail,
      password: "Password1!",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 2. Register a receptionist account (no password known, but join returns token)
  const recEmail = typia.random<string & tags.Format<"email">>();
  const rec: IHealthcarePlatformReceptionist.IAuthorized =
    await api.functional.auth.receptionist.join(connection, {
      body: {
        email: recEmail,
        full_name: RandomGenerator.name(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    });
  typia.assert(rec);

  // Switch connection/session as receptionist if needed (here, assume allowed or use current session)

  // 3. Receptionist creates an appointment
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
          appointment_type: "in-person",
          start_time: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
          end_time: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointment);

  // 4. Receptionist creates a reminder for the appointment
  const reminder: IHealthcarePlatformAppointmentReminder =
    await api.functional.healthcarePlatform.receptionist.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          reminder_time: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
          recipient_type: "patient",
          recipient_id: appointment.patient_id,
          delivery_channel: "email",
        } satisfies IHealthcarePlatformAppointmentReminder.ICreate,
      },
    );
  typia.assert(reminder);

  // 5. Switch back to system admin role
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysEmail,
      provider: "local",
      provider_key: sysEmail,
      password: "Password1!",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 6. Admin deletes the appointment reminder
  await api.functional.healthcarePlatform.systemAdmin.appointments.reminders.erase(
    connection,
    {
      appointmentId: appointment.id,
      reminderId: reminder.id,
    },
  );
  // Expect no error = successful deletion

  // 7. Try to delete again (should raise an error for already-deleted or nonexistent)
  await TestValidator.error("deleting reminder twice should fail", async () => {
    await api.functional.healthcarePlatform.systemAdmin.appointments.reminders.erase(
      connection,
      {
        appointmentId: appointment.id,
        reminderId: reminder.id,
      },
    );
  });

  // 8. Attempt deleting reminder on unknown/invalid appointment ids
  const bogusAppointmentId = typia.random<string & tags.Format<"uuid">>();
  const bogusReminderId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent reminder should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.appointments.reminders.erase(
        connection,
        {
          appointmentId: bogusAppointmentId,
          reminderId: bogusReminderId,
        },
      );
    },
  );
}
