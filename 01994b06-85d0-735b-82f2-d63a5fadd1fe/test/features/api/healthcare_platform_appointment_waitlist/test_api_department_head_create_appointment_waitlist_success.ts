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
import type { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";

/**
 * Validate that a department head can successfully add a patient to the
 * waitlist for an appointment, ensuring all prerequisite entity creations
 * (system admin, organization, organization admin, department head, patient,
 * assignments, appointment) and role authentications are performed. Steps
 * include account registration and login for required roles, organization and
 * department creation, assigning users to organization (including department
 * head and patient), appointment creation as department head, and finally,
 * adding the patient to the appointment waitlist. Final assertions validate
 * that the business logic correctly reflects the waitlist status, response
 * structure, and appropriate links among created entities. This validates both
 * the end-to-end success path and correct entity relationships required for
 * platform compliance.
 */
export async function test_api_department_head_create_appointment_waitlist_success(
  connection: api.IConnection,
) {
  // 1. System admin registers and logs in
  const sysAdminEmail = RandomGenerator.alphaNumeric(8) + "@enterprise.test";
  const sysAdminPassword = RandomGenerator.alphaNumeric(12) + "A1!";
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
  // Now logged in as system admin

  // 2. Create organization
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

  // 3. Organization admin registers & logs in
  const orgAdminEmail = RandomGenerator.alphaNumeric(8) + "@orgadmin.test";
  const orgAdminPassword = RandomGenerator.alphaNumeric(12) + "A1!";
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
  // Now logged in as organization admin

  // 4. Create department within the organization
  const deptCode = RandomGenerator.alphabets(4).toUpperCase();
  const deptName = RandomGenerator.paragraph({ sentences: 2 });
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

  // 5. Department head registers & logs in
  const deptHeadEmail = RandomGenerator.alphaNumeric(8) + "@depthead.test";
  const deptHeadPassword = RandomGenerator.alphaNumeric(12) + "A1!";
  const deptHeadJoin = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: deptHeadEmail,
        full_name: RandomGenerator.name(),
        password: deptHeadPassword,
      },
    },
  );
  typia.assert(deptHeadJoin);

  // Organization admin assigns department head to organization
  const deptHeadAssignment =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.create(
      connection,
      {
        body: {
          user_id: deptHeadJoin.id,
          healthcare_platform_organization_id: org.id,
          role_code: "departmentHead",
          assignment_status: "active",
        },
      },
    );
  typia.assert(deptHeadAssignment);

  // 6. Patient registers
  const patientEmail = RandomGenerator.alphaNumeric(8) + "@patient.test";
  const patientPassword = RandomGenerator.alphaNumeric(12) + "P@aa1!";
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(
        Date.now() - 32 * 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      password: patientPassword,
    },
  });
  typia.assert(patient);

  // Organization admin assigns patient to organization
  const patientAssignment =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.create(
      connection,
      {
        body: {
          user_id: patient.id,
          healthcare_platform_organization_id: org.id,
          role_code: "patient",
          assignment_status: "active",
        },
      },
    );
  typia.assert(patientAssignment);

  // 7. Department head login (switch context)
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadEmail,
      password: deptHeadPassword,
    },
  });

  // Department head creates appointment (also as provider & patient)
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const apptStart = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const apptEnd = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const appointment =
    await api.functional.healthcarePlatform.departmentHead.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org.id,
          healthcare_platform_department_id: department.id,
          provider_id: deptHeadJoin.id,
          patient_id: patient.id,
          status_id: statusId,
          appointment_type: "in-person",
          start_time: apptStart,
          end_time: apptEnd,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
        },
      },
    );
  typia.assert(appointment);

  // 8. Department head adds patient to appointment waitlist
  const waitlistStatus = "active";
  const waitlist =
    await api.functional.healthcarePlatform.departmentHead.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          appointment_id: appointment.id,
          patient_id: patient.id,
          status: waitlistStatus,
        },
      },
    );
  typia.assert(waitlist);
  TestValidator.equals(
    "waitlist appointment id matches",
    waitlist.appointment_id,
    appointment.id,
  );
  TestValidator.equals(
    "waitlist patient id matches",
    waitlist.patient_id,
    patient.id,
  );
  TestValidator.equals(
    "waitlist status is active",
    waitlist.status,
    waitlistStatus,
  );
  TestValidator.predicate(
    "waitlist join_time is valid date-time",
    typeof waitlist.join_time === "string" && waitlist.join_time.length > 0,
  );
  TestValidator.predicate(
    "waitlist created_at is valid date-time",
    typeof waitlist.created_at === "string" && waitlist.created_at.length > 0,
  );
  TestValidator.predicate(
    "waitlist updated_at is valid date-time",
    typeof waitlist.updated_at === "string" && waitlist.updated_at.length > 0,
  );
}
