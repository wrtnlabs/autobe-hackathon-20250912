import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate systemAdmin GET access to specific appointment waitlist entry.
 *
 * Covers business authentication, correct waitlist retrieval, unauthorized and
 * error edge cases.
 *
 * 1. SystemAdmin joins and logins for privileged session
 * 2. Receptionist joins for writing flows (receptionist join provides
 *    authentication)
 * 3. Create patient
 * 4. Receptionist creates appointment (with randomized org/provider/status uuids,
 *    assign created patient)
 * 5. Receptionist adds waitlist entry for patient + get IDs
 * 6. SystemAdmin logins (context switch to admin, ensures session for GET)
 * 7. GET waitlist entry by appointmentId, waitlistId (success, check
 *    structure/IDs)
 * 8. GET waitlist entry with unauthenticated connection (should fail)
 * 9. GET waitlist entry with invalid/nonexistent waitlistId (should fail)
 * 10. Field referential integrity and type assertion validation
 */
export async function test_api_systemadmin_appointment_waitlist_entry_retrieval(
  connection: api.IConnection,
) {
  // 1. systemAdmin join/login
  const adminEmail = RandomGenerator.alphaNumeric(8) + "@testcorp.com";
  const systemAdminJoin = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        provider: "local",
        provider_key: adminEmail,
        password: "SuperAdminP@ssw0rd",
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    },
  );
  typia.assert(systemAdminJoin);

  const systemAdminLogin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        provider: "local",
        provider_key: adminEmail,
        password: "SuperAdminP@ssw0rd",
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    },
  );
  typia.assert(systemAdminLogin);

  // 2. receptionist join (join provides authenticated session)
  const receptionistEmail = RandomGenerator.alphaNumeric(8) + "@testrecept.com";
  const receptionistJoin = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: receptionistEmail,
        full_name: RandomGenerator.name(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    },
  );
  typia.assert(receptionistJoin);

  // 3. Create patient
  const patientEmail = RandomGenerator.alphaNumeric(8) + "@testpt.com";
  const patientJoin = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date("1992-05-02").toISOString(),
      password: "Patient123$",
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patientJoin);

  // 4. receptionist creates appointment (assign patient as participant and randomize required UUIDs)
  const appointmentReq = {
    ...typia.random<IHealthcarePlatformAppointment.ICreate>(),
    patient_id: patientJoin.id,
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: appointmentReq,
      },
    );
  typia.assert(appointment);

  // 5. receptionist adds patient to waitlist
  const waitlistEntryReq = {
    appointment_id: appointment.id,
    patient_id: patientJoin.id,
  } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate;
  const waitlistEntry =
    await api.functional.healthcarePlatform.receptionist.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: waitlistEntryReq,
      },
    );
  typia.assert(waitlistEntry);

  // 6. System administrator re-login to swap context
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: "SuperAdminP@ssw0rd",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 7. GET waitlist entry by appointmentId, waitlistId (success case)
  const fetchedWaitlist =
    await api.functional.healthcarePlatform.systemAdmin.appointments.waitlists.at(
      connection,
      {
        appointmentId: appointment.id,
        waitlistId: waitlistEntry.id,
      },
    );
  typia.assert(fetchedWaitlist);
  TestValidator.equals(
    "waitlist id matches",
    fetchedWaitlist.id,
    waitlistEntry.id,
  );
  TestValidator.equals(
    "patient_id matches",
    fetchedWaitlist.patient_id,
    patientJoin.id,
  );
  TestValidator.equals(
    "appointment_id matches",
    fetchedWaitlist.appointment_id,
    appointment.id,
  );

  // 8. Attempt GET with unauthenticated connection
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated systemAdmin access denied",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.appointments.waitlists.at(
        unauthConn,
        {
          appointmentId: appointment.id,
          waitlistId: waitlistEntry.id,
        },
      );
    },
  );

  // 9. Attempt GET with invalid/nonexistent waitlistId
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("not-found for invalid waitlistId", async () => {
    await api.functional.healthcarePlatform.systemAdmin.appointments.waitlists.at(
      connection,
      {
        appointmentId: appointment.id,
        waitlistId: randomUuid,
      },
    );
  });

  // 10. Confirm field referential integrity (join_time, created_at, etc are present and valid)
  typia.assert<IHealthcarePlatformAppointmentWaitlist>(fetchedWaitlist);
}
