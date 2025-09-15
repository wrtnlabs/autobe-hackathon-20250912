import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentStatus";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformResourceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformResourceSchedule";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates updating an appointment as a department head, requiring full
 * dependency setup:
 *
 * 1. Register and login system admin (for org creation)
 * 2. Create organization
 * 3. Register org admin (for department, patient, status, schedule)
 * 4. Login org admin
 * 5. Create department in organization
 * 6. Register & login department head
 * 7. Register and login medical doctor
 * 8. Create patient
 * 9. Create appointment status
 * 10. Create resource schedule (room)
 * 11. Department head logs in
 * 12. Department head creates appointment
 * 13. Department head updates appointment fields (title, appointment_type, status,
 *     room, description) Test asserts type compliance and business ownership
 *     boundaries throughout.
 */
export async function test_api_appointment_update_by_department_head_complete_chain(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  typia.assert(sysAdmin);
  // 2. Login as system admin (token set automatically)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  // 3. Create organization
  const orgCode = RandomGenerator.alphaNumeric(6);
  const orgName = RandomGenerator.paragraph({ sentences: 2 });
  const organization =
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
  typia.assert(organization);
  // 4. Register organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
        provider: "local",
        provider_key: orgAdminEmail,
      },
    },
  );
  typia.assert(orgAdmin);
  // 5. Login as organization admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    },
  });
  // 6. Create department in org
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
        },
      },
    );
  typia.assert(department);
  // 7. Register department head
  const depHeadEmail = typia.random<string & tags.Format<"email">>();
  const depHeadPassword = RandomGenerator.alphaNumeric(12);
  const depHead = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: depHeadEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: depHeadPassword,
    },
  });
  typia.assert(depHead);
  // 8. Login as department head (ensure context is switched so head can make calls later)
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: depHeadEmail,
      password: depHeadPassword,
    },
  });
  // 9. Register medical doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = RandomGenerator.alphaNumeric(12);
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: RandomGenerator.alphaNumeric(10),
      password: doctorPassword,
      specialty: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(doctor);
  // 10. Login medical doctor
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    },
  });
  // 11. Login (again) as organization admin (to create patient, appointment status, resource)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    },
  });
  // 12. Create patient
  const patientDOB = new Date(
    Date.now() - 35 * 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: patientDOB as string & tags.Format<"date-time">,
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(patient);
  // 13. Create appointment status
  const status =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.create(
      connection,
      {
        body: {
          status_code: RandomGenerator.alphaNumeric(8),
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
          business_status: RandomGenerator.pick(["active", "closed", null]),
          sort_order: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(status);
  // 14. Create resource schedule as org admin (simulate a room resource)
  const roomResource =
    await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          resource_type: "room",
          resource_id: typia.random<string & tags.Format<"uuid">>(),
          available_start_time: "09:00",
          available_end_time: "18:00",
          recurrence_pattern: null,
          exception_dates: null,
        },
      },
    );
  typia.assert(roomResource);
  // 15. Login as department head before appointment creation
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: depHeadEmail,
      password: depHeadPassword,
    },
  });
  // 16. Department head creates appointment
  const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const endTime = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();
  const createBody = {
    healthcare_platform_organization_id: organization.id,
    healthcare_platform_department_id: department.id,
    provider_id: doctor.id,
    patient_id: patient.id,
    status_id: status.id,
    room_id: roomResource.id,
    appointment_type: "in-person",
    start_time: startTime as string & tags.Format<"date-time">,
    end_time: endTime as string & tags.Format<"date-time">,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    recurrence_rule: null,
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.departmentHead.appointments.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(appointment);
  // 17. Department head updates appointment fields (change title, type, status, room, desc)
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    appointment_type: "telemedicine",
    status_id: status.id,
    room_id: roomResource.id,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHealthcarePlatformAppointment.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.departmentHead.appointments.update(
      connection,
      {
        appointmentId: appointment.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  // Validate that update is reflected
  TestValidator.equals(
    "appointment updated title",
    updated.title,
    updateBody.title,
  );
  TestValidator.equals(
    "appointment updated type",
    updated.appointment_type,
    updateBody.appointment_type,
  );
  TestValidator.equals(
    "appointment updated description",
    updated.description,
    updateBody.description,
  );
}
