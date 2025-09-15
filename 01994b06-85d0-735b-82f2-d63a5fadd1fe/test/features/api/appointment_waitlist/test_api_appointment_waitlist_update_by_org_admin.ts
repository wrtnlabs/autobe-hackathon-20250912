import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * E2E scenario: organization admin updates existing appointment waitlist entry.
 *
 * Steps:
 *
 * 1. Register and login as organization admin
 * 2. Create an appointment
 * 3. Create a waitlist entry for the appointment (for a test patient)
 * 4. Update the waitlist status (and join_time) via PUT endpoint
 * 5. Validate updated data integrity
 * 6. Error case: update a non-existent waitlist entry (should fail)
 * 7. Error case: update with invalid status (should fail)
 */
export async function test_api_appointment_waitlist_update_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Register new organization admin
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: adminCredentials,
    },
  );
  typia.assert(adminAuth);

  // 2. Login as organization admin (to ensure session)
  const loginResp = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminCredentials.email,
        password: adminCredentials.password,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginResp);

  // 3. Create a new appointment
  const appointmentCreate = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: RandomGenerator.pick([
      "in-person",
      "telemedicine",
      "other",
    ] as const),
    start_time: new Date(Date.now() + 3600000).toISOString(),
    end_time: new Date(Date.now() + 7200000).toISOString(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IHealthcarePlatformAppointment.ICreate;

  const appointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      {
        body: appointmentCreate,
      },
    );
  typia.assert(appointment);

  // 4. Create a new waitlist entry for the appointment
  const waitlistCreate = {
    appointment_id: appointment.id,
    patient_id: appointment.patient_id,
    status: "active",
    join_time: new Date().toISOString(),
  } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate;

  const waitlist =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: waitlistCreate,
      },
    );
  typia.assert(waitlist);

  // 5. Update the waitlist entry (status and join_time)
  const newStatus = RandomGenerator.pick(["promoted", "removed"] as const);
  const newJoinTime = new Date(Date.now() + 10000).toISOString();
  const updateBody = {
    status: newStatus,
    join_time: newJoinTime,
  } satisfies IHealthcarePlatformAppointmentWaitlist.IUpdate;

  const updated =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.waitlists.update(
      connection,
      {
        appointmentId: appointment.id,
        waitlistId: waitlist.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("waitlist status updated", updated.status, newStatus);
  TestValidator.equals(
    "waitlist join_time updated",
    updated.join_time,
    newJoinTime,
  );

  // 6. Error: update non-existent waitlist id (should fail)
  await TestValidator.error(
    "updating non-existent waitlistId should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.appointments.waitlists.update(
        connection,
        {
          appointmentId: appointment.id,
          waitlistId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );

  // 7. Error: update with invalid status (should fail)
  await TestValidator.error(
    "updating with invalid status should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.appointments.waitlists.update(
        connection,
        {
          appointmentId: appointment.id,
          waitlistId: waitlist.id,
          body: {
            status: "not_a_status",
          } satisfies IHealthcarePlatformAppointmentWaitlist.IUpdate,
        },
      );
    },
  );
}
