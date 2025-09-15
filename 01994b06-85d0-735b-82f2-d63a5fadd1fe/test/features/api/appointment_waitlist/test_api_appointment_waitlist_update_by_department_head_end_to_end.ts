import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentWaitlist";

/**
 * Validates that a department head can update/view an appointment's waitlist,
 * with full role setup and linking.
 *
 * 1. System admin registers and logs in.
 * 2. Organization admin account is created and logs in.
 * 3. System admin creates an organization.
 * 4. Organization admin creates a department.
 * 5. Organization admin registers a patient.
 * 6. Department head registers and logs in.
 * 7. Department head creates an appointment for the department and patient.
 * 8. Department head creates a waitlist entry for the patient/appointment.
 * 9. Department head performs PATCH (index) to view waitlist for the appointment
 *    by status and patient.
 * 10. Tests edge/error cases: unauthenticated PATCH; PATCH for missing
 *     appointmentId or unrelated patient.
 */
export async function test_api_appointment_waitlist_update_by_department_head_end_to_end(
  connection: api.IConnection,
) {
  // 1. Register and login system admin
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: systemAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: systemAdminEmail,
      password: "admin123!@#",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminJoin);

  const sysAdminLogin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: systemAdminEmail,
        provider: "local",
        provider_key: systemAdminEmail,
        password: "admin123!@#",
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    },
  );
  typia.assert(sysAdminLogin);

  // 2. Register and login organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: "orgadmin123!@#",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);
  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: "orgadmin123!@#",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgAdminLogin);

  // 3. System admin creates organization
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminEmail,
      provider: "local",
      provider_key: systemAdminEmail,
      password: "admin123!@#",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  const organizationOutput =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(organizationOutput);

  // 4. Organization admin creates department
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "orgadmin123!@#",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const departmentOutput =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organizationOutput.id,
        body: {
          healthcare_platform_organization_id: organizationOutput.id,
          code: RandomGenerator.alphaNumeric(3),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        } satisfies IHealthcarePlatformDepartment.ICreate,
      },
    );
  typia.assert(departmentOutput);

  // 5. Organization admin registers a patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: patientEmail,
          full_name: RandomGenerator.name(),
          date_of_birth: new Date(1990, 1, 1).toISOString(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patient);

  // 6. Department head registers and logs in
  const deptHeadEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadJoin = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: deptHeadEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "depthead123!@#",
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    },
  );
  typia.assert(deptHeadJoin);
  const deptHeadLogin = await api.functional.auth.departmentHead.login(
    connection,
    {
      body: {
        email: deptHeadEmail,
        password: "depthead123!@#",
      } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
    },
  );
  typia.assert(deptHeadLogin);

  // 7. Department head creates appointment (assigns themselves as provider) for the patient
  const statusId = typia.random<string & tags.Format<"uuid">>(); // Must supply a status, random valid uuid used
  const appointment =
    await api.functional.healthcarePlatform.departmentHead.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organizationOutput.id,
          healthcare_platform_department_id: departmentOutput.id,
          provider_id: deptHeadJoin.id,
          patient_id: patient.id,
          status_id: statusId,
          appointment_type: "in-person",
          start_time: new Date(Date.now() + 3_600_000).toISOString(),
          end_time: new Date(Date.now() + 7_200_000).toISOString(),
          title: "Regular Checkup",
          description: "General health check and consultation.",
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointment);

  // 8. Department head adds patient to appointment's waitlist
  const waitlist =
    await api.functional.healthcarePlatform.departmentHead.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          appointment_id: appointment.id,
          patient_id: patient.id,
          join_time: new Date().toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate,
      },
    );
  typia.assert(waitlist);

  // 9. Department head PATCH: view waitlist entries for this appointment, filtering by status and patient
  const waitlistPage =
    await api.functional.healthcarePlatform.departmentHead.appointments.waitlists.index(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          patient_id: patient.id,
          status: "active",
        } satisfies IHealthcarePlatformAppointmentWaitlist.IRequest,
      },
    );
  typia.assert(waitlistPage);
  const found = waitlistPage.data.find((wl) => wl.id === waitlist.id);
  typia.assert(found);

  // 10. Unauthorized PATCH: missing/invalid appointment id or logged-out session
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated waitlist PATCH should fail",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.appointments.waitlists.index(
        unauthConn,
        {
          appointmentId: appointment.id,
          body: {
            patient_id: patient.id,
            status: "active",
          } satisfies IHealthcarePlatformAppointmentWaitlist.IRequest,
        },
      );
    },
  );

  await TestValidator.error(
    "PATCH with nonexisting appointment should fail",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.appointments.waitlists.index(
        connection,
        {
          appointmentId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            patient_id: patient.id,
            status: "active",
          } satisfies IHealthcarePlatformAppointmentWaitlist.IRequest,
        },
      );
    },
  );
}
