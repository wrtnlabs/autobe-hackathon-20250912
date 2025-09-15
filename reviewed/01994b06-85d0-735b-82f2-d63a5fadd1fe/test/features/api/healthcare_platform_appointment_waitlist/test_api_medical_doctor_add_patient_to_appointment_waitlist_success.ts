import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentWaitlist";

/**
 * Test a medical doctor successfully adding a patient to the waitlist for an
 * appointment that is currently full.
 *
 * This test simulates a real multi-actor workflow:
 *
 * 1. Register and authenticate system admin, organization admin, medical doctor,
 *    and patient
 * 2. System admin creates an organization
 * 3. Organization admin creates a department
 * 4. Assign the doctor and patient to the organization with proper role codes
 * 5. Medical doctor schedules an appointment with the patient
 * 6. Simulate the appointment as "full" (no direct API for this; we focus on
 *    adding to waitlist)
 * 7. Medical doctor adds the patient to the appointment waitlist
 * 8. Validate patient now appears in the waitlist with 'active' status
 * 9. All API responses are typia.assert validated and business logic checks
 *    performed
 */
export async function test_api_medical_doctor_add_patient_to_appointment_waitlist_success(
  connection: api.IConnection,
) {
  // 1. System admin registration and login
  const sysAdminEmail = RandomGenerator.alphaNumeric(10) + "@corp.com";
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  typia.assert(sysAdmin);

  // 2. Organization admin registration and login
  const orgAdminEmail = RandomGenerator.alphaNumeric(10) + "@org.com";
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail as string & tags.Format<"email">,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
      },
    },
  );
  typia.assert(orgAdminJoin);
  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail as string & tags.Format<"email">,
        password: orgAdminPassword,
      },
    },
  );
  typia.assert(orgAdminLogin);

  // 3. Medical doctor registration and login
  const doctorEmail = RandomGenerator.alphaNumeric(10) + "@hospital.com";
  const doctorPassword = RandomGenerator.alphaNumeric(14);
  const doctorNPI = RandomGenerator.alphaNumeric(10);
  const doctorJoin = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      npi_number: doctorNPI,
      password: doctorPassword,
    },
  });
  typia.assert(doctorJoin);
  const doctorLogin = await api.functional.auth.medicalDoctor.login(
    connection,
    {
      body: {
        email: doctorEmail as string & tags.Format<"email">,
        password: doctorPassword,
      },
    },
  );
  typia.assert(doctorLogin);

  // 4. Patient registration
  const patientEmail = RandomGenerator.alphaNumeric(11) + "@patient.com";
  const patientPassword = RandomGenerator.alphaNumeric(13);
  const dob = new Date("1980-01-01").toISOString();
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: dob,
      phone: RandomGenerator.mobile(),
      password: patientPassword,
    },
  });
  typia.assert(patient);

  // 5. System admin logs in (ensure org create context)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail as string & tags.Format<"email">,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });

  // 6. Create organization
  const organizationName = "Test Health Org " + RandomGenerator.alphaNumeric(5);
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(7),
          name: organizationName,
          status: "active",
        },
      },
    );
  typia.assert(org);

  // 7. Organization admin logs in
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail as string & tags.Format<"email">,
      password: orgAdminPassword,
    },
  });

  // 8. Create department in organization
  const dept =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id,
        body: {
          healthcare_platform_organization_id: org.id,
          code: RandomGenerator.alphaNumeric(4),
          name: RandomGenerator.name(2),
          status: "active",
        },
      },
    );
  typia.assert(dept);

  // 9. Assign doctor and patient to organization with proper roles
  const doctorAssignment =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.create(
      connection,
      {
        body: {
          user_id: doctorJoin.id,
          healthcare_platform_organization_id: org.id,
          role_code: "doctor",
          assignment_status: "active",
        },
      },
    );
  typia.assert(doctorAssignment);
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

  // 10. Medical doctor logs in
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail as string & tags.Format<"email">,
      password: doctorPassword,
    },
  });

  // 11. Create appointment (simulate as if appointment schedule is full)
  const start = new Date(Date.now() + 60 * 60 * 1000); // 1 hour in future
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 2 hours in future
  const appointment =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org.id,
          healthcare_platform_department_id: dept.id,
          provider_id: doctorJoin.id,
          patient_id: patient.id,
          status_id: typia.random<string & tags.Format<"uuid">>(), // simulate 'scheduled' status
          appointment_type: "in-person",
          start_time: start.toISOString() as string & tags.Format<"date-time">,
          end_time: end.toISOString() as string & tags.Format<"date-time">,
          title: "Consultation Appointment " + RandomGenerator.alphaNumeric(6),
          description: "General checkup for waitlist scenario",
        },
      },
    );
  typia.assert(appointment);

  // 12. Medical doctor patches waitlist to add the patient
  const waitlistPatchBody = {
    patient_id: patient.id,
  } satisfies IHealthcarePlatformAppointmentWaitlist.IRequest;

  const waitlistPage =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.waitlists.index(
      connection,
      {
        appointmentId: appointment.id,
        body: waitlistPatchBody,
      },
    );
  typia.assert(waitlistPage);

  // 13. Validate that the patient is present on the waitlist
  const found = waitlistPage.data.find((w) => w.patient_id === patient.id);
  typia.assertGuard(found!);
  TestValidator.equals(
    "Patient appears on appointment waitlist after PATCH",
    found!.patient_id,
    patient.id,
  );
  TestValidator.equals("Waitlist entry is active", found!.status, "active");

  // 14. Confirm all entity responses are valid
  TestValidator.predicate(
    "All prerequisite entities and assignments were successfully created",
    Boolean(
      sysAdmin.id &&
        orgAdminJoin.id &&
        doctorJoin.id &&
        patient.id &&
        org.id &&
        dept.id &&
        doctorAssignment.id &&
        patientAssignment.id &&
        appointment.id &&
        found!.id,
    ),
  );
}
