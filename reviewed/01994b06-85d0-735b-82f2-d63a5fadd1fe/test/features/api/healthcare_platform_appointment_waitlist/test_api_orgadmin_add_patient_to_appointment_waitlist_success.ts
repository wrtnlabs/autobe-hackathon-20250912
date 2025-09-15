import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";

/**
 * Organization admin adds a patient to an appointment waitlist
 *
 * 1. Register system admin
 * 2. Login as system admin
 * 3. Create an organization
 * 4. Register organization admin
 * 5. Login as organization admin
 * 6. Create a department
 * 7. Register patient
 * 8. Assign org admin to organization (active organization admin assignment)
 * 9. Assign patient to organization (active patient assignment)
 * 10. Create appointment (provider: org admin, patient)
 * 11. Add patient to waitlist for appointment
 * 12. Ensure waitlist contains patient info
 */
export async function test_api_orgadmin_add_patient_to_appointment_waitlist_success(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysAdminEmail = RandomGenerator.name(1) + "@corp.example.com";
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail as string,
      password: "AdminP@ss123",
    },
  });
  typia.assert(systemAdmin);

  // 2. Login as system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail as string & tags.Format<"email">,
      provider: "local",
      provider_key: sysAdminEmail as string,
      password: "AdminP@ss123",
    },
  });

  // 3. Create a new organization
  const orgCode = RandomGenerator.alphaNumeric(8);
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: RandomGenerator.name(2),
          status: "active",
        },
      },
    );
  typia.assert(organization);

  // 4. Register organization admin
  const orgAdminEmail = RandomGenerator.name(1) + "@org.example.com";
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail as string & tags.Format<"email">,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "OrgAdm1n!",
      },
    },
  );
  typia.assert(orgAdmin);

  // 5. Login as organization admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail as string & tags.Format<"email">,
      password: "OrgAdm1n!",
    },
  });

  // 6. Create a department
  const deptCode = RandomGenerator.alphaNumeric(4);
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: deptCode,
          name: RandomGenerator.name(1),
          status: "active",
        },
      },
    );
  typia.assert(department);

  // 7. Register patient
  const patientEmail = RandomGenerator.name(1) + "@patient.example.com";
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1990, 0, 1).toISOString() as string &
        tags.Format<"date-time">,
      phone: RandomGenerator.mobile(),
      password: "P@ssw0rd!",
    },
  });
  typia.assert(patient);

  // 8. Assign org admin user assignment (active)
  const adminAssignment =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.create(
      connection,
      {
        body: {
          user_id: orgAdmin.id,
          healthcare_platform_organization_id: organization.id,
          role_code: "org_admin",
          assignment_status: "active",
        },
      },
    );
  typia.assert(adminAssignment);

  // 9. Assign patient to org (active patient assignment)
  const patientAssignment =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.create(
      connection,
      {
        body: {
          user_id: patient.id,
          healthcare_platform_organization_id: organization.id,
          role_code: "patient",
          assignment_status: "active",
        },
      },
    );
  typia.assert(patientAssignment);

  // 10. Create appointment
  const now = new Date();
  const appointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          healthcare_platform_department_id: department.id,
          provider_id: adminAssignment.id,
          patient_id: patient.id,
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: "in-person",
          start_time: new Date(
            now.getTime() + 60 * 60 * 1000,
          ).toISOString() as string & tags.Format<"date-time">,
          end_time: new Date(
            now.getTime() + 2 * 60 * 60 * 1000,
          ).toISOString() as string & tags.Format<"date-time">,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph(),
        },
      },
    );
  typia.assert(appointment);

  // 11. Add patient to appointment waitlist
  const waitlistEntry =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          appointment_id: appointment.id,
          patient_id: patient.id,
          status: "active",
        },
      },
    );
  typia.assert(waitlistEntry);

  // 12. Validate: returned entry has correct patient/appointment and status
  TestValidator.equals(
    "added waitlist entry should reference patient, appointment, status",
    {
      appointment_id: appointment.id,
      patient_id: patient.id,
      status: "active",
    },
    {
      appointment_id: waitlistEntry.appointment_id,
      patient_id: waitlistEntry.patient_id,
      status: waitlistEntry.status,
    },
  );
}
