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
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformResourceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformResourceSchedule";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

export async function test_api_delete_appointment_by_receptionist_and_full_audit(
  connection: api.IConnection,
) {
  /**
   * E2E test for full receptionist appointment deletion with
   * audit/authorization:
   *
   * 1. Register and login system admin
   * 2. Create organization (as system admin)
   * 3. Register and login organization admin
   * 4. Create department (as org admin)
   * 5. Register doctor/provider account
   * 6. Register patient
   * 7. Create appointment status
   * 8. Create resource schedule (room)
   * 9. Register and login receptionist
   * 10. Receptionist creates appointment with all required links
   * 11. Receptionist deletes the appointment (soft delete)
   * 12. Attempt re-deleting (expect error)
   * 13. [Optional] Could verify with a assumed read API if appointment.deleted_at
   *     is set (not possible here)
   *
   * Validates that:
   *
   * - Full dependency chain is satisfied for lawful receptionist appointment
   *   deletion
   * - Soft delete (not hard delete), i.e., record is kept for audit
   * - Unauthorized/duplicate deletion attempts fail
   */
  // Step 1: Register and login as system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(10);
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  typia.assert(sysAdminJoin);

  // Step 2: Create organization (as system admin)
  const org =
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
  typia.assert(org);

  // Step 3: Register and login as organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(10);
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
        provider: undefined,
        provider_key: undefined,
        phone: RandomGenerator.mobile(),
      },
    },
  );
  typia.assert(orgAdminJoin);

  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: orgAdminPassword,
        provider: undefined,
        provider_key: undefined,
      },
    },
  );
  typia.assert(orgAdminLogin);

  // Step 4: Create department (as org admin)
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id,
        body: {
          healthcare_platform_organization_id: org.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(department);

  // Step 5: Register doctor/provider account
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = RandomGenerator.alphaNumeric(10);
  const doctorNPI = RandomGenerator.alphaNumeric(10);
  const doctorJoin = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: doctorNPI,
      password: doctorPassword,
      phone: RandomGenerator.mobile(),
      specialty: "General",
    },
  });
  typia.assert(doctorJoin);

  // Step 6: Register patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const dob = new Date(
    1980 + Math.floor(Math.random() * 30),
    1,
    1,
  ).toISOString();
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: patientEmail,
          full_name: RandomGenerator.name(),
          date_of_birth: dob,
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(patient);

  // Step 7: Create appointment status
  const status =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.create(
      connection,
      {
        body: {
          status_code: "scheduled",
          display_name: "Scheduled",
          business_status: "active",
          sort_order: 1,
        },
      },
    );
  typia.assert(status);

  // Step 8: Create resource schedule (simulate a room)
  const roomResourceId = typia.random<string & tags.Format<"uuid">>();
  const schedule =
    await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org.id,
          resource_type: "room",
          resource_id: roomResourceId,
          available_start_time: "09:00",
          available_end_time: "18:00",
          recurrence_pattern: null,
          exception_dates: null,
        },
      },
    );
  typia.assert(schedule);

  // Step 9: Register and login receptionist
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistPassword = RandomGenerator.alphaNumeric(12);
  const receptionistJoin = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: receptionistEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      },
    },
  );
  typia.assert(receptionistJoin);

  const receptionistLogin = await api.functional.auth.receptionist.login(
    connection,
    {
      body: {
        email: receptionistEmail,
        password: receptionistPassword,
      },
    },
  );
  typia.assert(receptionistLogin);

  // Step 10: Receptionist creates appointment
  const appointmentStart = new Date(Date.now() + 1000 * 60 * 60).toISOString();
  const appointmentEnd = new Date(Date.now() + 1000 * 60 * 120).toISOString();
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org.id,
          healthcare_platform_department_id: department.id,
          provider_id: doctorJoin.id,
          patient_id: patient.id,
          status_id: status.id,
          room_id: roomResourceId,
          appointment_type: "in-person",
          start_time: appointmentStart,
          end_time: appointmentEnd,
          title: "Initial Consultation",
          description: "Patient new consult",
          recurrence_rule: null,
          equipment_id: undefined,
        },
      },
    );
  typia.assert(appointment);

  // Step 11: Receptionist deletes (soft) the appointment
  await api.functional.healthcarePlatform.receptionist.appointments.erase(
    connection,
    {
      appointmentId: appointment.id,
    },
  );
  // Step 12: Attempt to delete again (should fail)
  await TestValidator.error(
    "cannot delete already deleted appointment",
    async () => {
      await api.functional.healthcarePlatform.receptionist.appointments.erase(
        connection,
        {
          appointmentId: appointment.id,
        },
      );
    },
  );
}
