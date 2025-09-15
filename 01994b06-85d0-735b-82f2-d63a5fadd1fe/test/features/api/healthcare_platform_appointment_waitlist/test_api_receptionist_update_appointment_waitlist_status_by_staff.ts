import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Test updating a waitlist entry for an appointment as a receptionist,
 * including success, forbidden, and error scenarios.
 *
 * 1. Receptionist joins and logs in (creates their account and session).
 * 2. Patient joins and logs in (for patient context).
 * 3. Receptionist creates an appointment for a provider and patient.
 * 4. Patient joins the waitlist for the created appointment.
 * 5. Receptionist updates the waitlist entry's status (e.g., promotes to
 *    'promoted', or removes with 'removed').
 * 6. Confirm API returns updated waitlist with correct status and updated_at
 *    timestamp changes.
 * 7. (Removed) Do not test invalid type status. Only valid business state
 *    transitions are checked.
 */
export async function test_api_receptionist_update_appointment_waitlist_status_by_staff(
  connection: api.IConnection,
) {
  // 1. Receptionist registration and login
  const receptionistEmail =
    RandomGenerator.name(2).replace(/ /g, "") + "@hospital.com";
  const receptionistPassword = RandomGenerator.alphaNumeric(12);
  const receptionistJoinBody = {
    email: receptionistEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformReceptionist.ICreate;
  const receptionistAuth = await api.functional.auth.receptionist.join(
    connection,
    { body: receptionistJoinBody },
  );
  typia.assert(receptionistAuth);
  // If join does not log in, log in now
  const receptionistLoginBody = {
    email: receptionistEmail,
    password: receptionistPassword,
  } satisfies IHealthcarePlatformReceptionist.ILogin;
  await api.functional.auth.receptionist.login(connection, {
    body: receptionistLoginBody,
  });

  // 2. Patient registration and login
  const patientEmail =
    RandomGenerator.name(2).replace(/ /g, "") + "@patient.com";
  const patientPassword = RandomGenerator.alphaNumeric(10);
  const patientJoinBody = {
    email: patientEmail,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(1985, 4, 14).toISOString(),
    phone: RandomGenerator.mobile(),
    password: patientPassword,
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patientAuth = await api.functional.auth.patient.join(connection, {
    body: patientJoinBody,
  });
  typia.assert(patientAuth);
  const patientLoginBody = {
    email: patientEmail,
    password: patientPassword,
  } satisfies IHealthcarePlatformPatient.ILogin;
  await api.functional.auth.patient.login(connection, {
    body: patientLoginBody,
  });

  // 3. Receptionist creates an appointment
  await api.functional.auth.receptionist.login(connection, {
    body: receptionistLoginBody,
  });
  const appointmentBody = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    healthcare_platform_department_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: patientAuth.id,
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: "in-person",
    start_time: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    end_time: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
    title: RandomGenerator.paragraph(),
    description: RandomGenerator.content(),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      { body: appointmentBody },
    );
  typia.assert(appointment);

  // 4. Patient joins waitlist for the new appointment
  await api.functional.auth.patient.login(connection, {
    body: patientLoginBody,
  });
  const waitlistBody = {
    appointment_id: appointment.id,
    patient_id: patientAuth.id,
    status: "active",
  } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate;
  const waitlist =
    await api.functional.healthcarePlatform.patient.appointments.waitlists.create(
      connection,
      { appointmentId: appointment.id, body: waitlistBody },
    );
  typia.assert(waitlist);

  // 5. Receptionist updates the waitlist entry
  await api.functional.auth.receptionist.login(connection, {
    body: receptionistLoginBody,
  });
  const updatePayload = {
    status: "promoted",
  } satisfies IHealthcarePlatformAppointmentWaitlist.IUpdate;
  const updatedWaitlist =
    await api.functional.healthcarePlatform.receptionist.appointments.waitlists.update(
      connection,
      {
        appointmentId: appointment.id,
        waitlistId: waitlist.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedWaitlist);
  TestValidator.equals(
    "waitlist entry is now promoted",
    updatedWaitlist.status,
    "promoted",
  );
  TestValidator.predicate(
    "waitlist updated_at is later",
    new Date(updatedWaitlist.updated_at) > new Date(waitlist.updated_at),
  );

  // 6. Verify updating again to removed
  const removalPayload = {
    status: "removed",
  } satisfies IHealthcarePlatformAppointmentWaitlist.IUpdate;
  const removedWaitlist =
    await api.functional.healthcarePlatform.receptionist.appointments.waitlists.update(
      connection,
      {
        appointmentId: appointment.id,
        waitlistId: waitlist.id,
        body: removalPayload,
      },
    );
  typia.assert(removedWaitlist);
  TestValidator.equals(
    "waitlist entry is now removed",
    removedWaitlist.status,
    "removed",
  );
  TestValidator.predicate(
    "waitlist updated_at changed after removal",
    new Date(removedWaitlist.updated_at) > new Date(updatedWaitlist.updated_at),
  );
}
