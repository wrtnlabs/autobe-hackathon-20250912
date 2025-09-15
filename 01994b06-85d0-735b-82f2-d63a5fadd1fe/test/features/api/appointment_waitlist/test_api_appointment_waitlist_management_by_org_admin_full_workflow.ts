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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentWaitlist";

/**
 * End-to-end scenario for organization admin waitlist management:
 *
 * 1. System admin joins and logs in to create an organization (tenant)
 * 2. Org admin account is registered, logged in
 * 3. Department is created under the organization
 * 4. Patient is created/registered
 * 5. Appointment is created (we will use org admin as provider and patient as
 *    patient)
 * 6. Patient is added to the appointment's waitlist
 * 7. Waitlist is retrieved and validated
 * 8. Patch waitlist (e.g., fetch filtered list)
 * 9. Attempt to patch waitlist with non-existent appointmentId (should error)
 * 10. Attempt to patch waitlist as unauthenticated (should error)
 */
export async function test_api_appointment_waitlist_management_by_org_admin_full_workflow(
  connection: api.IConnection,
) {
  // 1. System admin joins
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(16);
  const sysAdmin: IHealthcarePlatformSystemAdmin.IAuthorized =
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
  typia.assert(sysAdmin);

  // 2. Log in as system admin (optional, but for completeness and using fresh token)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 3. System admin creates organization
  const orgCode = RandomGenerator.alphaNumeric(8);
  const orgName = RandomGenerator.name(2);
  const organization: IHealthcarePlatformOrganization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: orgName,
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);

  // 4. Organization admin joins
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdmin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
        provider: undefined,
        provider_key: undefined,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgAdmin);

  // 5. Log in as org admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: undefined,
      provider_key: undefined,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 6. Org admin creates department
  const departmentCode = RandomGenerator.alphaNumeric(4);
  const department: IHealthcarePlatformDepartment =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: departmentCode,
          name: RandomGenerator.name(1),
          status: "active",
        } satisfies IHealthcarePlatformDepartment.ICreate,
      },
    );
  typia.assert(department);

  // 7. Org admin creates patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patient: IHealthcarePlatformPatient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: patientEmail,
          full_name: RandomGenerator.name(2),
          date_of_birth: new Date("1990-01-01T00:00:00Z").toISOString(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patient);

  // 8. Org admin creates appointment (set org admin as provider, patient as patient)
  // For test, provider_id can be org admin id (if not strictly enforced)
  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const end = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const appointment: IHealthcarePlatformAppointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          healthcare_platform_department_id: department.id,
          provider_id: orgAdmin.id,
          patient_id: patient.id,
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: "in-person",
          start_time: start,
          end_time: end,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          recurrence_rule: null,
          room_id: null,
          equipment_id: null,
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointment);

  // 9. Add patient to waitlist for appointment
  const waitlistEntry: IHealthcarePlatformAppointmentWaitlist =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          appointment_id: appointment.id,
          patient_id: patient.id,
        } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate,
      },
    );
  typia.assert(waitlistEntry);

  // 10. Retrieve waitlist for the appointment (basic filter)
  const waitlistPage =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.waitlists.index(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          patient_id: patient.id,
          status: "active",
          page: 1 satisfies number as number,
          page_size: 10 satisfies number as number,
        },
      },
    );
  typia.assert(waitlistPage);
  TestValidator.predicate(
    "waitlist result contains at least one entry for our patient",
    () => waitlistPage.data.some((x) => x.patient_id === patient.id),
  );

  // 11. Error - patch waitlist with invalid appointmentId
  await TestValidator.error(
    "patch waitlist fails when appointment doesn't exist",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.appointments.waitlists.index(
        connection,
        {
          appointmentId: typia.random<string & tags.Format<"uuid">>(), // likely non-existent
          body: {
            status: "active",
          },
        },
      );
    },
  );

  // 12. Error - patch waitlist unauthorized (simulate by using unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "patch waitlist fails when organization admin is not authenticated",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.appointments.waitlists.index(
        unauthConn,
        {
          appointmentId: appointment.id,
          body: {
            status: "active",
          },
        },
      );
    },
  );
}
