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
 * Validates that a patient can successfully self-join the waitlist for an
 * appointment via the patient API, and that the system prevents duplicate
 * join requests and unauthorized waitlisting for other patients.
 *
 * Workflow:
 *
 * 1. Register and login a receptionist (for appointment setup)
 * 2. Register and login a patient (main actor)
 * 3. Receptionist creates an appointment for the patient and a generated
 *    provider id (simulating assignment)
 * 4. Patient attempts to join the appointment waitlist via the proper patient
 *    API; validate success
 * 5. Patient attempts to join the same waitlist again (should fail: duplicate
 *    join)
 * 6. Patient attempts to waitlist a different patient_id than themselves
 *    (should fail: authorization error)
 * 7. Attempt to perform a waitlist join without authentication (should fail:
 *    unauthenticated)
 */
export async function test_api_appointment_waitlist_self_join_by_patient(
  connection: api.IConnection,
) {
  // Step 1: Register and login receptionist
  const receptionistEmail = RandomGenerator.alphaNumeric(10) + "@clinic.com";
  const receptionistPassword = RandomGenerator.alphaNumeric(12);
  const receptionistFullName = RandomGenerator.name();
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: {
      email: receptionistEmail,
      full_name: receptionistFullName,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });
  typia.assert(receptionist);

  // Receptionist login is technically redundant after join (auto-login), but do it for clarity
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // Step 2: Register and login patient
  const patientEmail = RandomGenerator.alphaNumeric(10) + "@patient.com";
  const patientPassword = RandomGenerator.alphaNumeric(12);
  const patientFullName = RandomGenerator.name();
  const dob = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 365 * 20,
  ).toISOString(); // 20 years ago
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: patientFullName,
      date_of_birth: dob,
      password: patientPassword,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patient);
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientEmail,
      password: patientPassword,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });

  // Register a "second patient" for cross-patient test
  const otherPatientEmail = RandomGenerator.alphaNumeric(10) + "@patient.com";
  const otherPatientPassword = RandomGenerator.alphaNumeric(12);
  const otherPatientFullName = RandomGenerator.name();
  const otherPatient = await api.functional.auth.patient.join(connection, {
    body: {
      email: otherPatientEmail,
      full_name: otherPatientFullName,
      date_of_birth: dob,
      password: otherPatientPassword,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(otherPatient);

  // Step 3: Receptionist creates an appointment
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });
  // Generate required IDs
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const providerId = typia.random<string & tags.Format<"uuid">>();
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const startTime = new Date(now.getTime() + 1000 * 60 * 15).toISOString();
  const endTime = new Date(now.getTime() + 1000 * 60 * 60).toISOString();
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organizationId,
          provider_id: providerId,
          patient_id: patient.id,
          status_id: statusId,
          appointment_type: "in-person",
          start_time: startTime,
          end_time: endTime,
          title: RandomGenerator.paragraph(),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointment);

  // Step 4: Patient logs in and joins their own waitlist
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientEmail,
      password: patientPassword,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });
  const waitlistEntry =
    await api.functional.healthcarePlatform.patient.appointments.waitlists.create(
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
  TestValidator.equals(
    "waitlist join appointment/patient match",
    waitlistEntry.appointment_id,
    appointment.id,
  );
  TestValidator.equals(
    "waitlist join patient self",
    waitlistEntry.patient_id,
    patient.id,
  );

  // Step 5: Patient tries to join again (should fail - duplicate)
  await TestValidator.error(
    "duplicate waitlist join by same patient should fail",
    async () => {
      await api.functional.healthcarePlatform.patient.appointments.waitlists.create(
        connection,
        {
          appointmentId: appointment.id,
          body: {
            appointment_id: appointment.id,
            patient_id: patient.id,
          } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate,
        },
      );
    },
  );

  // Step 6: Patient tries to waitlist another patient (should fail - authz error)
  await TestValidator.error(
    "patient cannot waitlist different patient_id",
    async () => {
      await api.functional.healthcarePlatform.patient.appointments.waitlists.create(
        connection,
        {
          appointmentId: appointment.id,
          body: {
            appointment_id: appointment.id,
            patient_id: otherPatient.id,
          } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate,
        },
      );
    },
  );

  // Step 7: Try waitlisting without authentication (should fail - unauthenticated)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated waitlist join attempt fails",
    async () => {
      await api.functional.healthcarePlatform.patient.appointments.waitlists.create(
        unauthConn,
        {
          appointmentId: appointment.id,
          body: {
            appointment_id: appointment.id,
            patient_id: patient.id,
          } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate,
        },
      );
    },
  );
}
