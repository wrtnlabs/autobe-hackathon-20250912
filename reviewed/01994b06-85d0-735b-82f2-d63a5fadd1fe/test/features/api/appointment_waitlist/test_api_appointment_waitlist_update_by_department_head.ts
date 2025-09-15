import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";

/**
 * Validates department head's ability to update waitlist entries for
 * appointments in their department.
 *
 * Workflow:
 *
 * 1. Register and login a department head.
 * 2. Create a new appointment in their department.
 * 3. Add a patient to the appointment's waitlist and get the waitlistId.
 * 4. Perform a status update for the waitlist entry (using PUT), and verify update
 *    succeeds.
 * 5. Test key business logic: status changes, updated join time, and successful
 *    audit of changes.
 * 6. Error/edge cases: Try update with invalid appointmentId/waitlistId and assert
 *    access denial for unrelated department.
 */
export async function test_api_appointment_waitlist_update_by_department_head(
  connection: api.IConnection,
) {
  // Register department head and authenticate
  const deptHeadEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadPassword = RandomGenerator.alphaNumeric(12);
  const joinReq = {
    email: deptHeadEmail,
    full_name: RandomGenerator.name(),
    password: deptHeadPassword,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const deptHeadAuth = await api.functional.auth.departmentHead.join(
    connection,
    { body: joinReq },
  );
  typia.assert(deptHeadAuth);

  // Re-login for session clarity (optional, for token stability)
  const loginReq = {
    email: deptHeadEmail,
    password: deptHeadPassword,
  } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest;
  const session = await api.functional.auth.departmentHead.login(connection, {
    body: loginReq,
  });
  typia.assert(session);

  // Create an appointment (using random org/department/provider/patient/status)
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const departmentId = typia.random<string & tags.Format<"uuid">>();
  const providerId = typia.random<string & tags.Format<"uuid">>();
  const patientId = typia.random<string & tags.Format<"uuid">>();
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const appointmentReq = {
    healthcare_platform_organization_id: organizationId,
    healthcare_platform_department_id: departmentId,
    provider_id: providerId,
    patient_id: patientId,
    status_id: statusId,
    appointment_type: RandomGenerator.pick([
      "in-person",
      "telemedicine",
    ] as const),
    start_time: new Date(Date.now() + 1000000).toISOString(),
    end_time: new Date(Date.now() + 7200000).toISOString(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    recurrence_rule: null,
    room_id: null,
    equipment_id: null,
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.departmentHead.appointments.create(
      connection,
      { body: appointmentReq },
    );
  typia.assert(appointment);

  // Create waitlist entry for a new patient
  const waitlistPatientId = typia.random<string & tags.Format<"uuid">>();
  const waitlistCreateReq = {
    appointment_id: appointment.id,
    patient_id: waitlistPatientId,
    join_time: new Date().toISOString(),
    status: "active",
  } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate;
  const waitlist =
    await api.functional.healthcarePlatform.departmentHead.appointments.waitlists.create(
      connection,
      { appointmentId: appointment.id, body: waitlistCreateReq },
    );
  typia.assert(waitlist);

  // Update (promote) the waitlist entry
  const newJoinTime = new Date(Date.now() + 500000).toISOString();
  const updateReq = {
    status: "promoted",
    join_time: newJoinTime,
  } satisfies IHealthcarePlatformAppointmentWaitlist.IUpdate;
  const updatedWaitlist =
    await api.functional.healthcarePlatform.departmentHead.appointments.waitlists.update(
      connection,
      {
        appointmentId: appointment.id,
        waitlistId: waitlist.id,
        body: updateReq,
      },
    );
  typia.assert(updatedWaitlist);

  TestValidator.equals(
    "waitlist status updated",
    updatedWaitlist.status,
    "promoted",
  );
  TestValidator.equals(
    "waitlist join_time updated",
    updatedWaitlist.join_time,
    newJoinTime,
  );

  // Edge case: invalid appointmentId/waitlistId (should error)
  await TestValidator.error(
    "invalid appointmentId on update should fail",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.appointments.waitlists.update(
        connection,
        {
          appointmentId: typia.random<string & tags.Format<"uuid">>(),
          waitlistId: waitlist.id,
          body: updateReq,
        },
      );
    },
  );
  await TestValidator.error(
    "invalid waitlistId on update should fail",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.appointments.waitlists.update(
        connection,
        {
          appointmentId: appointment.id,
          waitlistId: typia.random<string & tags.Format<"uuid">>(),
          body: updateReq,
        },
      );
    },
  );

  // Edge case: Department head not in department for appointment
  // Register different department head & login
  const otherHeadEmail = typia.random<string & tags.Format<"email">>();
  const otherHeadPassword = RandomGenerator.alphaNumeric(12);
  const otherJoinReq = {
    email: otherHeadEmail,
    full_name: RandomGenerator.name(),
    password: otherHeadPassword,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const otherHeadAuth = await api.functional.auth.departmentHead.join(
    connection,
    { body: otherJoinReq },
  );
  typia.assert(otherHeadAuth);

  const otherLoginReq = {
    email: otherHeadEmail,
    password: otherHeadPassword,
  } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest;
  const otherSession = await api.functional.auth.departmentHead.login(
    connection,
    { body: otherLoginReq },
  );
  typia.assert(otherSession);

  // Try to update waitlist from other department head, expect failure
  await TestValidator.error(
    "department head cannot update waitlist for appointment in another department",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.appointments.waitlists.update(
        connection,
        {
          appointmentId: appointment.id,
          waitlistId: waitlist.id,
          body: updateReq,
        },
      );
    },
  );
}
