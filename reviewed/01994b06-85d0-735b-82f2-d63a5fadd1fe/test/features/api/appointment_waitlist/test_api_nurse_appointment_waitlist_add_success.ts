import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Ensures that a nurse can add a patient to an appointment waitlist via the
 * nurse endpoint.
 *
 * Steps:
 *
 * 1. Register and authenticate as an organization admin.
 * 2. Register and authenticate as a nurse.
 * 3. Organization admin creates an appointment using appropriate DTO fields and
 *    random UUIDs.
 * 4. Switch authentication to the nurse (login).
 * 5. As nurse, attempt to add a patient to the appointment waitlist using the
 *    appointmentId and correct patientId.
 * 6. Validate that the response DTO is correct and type-safe.
 * 7. Attempt to add the same patient to the waitlist again for this appointment
 *    and assert the error response is correct.
 */
export async function test_api_nurse_appointment_waitlist_add_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(10);
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);

  // 2. Register and authenticate as nurse
  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nursePassword = RandomGenerator.alphaNumeric(12);
  const nurseLicense = RandomGenerator.alphaNumeric(7);
  const nurseJoin = await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurseEmail,
      full_name: RandomGenerator.name(),
      license_number: nurseLicense,
      password: nursePassword,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformNurse.IJoin,
  });
  typia.assert(nurseJoin);

  // 3. Organization admin logs back in to create the appointment
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // For simplicity, use nurse as provider and patient in appointment
  const appointmentBody = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    provider_id: nurseJoin.id,
    patient_id: nurseJoin.id,
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: "in-person",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  } satisfies IHealthcarePlatformAppointment.ICreate;

  const appointment =
    await api.functional.healthcarePlatform.organizationAdmin.appointments.create(
      connection,
      { body: appointmentBody },
    );
  typia.assert(appointment);

  // 4. Switch to nurse authentication
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePassword,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  // 5. Add patient to appointment waitlist as nurse
  const waitlistInput = {
    appointment_id: appointment.id,
    patient_id: nurseJoin.id,
  } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate;
  const waitlist =
    await api.functional.healthcarePlatform.nurse.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: waitlistInput,
      },
    );
  typia.assert(waitlist);

  TestValidator.equals(
    "waitlist appointment_id matches",
    waitlist.appointment_id,
    appointment.id,
  );
  TestValidator.equals(
    "waitlist patient_id matches",
    waitlist.patient_id,
    nurseJoin.id,
  );

  // 6. Attempt to waitlist the same patient again for the same appointment and expect error
  await TestValidator.error(
    "duplicate waitlist for same patient should fail",
    async () => {
      await api.functional.healthcarePlatform.nurse.appointments.waitlists.create(
        connection,
        {
          appointmentId: appointment.id,
          body: waitlistInput,
        },
      );
    },
  );
}
