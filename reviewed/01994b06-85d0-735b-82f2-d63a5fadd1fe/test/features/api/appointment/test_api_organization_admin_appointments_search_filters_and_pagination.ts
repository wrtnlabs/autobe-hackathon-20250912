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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointment";

/**
 * Scenario tests the ability of an organization admin to search, filter, and
 * paginate appointment records.
 *
 * 1. Registers and authenticates a system admin for organization creation.
 * 2. Registers and authenticates an organization admin for RBAC test context.
 * 3. Creates a new organization as system admin and authenticates as org admin.
 * 4. Creates a department within the organization.
 * 5. Creates one provider (medical doctor) and one patient.
 * 6. Creates two appointment statuses.
 * 7. Defines a room and equipment (resource schedules).
 * 8. Posts four appointments with varied combinations of status, room/equipment,
 *    type, and time.
 * 9. Validates appointment searches/filters for provider, patient, status,
 *    department, type, date range, room, and equipment.
 * 10. Exercises pagination results and verifies metadata and result counts for
 *     multiple pages, including large page_size.
 * 11. Tests business edge cases for empty result (random uuid), errors for invalid
 *     status filter, and unauthorized/unauthenticated access.
 * 12. Confirms correct result metadata and RBAC protection for organization admin
 *     access.
 */
export async function test_api_organization_admin_appointments_search_filters_and_pagination(
  connection: api.IConnection,
) {
  // Register system admin (for organization creation)
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: RandomGenerator.alphabets(10),
      password: "TestPassword!1",
    },
  });
  typia.assert(sysAdminJoin);

  // Create organization
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(7),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        },
      },
    );
  typia.assert(organization);

  // Register and authenticate org admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: "TestPassword!1",
        phone: RandomGenerator.mobile(),
        provider: undefined,
        provider_key: undefined,
      },
    },
  );
  typia.assert(orgAdminJoin);
  // Login as org admin (simulate token context switch)
  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: "TestPassword!1",
      },
    },
  );
  typia.assert(orgAdminLogin);

  // Create department
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: RandomGenerator.alphaNumeric(3),
          name: "General Medicine",
          status: "active",
        },
      },
    );
  typia.assert(department);

  // Create appointment statuses
  const statusScheduled =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.create(
      connection,
      {
        body: {
          status_code: "scheduled",
          display_name: "Scheduled",
          business_status: "active",
          sort_order: 0,
        },
      },
    );
  typia.assert(statusScheduled);
  const statusConfirmed =
    await api.functional.healthcarePlatform.organizationAdmin.appointmentStatuses.create(
      connection,
      {
        body: {
          status_code: "confirmed",
          display_name: "Confirmed",
          business_status: "active",
          sort_order: 1,
        },
      },
    );
  typia.assert(statusConfirmed);

  // Create medical doctor (provider)
  const doctor =
    await api.functional.healthcarePlatform.organizationAdmin.medicaldoctors.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          npi_number: RandomGenerator.alphaNumeric(10),
          specialty: "general",
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(doctor);

  // Create patient
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: new Date("1990-01-01T00:00:00Z").toISOString(),
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(patient);

  // Create room and equipment as resources
  const roomSchedule =
    await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          resource_type: "room",
          resource_id: RandomGenerator.alphaNumeric(8),
          available_start_time: "08:00",
          available_end_time: "18:00",
        },
      },
    );
  typia.assert(roomSchedule);
  const equipmentSchedule =
    await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          resource_type: "equipment",
          resource_id: RandomGenerator.alphaNumeric(9),
          available_start_time: "09:00",
          available_end_time: "17:00",
        },
      },
    );
  typia.assert(equipmentSchedule);

  // Create multiple appointments
  const now = new Date();
  const appointmentTimes = [0, 1, 2, 3].map((offsetDays) => {
    const start = new Date(now.getTime() + offsetDays * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  });
  const appointments = [];
  for (let i = 0; i < 4; ++i) {
    const appt =
      await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
        connection,
        {
          body: {
            healthcare_platform_organization_id: organization.id,
            healthcare_platform_department_id: department.id,
            provider_id: doctor.id,
            patient_id: patient.id,
            status_id: i % 2 === 0 ? statusScheduled.id : statusConfirmed.id,
            room_id: i % 2 === 0 ? roomSchedule.id : undefined,
            equipment_id: i % 2 === 1 ? equipmentSchedule.id : undefined,
            appointment_type: i % 2 === 0 ? "in-person" : "telemedicine",
            start_time: appointmentTimes[i].start,
            end_time: appointmentTimes[i].end,
            title: `Test Appt ${i + 1}`,
            description: i === 2 ? "urgent case" : undefined,
            recurrence_rule: undefined,
          },
        },
      );
    typia.assert(appt);
    appointments.push(appt);
  }

  // Test filters: exact status, provider, date range, department, room, equipment, appointment_type, patient
  const filterCases = [
    { filter: { provider_id: doctor.id }, expect: appointments },
    { filter: { patient_id: patient.id }, expect: appointments },
    {
      filter: { status_id: statusScheduled.id },
      expect: appointments.filter((a) => a.status_id === statusScheduled.id),
    },
    {
      filter: { status_id: statusConfirmed.id },
      expect: appointments.filter((a) => a.status_id === statusConfirmed.id),
    },
    { filter: { department_id: department.id }, expect: appointments },
    {
      filter: { room_id: roomSchedule.id },
      expect: appointments.filter((a) => a.room_id === roomSchedule.id),
    },
    {
      filter: { equipment_id: equipmentSchedule.id },
      expect: appointments.filter(
        (a) => a.equipment_id === equipmentSchedule.id,
      ),
    },
    {
      filter: { appointment_type: "in-person" },
      expect: appointments.filter((a) => a.appointment_type === "in-person"),
    },
    {
      filter: {
        start_time_from: appointmentTimes[1].start,
        start_time_to: appointmentTimes[2].end,
      },
      expect: appointments.filter(
        (a) =>
          new Date(a.start_time) >= new Date(appointmentTimes[1].start) &&
          new Date(a.start_time) <= new Date(appointmentTimes[2].end),
      ),
    },
  ];
  for (const [i, c] of filterCases.entries()) {
    const res =
      await api.functional.healthcarePlatform.organizationAdmin.appointments.index(
        connection,
        {
          body: c.filter,
        },
      );
    typia.assert(res);
    const foundIds = res.data.map((x) => x.id).sort();
    const expectedIds = c.expect.map((x) => x.id).sort();
    TestValidator.equals(
      `filter #${i + 1} returns correct ids`,
      foundIds,
      expectedIds,
    );
  }

  // Test pagination: page 1, page 2, large page_size
  const pageSize = 2;
  for (let page = 1; page <= 2; ++page) {
    const res =
      await api.functional.healthcarePlatform.organizationAdmin.appointments.index(
        connection,
        {
          body: { page, page_size: pageSize },
        },
      );
    typia.assert(res);
    TestValidator.equals(
      `page ${page} pageSize ${pageSize} count`,
      res.data.length,
      page === 1
        ? Math.min(pageSize, appointments.length)
        : Math.max(0, appointments.length - pageSize),
    );
    TestValidator.equals(
      `pagination page ${page}`,
      res.pagination.current,
      page,
    );
    TestValidator.equals(
      `pagination page_size ${page}`,
      res.pagination.limit,
      pageSize,
    );
  }
  // Test very high page_size (should return all)
  const resAll =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.index(
      connection,
      { body: { page: 1, page_size: 999 } },
    );
  typia.assert(resAll);
  TestValidator.equals(
    "large page_size returns all",
    resAll.data.length,
    appointments.length,
  );

  // Test edge cases: empty result
  const resEmpty =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.index(
      connection,
      { body: { provider_id: typia.random<string & tags.Format<"uuid">>() } },
    );
  typia.assert(resEmpty);
  TestValidator.equals("empty filter returns zero", resEmpty.data.length, 0);

  // Test invalid filter: status_id random non-existent
  await TestValidator.error(
    "invalid status_id filter calls HTTP error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.appointments.index(
        connection,
        {
          body: { status_id: typia.random<string & tags.Format<"uuid">>() },
        },
      );
    },
  );

  // Test unauthorized: blank/invalid connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access rejected", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.appointments.index(
      unauthConn,
      { body: {} },
    );
  });
}
