import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Verifies that a department head can retrieve the details of a reminder on an
 * appointment under their department. Checks the proper fields are returned
 * (recipient, schedule, message), and ensures correct enforcement of department
 * boundaries. Includes error/failure scenario where department head requests a
 * reminder outside their permitted department—should receive an authorization
 * error.
 */
export async function test_api_appointment_reminder_retrieval_by_department_head(
  connection: api.IConnection,
) {
  // 1. Create organization admin and join
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdmin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: "12345678",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgAdmin);

  // 2. Organization admin login (to ensure session state)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "12345678",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Department Head joins (simulate department related to org)
  const departmentHeadEmail = typia.random<string & tags.Format<"email">>();
  const departmentHead: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: {
        email: departmentHeadEmail,
        full_name: RandomGenerator.name(),
        password: "12345678",
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    });
  typia.assert(departmentHead);

  // 4. Department Head login (to ensure session state)
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: departmentHeadEmail,
      password: "12345678",
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // 5. Organization Admin: create an appointment (simulate required UUIDs, dept id, etc.)
  const appointment: IHealthcarePlatformAppointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgAdmin.id,
          healthcare_platform_department_id: null,
          provider_id: typia.random<string & tags.Format<"uuid">>(),
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: "in-person",
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointment);

  // 6. Department Head login to ensure correct session
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: departmentHeadEmail,
      password: "12345678",
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // 7. Department Head: create reminder for the appointment
  const reminderRecipientId = appointment.patient_id;
  const reminder: IHealthcarePlatformAppointmentReminder =
    await api.functional.healthcarePlatform.departmentHead.appointments.reminders.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          reminder_time: new Date(Date.now() + 600000).toISOString(),
          recipient_type: "patient",
          recipient_id: reminderRecipientId,
          delivery_channel: "in_app",
        } satisfies IHealthcarePlatformAppointmentReminder.ICreate,
      },
    );
  typia.assert(reminder);

  // 8. Retrieve the reminder as department head and verify fields
  const retrieved: IHealthcarePlatformAppointmentReminder =
    await api.functional.healthcarePlatform.departmentHead.appointments.reminders.at(
      connection,
      {
        appointmentId: appointment.id,
        reminderId: reminder.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals("reminder id matches", retrieved.id, reminder.id);
  TestValidator.equals(
    "reminder recipient matches",
    retrieved.recipient_id,
    reminderRecipientId,
  );
  TestValidator.equals(
    "reminder recipient type matches",
    retrieved.recipient_type,
    "patient",
  );
  TestValidator.equals(
    "reminder channel matches",
    retrieved.delivery_channel,
    "in_app",
  );
  TestValidator.predicate(
    "reminder_time is iso string",
    typeof retrieved.reminder_time === "string",
  );
  TestValidator.predicate(
    "delivery status is string",
    typeof retrieved.delivery_status === "string",
  );

  // 9. Switch to a different department head (foreign user in another department/org)
  const otherDeptHeadEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: otherDeptHeadEmail,
      full_name: RandomGenerator.name(),
      password: "12345678",
    } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
  });
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: otherDeptHeadEmail,
      password: "12345678",
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // 10. Cross-department head should not be able to access the appointment reminder
  await TestValidator.error(
    "should not retrieve reminder in foreign department",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.appointments.reminders.at(
        connection,
        {
          appointmentId: appointment.id,
          reminderId: reminder.id,
        },
      );
    },
  );
}
