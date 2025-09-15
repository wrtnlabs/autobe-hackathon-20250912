import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Validate patient can fetch their own appointment detail, and fail to
 * access others'.
 *
 * This test simulates the complete booking lifecycle for a patient
 * appointment in a healthcare platform, including multi-role setup: system
 * admin (organization creation), organization admin
 * (department/provider/receptionist), receptionist (appointment creation),
 * and patient (self-detail access). The test ensures patients can access
 * their own appointment, are forbidden from others', and that unknown
 * appointmentIds result in errors.
 *
 * Steps:
 *
 * 1. Register and login system admin
 * 2. System admin creates organization
 * 3. Register and login organization admin
 * 4. Organization admin creates department
 * 5. Organization admin adds provider (technician)
 * 6. Organization admin creates receptionist
 * 7. Register patients A and B
 * 8. Receptionist books appointment for Patient A
 * 9. Receptionist books appointment for Patient B
 * 10. Patient A login, fetches their own appointment and asserts data
 * 11. Patient A tries to fetch B's appointment (forbidden)
 * 12. Patient A fetches random (nonexistent) appointment (error)
 */
export async function test_api_patient_appointment_self_detail_access(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysAdminData = {
    email: RandomGenerator.alphaNumeric(8) + "@hospital.com",
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(8),
    password: "Test123!",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminData,
  });
  typia.assert(sysAdmin);

  // 2. Login system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminData.email,
      provider: "local",
      provider_key: sysAdminData.provider_key,
      password: sysAdminData.password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 3. System admin creates organization
  const orgData = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgData },
    );
  typia.assert(org);

  // 4. Register organization admin
  const orgAdminData = {
    email: RandomGenerator.alphaNumeric(8) + "@org.com",
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "Admin123!",
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(8),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAdminData },
  );
  typia.assert(orgAdmin);

  // 5. Login organization admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminData.email,
      password: orgAdminData.password,
      provider: "local",
      provider_key: orgAdminData.provider_key,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 6. Organization admin creates department
  const deptData = {
    healthcare_platform_organization_id: org.id,
    code: RandomGenerator.alphaNumeric(4),
    name: RandomGenerator.name(),
    status: "active",
  } satisfies IHealthcarePlatformDepartment.ICreate;
  const dept =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id,
        body: deptData,
      },
    );
  typia.assert(dept);

  // 7. Organization admin creates technician (provider)
  const providerData = {
    email: RandomGenerator.alphaNumeric(8) + "@provider.com",
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(6),
  } satisfies IHealthcarePlatformTechnician.ICreate;
  const provider =
    await api.functional.healthcarePlatform.organizationAdmin.technicians.create(
      connection,
      { body: providerData },
    );
  typia.assert(provider);

  // 8. Organization admin creates receptionist
  const receptionistData = {
    email: RandomGenerator.alphaNumeric(8) + "@reception.com",
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformReceptionist.ICreate;
  const receptionist =
    await api.functional.healthcarePlatform.organizationAdmin.receptionists.create(
      connection,
      { body: receptionistData },
    );
  typia.assert(receptionist);

  // 9. Register Patient A
  const patientAData = {
    email: RandomGenerator.alphaNumeric(8) + "@patient.com",
    full_name: RandomGenerator.name(),
    date_of_birth: new Date("1990-01-01").toISOString(),
    phone: RandomGenerator.mobile(),
    password: "PatientA1",
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(8),
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patientA = await api.functional.auth.patient.join(connection, {
    body: patientAData,
  });
  typia.assert(patientA);

  // 10. Register Patient B
  const patientBData = {
    email: RandomGenerator.alphaNumeric(8) + "@patient.com",
    full_name: RandomGenerator.name(),
    date_of_birth: new Date("1992-01-01").toISOString(),
    phone: RandomGenerator.mobile(),
    password: "PatientB1",
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(8),
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patientB = await api.functional.auth.patient.join(connection, {
    body: patientBData,
  });
  typia.assert(patientB);

  // 11. Receptionist books appointment for Patient A
  const statusIdA = typia.random<string & tags.Format<"uuid">>();
  const appointmentBodyA = {
    healthcare_platform_organization_id: org.id,
    healthcare_platform_department_id: dept.id,
    provider_id: provider.id,
    patient_id: patientA.id,
    status_id: statusIdA,
    appointment_type: "in-person",
    start_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    end_time: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
    title: "Consultation",
    description: "Initial checkup",
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointmentA =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      { body: appointmentBodyA },
    );
  typia.assert(appointmentA);

  // 12. Receptionist books appointment for Patient B
  const statusIdB = typia.random<string & tags.Format<"uuid">>();
  const appointmentBodyB = {
    healthcare_platform_organization_id: org.id,
    healthcare_platform_department_id: dept.id,
    provider_id: provider.id,
    patient_id: patientB.id,
    status_id: statusIdB,
    appointment_type: "telemedicine",
    start_time: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
    end_time: new Date(Date.now() + 90000000).toISOString(), // slightly over 1 day from now
    title: "Follow-up",
    description: "Tele follow up",
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointmentB =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      { body: appointmentBodyB },
    );
  typia.assert(appointmentB);

  // 13. Login as Patient A
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientAData.email,
      password: patientAData.password,
      provider: "local",
      provider_key: patientAData.provider_key,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });

  // 14. Patient A fetches own appointment detail
  const appointmentAFetch =
    await api.functional.healthcarePlatform.patient.appointments.at(
      connection,
      { appointmentId: appointmentA.id },
    );
  typia.assert(appointmentAFetch);
  TestValidator.equals(
    "Patient A receives correct appointment detail",
    appointmentA,
    appointmentAFetch,
    (key) => ["created_at", "updated_at", "deleted_at"].includes(key),
  );

  // 15. Patient A tries to fetch Patient B's appointment (forbidden)
  await TestValidator.error(
    "Patient A forbidden from accessing Patient B appointment",
    async () => {
      await api.functional.healthcarePlatform.patient.appointments.at(
        connection,
        { appointmentId: appointmentB.id },
      );
    },
  );

  // 16. Patient A fetches a nonexistent appointmentId (error)
  await TestValidator.error(
    "Patient A receives error on nonexistent appointment",
    async () => {
      await api.functional.healthcarePlatform.patient.appointments.at(
        connection,
        {
          appointmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
