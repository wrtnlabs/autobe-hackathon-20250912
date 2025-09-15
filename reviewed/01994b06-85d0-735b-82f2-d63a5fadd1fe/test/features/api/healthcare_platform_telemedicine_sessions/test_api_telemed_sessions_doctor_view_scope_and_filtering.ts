import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformTelemedicineSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSession";
import type { IHealthcarePlatformTelemedicineSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSessions";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformTelemedicineSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformTelemedicineSessions";

/**
 * Validates that a medical doctor can view only their own telemedicine sessions
 * and that query filters and access control work as designed.
 *
 * 1. Register and login as system admin and organization admin, and medical doctor
 * 2. Create organization as system admin
 * 3. Create department under that organization as org admin
 * 4. Register and login as medical doctor and patient
 * 5. Create appointments (by doctor) for the doctor with the patient
 * 6. Create telemedicine sessions (by doctor) for those appointments
 * 7. Query sessions (PATCH) as doctor (using provider_user_id, org, dept, patient
 *    filters)
 * 8. Assert that only sessions for that doctor are visible, filters/pagination
 *    work, and unrelated records are never present
 * 9. Query for unrelated doctors (should get empty or forbidden)
 */
export async function test_api_telemed_sessions_doctor_view_scope_and_filtering(
  connection: api.IConnection,
) {
  // Register and login as system admin
  const sysAdminEmail = `${RandomGenerator.alphabets(8)}@corp.com`;
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  typia.assert(sysAdminJoin);

  // Login as system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });

  // Create organization
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(8),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(organization);

  // Register and login as organization admin
  const orgAdminEmail = `${RandomGenerator.alphabets(8)}@corp.com`;
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
      },
    },
  );
  typia.assert(orgAdminJoin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    },
  });

  // Create department as organization admin
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: RandomGenerator.alphabets(4),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        },
      },
    );
  typia.assert(department);

  // Register and login as medical doctor
  const doctorEmail = `${RandomGenerator.alphabets(8)}@hospital.com`;
  const doctorPassword = RandomGenerator.alphaNumeric(12);
  const doctorNPI = RandomGenerator.alphaNumeric(10);
  const doctorJoin = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: doctorNPI,
      password: doctorPassword,
    },
  });
  typia.assert(doctorJoin);

  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    },
  });

  // Register and login as patient
  const patientEmail = `${RandomGenerator.alphabets(8)}@patient.com`;
  const patientPassword = RandomGenerator.alphaNumeric(12);
  const patientJoin = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1990, 0, 15).toISOString(),
      password: patientPassword,
    },
  });
  typia.assert(patientJoin);

  // Create multiple appointments as doctor
  const appointments: IHealthcarePlatformAppointment[] = [];
  for (let i = 0; i < 3; i++) {
    const appt =
      await api.functional.healthcarePlatform.medicalDoctor.appointments.create(
        connection,
        {
          body: {
            healthcare_platform_organization_id: organization.id,
            healthcare_platform_department_id: department.id,
            provider_id: doctorJoin.id, // own doctor ID
            patient_id: patientJoin.id, // patient user
            status_id: typia.random<string & tags.Format<"uuid">>(),
            appointment_type: "telemedicine",
            start_time: new Date(Date.now() + i * 7200000).toISOString(),
            end_time: new Date(Date.now() + (i + 1) * 7200000).toISOString(),
            title: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    appointments.push(appt);
    typia.assert(appt);
  }

  // Create telemedicine sessions for each appointment as doctor
  const sessions: IHealthcarePlatformTelemedicineSession[] = [];
  for (const appt of appointments) {
    const session =
      await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.create(
        connection,
        {
          body: {
            appointment_id: appt.id,
            join_link: `https://test.telemed/${RandomGenerator.alphaNumeric(16)}`,
            session_start: appt.start_time,
            session_end: appt.end_time,
            session_recorded: false,
          },
        },
      );
    sessions.push(session);
    typia.assert(session);
  }

  // Doctor queries own telemedicine sessions (should only see their sessions)
  const sessionList =
    await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.index(
      connection,
      {
        body: {
          provider_user_id: doctorJoin.id,
          organization_id: organization.id,
        },
      },
    );
  typia.assert(sessionList);
  TestValidator.predicate(
    "list contains only own sessions",
    sessionList.data.every((s) =>
      appointments.map((a) => a.id).includes(s.appointment_id),
    ),
  );
  TestValidator.predicate(
    "list only contains sessions for this doctor",
    sessionList.data.length === sessions.length,
  );

  // Doctor filters by department
  const sessionListDept =
    await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.index(
      connection,
      {
        body: {
          department_id: department.id,
          provider_user_id: doctorJoin.id,
        },
      },
    );
  typia.assert(sessionListDept);
  TestValidator.equals(
    "dept filtered session count",
    sessionListDept.data.length,
    sessions.length,
  );

  // Doctor filters by patient
  const sessionListPatient =
    await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.index(
      connection,
      {
        body: {
          patient_user_id: patientJoin.id,
          provider_user_id: doctorJoin.id,
        },
      },
    );
  typia.assert(sessionListPatient);
  TestValidator.equals(
    "patient filtered session count",
    sessionListPatient.data.length,
    sessions.length,
  );

  // Pagination: limit results
  const sessionListPaginated =
    await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.index(
      connection,
      {
        body: {
          provider_user_id: doctorJoin.id,
          limit: 2 as number, // offset not supported so just limit
        },
      },
    );
  typia.assert(sessionListPaginated);
  TestValidator.predicate(
    "paginated returns <= 2",
    sessionListPaginated.data.length <= 2,
  );

  // Error case: query as doctor for another doctor (should get empty)
  const foreignDoctorId = typia.random<string & tags.Format<"uuid">>();
  const sessionListOtherDoctor =
    await api.functional.healthcarePlatform.medicalDoctor.telemedicineSessions.index(
      connection,
      {
        body: {
          provider_user_id: foreignDoctorId,
          organization_id: organization.id,
        },
      },
    );
  typia.assert(sessionListOtherDoctor);
  TestValidator.equals(
    "no sessions for foreign doctor",
    sessionListOtherDoctor.data.length,
    0,
  );
}
