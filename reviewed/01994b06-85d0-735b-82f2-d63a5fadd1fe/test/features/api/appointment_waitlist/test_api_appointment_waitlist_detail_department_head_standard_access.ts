import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Department Head retrieves appointment waitlist entry detail.
 *
 * 1. Register & login as department head.
 * 2. Register & login as receptionist.
 * 3. Receptionist creates an appointment (department-scoped).
 * 4. Switch to department head role.
 * 5. Department head adds a patient to the appointment waitlist.
 * 6. Department head retrieves that waitlist entry's detail (should succeed).
 * 7. Attempt to retrieve a waitlist entry from an appointment in a different
 *    department (should error with 403/404).
 */
export async function test_api_appointment_waitlist_detail_department_head_standard_access(
  connection: api.IConnection,
) {
  // 1. Register & login as department head
  const deptHeadEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadPassword = RandomGenerator.alphaNumeric(10);
  const departmentHead = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: deptHeadEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: deptHeadPassword,
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    },
  );
  typia.assert(departmentHead);

  // 2. Register & login as receptionist
  const recptEmail = typia.random<string & tags.Format<"email">>();
  const recptPassword = RandomGenerator.alphaNumeric(10);
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: {
      email: recptEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });
  typia.assert(receptionist);

  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: recptEmail,
      password: recptPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 3. Receptionist creates appointment (in same org/department as department head)
  const appointmentOrgId = typia.random<string & tags.Format<"uuid">>();
  const appointmentDepartmentId = typia.random<string & tags.Format<"uuid">>();

  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: appointmentOrgId,
          healthcare_platform_department_id: appointmentDepartmentId,
          provider_id: typia.random<string & tags.Format<"uuid">>(),
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: RandomGenerator.pick([
            "in-person",
            "telemedicine",
          ] as const),
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600 * 1000).toISOString(),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          recurrence_rule: undefined,
          room_id: undefined,
          equipment_id: undefined,
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointment);

  // 4. Switch to department head role
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadEmail,
      password: deptHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // 5. Department head adds a patient to appointment waitlist
  const patientId = typia.random<string & tags.Format<"uuid">>();
  const waitlist =
    await api.functional.healthcarePlatform.departmentHead.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          appointment_id: appointment.id,
          patient_id: patientId,
          join_time: new Date().toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate,
      },
    );
  typia.assert(waitlist);

  // 6. Department head retrieves waitlist entry detail
  const detail =
    await api.functional.healthcarePlatform.departmentHead.appointments.waitlists.at(
      connection,
      {
        appointmentId: appointment.id,
        waitlistId: waitlist.id,
      },
    );
  typia.assert(detail);
  // Validate return is department scoped and matches waitlist entry
  TestValidator.equals("waitlist id matches", detail.id, waitlist.id);
  TestValidator.equals(
    "appointment id matches",
    detail.appointment_id,
    appointment.id,
  );
  TestValidator.equals("patient id matches", detail.patient_id, patientId);
  TestValidator.equals("status is 'active'", detail.status, "active");

  // 7. Try retrieving a waitlist entry from another department (should error)
  const otherAppointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          healthcare_platform_department_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          provider_id: typia.random<string & tags.Format<"uuid">>(),
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: RandomGenerator.pick([
            "in-person",
            "telemedicine",
          ] as const),
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600 * 1000).toISOString(),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          recurrence_rule: undefined,
          room_id: undefined,
          equipment_id: undefined,
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(otherAppointment);
  const otherWaitlist =
    await api.functional.healthcarePlatform.departmentHead.appointments.waitlists.create(
      connection,
      {
        appointmentId: otherAppointment.id,
        body: {
          appointment_id: otherAppointment.id,
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          join_time: new Date().toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate,
      },
    );
  typia.assert(otherWaitlist);
  await TestValidator.error(
    "Department head cannot access waitlist in another department",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.appointments.waitlists.at(
        connection,
        {
          appointmentId: otherAppointment.id,
          waitlistId: otherWaitlist.id,
        },
      );
    },
  );
}
