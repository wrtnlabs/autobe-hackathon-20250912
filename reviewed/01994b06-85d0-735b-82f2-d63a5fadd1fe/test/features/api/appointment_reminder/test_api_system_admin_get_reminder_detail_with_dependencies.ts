import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test retrieval of appointment reminder detail as system admin, including
 * all required business flows and edge cases.
 *
 * Steps:
 *
 * 1. Register and login as system admin to enable permissions for the
 *    /healthcarePlatform/systemAdmin endpoints
 * 2. Register and login as organization admin for appointment and reminder
 *    creation (System admin cannot directly create appointment/reminder)
 * 3. Create an appointment using the organization admin account
 * 4. Create a reminder for the appointment using org admin
 * 5. Switch back to system admin session
 * 6. Fetch the created reminder detail as system admin (success case)
 * 7. Fetch reminder with invalid (random/nonexistent) reminderId
 * 8. Fetch with invalid (random/nonexistent) appointmentId
 * 9. Permission denied: attempt to fetch reminder after logging out (simulate
 *    unauthorized access by clearing auth)
 * 10. (Edge) Try fetch with reminder/appointment that doesn't belong to
 *     requested organization or is in wrong format (skip: not directly
 *     testable without API side effects)
 *
 * Validate: successful scenario returns correct reminder, error cases
 * return errors, and typia asserts all types. TestValidator.error used for
 * negative scenarios with descriptive titles.
 */
export async function test_api_system_admin_get_reminder_detail_with_dependencies(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: "systemAdminTestPw1!",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminJoin);
  // 2. Register organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "orgAdminPw!2@",
        provider: "local",
        provider_key: orgAdminEmail,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);
  // 3. Login as organization admin
  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: "orgAdminPw!2@",
        provider: "local",
        provider_key: orgAdminEmail,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgAdminLogin);
  // 4. Create appointment as organization admin
  const orgId = orgAdminLogin.id;
  const providerId = typia.random<string & tags.Format<"uuid">>();
  const patientId = typia.random<string & tags.Format<"uuid">>();
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const appointmentCreateBody = {
    healthcare_platform_organization_id: orgId,
    provider_id: providerId,
    patient_id: patientId,
    status_id: statusId,
    appointment_type: "in-person",
    start_time: new Date(Date.now() + 3600000).toISOString(),
    end_time: new Date(Date.now() + 7200000).toISOString(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      {
        body: appointmentCreateBody,
      },
    );
  typia.assert(appointment);
  // 5. Create reminder for appointment as organization admin
  const recipientId = patientId;
  const reminderCreateBody = {
    reminder_time: new Date(Date.now() + 1800000).toISOString(),
    recipient_type: "patient",
    recipient_id: recipientId,
    delivery_channel: "email",
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: reminderCreateBody,
      },
    );
  typia.assert(reminder);
  // 6. Login as system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      password: "systemAdminTestPw1!",
      provider: "local",
      provider_key: sysAdminEmail,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  // 7. Success case: Get reminder detail as system admin
  const got =
    await api.functional.healthcarePlatform.systemAdmin.appointments.reminders.at(
      connection,
      {
        appointmentId: appointment.id,
        reminderId: reminder.id,
      },
    );
  typia.assert(got);
  TestValidator.equals(
    "system admin retrieves expected reminder",
    got,
    reminder,
  );
  // 8. Error: Non-existent reminderId
  const randomReminderId = typia.random<string & tags.Format<"uuid">>();
  if (randomReminderId !== reminder.id) {
    await TestValidator.error(
      "system admin fails for non-existent reminderId",
      async () => {
        await api.functional.healthcarePlatform.systemAdmin.appointments.reminders.at(
          connection,
          {
            appointmentId: appointment.id,
            reminderId: randomReminderId,
          },
        );
      },
    );
  }
  // 9. Error: Non-existent appointmentId
  const randomAppointmentId = typia.random<string & tags.Format<"uuid">>();
  if (randomAppointmentId !== appointment.id) {
    await TestValidator.error(
      "system admin fails for non-existent appointmentId",
      async () => {
        await api.functional.healthcarePlatform.systemAdmin.appointments.reminders.at(
          connection,
          {
            appointmentId: randomAppointmentId,
            reminderId: reminder.id,
          },
        );
      },
    );
  }
  // 10. Permission denied: simulate unauthenticated session
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot retrieve reminder",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.appointments.reminders.at(
        unauthConn,
        {
          appointmentId: appointment.id,
          reminderId: reminder.id,
        },
      );
    },
  );
}
