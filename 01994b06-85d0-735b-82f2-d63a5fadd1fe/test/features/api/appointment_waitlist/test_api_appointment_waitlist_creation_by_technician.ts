import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * E2E test: Technician adds a patient to an appointment's waitlist via
 * technician API
 *
 * This test covers comprehensive dependency setup and both success and
 * error cases.
 *
 * Flow:
 *
 * 1. Receptionist registers and logs in to gain session context.
 * 2. A patient is registered to the platform and their identity is verified.
 * 3. A technician is registered to the platform and their identity is verified
 *    (needed later).
 * 4. As receptionist, creates a new appointment using the previously created
 *    patient and random scheduling/doctor information.
 * 5. Technician logs in (role switch).
 * 6. Technician adds the same patient to the created appointment's waitlist
 *    via the /waitlists endpoint.
 * 7. Validate that waitlist entry was created successfully and values match
 *    expectation.
 * 8. Attempt to add the same patient again to the same appointment's waitlist
 *    (should error as duplicate/waitlist business logic).
 * 9. Attempt to add a different patient to the same appointment waitlist and
 *    expect success.
 *
 * Additional validation for authentication context and permission errors
 * can be added if test data permits.
 */
export async function test_api_appointment_waitlist_creation_by_technician(
  connection: api.IConnection,
) {
  // 1. Receptionist registration
  const receptionistEmail = RandomGenerator.alphabets(8) + "@clinic.com";
  const receptionistPassword = RandomGenerator.alphaNumeric(10);
  const receptionistJoin = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: receptionistEmail as string & tags.Format<"email">,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    },
  );
  typia.assert(receptionistJoin);

  // 2. Receptionist login
  const receptionistLogin = await api.functional.auth.receptionist.login(
    connection,
    {
      body: {
        email: receptionistEmail as string & tags.Format<"email">,
        password: receptionistPassword,
      } satisfies IHealthcarePlatformReceptionist.ILogin,
    },
  );
  typia.assert(receptionistLogin);

  // 3. Patient registration
  const patientEmail = RandomGenerator.alphabets(8) + "@patient.com";
  const patientPassword = RandomGenerator.alphaNumeric(10);
  const patientProfile = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1990, 1, 1).toISOString() as string &
        tags.Format<"date-time">,
      phone: RandomGenerator.mobile(),
      password: patientPassword,
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patientProfile);

  // 4. Technician registration
  const technicianEmail = RandomGenerator.alphabets(8) + "@tech.com";
  const technicianPassword = RandomGenerator.alphaNumeric(10);
  const technicianJoin = await api.functional.auth.technician.join(connection, {
    body: {
      email: technicianEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(12),
      specialty: "Radiology",
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  typia.assert(technicianJoin);

  // 5. Technician login (for later role switch)
  const technicianLogin = await api.functional.auth.technician.login(
    connection,
    {
      body: {
        email: technicianEmail as string & tags.Format<"email">,
        password: technicianPassword,
      } satisfies IHealthcarePlatformTechnician.ILogin,
    },
  );
  typia.assert(technicianLogin);

  // 6. Create appointment as receptionist
  // Need dummy org/provider/status UUIDs; in real test, these would be resolved, here: random UUIDs
  const organization_id = typia.random<string & tags.Format<"uuid">>();
  const provider_id = typia.random<string & tags.Format<"uuid">>();
  const status_id = typia.random<string & tags.Format<"uuid">>();
  const appointmentCreate =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization_id,
          provider_id: provider_id,
          patient_id: patientProfile.id,
          status_id: status_id,
          appointment_type: RandomGenerator.pick([
            "in-person",
            "telemedicine",
          ] as const),
          start_time: new Date(Date.now() + 3600_000).toISOString() as string &
            tags.Format<"date-time">, // 1 hour ahead
          end_time: new Date(Date.now() + 7200_000).toISOString() as string &
            tags.Format<"date-time">, // 2 hour ahead
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointmentCreate);

  // 7. Switch to technician (simulate role context)
  await api.functional.auth.technician.login(connection, {
    body: {
      email: technicianEmail as string & tags.Format<"email">,
      password: technicianPassword,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });

  // 8. Add patient to appointment waitlist (success)
  const waitlistBody = {
    appointment_id: appointmentCreate.id,
    patient_id: patientProfile.id,
  } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate;
  const waitlistEntry =
    await api.functional.healthcarePlatform.technician.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointmentCreate.id,
        body: waitlistBody,
      },
    );
  typia.assert(waitlistEntry);
  TestValidator.equals(
    "waitlist entry matches input",
    waitlistEntry.appointment_id,
    appointmentCreate.id,
  );
  TestValidator.equals(
    "waitlist entry matches patient",
    waitlistEntry.patient_id,
    patientProfile.id,
  );

  // 9. Attempt to add same patient again for same appointment (should error)
  await TestValidator.error(
    "duplicate waitlist entry should fail",
    async () => {
      await api.functional.healthcarePlatform.technician.appointments.waitlists.create(
        connection,
        {
          appointmentId: appointmentCreate.id,
          body: {
            appointment_id: appointmentCreate.id,
            patient_id: patientProfile.id,
          } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate,
        },
      );
    },
  );

  // 10. Register a second patient
  const patient2Email = RandomGenerator.alphabets(8) + "@patient2.com";
  const patient2Password = RandomGenerator.alphaNumeric(10);
  const patient2Profile = await api.functional.auth.patient.join(connection, {
    body: {
      email: patient2Email,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1992, 2, 2).toISOString() as string &
        tags.Format<"date-time">,
      phone: RandomGenerator.mobile(),
      password: patient2Password,
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patient2Profile);

  // 11. Add second patient to the same appointment's waitlist (should succeed)
  const waitlistBody2 = {
    appointment_id: appointmentCreate.id,
    patient_id: patient2Profile.id,
  } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate;
  const waitlistEntry2 =
    await api.functional.healthcarePlatform.technician.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointmentCreate.id,
        body: waitlistBody2,
      },
    );
  typia.assert(waitlistEntry2);
  TestValidator.equals(
    "waitlist entry for second patient",
    waitlistEntry2.patient_id,
    patient2Profile.id,
  );
}
