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
 * Validate the ability for an organization admin to update an appointment,
 * covering the full dependencies and end-to-end workflow.
 *
 * 1. Register system admin and authenticate (ensure org creation permission)
 * 2. Create a new organization as system admin
 * 3. Register an organization admin via join and login (to assign organization
 *    context)
 * 4. As organization admin, create a department in the organization
 * 5. Register a medical doctor (provider) via join
 * 6. As organization admin, register a new patient
 * 7. As organization admin, create a new appointment status
 * 8. As organization admin, create a new resource schedule (room or equipment)
 * 9. As organization admin, create an initial appointment, referencing the
 *    above dependencies
 * 10. As organization admin, update the appointment (change date, description,
 *     status, type, and possibly provider/room/equipment)
 * 11. Retrieve (assert) the updated appointment matches intended changes
 */
export async function test_api_appointment_update_with_full_workflow_and_dependencies(
  connection: api.IConnection,
) {
  // 1. Register system admin and authenticate
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = typia.random<string & tags.Format<"password">>();
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

  // 2. Create organization as system admin
  const orgCreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgCreate },
    );
  typia.assert(organization);

  // 3. Register and login as organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = typia.random<string & tags.Format<"password">>();
  const orgAdmin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
        provider: "local",
        provider_key: orgAdminEmail,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgAdmin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4. Create department
  const depCreate = {
    healthcare_platform_organization_id: organization.id,
    code: RandomGenerator.alphaNumeric(3),
    name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
  } satisfies IHealthcarePlatformDepartment.ICreate;

  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: depCreate,
      },
    );
  typia.assert(department);

  // 5. Register a medical doctor (provider)
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = typia.random<string & tags.Format<"password">>();
  const doctor: IHealthcarePlatformMedicalDoctor.IAuthorized =
    await api.functional.auth.medicalDoctor.join(connection, {
      body: {
        email: doctorEmail,
        full_name: RandomGenerator.name(),
        npi_number: RandomGenerator.alphaNumeric(10),
        password: doctorPassword,
        specialty: RandomGenerator.paragraph({ sentences: 1 }),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
    });
  typia.assert(doctor);

  // 6. Register a patient
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: new Date(
            Date.now() - 30 * 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patient);

  // 7. Create appointment status
  const statusCreate = {
    status_code: RandomGenerator.alphaNumeric(6),
    display_name: RandomGenerator.paragraph({ sentences: 1 }),
    business_status: "active",
    sort_order: 1,
  } satisfies IHealthcarePlatformAppointmentStatus.ICreate;
  const status =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.create(
      connection,
      {
        body: statusCreate,
      },
    );
  typia.assert(status);

  // 8. Create resource schedule (room)
  const resourceSchedule =
    await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          resource_type: "room",
          resource_id: typia.random<string & tags.Format<"uuid">>(), // as test, random uuid
          available_start_time: "09:00",
          available_end_time: "18:00",
        } satisfies IHealthcarePlatformResourceSchedule.ICreate,
      },
    );
  typia.assert(resourceSchedule);

  // 9. Create appointment
  const start = new Date();
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const appointmentCreate = {
    healthcare_platform_organization_id: organization.id,
    healthcare_platform_department_id: department.id,
    provider_id: doctor.id,
    patient_id: patient.id,
    status_id: status.id,
    room_id: resourceSchedule.id,
    appointment_type: "in-person",
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    title: "Initial appointment",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    recurrence_rule: null,
  } satisfies IHealthcarePlatformAppointment.ICreate;

  const appointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      {
        body: appointmentCreate,
      },
    );
  typia.assert(appointment);

  // 10. Update appointment (change type, time, status, title, description)
  const updateTitle = "Updated appointment title";
  const updateDescription =
    "Updated appointment description including new notes.";
  const updateStart = new Date(start.getTime() + 24 * 60 * 60 * 1000); // +1 day
  const updateEnd = new Date(updateStart.getTime() + 2 * 60 * 60 * 1000); // +2 hours
  const updateStatus =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.create(
      connection,
      {
        body: {
          status_code: RandomGenerator.alphaNumeric(6),
          display_name: "Completed",
          business_status: "closed",
          sort_order: 2,
        } satisfies IHealthcarePlatformAppointmentStatus.ICreate,
      },
    );
  typia.assert(updateStatus);

  const updatedAppointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.update(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          title: updateTitle,
          description: updateDescription,
          start_time: updateStart.toISOString(),
          end_time: updateEnd.toISOString(),
          appointment_type: "telemedicine",
          status_id: updateStatus.id,
          room_id: null,
        } satisfies IHealthcarePlatformAppointment.IUpdate,
      },
    );
  typia.assert(updatedAppointment);

  // 11. Validate all updates are reflected
  TestValidator.equals(
    "appointment id matches",
    updatedAppointment.id,
    appointment.id,
  );
  TestValidator.equals("updated title", updatedAppointment.title, updateTitle);
  TestValidator.equals(
    "updated description",
    updatedAppointment.description,
    updateDescription,
  );
  TestValidator.equals(
    "updated type",
    updatedAppointment.appointment_type,
    "telemedicine",
  );
  TestValidator.equals(
    "updated status id",
    updatedAppointment.status_id,
    updateStatus.id,
  );
  TestValidator.equals(
    "updated start_time",
    updatedAppointment.start_time,
    updateStart.toISOString(),
  );
  TestValidator.equals(
    "updated end_time",
    updatedAppointment.end_time,
    updateEnd.toISOString(),
  );
  TestValidator.equals("room id cleared", updatedAppointment.room_id, null);
}
