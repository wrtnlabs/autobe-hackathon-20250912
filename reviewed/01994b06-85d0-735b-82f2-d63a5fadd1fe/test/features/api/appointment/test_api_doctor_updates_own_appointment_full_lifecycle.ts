import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentStatus";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformResourceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformResourceSchedule";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Full lifecycle test for doctor updating their own appointment and RBAC.
 *
 * 1. System admin joins and logs in
 * 2. Org admin created, joins, and logs in
 * 3. Create organization as system admin
 * 4. Create department as org admin under org
 * 5. Org admin creates a patient
 * 6. Org admin creates an appointment status and resource schedule
 * 7. Register medical doctor and log in
 * 8. Doctor creates an appointment with the above context
 * 9. Doctor updates their own appointment with new values for start/end time,
 *    title, and description
 * 10. Validate update: check updated fields/timestamp
 * 11. Negative test: doctor tries to update an appointment not assigned to self
 *     (should error)
 * 12. Negative test: update finalized/cancelled appointment (should error)
 * 13. Negative test: update attempt for privilege escalation (editing
 *     organization/department) is denied
 */
export async function test_api_doctor_updates_own_appointment_full_lifecycle(
  connection: api.IConnection,
) {
  // System admin joins and logs in
  const sysAdminEmail = RandomGenerator.alphaNumeric(8) + "@orgadmin.com";
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  const sysAdminAuth = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(sysAdminAuth);

  // Create org as system admin
  const orgCode = RandomGenerator.alphaNumeric(6);
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: RandomGenerator.name(2),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(org);

  // Org admin creation: join
  const orgAdminEmail = RandomGenerator.alphaNumeric(8) + "@orgadmin.com";
  const orgAdminPassword = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgAdminEmail,
      full_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  const orgAdminAuth = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: orgAdminPassword,
        provider: "local",
        provider_key: orgAdminEmail,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgAdminAuth);

  // Create department
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id,
        body: {
          healthcare_platform_organization_id: org.id,
          code: RandomGenerator.alphaNumeric(4),
          name: RandomGenerator.name(2),
          status: "active",
        } satisfies IHealthcarePlatformDepartment.ICreate,
      },
    );
  typia.assert(department);

  // Org admin creates a patient
  const patientEmail = RandomGenerator.alphaNumeric(8) + "@patient.com";
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: patientEmail,
          full_name: RandomGenerator.name(2),
          date_of_birth: new Date(
            1980 + Math.floor(Math.random() * 30),
            0,
            1,
          ).toISOString(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patient);

  // Org admin creates an appointment status (scheduled) and (cancelled or finalized)
  const scheduledStatus =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.create(
      connection,
      {
        body: {
          status_code: "scheduled" + RandomGenerator.alphaNumeric(4),
          display_name: "Scheduled",
          business_status: "active",
          sort_order: 1,
        } satisfies IHealthcarePlatformAppointmentStatus.ICreate,
      },
    );
  typia.assert(scheduledStatus);
  const finalizedStatus =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.create(
      connection,
      {
        body: {
          status_code: "finalized" + RandomGenerator.alphaNumeric(4),
          display_name: "Finalized",
          business_status: "closed",
          sort_order: 99,
        } satisfies IHealthcarePlatformAppointmentStatus.ICreate,
      },
    );
  typia.assert(finalizedStatus);
  const cancelledStatus =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.create(
      connection,
      {
        body: {
          status_code: "cancelled" + RandomGenerator.alphaNumeric(4),
          display_name: "Cancelled",
          business_status: "closed",
          sort_order: 100,
        } satisfies IHealthcarePlatformAppointmentStatus.ICreate,
      },
    );
  typia.assert(cancelledStatus);

  // Org admin creates resource schedule (room or equipment)
  const resourceSchedule =
    await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org.id,
          resource_type: "room",
          resource_id: org.id, // just using org as fake resource for this test
          available_start_time: "08:00",
          available_end_time: "18:00",
          recurrence_pattern: null,
          exception_dates: null,
        } satisfies IHealthcarePlatformResourceSchedule.ICreate,
      },
    );
  typia.assert(resourceSchedule);

  // Medical doctor user registration
  const doctorEmail = RandomGenerator.alphaNumeric(8) + "@doctor.com";
  const doctorPassword = RandomGenerator.alphaNumeric(10);
  const doctorNPI = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(2),
      npi_number: doctorNPI,
      password: doctorPassword as string & tags.Format<"password">,
      specialty: "general",
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  // login as doctor
  const doctorAuth = await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword as string & tags.Format<"password">,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  typia.assert(doctorAuth);

  // Doctor creates an appointment assigned to self and above patient
  const appointmentStart = new Date(Date.now() + 1000 * 60 * 60 * 24); // 1 day from now
  const appointmentEnd = new Date(appointmentStart.getTime() + 60 * 60 * 1000); // +1hr
  const appointment =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org.id,
          healthcare_platform_department_id: department.id,
          provider_id: doctorAuth.id,
          patient_id: patient.id,
          status_id: scheduledStatus.id,
          room_id: org.id,
          equipment_id: undefined,
          appointment_type: "in-person",
          start_time: appointmentStart.toISOString(),
          end_time: appointmentEnd.toISOString(),
          title: "Initial Appointment",
          description: "Routine checkup.",
          recurrence_rule: null,
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointment);

  // Doctor updates their own appointment
  const updatedStart = new Date(appointmentStart.getTime() + 1000 * 60 * 30); // push 30min forward
  const updatedEnd = new Date(appointmentEnd.getTime() + 1000 * 60 * 30);
  const updatedTitle = "Adjusted Appointment";
  const updatedDescription = "Changed schedule, bring recent lab results.";
  const updated =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.update(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          start_time: updatedStart.toISOString(),
          end_time: updatedEnd.toISOString(),
          title: updatedTitle,
          description: updatedDescription,
        } satisfies IHealthcarePlatformAppointment.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated appointment start_time",
    updated.start_time,
    updatedStart.toISOString(),
  );
  TestValidator.equals(
    "updated appointment title",
    updated.title,
    updatedTitle,
  );
  TestValidator.predicate(
    "updated_at is newer than original",
    new Date(updated.updated_at).getTime() >
      new Date(appointment.updated_at).getTime(),
  );

  // Negative: try updating a different appointment (belongs to new provider)
  // First, create a new doctor and appointment
  const otherDoctorEmail = RandomGenerator.alphaNumeric(8) + "@doctor.com";
  const otherDoctorPassword = RandomGenerator.alphaNumeric(10);
  const otherNPI = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: otherDoctorEmail,
      full_name: RandomGenerator.name(2),
      npi_number: otherNPI,
      password: otherDoctorPassword as string & tags.Format<"password">,
      specialty: "general",
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  // login as other doctor
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: otherDoctorEmail,
      password: otherDoctorPassword as string & tags.Format<"password">,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  const otherAppointment =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org.id,
          healthcare_platform_department_id: department.id,
          provider_id: otherNPI,
          patient_id: patient.id,
          status_id: scheduledStatus.id,
          room_id: org.id,
          equipment_id: undefined,
          appointment_type: "in-person",
          start_time: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
          end_time: new Date(Date.now() + 1000 * 60 * 60 * 49).toISOString(),
          title: "Other appt",
          description: null,
          recurrence_rule: null,
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(otherAppointment);

  // Attempt update NOT assigned to this doctor (logged in as original doctor)
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword as string & tags.Format<"password">,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  await TestValidator.error(
    "unauthorized doctor cannot update appointment for non-assigned provider",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.update(
        connection,
        {
          appointmentId: otherAppointment.id,
          body: {
            title: "Should not succeed",
          } satisfies IHealthcarePlatformAppointment.IUpdate,
        },
      );
    },
  );

  // Negative: Try updating finalized/cancelled appointment
  // First, update the appointment to finalized/cancelled as org admin (simulate status change)
  // But the update endpoint is only for doctor; so can only test the blocked status with valid doctor
  const updatedCancelled =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.update(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          status_id: cancelledStatus.id,
        } satisfies IHealthcarePlatformAppointment.IUpdate,
      },
    );
  typia.assert(updatedCancelled);
  await TestValidator.error("cannot update cancelled appointment", async () => {
    await api.functional.healthcarePlatform.medicalDoctor.appointments.update(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          title: "Late update after cancelled",
        } satisfies IHealthcarePlatformAppointment.IUpdate,
      },
    );
  });

  // Negative: Attempt privilege escalation (doctor tries editing org or department)
  await TestValidator.error(
    "doctor cannot reassign org or department via update",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.appointments.update(
        connection,
        {
          appointmentId: appointment.id,
          body: {
            healthcare_platform_organization_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            healthcare_platform_department_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IHealthcarePlatformAppointment.IUpdate,
        },
      );
    },
  );
}
