import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentStatus";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates department head appointment creation permissions and full workflow.
 *
 * 1. Register and login as a system admin.
 * 2. Create an organization.
 * 3. Register and login as an organization admin.
 * 4. Create a department under the organization.
 * 5. Register and login as a department head tied to that department.
 * 6. Register a provider (medical doctor).
 * 7. Register a patient.
 * 8. Organization admin creates an appointment status entity.
 * 9. Organization admin reserves a room resource.
 * 10. Organization admin reserves equipment if needed.
 * 11. Department head creates an appointment in their department using all prepared
 *     dependencies.
 * 12. Validate successful appointment creation and linkage.
 * 13. Attempt to create appointment for a different department (should fail with
 *     insufficient permissions).
 * 14. Attempt to create appointment with invalid references to sub-entities (should
 *     fail).
 */
export async function test_api_department_head_appointment_creation_permission_and_workflow(
  connection: api.IConnection,
) {
  // Register system admin
  const sysAdminEmail = `sysadmin_${RandomGenerator.alphaNumeric(8)}@company.com`;
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      password: sysAdminPassword,
      provider: "local",
      provider_key: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(sysAdmin);

  // Create organization
  const orgCreate = {
    code: RandomGenerator.alphaNumeric(6),
    name: `Org ${RandomGenerator.name(2)}`,
    status: "active",
  };
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: orgCreate,
      },
    );
  typia.assert(org);

  // Organization admin
  const orgAdminEmail = `orgadmin_${RandomGenerator.alphaNumeric(6)}@company.com`;
  const orgAdminPassword = RandomGenerator.alphaNumeric(10);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: orgAdminPassword,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: undefined,
        provider_key: undefined,
      },
    },
  );
  typia.assert(orgAdmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    },
  });

  // Create department under the organization
  const deptCreate = {
    healthcare_platform_organization_id: org.id,
    code: RandomGenerator.alphaNumeric(4),
    name: `Dept ${RandomGenerator.name(2)}`,
    status: "active",
  };
  const dept =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id,
        body: deptCreate,
      },
    );
  typia.assert(dept);

  // Department head
  const headEmail = `depthead_${RandomGenerator.alphaNumeric(6)}@company.com`;
  const headPassword = RandomGenerator.alphaNumeric(10);
  const deptHead = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: headEmail,
      password: headPassword,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      sso_provider: null,
      sso_provider_key: null,
    },
  });
  typia.assert(deptHead);
  // Department head login (context switch to department role)
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: headEmail,
      password: headPassword,
    },
  });

  // Register a provider (medical doctor)
  const providerEmail = `doctor_${RandomGenerator.alphaNumeric(6)}@hospital.com`;
  const providerPassword = RandomGenerator.alphaNumeric(12);
  const provider = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: providerEmail,
      password: providerPassword,
      full_name: RandomGenerator.name(),
      npi_number: RandomGenerator.alphaNumeric(10),
      phone: RandomGenerator.mobile(),
      specialty: "general medicine",
    },
  });
  typia.assert(provider);

  // Register a patient
  const patientEmail = `patient_${RandomGenerator.alphaNumeric(6)}@domain.com`;
  const patientPassword = RandomGenerator.alphaNumeric(10);
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      password: patientPassword,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1990, 1, 1).toISOString(),
      phone: RandomGenerator.mobile(),
      provider: undefined,
      provider_key: undefined,
    },
  });
  typia.assert(patient);

  // Switch to organization admin context to provision appointment status and resources
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    },
  });

  // Create appointment status
  const statusCreate = {
    status_code: `scheduled_${RandomGenerator.alphaNumeric(5)}`,
    display_name: "Scheduled",
    business_status: "active",
    sort_order: 1,
  };
  const status =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.create(
      connection,
      {
        body: statusCreate,
      },
    );
  typia.assert(status);

  // Reserve room
  const roomId = typia.random<string & tags.Format<"uuid">>();
  const start_time = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour from now
  const end_time = new Date(Date.now() + 7200 * 1000).toISOString(); // 2 hours from now
  const roomReservation =
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org.id,
          room_id: roomId,
          reservation_start: start_time,
          reservation_end: end_time,
          reservation_type: "appointment",
          appointment_id: null,
        },
      },
    );
  typia.assert(roomReservation);

  // Reserve equipment (optional)
  const equipmentId = typia.random<string & tags.Format<"uuid">>();
  const equipmentReservation =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.create(
      connection,
      {
        body: {
          organization_id: org.id,
          equipment_id: equipmentId,
          reservation_start: start_time,
          reservation_end: end_time,
          appointment_id: null,
          reservation_type: "appointment",
        },
      },
    );
  typia.assert(equipmentReservation);

  // Switch to department head context for appointment creation
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: headEmail,
      password: headPassword,
    },
  });

  // Create appointment
  const appointmentCreate = {
    healthcare_platform_organization_id: org.id,
    healthcare_platform_department_id: dept.id,
    provider_id: provider.id,
    patient_id: patient.id,
    status_id: status.id,
    room_id: roomId,
    equipment_id: equipmentId,
    appointment_type: "in-person",
    start_time: start_time,
    end_time: end_time,
    title: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    recurrence_rule: null,
  };

  const appointment =
    await api.functional.healthcarePlatform.departmentHead.appointments.create(
      connection,
      {
        body: appointmentCreate,
      },
    );
  typia.assert(appointment);

  TestValidator.equals(
    "appointment provider matches",
    appointment.provider_id,
    provider.id,
  );
  TestValidator.equals(
    "appointment patient matches",
    appointment.patient_id,
    patient.id,
  );
  TestValidator.equals(
    "appointment status matches",
    appointment.status_id,
    status.id,
  );
  TestValidator.equals(
    "appointment department matches",
    appointment.healthcare_platform_department_id,
    dept.id,
  );
  TestValidator.equals("appointment room matches", appointment.room_id, roomId);
  TestValidator.equals(
    "appointment equipment matches",
    appointment.equipment_id,
    equipmentId,
  );

  // Error: cross-department appointment creation attempt
  // Create another department
  await api.functional.auth.organizationAdmin.login(connection, {
    body: { email: orgAdminEmail, password: orgAdminPassword },
  });
  const dept2Create = {
    healthcare_platform_organization_id: org.id,
    code: RandomGenerator.alphaNumeric(4),
    name: `Dept ${RandomGenerator.name(2)}`,
    status: "active",
  };
  const dept2 =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id,
        body: dept2Create,
      },
    );
  typia.assert(dept2);

  await api.functional.auth.departmentHead.login(connection, {
    body: { email: headEmail, password: headPassword },
  });

  await TestValidator.error(
    "should not allow appointment creation in a department outside department head's scope",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.appointments.create(
        connection,
        {
          body: {
            ...appointmentCreate,
            healthcare_platform_department_id: dept2.id,
          },
        },
      );
    },
  );

  // Error: invalid provider/patient/status reference
  await TestValidator.error(
    "should fail if provider id is invalid",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.appointments.create(
        connection,
        {
          body: {
            ...appointmentCreate,
            provider_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );
  await TestValidator.error(
    "should fail if patient id is invalid",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.appointments.create(
        connection,
        {
          body: {
            ...appointmentCreate,
            patient_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );

  await TestValidator.error("should fail if status id is invalid", async () => {
    await api.functional.healthcarePlatform.departmentHead.appointments.create(
      connection,
      {
        body: {
          ...appointmentCreate,
          status_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  });

  // No test for missing required property (skipped: prohibited by type system)
}
