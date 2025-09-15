import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Validates nurse access control to appointment waitlist entry details.
 *
 * Business context: Ensures a nurse can see the details for an appointment
 * waitlist entry in their organizational scope and is forbidden to view those
 * out of their scope. Steps:
 *
 * 1. Nurse1 joins and logs in.
 * 2. Receptionist joins (login skipped as not possible due to no password field).
 * 3. Receptionist creates a new appointment (assumed auto-authenticated after
 *    join).
 * 4. Nurse1 logs in.
 * 5. Nurse1 adds a patient to the waitlist for that appointment.
 * 6. Nurse1 retrieves the waitlist entry details (success expected).
 * 7. Nurse2 joins and logs in (separate identity).
 * 8. Nurse2 attempts to access the same waitlist details (must fail with error
 *    403).
 */
export async function test_api_appointment_waitlist_detail_nurse_access_control(
  connection: api.IConnection,
) {
  // 1. Register Nurse1
  const nurse1Email =
    RandomGenerator.name(1).replace(" ", "") + "@nurse1.example.org";
  const nurse1License = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurse1Email,
      full_name: RandomGenerator.name(2),
      license_number: nurse1License,
      password: "Nurse1Pass12!",
    } satisfies IHealthcarePlatformNurse.IJoin,
  });
  // Log in as Nurse1
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurse1Email,
      password: "Nurse1Pass12!",
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  // 2. Register Receptionist (no password in API, login step skipped)
  const receptionistEmail =
    RandomGenerator.name(1).replace(" ", "") + "@recept1.example.org";
  await api.functional.auth.receptionist.join(connection, {
    body: {
      email: receptionistEmail,
      full_name: RandomGenerator.name(2),
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });

  // 3. Create appointment as receptionist (assumed auth context from join persists)
  const providerId = typia.random<string & tags.Format<"uuid">>();
  const patientId = typia.random<string & tags.Format<"uuid">>();
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const appointment: IHealthcarePlatformAppointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgId,
          provider_id: providerId,
          patient_id: patientId,
          status_id: statusId,
          appointment_type: "in-person",
          start_time: new Date(Date.now() + 60_000).toISOString(),
          end_time: new Date(Date.now() + 3_600_000).toISOString(),
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointment);

  // 4. Log in as Nurse1 to get nurse context
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurse1Email,
      password: "Nurse1Pass12!",
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  // 5. Nurse1 adds a patient to the appointment waitlist
  const waitlist: IHealthcarePlatformAppointmentWaitlist =
    await api.functional.healthcarePlatform.nurse.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          appointment_id: appointment.id,
          patient_id: patientId,
          status: "active",
        } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate,
      },
    );
  typia.assert(waitlist);
  TestValidator.equals(
    "created waitlist references correct appointment",
    waitlist.appointment_id,
    appointment.id,
  );
  TestValidator.equals(
    "created waitlist patient",
    waitlist.patient_id,
    patientId,
  );
  TestValidator.equals("waitlist status is active", waitlist.status, "active");

  // 6. Nurse1 retrieves waitlist details (should succeed)
  const entry: IHealthcarePlatformAppointmentWaitlist =
    await api.functional.healthcarePlatform.nurse.appointments.waitlists.at(
      connection,
      {
        appointmentId: appointment.id,
        waitlistId: waitlist.id,
      },
    );
  typia.assert(entry);
  TestValidator.equals(
    "fetched waitlist id matches created",
    entry.id,
    waitlist.id,
  );
  TestValidator.equals(
    "fetched waitlist patient",
    entry.patient_id,
    waitlist.patient_id,
  );
  TestValidator.equals("status is active", entry.status, "active");

  // 7. Register Nurse2
  const nurse2Email =
    RandomGenerator.name(1).replace(" ", "") + "@nurse2.example.org";
  const nurse2License = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurse2Email,
      full_name: RandomGenerator.name(2),
      license_number: nurse2License,
      password: "Nurse2Pass12!",
    } satisfies IHealthcarePlatformNurse.IJoin,
  });
  // Log in as Nurse2
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurse2Email,
      password: "Nurse2Pass12!",
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  // 8. Nurse2 attempts to access the existing waitlist entry (should be forbidden)
  await TestValidator.error(
    "Nurse2 cannot access waitlist entry created by/unshared with them (forbidden)",
    async () => {
      await api.functional.healthcarePlatform.nurse.appointments.waitlists.at(
        connection,
        {
          appointmentId: appointment.id,
          waitlistId: waitlist.id,
        },
      );
    },
  );
}
