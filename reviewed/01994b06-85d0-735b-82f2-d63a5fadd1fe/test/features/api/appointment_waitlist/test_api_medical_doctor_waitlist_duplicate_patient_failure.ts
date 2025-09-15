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
 * Validates that a patient cannot be added multiple times to an appointment
 * waitlist. Ensures proper rejection of duplicate entries.
 *
 * 1. Register system admin
 * 2. Register and authenticate an organization admin
 * 3. Create an organization and department
 * 4. Register medical doctor and patient
 * 5. Assign both doctor and patient to the organization
 * 6. Authenticate as medical doctor
 * 7. Create an appointment
 * 8. Add the patient to the appointment waitlist
 * 9. Attempt to add the patient to the same waitlist again (expect rejection)
 * 10. Assert only one waitlist entry exists for the patient
 */
export async function test_api_medical_doctor_waitlist_duplicate_patient_failure(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysAdminEmail = RandomGenerator.alphaNumeric(6) + "@syshost.com";
  const sysAdminPassword = RandomGenerator.alphaNumeric(10);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(sysAdmin);

  // 2. Register and authenticate organization admin
  const orgAdminEmail = RandomGenerator.alphaNumeric(8) + "@orgadmin.com";
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
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
      provider: undefined,
      provider_key: undefined,
    },
  });

  // 3. Create organization and department
  const orgCode = RandomGenerator.alphabets(8);
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        },
      },
    );
  typia.assert(org);
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id,
        body: {
          healthcare_platform_organization_id: org.id,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(department);

  // 4. Register medical doctor and patient
  const doctorEmail = RandomGenerator.alphaNumeric(10) + "@hospital.com";
  const doctorPassword = RandomGenerator.alphaNumeric(15);
  const doctorNpi = RandomGenerator.alphabets(10);
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: doctorNpi,
      password: doctorPassword,
      specialty: "general",
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(doctor);
  const patientEmail = RandomGenerator.alphaNumeric(10) + "@patient.com";
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date("2000-01-01").toISOString(),
      phone: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      provider: undefined,
      provider_key: undefined,
    },
  });
  typia.assert(patient);

  // 5. Assign both doctor and patient to the organization
  await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.create(
    connection,
    {
      body: {
        user_id: doctor.id,
        healthcare_platform_organization_id: org.id,
        role_code: "doctor",
        assignment_status: "active",
      },
    },
  );
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

  // 6. Authenticate as medical doctor
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    },
  });

  // 7. Create an appointment
  const apptStatus = typia.random<string & tags.Format<"uuid">>();
  const appointment =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org.id,
          healthcare_platform_department_id: department.id,
          provider_id: doctor.id,
          patient_id: patient.id,
          status_id: apptStatus,
          appointment_type: "in-person",
          start_time: new Date(Date.now() + 3600 * 1000).toISOString(),
          end_time: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 6 }),
        },
      },
    );
  typia.assert(appointment);

  // 8. Add the patient to the appointment waitlist
  await api.functional.healthcarePlatform.medicalDoctor.appointments.waitlists.index(
    connection,
    {
      appointmentId: appointment.id,
      body: {
        patient_id: patient.id,
        status: "active",
      },
    },
  );

  // 9. Attempt to add the same patient a second time (expect failure)
  await TestValidator.error(
    "cannot add the same patient twice to waitlist",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.waitlists.index(
        connection,
        {
          appointmentId: appointment.id,
          body: {
            patient_id: patient.id,
            status: "active",
          },
        },
      );
    },
  );

  // 10. Assert only one waitlist entry exists for this patient-appointment
  const waitlist =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.waitlists.index(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          patient_id: patient.id,
        },
      },
    );
  typia.assert(waitlist);
  TestValidator.equals(
    "waitlist has only one entry for the patient",
    waitlist.data.length,
    1,
  );
}
