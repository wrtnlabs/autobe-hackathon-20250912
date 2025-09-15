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
 * Validates that a technician can retrieve the full appointment details for an
 * assigned appointment as permitted.
 *
 * Workflow:
 *
 * 1. Register and authenticate as technician.
 * 2. Register and authenticate as system admin, then create organization.
 * 3. Register and authenticate as organization admin for the org, then create
 *    department.
 * 4. Organization admin creates technician (provider) and patient.
 * 5. Register and login as receptionist, use to create an appointment referencing
 *    all created entities.
 * 6. Login as the technician used in the appointment and retrieve appointment
 *    details via GET endpoint.
 * 7. Assert details match what was created. Attempt error edge cases (invalid ID,
 *    unauthorized role).
 */
export async function test_api_technician_appointment_detail_retrieval(
  connection: api.IConnection,
) {
  const technicianEmail = typia.random<string & tags.Format<"email">>();
  const technicianPassword = RandomGenerator.alphaNumeric(10);
  const technicianLicense = RandomGenerator.alphaNumeric(8);
  const technicianFullName = RandomGenerator.name();
  const joinTech = await api.functional.auth.technician.join(connection, {
    body: {
      email: technicianEmail,
      full_name: technicianFullName,
      license_number: technicianLicense,
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  typia.assert(joinTech);

  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdminFullName = RandomGenerator.name();
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: sysAdminFullName,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  typia.assert(sysAdmin);

  const orgCreate = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgCreate },
    );
  typia.assert(organization);

  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdminFullName = RandomGenerator.name();
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: orgAdminFullName,
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: orgAdminPassword,
      },
    },
  );
  typia.assert(orgAdminLogin);

  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: RandomGenerator.alphaNumeric(4),
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IHealthcarePlatformDepartment.ICreate,
      },
    );
  typia.assert(department);

  const providerEmail = typia.random<string & tags.Format<"email">>();
  const providerFullName = RandomGenerator.name();
  const providerLicense = RandomGenerator.alphaNumeric(8);
  const technicianProvider =
    await api.functional.healthcarePlatform.organizationAdmin.technicians.create(
      connection,
      {
        body: {
          email: providerEmail,
          full_name: providerFullName,
          license_number: providerLicense,
        } satisfies IHealthcarePlatformTechnician.ICreate,
      },
    );
  typia.assert(technicianProvider);

  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientFullName = RandomGenerator.name();
  const patientDOB = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 365 * 20,
  ).toISOString();
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: patientEmail,
          full_name: patientFullName,
          date_of_birth: patientDOB,
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patient);

  const recepEmail = typia.random<string & tags.Format<"email">>();
  const recepPassword = RandomGenerator.alphaNumeric(10);
  const recepFullName = RandomGenerator.name();
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: {
      email: recepEmail,
      full_name: recepFullName,
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });
  typia.assert(receptionist);
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: recepEmail,
      password: recepPassword,
    },
  });

  const now = new Date();
  const startDate = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const endDate = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const appointmentCreate = {
    healthcare_platform_organization_id: organization.id,
    healthcare_platform_department_id: department.id,
    provider_id: technicianProvider.id,
    patient_id: patient.id,
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: "in-person",
    start_time: startDate,
    end_time: endDate,
    title: "Diagnostics appointment",
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 8,
    }),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      { body: appointmentCreate },
    );
  typia.assert(appointment);

  await api.functional.auth.technician.login(connection, {
    body: {
      email: providerEmail,
      password: RandomGenerator.alphaNumeric(10),
    },
  });

  const detail =
    await api.functional.healthcarePlatform.technician.appointments.at(
      connection,
      {
        appointmentId: appointment.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "appointment.id should match",
    detail.id,
    appointment.id,
  );
  TestValidator.equals(
    "provider_id matches assigned",
    detail.provider_id,
    appointmentCreate.provider_id,
  );
  TestValidator.equals("patient_id matches", detail.patient_id, patient.id);
  TestValidator.equals(
    "appointment_type matches",
    detail.appointment_type,
    appointmentCreate.appointment_type,
  );
  TestValidator.equals("title matches", detail.title, appointmentCreate.title);
  TestValidator.equals(
    "start_time matches",
    detail.start_time,
    appointmentCreate.start_time,
  );
  TestValidator.equals(
    "end_time matches",
    detail.end_time,
    appointmentCreate.end_time,
  );

  await TestValidator.error("invalid appointmentId yields error", async () => {
    await api.functional.healthcarePlatform.technician.appointments.at(
      connection,
      {
        appointmentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    },
  });
  await TestValidator.error(
    "organizationAdmin cannot access technician appointment endpoint",
    async () => {
      await api.functional.healthcarePlatform.technician.appointments.at(
        connection,
        {
          appointmentId: appointment.id,
        },
      );
    },
  );
}
