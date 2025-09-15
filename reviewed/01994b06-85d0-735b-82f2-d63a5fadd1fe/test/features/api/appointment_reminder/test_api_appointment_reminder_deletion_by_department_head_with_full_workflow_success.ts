import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate successful and unsuccessful reminder deletion by department head
 * with full prerequisite workflow.
 *
 * Steps:
 *
 * 1. Create a system admin & login.
 * 2. Create an organization as system admin.
 * 3. Create an org admin & login.
 * 4. Create a department in the org as org admin.
 * 5. Create and login a department head.
 * 6. Create an appointment as department head (use self as both provider_id and
 *    patient_id, random status_id).
 * 7. Add a reminder to the appointment (recipient is self, channel "email").
 * 8. Department head deletes the reminder: expect success.
 * 9. Attempt to delete without login (unauthenticated): expect error.
 * 10. Attempt to delete with random bogus appointment/reminder ids: expect error.
 */
export async function test_api_appointment_reminder_deletion_by_department_head_with_full_workflow_success(
  connection: api.IConnection,
) {
  // 1. System admin join & login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPass = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: adminEmail,
      password: adminPass,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPass,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 2. Create organization
  const orgBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: `Org ${RandomGenerator.name()}`,
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgBody },
    );
  typia.assert(org);

  // 3. Organization admin join & login
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPass = RandomGenerator.alphaNumeric(10);
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPass,
        provider: "local",
        provider_key: orgAdminEmail,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPass,
      provider: "local",
      provider_key: orgAdminEmail,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4. Create department
  const deptBody = {
    healthcare_platform_organization_id: org.id,
    code: RandomGenerator.alphaNumeric(5),
    name: `Dept ${RandomGenerator.name(1)}`,
    status: "active",
  } satisfies IHealthcarePlatformDepartment.ICreate;
  const dept =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id,
        body: deptBody,
      },
    );
  typia.assert(dept);

  // 5. Department head join & login
  const dhEmail = typia.random<string & tags.Format<"email">>();
  const dhPass = RandomGenerator.alphaNumeric(11);
  const dhJoin = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: dhEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: dhPass,
    } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
  });
  typia.assert(dhJoin);
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: dhEmail,
      password: dhPass,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // 6. Department head creates an appointment (uses own id for provider_id and patient_id here)
  const apptBody = {
    healthcare_platform_organization_id: org.id,
    healthcare_platform_department_id: dept.id,
    provider_id: dhJoin.id,
    patient_id: dhJoin.id,
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: "in-person",
    start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour in the future
    end_time: new Date(Date.now() + 120 * 60 * 1000).toISOString(), // 2 hours in the future
    title: `Appt ${RandomGenerator.paragraph({ sentences: 3 })}`,
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    recurrence_rule: null,
    room_id: null,
    equipment_id: null,
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appt =
    await api.functional.healthcarePlatform.departmentHead.appointments.create(
      connection,
      {
        body: apptBody,
      },
    );
  typia.assert(appt);

  // 7. Department head adds reminder
  const remBody = {
    reminder_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes in future
    recipient_type: "provider",
    recipient_id: dhJoin.id,
    delivery_channel: "email",
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.departmentHead.appointments.reminders.create(
      connection,
      {
        appointmentId: appt.id,
        body: remBody,
      },
    );
  typia.assert(reminder);

  // 8. Department head deletes the reminder (success expected)
  await api.functional.healthcarePlatform.departmentHead.appointments.reminders.erase(
    connection,
    {
      appointmentId: appt.id,
      reminderId: reminder.id,
    },
  );

  // 9. Attempt to delete reminder without login (should fail: unauthenticated)
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error(
    "delete reminder fails when unauthenticated",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.appointments.reminders.erase(
        unauthConn,
        {
          appointmentId: appt.id,
          reminderId: reminder.id,
        },
      );
    },
  );

  // 10. Attempt to delete with bogus appointment/reminder IDs (should error)
  await TestValidator.error(
    "delete reminder fails when appointment id is bogus",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.appointments.reminders.erase(
        connection,
        {
          appointmentId: typia.random<string & tags.Format<"uuid">>(),
          reminderId: reminder.id,
        },
      );
    },
  );
  await TestValidator.error(
    "delete reminder fails when reminder id is bogus",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.appointments.reminders.erase(
        connection,
        {
          appointmentId: appt.id,
          reminderId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
