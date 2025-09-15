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
 * Validate receptionist can remove a patient from an appointment waitlist.
 *
 * 1. Receptionist registers and logs in.
 * 2. Patient registers and logs in.
 * 3. Receptionist creates appointment.
 * 4. Patient joins waitlist for that appointment.
 * 5. Receptionist removes patient from waitlist.
 * 6. Validate removal: further operate on waitlist entry fails.
 * 7. Try improper removals (non-existent/wrong role).
 */
export async function test_api_receptionist_remove_patient_from_appointment_waitlist(
  connection: api.IConnection,
) {
  // 1. Receptionist registers and logs in
  const receptionistEmail: string =
    RandomGenerator.alphaNumeric(8) + "@clinic.com";
  const receptionistJoin = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: receptionistEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      },
    },
  );
  typia.assert(receptionistJoin);
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: "1234",
    },
  });

  // 2. Patient registers and logs in
  const patientEmail: string = RandomGenerator.alphaNumeric(8) + "@patient.com";
  const dob = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 365 * 30,
  ).toISOString();
  const patientJoin = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: dob,
      phone: RandomGenerator.mobile(),
      password: "1234",
    },
  });
  typia.assert(patientJoin);
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientEmail,
      password: "1234",
    },
  });

  // 3. Receptionist creates appointment (switch back to receptionist)
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: "1234",
    },
  });
  const patientId = patientJoin.id;
  // Generate valid appointment for both receptionist org and patient
  const appt =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          provider_id: typia.random<string & tags.Format<"uuid">>(),
          patient_id: patientId,
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: "in-person",
          start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        },
      },
    );
  typia.assert(appt);

  // 4. Patient joins waitlist
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientEmail,
      password: "1234",
    },
  });
  const waitlistEntry =
    await api.functional.healthcarePlatform.patient.appointments.waitlists.create(
      connection,
      {
        appointmentId: appt.id,
        body: {
          appointment_id: appt.id,
          patient_id: patientId,
        },
      },
    );
  typia.assert(waitlistEntry);

  // 5. Receptionist removes patient from waitlist
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: "1234",
    },
  });
  await api.functional.healthcarePlatform.receptionist.appointments.waitlists.erase(
    connection,
    {
      appointmentId: appt.id,
      waitlistId: waitlistEntry.id,
    },
  );

  // 6. Validate removal
  await TestValidator.error("removed waitlist entry is not found", async () => {
    await api.functional.healthcarePlatform.receptionist.appointments.waitlists.erase(
      connection,
      {
        appointmentId: appt.id,
        waitlistId: waitlistEntry.id,
      },
    );
  });

  // 7. Attempt improper removal - try to remove with patient role
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientEmail,
      password: "1234",
    },
  });
  await TestValidator.error(
    "non-receptionist cannot remove waitlist entry",
    async () => {
      await api.functional.healthcarePlatform.receptionist.appointments.waitlists.erase(
        connection,
        {
          appointmentId: appt.id,
          waitlistId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
