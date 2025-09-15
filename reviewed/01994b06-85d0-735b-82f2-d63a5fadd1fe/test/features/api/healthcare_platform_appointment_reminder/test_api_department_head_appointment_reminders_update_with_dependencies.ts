import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentReminder";

/**
 * Validate department head querying (not updating) reminders for an
 * appointment.
 *
 * Since the PATCH reminders.index endpoint is a filtering/query endpoint (not
 * an update), this test covers:
 *
 * 1. Register/join a new department head
 * 2. Login as department head
 * 3. Create appointment as department head
 * 4. Create a reminder for that appointment
 * 5. Query the reminders using PATCH (reminders.index), filtering for the new
 *    reminder
 * 6. Validate results include the created reminder
 * 7. Attempt query as unauthenticated user and confirm permission denial
 * 8. Attempt query with a non-existing appointment and validate proper error
 *    handling
 * 9. Attempt query with an unrelated recipient_id (not in department), validate
 *    proper error handling
 *
 * The scenario avoids forbidden update/type error logic and uses only business
 * rules and access control.
 */
export async function test_api_department_head_appointment_reminders_update_with_dependencies(
  connection: api.IConnection,
) {
  // 1. Register department head and store password for login
  const deptHeadEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadPassword = RandomGenerator.alphaNumeric(12);
  const deptHeadJoin = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: deptHeadEmail,
        full_name: RandomGenerator.name(),
        password: deptHeadPassword,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    },
  );
  typia.assert(deptHeadJoin);

  // 2. Login as department head
  const deptHeadLogin = await api.functional.auth.departmentHead.login(
    connection,
    {
      body: {
        email: deptHeadEmail,
        password: deptHeadPassword,
      } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
    },
  );
  typia.assert(deptHeadLogin);

  // 3. Create appointment (all required fields)
  const appointmentData = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    healthcare_platform_department_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: "in-person",
    start_time: new Date(Date.now() + 3600000).toISOString(),
    end_time: new Date(Date.now() + 7200000).toISOString(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.departmentHead.appointments.create(
      connection,
      { body: appointmentData },
    );
  typia.assert(appointment);

  // 4. Create initial reminder for the appointment
  const reminderCreateInput = {
    reminder_time: new Date(Date.now() + 1800000).toISOString(),
    recipient_type: "patient",
    recipient_id: appointment.patient_id,
    delivery_channel: "email",
  } satisfies IHealthcarePlatformAppointmentReminder.ICreate;
  const reminder =
    await api.functional.healthcarePlatform.departmentHead.appointments.reminders.create(
      connection,
      { appointmentId: appointment.id, body: reminderCreateInput },
    );
  typia.assert(reminder);

  // 5. Query reminders using PATCH (reminders.index); this is a search, not an update
  const queryBody = {
    appointment_id: appointment.id,
    recipient_type: "patient",
    recipient_id: appointment.patient_id,
    delivery_channel: "email",
    page: 1,
    limit: 10,
    sort_by: "reminder_time",
    sort_direction: "asc",
  } satisfies IHealthcarePlatformAppointmentReminder.IRequest;
  const patchResult =
    await api.functional.healthcarePlatform.departmentHead.appointments.reminders.index(
      connection,
      {
        appointmentId: appointment.id,
        body: queryBody,
      },
    );
  typia.assert(patchResult);
  TestValidator.predicate(
    "reminder query (patch) returns at least one record",
    patchResult.data.length > 0,
  );
  // Confirm the reminder is in the returned results
  const foundPatch = patchResult.data.find((r) => r.id === reminder.id);
  TestValidator.predicate(
    "queried reminder is present in the result set",
    !!foundPatch,
  );

  // 6. Error: query as unauthenticated user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot query reminders",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.appointments.reminders.index(
        unauthConn,
        {
          appointmentId: appointment.id,
          body: queryBody,
        },
      );
    },
  );

  // 7. Error: query non-existing appointment
  await TestValidator.error(
    "query with non-existing appointment should fail",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.appointments.reminders.index(
        connection,
        {
          appointmentId: typia.random<string & tags.Format<"uuid">>(),
          body: queryBody,
        },
      );
    },
  );

  // 8. Error: unrelated recipient_id (not patient)
  await TestValidator.error(
    "query with unrelated recipient should fail",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.appointments.reminders.index(
        connection,
        {
          appointmentId: appointment.id,
          body: {
            ...queryBody,
            recipient_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );
}
