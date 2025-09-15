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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentWaitlist";

/**
 * Test appointment waitlist filtering by patient_id via system admin PATCH
 * endpoint.
 *
 * This test covers the scenario where a system admin must list appointment
 * waitlists for a specific appointment filtered by patient_id. Steps:
 *
 * 1. System admin is created and logged in.
 * 2. Receptionist is created and logged in.
 * 3. Two distinct patients are created and logged in.
 * 4. Receptionist creates an appointment for patient1.
 * 5. Both patients join the waitlist for that appointment (setup ensures multiple
 *    waitlist entries exist).
 * 6. System admin queries PATCH waitlist endpoint, filtering by
 *    patient_id=patient2.id, and validates only waitlist entries for patient2
 *    are returned.
 *
 * Assertions:
 *
 * - All waitlist records in result have patient_id equal to patient2.
 * - At least one such entry is present in the result.
 */
export async function test_api_system_admin_appointment_waitlist_patch_filter_by_patient(
  connection: api.IConnection,
) {
  // STEP 1: Create and login system admin
  const sysadminEmail = RandomGenerator.name(1) + "@company.com";
  const sysadminPwd = "adminPW1234";
  const sysadminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysadminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPwd,
    },
  });
  typia.assert(sysadminJoin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPwd,
    },
  });

  // STEP 2: Create and login receptionist
  const receptionistEmail = RandomGenerator.name(1) + "@company.com";
  const receptionistPwd = "recepPW" + RandomGenerator.alphaNumeric(5);
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
      password: receptionistPwd,
    },
  });

  // STEP 3: Create and login two patients
  const p1email = RandomGenerator.name(1) + "@patients.com";
  const p2email = RandomGenerator.name(1) + "@patients.com";
  const patientPwd = "patientPW" + RandomGenerator.alphaNumeric(4);

  // Patient 1
  const patient1Join = await api.functional.auth.patient.join(connection, {
    body: {
      email: p1email,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(
        1990 + Math.floor(Math.random() * 15),
        1,
        1,
      ).toISOString(),
      phone: RandomGenerator.mobile(),
      password: patientPwd,
    },
  });
  typia.assert(patient1Join);
  await api.functional.auth.patient.login(connection, {
    body: { email: p1email, password: patientPwd },
  });

  // Patient 2
  const patient2Join = await api.functional.auth.patient.join(connection, {
    body: {
      email: p2email,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(
        1988 + Math.floor(Math.random() * 15),
        6,
        1,
      ).toISOString(),
      phone: RandomGenerator.mobile(),
      password: patientPwd,
    },
  });
  typia.assert(patient2Join);
  await api.functional.auth.patient.login(connection, {
    body: { email: p2email, password: patientPwd },
  });

  // STEP 4: Receptionist creates an appointment for patient1
  await api.functional.auth.receptionist.login(connection, {
    body: { email: receptionistEmail, password: receptionistPwd },
  });
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          provider_id: typia.random<string & tags.Format<"uuid">>(),
          patient_id: patient1Join.id,
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: "in-person",
          start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        },
      },
    );
  typia.assert(appointment);

  // STEP 5: Both patients join waitlist for the appointment
  // Patient 1
  await api.functional.auth.patient.login(connection, {
    body: { email: p1email, password: patientPwd },
  });
  const wl1 =
    await api.functional.healthcarePlatform.patient.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          appointment_id: appointment.id,
          patient_id: patient1Join.id,
          join_time: new Date().toISOString(),
          status: "active",
        },
      },
    );
  typia.assert(wl1);
  // Patient 2
  await api.functional.auth.patient.login(connection, {
    body: { email: p2email, password: patientPwd },
  });
  const wl2 =
    await api.functional.healthcarePlatform.patient.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          appointment_id: appointment.id,
          patient_id: patient2Join.id,
          join_time: new Date().toISOString(),
          status: "active",
        },
      },
    );
  typia.assert(wl2);

  // STEP 6: System admin queries waitlist filtered by patient2
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPwd,
    },
  });

  const result =
    await api.functional.healthcarePlatform.systemAdmin.appointments.waitlists.index(
      connection,
      {
        appointmentId: appointment.id,
        body: { patient_id: patient2Join.id },
      },
    );
  typia.assert(result);

  // Confirm only patient2 is present in result
  TestValidator.predicate(
    "All waitlist records in result must have patient_id equal to patient2",
    result.data.every((item) => item.patient_id === patient2Join.id),
  );
  TestValidator.equals(
    "result should contain at least one entry for filtered patient_id",
    result.data.length > 0,
    true,
  );
}
