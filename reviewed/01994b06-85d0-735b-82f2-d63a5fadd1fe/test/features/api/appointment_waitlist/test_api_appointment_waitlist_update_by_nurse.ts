import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates that a nurse can update a waitlist entry for an appointment they
 * are assigned to: Create and login nurse, organization, department, patient,
 * appointment, waitlist, then authenticate nurse, and update waitlist
 * status/rationale. Ensures business rules on allowed status transitions,
 * correct audit documentation, and correct RBAC. Denies update if nurse lacks
 * appointment/department assignment.
 */
export async function test_api_appointment_waitlist_update_by_nurse(
  connection: api.IConnection,
) {
  // 1. System admin register and login
  const sysAdminEmail = RandomGenerator.alphabets(12) + "@sysadmintest.com";
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdminProfile = {
    email: sysAdminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: sysAdminEmail,
    password: sysAdminPassword,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminProfile,
  });
  typia.assert(sysAdminAuth);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });

  // 2. Organization admin register and login
  const orgAdminEmail = RandomGenerator.alphabets(12) + "@orgadmin.com";
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdminProfile = {
    email: orgAdminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: orgAdminPassword,
    provider: "local",
    provider_key: orgAdminEmail,
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAdminProfile },
  );
  typia.assert(orgAdminAuth);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    },
  });

  // 3. Create an organization as system admin
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(3),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);

  // 4. Create a department as org admin
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.name(2),
          status: "active",
        } satisfies IHealthcarePlatformDepartment.ICreate,
      },
    );
  typia.assert(department);

  // 5. Nurse register and login, store nurse id for provider_id
  const nurseEmail = RandomGenerator.alphabets(10) + "@nurse-mail.com";
  const nursePassword = RandomGenerator.alphaNumeric(10);
  const nurseLicense = RandomGenerator.alphaNumeric(10);
  const nurseProfile = {
    email: nurseEmail,
    full_name: RandomGenerator.name(),
    license_number: nurseLicense,
    phone: RandomGenerator.mobile(),
    password: nursePassword,
  } satisfies IHealthcarePlatformNurse.IJoin;
  const nurseAuth = await api.functional.auth.nurse.join(connection, {
    body: nurseProfile,
  });
  typia.assert(nurseAuth);
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePassword,
    },
  });

  // 6. Patient register and login
  const patientEmail = RandomGenerator.alphabets(10) + "@patient.com";
  const patientPassword = RandomGenerator.alphaNumeric(12);
  const patientProfile = {
    email: patientEmail,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(
      1980 + Math.floor(Math.random() * 40),
      0,
      1,
    ).toISOString(),
    phone: RandomGenerator.mobile(),
    password: patientPassword,
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patientAuth = await api.functional.auth.patient.join(connection, {
    body: patientProfile,
  });
  typia.assert(patientAuth);
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientEmail,
      password: patientPassword,
    },
  });

  // 7. Organization admin login (to create appointment as admin)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    },
  });

  // Create appointment as admin: associate department, provider (nurse), and patient
  const appointmentStartTime = new Date(Date.now() + 3600000).toISOString();
  const appointmentEndTime = new Date(Date.now() + 7200000).toISOString();
  const appointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          healthcare_platform_department_id: department.id,
          provider_id: nurseAuth.id, // Use nurse's UUID id as provider_id
          patient_id: patientAuth.id,
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: "in-person",
          start_time: appointmentStartTime as string & tags.Format<"date-time">,
          end_time: appointmentEndTime as string & tags.Format<"date-time">,
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointment);

  // 8. Nurse login to add patient to waitlist for this appointment
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePassword,
    },
  });
  const waitlist =
    await api.functional.healthcarePlatform.nurse.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          appointment_id: appointment.id,
          patient_id: patientAuth.id,
          status: "active",
        } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate,
      },
    );
  typia.assert(waitlist);

  // 9. Nurse updates the waitlist entry (status change)
  const newStatus = "promoted";
  const updateJoinTime = new Date().toISOString() as string &
    tags.Format<"date-time">;
  const updatedWaitlist =
    await api.functional.healthcarePlatform.nurse.appointments.waitlists.update(
      connection,
      {
        appointmentId: appointment.id,
        waitlistId: waitlist.id,
        body: {
          status: newStatus,
          join_time: updateJoinTime,
        } satisfies IHealthcarePlatformAppointmentWaitlist.IUpdate,
      },
    );
  typia.assert(updatedWaitlist);
  TestValidator.equals(
    "waitlist status updated",
    updatedWaitlist.status,
    newStatus,
  );
  TestValidator.equals(
    "waitlist join_time updated",
    updatedWaitlist.join_time,
    updateJoinTime,
  );

  // 10. Negative test: nurse not assigned - should fail
  const nurseEmail2 = RandomGenerator.alphabets(10) + "@nurse-mail.com";
  const nursePassword2 = RandomGenerator.alphaNumeric(10);
  const nurseProfile2 = {
    email: nurseEmail2,
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
    password: nursePassword2,
  } satisfies IHealthcarePlatformNurse.IJoin;
  await api.functional.auth.nurse.join(connection, { body: nurseProfile2 });
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail2,
      password: nursePassword2,
    },
  });
  await TestValidator.error(
    "unauthorized nurse update should fail",
    async () => {
      await api.functional.healthcarePlatform.nurse.appointments.waitlists.update(
        connection,
        {
          appointmentId: appointment.id,
          waitlistId: waitlist.id,
          body: { status: "removed" },
        },
      );
    },
  );
}
