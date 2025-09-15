import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Test appointment waitlist entry removal by organization admin.
 *
 * 1. Register and authenticate as an organization admin
 * 2. Create a new appointment (org admin)
 * 3. Add a patient to that appointment's waitlist (org admin action)
 * 4. Remove the waitlist entry via the org admin DELETE endpoint
 * 5. Assert a subsequent delete for the same waitlistId fails
 * 6. Attempt to remove a random (non-existent) waitlistId and expect error
 */
export async function test_api_appointment_waitlist_entry_removal_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Organization admin onboarding
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: adminEmail,
        full_name: adminFullName,
        password: adminPassword,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create an appointment
  const appointmentBody = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: RandomGenerator.pick([
      "in-person",
      "telemedicine",
      "home-visit",
      "consultation",
    ] as const),
    start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment: IHealthcarePlatformAppointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      {
        body: appointmentBody,
      },
    );
  typia.assert(appointment);

  // 3. Add a waitlist entry (admin adds some patient)
  const patientId = typia.random<string & tags.Format<"uuid">>();
  const waitlistBody = {
    appointment_id: appointment.id,
    patient_id: patientId,
    status: "active",
  } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate;
  const waitlistEntry: IHealthcarePlatformAppointmentWaitlist =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: waitlistBody,
      },
    );
  typia.assert(waitlistEntry);

  // 4. Remove the waitlist entry
  await api.functional.healthcarePlatform.organizationAdmin.appointments.waitlists.erase(
    connection,
    {
      appointmentId: appointment.id,
      waitlistId: waitlistEntry.id,
    },
  );

  // 5. Try to remove again - expect error
  await TestValidator.error(
    "Deleting already-removed waitlistId should error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.appointments.waitlists.erase(
        connection,
        {
          appointmentId: appointment.id,
          waitlistId: waitlistEntry.id,
        },
      );
    },
  );

  // 6. Try to delete a random non-existent waitlistId
  await TestValidator.error(
    "Deleting non-existent waitlistId should error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.appointments.waitlists.erase(
        connection,
        {
          appointmentId: appointment.id,
          waitlistId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
