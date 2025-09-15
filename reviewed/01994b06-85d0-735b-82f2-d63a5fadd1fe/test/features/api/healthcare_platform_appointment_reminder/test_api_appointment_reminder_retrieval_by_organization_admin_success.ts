import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate that an organization admin can successfully retrieve the details of
 * an appointment reminder for an appointment within their organization, and
 * that access to reminders outside their organization is denied.
 *
 * This test does the following:
 *
 * 1. Registers and authenticates as the first organization admin
 * 2. Creates an appointment belonging to their organization
 * 3. Schedules a reminder for this appointment
 * 4. Retrieves the reminder by ID and verifies that all business fields match what
 *    was created
 * 5. Registers a second organization admin (representing a different organization)
 * 6. Attempts to access the first admin's reminder with the second admin,
 *    verifying an error is thrown (access control enforced)
 *
 * Success: Organization admin can access only their own organization's
 * reminders, and all data fields in the retrieved reminder match what was
 * originally created.
 */
export async function test_api_appointment_reminder_retrieval_by_organization_admin_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as first organization admin
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: admin1Email,
        full_name: RandomGenerator.name(),
        password: "Pa$$w0rd!#",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(admin1);

  // 2. Create an appointment in admin1's org
  const appointmentBody = {
    healthcare_platform_organization_id: admin1.id satisfies string as string,
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: "in-person",
    start_time: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    end_time: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment: IHealthcarePlatformAppointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      {
        body: appointmentBody,
      },
    );
  typia.assert(appointment);

  // 3. Create a reminder for this appointment
  const reminderBody = {
    reminder_time: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    recipient_type: "patient",
    recipient_id: appointment.patient_id,
    delivery_channel: "email",
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;
  const reminder: IHealthcarePlatformAppointmentReminder =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: reminderBody,
      },
    );
  typia.assert(reminder);

  // 4. Retrieve the reminder and check its fields
  const fetched: IHealthcarePlatformAppointmentReminder =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.reminders.at(
      connection,
      {
        appointmentId: appointment.id,
        reminderId: reminder.id,
      },
    );
  typia.assert(fetched);

  TestValidator.equals("reminder id matches", fetched.id, reminder.id);
  TestValidator.equals(
    "reminder appointment_id matches",
    fetched.appointment_id,
    appointment.id,
  );
  TestValidator.equals(
    "reminder recipient_type matches",
    fetched.recipient_type,
    reminderBody.recipient_type,
  );
  TestValidator.equals(
    "reminder recipient_id matches",
    fetched.recipient_id,
    reminderBody.recipient_id,
  );
  TestValidator.equals(
    "reminder delivery_channel matches",
    fetched.delivery_channel,
    reminderBody.delivery_channel,
  );
  TestValidator.equals(
    "reminder_time matches",
    fetched.reminder_time,
    reminderBody.reminder_time,
  );

  // 5. Register and authenticate as second organization admin (different org)
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: admin2Email,
        full_name: RandomGenerator.name(),
        password: "Pa#sW0rd9876",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(admin2);

  // 6. As admin2, attempt to fetch admin1's reminder and expect access denied
  await TestValidator.error(
    "Org admin from other org cannot access non-owned reminder",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.appointments.reminders.at(
        connection,
        {
          appointmentId: appointment.id,
          reminderId: reminder.id,
        },
      );
    },
  );
}
