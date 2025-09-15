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
 * End-to-end validation for receptionist appointment detail access and RBAC.
 *
 * Scenario steps:
 *
 * 1. Register and login as system admin
 * 2. Register and login as organization admin
 * 3. Create organization
 * 4. Organization admin creates department, provider (technician), and patient
 * 5. Register receptionist (the join operation establishes access - login not
 *    possible due to no password)
 * 6. Receptionist creates an appointment
 * 7. Receptionist fetches the appointment details by ID
 * 8. Validates all appointment fields and RBAC access
 * 9. Edge: non-existent appointmentId results in error
 */
export async function test_api_receptionist_appointment_detail_access(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const sysAdminCredentials =
    typia.random<IHealthcarePlatformSystemAdmin.IJoin>();
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminCredentials,
  });
  typia.assert(sysAdmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminCredentials.email,
      provider: sysAdminCredentials.provider,
      provider_key: sysAdminCredentials.provider_key,
      password: sysAdminCredentials.password ?? undefined,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 2. Create organization
  const orgBody = typia.random<IHealthcarePlatformOrganization.ICreate>();
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgBody },
    );
  typia.assert(organization);

  // 3. Register and login as organization admin
  const orgAdminCredentials: IHealthcarePlatformOrganizationAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(10),
    phone: RandomGenerator.mobile(),
    provider: undefined,
    provider_key: undefined,
  };
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAdminCredentials },
  );
  typia.assert(orgAdmin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminCredentials.email,
      password: orgAdminCredentials.password,
      provider: undefined,
      provider_key: undefined,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4. Create department
  const deptBody: IHealthcarePlatformDepartment.ICreate = {
    healthcare_platform_organization_id: organization.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    status: "active",
  };
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      { organizationId: organization.id, body: deptBody },
    );
  typia.assert(department);

  // 5a. Create provider (technician)
  const providerBody: IHealthcarePlatformTechnician.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(10),
    specialty: "Radiology",
    phone: RandomGenerator.mobile(),
  };
  const provider =
    await api.functional.healthcarePlatform.organizationAdmin.technicians.create(
      connection,
      { body: providerBody },
    );
  typia.assert(provider);

  // 5b. Create patient
  const patientBody: IHealthcarePlatformPatient.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 365 * 25,
    ).toISOString(),
    phone: RandomGenerator.mobile(),
  };
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      { body: patientBody },
    );
  typia.assert(patient);

  // 6. Register receptionist (no password set; join creates account and session)
  const receptionistCredentials: IHealthcarePlatformReceptionist.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  };
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: receptionistCredentials,
  });
  typia.assert(receptionist);

  // 7. Receptionist creates an appointment
  const now = new Date();
  const appointmentBody: IHealthcarePlatformAppointment.ICreate = {
    healthcare_platform_organization_id: organization.id,
    healthcare_platform_department_id: department.id,
    provider_id: provider.id,
    patient_id: patient.id,
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: "in-person",
    start_time: new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(),
    end_time: new Date(now.getTime() + 1000 * 60 * 60 * 25).toISOString(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
  };
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      { body: appointmentBody },
    );
  typia.assert(appointment);

  // 8. Receptionist fetches the appointment details
  const detail =
    await api.functional.healthcarePlatform.receptionist.appointments.at(
      connection,
      { appointmentId: appointment.id },
    );
  typia.assert(detail);

  // 9. Validate fetched appointment matches created data
  TestValidator.equals(
    "appointment org id",
    detail.healthcare_platform_organization_id,
    appointmentBody.healthcare_platform_organization_id,
  );
  TestValidator.equals(
    "appointment department id",
    detail.healthcare_platform_department_id,
    appointmentBody.healthcare_platform_department_id,
  );
  TestValidator.equals(
    "appointment provider id",
    detail.provider_id,
    appointmentBody.provider_id,
  );
  TestValidator.equals(
    "appointment patient id",
    detail.patient_id,
    appointmentBody.patient_id,
  );
  TestValidator.equals(
    "appointment type",
    detail.appointment_type,
    appointmentBody.appointment_type,
  );
  TestValidator.equals(
    "appointment start_time",
    detail.start_time,
    appointmentBody.start_time,
  );
  TestValidator.equals(
    "appointment end_time",
    detail.end_time,
    appointmentBody.end_time,
  );
  TestValidator.equals(
    "appointment title",
    detail.title,
    appointmentBody.title,
  );
  TestValidator.equals(
    "appointment description",
    detail.description,
    appointmentBody.description,
  );

  // 10. Edge: Non-existent appointment id should yield error
  await TestValidator.error(
    "receptionist cannot get non-existent appointment",
    async () => {
      await api.functional.healthcarePlatform.receptionist.appointments.at(
        connection,
        { appointmentId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
