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

/**
 * Validate that a medical doctor can create a waitlist entry for a patient for
 * a specific appointment. Steps: 1) Onboard and login as a medical doctor. 2)
 * Create org and department. 3) Register a patient. 4) Assign patient and
 * doctor to org. 5) Create the appointment. 6) POST to
 * /appointments/{appointmentId}/waitlists to add patient. 7) Check for
 * successful creation and waitlist state update.
 *
 * 1. Onboard/join and login as a system admin (for org creation).
 * 2. System admin creates a new organization.
 * 3. Onboard/join and login as an organization admin (for department creation and
 *    assignments).
 * 4. Organization admin creates a department under the organization.
 * 5. Register a patient.
 * 6. Onboard/join and login as a medical doctor.
 * 7. Organization admin assigns both patient and medical doctor to organization.
 * 8. Medical doctor logs in and creates an appointment for themselves and the
 *    patient.
 * 9. Medical doctor adds the patient to the waitlist for the appointment.
 * 10. Test validates that the waitlist entry exists, references the correct
 *     appointment and patient, and is in 'active' status.
 */
export async function test_api_medical_doctor_create_appointment_waitlist_success(
  connection: api.IConnection,
) {
  // 1. Onboard systemAdmin and login for system-level organization creation
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword as string & tags.Format<"password">,
    },
  });
  typia.assert(systemAdmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword as string & tags.Format<"password">,
    },
  });

  // 2. Create organization
  const orgCode = RandomGenerator.alphaNumeric(8);
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: `Test Org ${RandomGenerator.name()}`,
          status: "active",
        },
      },
    );
  typia.assert(org);

  // 3. Onboard and login as organizationAdmin
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

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    },
  });

  // 4. Create department in the organization
  const dept =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id,
        body: {
          healthcare_platform_organization_id: org.id,
          code: RandomGenerator.alphabets(5).toUpperCase(),
          name: RandomGenerator.name(1),
          status: "active",
        },
      },
    );
  typia.assert(dept);

  // 5. Register patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientPassword = RandomGenerator.alphaNumeric(12);
  const dob = new Date(
    1980 + Math.floor(Math.random() * 30),
    1,
    1,
  ).toISOString();
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: dob as string & tags.Format<"date-time">,
      phone: RandomGenerator.mobile(),
      password: patientPassword,
    },
  });
  typia.assert(patient);

  // 6. Onboard and login as medical doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;
  const npiNumber = RandomGenerator.alphaNumeric(10);
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: npiNumber,
      password: doctorPassword,
      specialty: "general",
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(doctor);

  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    },
  });

  // 7. Switch to organizationAdmin and assign patient
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    },
  });

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

  const doctorAssignment =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.create(
      connection,
      {
        body: {
          user_id: doctor.id,
          healthcare_platform_organization_id: org.id,
          role_code: "medical_doctor",
          assignment_status: "active",
        },
      },
    );
  typia.assert(doctorAssignment);

  // 8. Switch to medicalDoctor, create appointment (choose plausible status and timing)
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    },
  });
  const now = new Date();
  const startTime = new Date(now.getTime() + 1000 * 60 * 60).toISOString(); // in 1 hour
  const endTime = new Date(now.getTime() + 1000 * 60 * 90).toISOString(); // in 1.5 hours
  const statusId = typia.random<string & tags.Format<"uuid">>(); // Simulate status ID
  const appointment =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org.id,
          healthcare_platform_department_id: dept.id,
          provider_id: doctorAssignment.id,
          patient_id: patientAssignment.id,
          status_id: statusId,
          appointment_type: "in-person",
          start_time: startTime as string & tags.Format<"date-time">,
          end_time: endTime as string & tags.Format<"date-time">,
          title: `Visit for ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 4 }),
        },
      },
    );
  typia.assert(appointment);

  // 9. Add patient to the appointment waitlist
  const waitlist =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          appointment_id: appointment.id,
          patient_id: patientAssignment.id,
          status: "active",
        },
      },
    );
  typia.assert(waitlist);

  // 10. Assert waitlist result correctness
  TestValidator.equals(
    "waitlist appointment id matches",
    waitlist.appointment_id,
    appointment.id,
  );
  TestValidator.equals(
    "waitlist patient id matches",
    waitlist.patient_id,
    patientAssignment.id,
  );
  TestValidator.equals("waitlist status is active", waitlist.status, "active");
}
