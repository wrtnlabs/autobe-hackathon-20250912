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

/**
 * Validate that org admin can access telemedicine session in their org and is
 * denied for sessions outside their org.
 *
 * 1. Register and log in as a system admin.
 * 2. System admin creates an organization.
 * 3. Org admin registers and logs in.
 * 4. Org admin creates a department.
 * 5. Medical doctor (provider) and a patient register.
 * 6. Org admin creates appointment with above doctor, patient, org/department.
 * 7. Org admin creates a telemedicine session for that appointment.
 * 8. Org admin fetches the session detail by GET; asserts full data.
 * 9. Register a second org admin and create session in another org; attempt GET as
 *    first admin, expect error.
 */
export async function test_api_telemed_session_detail_access_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysAdminEmail = `${RandomGenerator.name(1).replace(/\s/g, "")}@sysadmin.com`;
  const sysAdminPassword = "SysAdminPass!12";
  await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail as string & tags.Format<"email">,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });

  // 2. System admin creates organization
  const orgCode = RandomGenerator.alphaNumeric(8);
  const orgName = RandomGenerator.name(2);
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: orgName,
          status: "active",
        },
      },
    );
  typia.assert(org);

  // 3. Org admin registers and logs in
  const orgAdminEmail = `${RandomGenerator.name(1).replace(/\s/g, "")}@org1.com`;
  const orgAdminPassword = "Org1Pass!12";
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgAdminEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: orgAdminPassword,
    },
  });
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail as string & tags.Format<"email">,
      password: orgAdminPassword,
    },
  });

  // 4. Org admin creates department
  const deptCode = RandomGenerator.alphaNumeric(4);
  const deptName = RandomGenerator.name(1);
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id,
        body: {
          healthcare_platform_organization_id: org.id,
          code: deptCode,
          name: deptName,
          status: "active",
        },
      },
    );
  typia.assert(department);

  // 5. Medical doctor (provider) registers
  const docEmail = `${RandomGenerator.name(1).replace(/\s/g, "")}@provider.com`;
  const docPassword = "DocPass!123";
  const docNpi = RandomGenerator.alphaNumeric(10);
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: docEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      npi_number: docNpi,
      password: docPassword as string & tags.Format<"password">,
      specialty: "General Medicine",
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(doctor);

  // 5b. Patient registers
  const patientEmail = `${RandomGenerator.name(1).replace(/\s/g, "")}@patient.com`;
  const patientPassword = "Patient!Pass123";
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1994, 3, 15).toISOString(),
      phone: RandomGenerator.mobile(),
      password: patientPassword,
    },
  });
  typia.assert(patient);

  // 6. Org admin creates appointment
  const appointmentStart = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const appointmentEnd = new Date(
    Date.now() + 2 * 60 * 60 * 1000,
  ).toISOString();
  const appointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org.id,
          healthcare_platform_department_id: department.id,
          provider_id: doctor.id,
          patient_id: patient.id,
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: "telemedicine",
          start_time: appointmentStart,
          end_time: appointmentEnd,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph(),
        },
      },
    );
  typia.assert(appointment);

  // 7. Org admin creates a telemedicine session
  const joinLink = `https://telemed.example.com/session/${RandomGenerator.alphaNumeric(10)}`;
  const sessionStart = appointmentStart;
  const sessionEnd = appointmentEnd;
  const telSession =
    await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.create(
      connection,
      {
        body: {
          appointment_id: appointment.id,
          join_link: joinLink,
          session_start: sessionStart,
          session_end: sessionEnd,
          session_recorded: false,
          provider_joined_at: null,
          patient_joined_at: null,
        },
      },
    );
  typia.assert(telSession);

  // 8. Org admin fetches session detail and asserts data
  const telSessionDetail =
    await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.at(
      connection,
      {
        telemedicineSessionId: telSession.id,
      },
    );
  typia.assert(telSessionDetail);
  // Field checks would be better but base response is {}

  // 9. Create another org and test access denial
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail as string & tags.Format<"email">,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  const org2Code = RandomGenerator.alphaNumeric(8);
  const org2Name = RandomGenerator.name(2);
  const org2 =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: org2Code,
          name: org2Name,
          status: "active",
        },
      },
    );
  typia.assert(org2);
  const orgAdmin2Email = `${RandomGenerator.name(1).replace(/\s/g, "")}@org2.com`;
  const orgAdmin2Password = "Org2Pass!12";
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgAdmin2Email as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: orgAdmin2Password,
    },
  });
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdmin2Email as string & tags.Format<"email">,
      password: orgAdmin2Password,
    },
  });
  // Try to fetch first session with org2 admin
  await TestValidator.error(
    "other org admin cannot access telemed session",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.telemedicineSessions.at(
        connection,
        {
          telemedicineSessionId: telSession.id,
        },
      );
    },
  );
}
