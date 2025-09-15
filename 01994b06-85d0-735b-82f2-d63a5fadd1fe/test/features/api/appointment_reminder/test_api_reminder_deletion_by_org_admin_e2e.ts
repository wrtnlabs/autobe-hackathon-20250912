import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * End-to-end workflow for validating organization admin deletion of an
 * appointment reminder.
 *
 * Steps:
 *
 * 1. Register a new organization admin account (unique email, full_name,
 *    password, etc).
 * 2. Log in as the organization admin (establishes session context).
 * 3. Create an appointment with valid random references for required fields
 *    (organization, patient, provider, status, time).
 * 4. Create a reminder for the created appointment (generate appointmentId and
 *    reminderId).
 * 5. Delete the reminder using the correct org admin context.
 * 6. Assert that reminder can no longer be retrieved (simulate by attempting
 *    to re-delete, expecting error).
 * 7. Negative: Attempt deletion with a fake/inexistent reminderId.
 * 8. (Optional, covered by business rules): Permission check is implicit,
 *    since all steps use legit org admin workflow only.
 *
 * All IDs and inputs conform to typia tag format requirements. All error
 * assertions use TestValidator.error with appropriate titles.
 */
export async function test_api_reminder_deletion_by_org_admin_e2e(
  connection: api.IConnection,
) {
  // 1. Register organization admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(admin);

  // 2. Log in (to set token)
  const adminLoginInput = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const login = await api.functional.auth.organizationAdmin.login(connection, {
    body: adminLoginInput,
  });
  typia.assert(login);
  TestValidator.equals(
    "joined and login are for same admin",
    login.email,
    admin.email,
  );

  // 3. Create appointment
  const appointmentInput = {
    healthcare_platform_organization_id: admin.id satisfies string as string,
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: RandomGenerator.pick([
      "in-person",
      "telemedicine",
      "other",
    ] as const),
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600 * 1000).toISOString(),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      { body: appointmentInput },
    );
  typia.assert(appointment);

  // 4. Create reminder
  const reminderInput = {
    reminder_time: new Date(Date.now() + 1800 * 1000).toISOString(),
    recipient_type: "patient",
    recipient_id: appointment.patient_id,
    delivery_channel: RandomGenerator.pick(["email", "sms", "in_app"] as const),
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: reminderInput,
      },
    );
  typia.assert(reminder);

  // 5. Delete the reminder for the appointment
  await api.functional.healthcarePlatform.organizationAdmin.appointments.reminders.erase(
    connection,
    {
      appointmentId: appointment.id,
      reminderId: reminder.id,
    },
  );

  // 6. Assert cannot re-delete (should error)
  await TestValidator.error(
    "re-deleting already-deleted reminder fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.appointments.reminders.erase(
        connection,
        {
          appointmentId: appointment.id,
          reminderId: reminder.id,
        },
      );
    },
  );

  // 7. Negative: Attempt to delete non-existent reminder
  await TestValidator.error(
    "deleting non-existent reminder errors",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.appointments.reminders.erase(
        connection,
        {
          appointmentId: appointment.id,
          reminderId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
