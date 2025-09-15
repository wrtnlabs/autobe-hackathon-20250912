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
 * End-to-end appointment creation covering all prerequisite onboarding flows,
 * resource assignments, and permission boundaries.
 *
 * 1. Register and authenticate as system admin, org admin, and receptionist (with
 *    token setup).
 * 2. System admin creates healthcare organization entity.
 * 3. Organization admin creates department, technician (provider), receptionist,
 *    patient under org.
 * 4. Receptionist logs in and creates appointment, linking all resources.
 * 5. Validate: appointment links are correct; duplicate scheduling fails; invalid
 *    IDs fail; only legal business errors tested; all API calls and
 *    TestValidator errors are properly awaited; type/tag safety is preserved
 *    throughout.
 */
export async function test_api_receptionist_create_appointment_complete_flow(
  connection: api.IConnection,
) {
  // 1. System admin registration and login
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPass = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPass,
    },
  });
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPass,
    },
  });

  // 2. Organization admin registration and login
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPass = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgAdminEmail,
      full_name: RandomGenerator.name(),
      password: orgAdminPass,
    },
  });
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPass,
    },
  });

  // 3. Receptionist registration and login via auth
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistPass = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.receptionist.join(connection, {
    body: {
      email: receptionistEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPass,
    },
  });

  // 4. Create organization (sys admin role)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPass,
    },
  });
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );

  // 5. Create department (org admin role)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPass,
    },
  });
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: RandomGenerator.alphabets(5),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );

  // 6. Create technician (provider)
  const technicianEmail = typia.random<string & tags.Format<"email">>();
  const technician =
    await api.functional.healthcarePlatform.organizationAdmin.technicians.create(
      connection,
      {
        body: {
          email: technicianEmail,
          full_name: RandomGenerator.name(),
          license_number: RandomGenerator.alphaNumeric(10),
          specialty: "Radiology",
          phone: RandomGenerator.mobile(),
        },
      },
    );

  // 7. Create patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: patientEmail,
          full_name: RandomGenerator.name(),
          date_of_birth: new Date(1990, 0, 1).toISOString(),
          phone: RandomGenerator.mobile(),
        },
      },
    );

  // 8. Receptionist creation via organization admin
  const recptSecondaryEmail = typia.random<string & tags.Format<"email">>();
  const recptRecord =
    await api.functional.healthcarePlatform.organizationAdmin.receptionists.create(
      connection,
      {
        body: {
          email: recptSecondaryEmail,
          full_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
        },
      },
    );

  // 9. Receptionist logs in for appointment creation
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPass,
    },
  });

  // 10. Receptionist creates appointment
  const now = new Date();
  const start_time = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const end_time = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const appointmentBody = {
    healthcare_platform_organization_id: organization.id,
    healthcare_platform_department_id: department.id,
    provider_id: technician.id,
    patient_id: patient.id,
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: RandomGenerator.pick([
      "in-person",
      "telemedicine",
    ] as const),
    start_time,
    end_time,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph(),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: appointmentBody,
      },
    );
  typia.assert(appointment);

  // Assert all links are correct
  TestValidator.equals(
    "organization links in appointment",
    appointment.healthcare_platform_organization_id,
    organization.id,
  );
  TestValidator.equals(
    "department links in appointment",
    appointment.healthcare_platform_department_id,
    department.id,
  );
  TestValidator.equals(
    "provider links in appointment",
    appointment.provider_id,
    technician.id,
  );
  TestValidator.equals(
    "patient links in appointment",
    appointment.patient_id,
    patient.id,
  );

  // 11. Attempt double booking (should error)
  await TestValidator.error("double booking not allowed", async () => {
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          ...appointmentBody,
        },
      },
    );
  });

  // 12. Create with invalid resource IDs (should error)
  await TestValidator.error("invalid provider ID rejected", async () => {
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          ...appointmentBody,
          provider_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  });
  await TestValidator.error("invalid patient ID rejected", async () => {
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          ...appointmentBody,
          patient_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  });
  await TestValidator.error("invalid department ID rejected", async () => {
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          ...appointmentBody,
          healthcare_platform_department_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      },
    );
  });
  await TestValidator.error("invalid organization ID rejected", async () => {
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          ...appointmentBody,
          healthcare_platform_organization_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      },
    );
  });
}
