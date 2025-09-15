import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * E2E test for department head deletion of appointments, covering both normal
 * and edge cases.
 *
 * 1. Register and login as department head A (headA)
 * 2. Register and login as department head B (headB)
 * 3. Register and login as receptionist
 * 4. Receptionist creates an appointment in headA's department
 * 5. Department head A deletes the appointment (should succeed)
 * 6. Attempt to delete the appointment again (should fail: already deleted)
 * 7. Department head B (other department) tries to delete same appointment (should
 *    fail)
 * 8. Try deleting random non-existent appointment (should error)
 */
export async function test_api_appointment_deletion_by_department_head_normal_and_edge_case(
  connection: api.IConnection,
) {
  // 1. Register and login as department head A (headA)
  const deptHeadA_email = typia.random<string & tags.Format<"email">>();
  const deptHeadA_password = RandomGenerator.alphaNumeric(10);
  const deptHeadA_join = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: deptHeadA_email,
        full_name: RandomGenerator.name(),
        password: deptHeadA_password,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    },
  );
  typia.assert(deptHeadA_join);
  const deptA_id = deptHeadA_join.id;

  // 2. Register and login as department head B (headB)
  const deptHeadB_email = typia.random<string & tags.Format<"email">>();
  const deptHeadB_password = RandomGenerator.alphaNumeric(10);
  const deptHeadB_join = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: deptHeadB_email,
        full_name: RandomGenerator.name(),
        password: deptHeadB_password,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    },
  );
  typia.assert(deptHeadB_join);
  const deptB_id = deptHeadB_join.id;

  // 3. Register and login as receptionist
  const receptionist_email = typia.random<string & tags.Format<"email">>();
  const receptionist_password = RandomGenerator.alphaNumeric(10);
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: {
      email: receptionist_email,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });
  typia.assert(receptionist);

  // receptionist login (for appointment creation)
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionist_email,
      password: receptionist_password,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 4. Receptionist creates an appointment in headA's department
  const appointmentCreate = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    healthcare_platform_department_id: deptA_id satisfies string as string,
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: RandomGenerator.pick([
      "in-person",
      "telemedicine",
    ] as const),
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    recurrence_rule: null,
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: appointmentCreate,
      },
    );
  typia.assert(appointment);
  const appointmentId = appointment.id;

  // 5. Department head A login and deletes the appointment
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadA_email,
      password: deptHeadA_password,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  await api.functional.healthcarePlatform.departmentHead.appointments.erase(
    connection,
    {
      appointmentId,
    },
  );

  // 6. Deleting the same appointment again (should fail: already deleted)
  await TestValidator.error(
    "Deleting already deleted appointment should error",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.appointments.erase(
        connection,
        {
          appointmentId,
        },
      );
    },
  );

  // 7. Department head B login (other department) and tries to delete same appointment (should fail)
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadB_email,
      password: deptHeadB_password,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  await TestValidator.error(
    "Other department head cannot delete appointment in different department or already deleted",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.appointments.erase(
        connection,
        {
          appointmentId,
        },
      );
    },
  );

  // 8. Try deleting totally non-existent appointment (should error)
  const randomNonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Deleting non-existent appointment should error",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.appointments.erase(
        connection,
        {
          appointmentId: randomNonExistentId,
        },
      );
    },
  );
}
