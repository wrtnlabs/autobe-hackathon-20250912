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
 * Test a patient accessing their own appointment waitlist entry.
 *
 * Steps:
 *
 * 1. Register and login patient1 (actor under test)
 * 2. Register and login patient2 (to test cross-patient access denial)
 * 3. Register receptionist, create an appointment
 * 4. Register system admin, add both patients to the waitlist
 * 5. Patient1 fetches their waitlist entry (success)
 * 6. Patient1 tries to fetch patient2's waitlist entry (should fail)
 * 7. Unauthenticated access to own waitlist entry (should fail)
 * 8. Fetch with invalid/nonexistent waitlistId (should fail)
 * 9. Fetch with invalid/nonexistent appointmentId (should fail)
 *
 * Validates that patients can only access their own waitlist entries, and all
 * error scenarios yield appropriate API errors. Ensures that business rules are
 * enforced and no sensitive data is leaked to unauthorized requests.
 */
export async function test_api_patient_view_own_waitlist_entry(
  connection: api.IConnection,
) {
  // Register patient1
  const patient1Join = {
    email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(1990, 1, 1).toISOString(),
    password: "testpassword1",
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patient1 = await api.functional.auth.patient.join(connection, {
    body: patient1Join,
  });
  typia.assert(patient1);

  // Register patient2
  const patient2Join = {
    email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(1995, 5, 15).toISOString(),
    password: "testpassword2",
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patient2 = await api.functional.auth.patient.join(connection, {
    body: patient2Join,
  });
  typia.assert(patient2);

  // Register receptionist & create appointment
  const receptionistJoin = {
    email: `${RandomGenerator.alphaNumeric(10)}@clinic.com`,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformReceptionist.ICreate;
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: receptionistJoin,
  });
  typia.assert(receptionist);

  // Since IHealthcarePlatformReceptionist.ICreate has no password, login is not performed; skip receptionist login

  // Receptionist creates appointment assigned to patient1
  const appointmentCreate = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: patient1.id,
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: "in-person",
    start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    title: RandomGenerator.paragraph(),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      { body: appointmentCreate },
    );
  typia.assert(appointment);

  // Register and login as system admin
  const sysAdminJoin = {
    email: `${RandomGenerator.alphaNumeric(10)}@org.com`,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: `${RandomGenerator.alphaNumeric(8)}`,
    password: "adminpass",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminJoin,
  });
  typia.assert(sysAdmin);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminJoin.email,
      provider: sysAdminJoin.provider,
      provider_key: sysAdminJoin.provider_key,
      password: sysAdminJoin.password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // Add patient1 to waitlist
  const waitlist1 =
    await api.functional.healthcarePlatform.systemAdmin.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          appointment_id: appointment.id,
          patient_id: patient1.id,
          status: "active",
        } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate,
      },
    );
  typia.assert(waitlist1);

  // Add patient2 to waitlist
  const waitlist2 =
    await api.functional.healthcarePlatform.systemAdmin.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          appointment_id: appointment.id,
          patient_id: patient2.id,
          status: "active",
        } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate,
      },
    );
  typia.assert(waitlist2);

  // Login as patient1
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patient1Join.email,
      password: patient1Join.password,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });

  // Patient1 fetches their own waitlist entry (success)
  const ownWaitlistEntry =
    await api.functional.healthcarePlatform.patient.appointments.waitlists.at(
      connection,
      { appointmentId: appointment.id, waitlistId: waitlist1.id },
    );
  typia.assert(ownWaitlistEntry);
  TestValidator.equals(
    "patient1 can view own waitlist entry",
    ownWaitlistEntry.id,
    waitlist1.id,
  );
  TestValidator.equals(
    "waitlist patient_id matches",
    ownWaitlistEntry.patient_id,
    patient1.id,
  );

  // Patient1 tries to fetch patient2's waitlist (should fail)
  await TestValidator.error(
    "patient cannot view another patient's waitlist entry",
    async () => {
      await api.functional.healthcarePlatform.patient.appointments.waitlists.at(
        connection,
        { appointmentId: appointment.id, waitlistId: waitlist2.id },
      );
    },
  );

  // Unauthenticated access to own waitlist entry (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to patient waitlist entry should fail",
    async () => {
      await api.functional.healthcarePlatform.patient.appointments.waitlists.at(
        unauthConn,
        { appointmentId: appointment.id, waitlistId: waitlist1.id },
      );
    },
  );

  // Fetch with invalid/nonexistent waitlistId (should fail)
  await TestValidator.error("non-existent waitlistId should fail", async () => {
    await api.functional.healthcarePlatform.patient.appointments.waitlists.at(
      connection,
      {
        appointmentId: appointment.id,
        waitlistId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // Fetch with invalid/nonexistent appointmentId (should fail)
  await TestValidator.error(
    "non-existent appointmentId should fail",
    async () => {
      await api.functional.healthcarePlatform.patient.appointments.waitlists.at(
        connection,
        {
          appointmentId: typia.random<string & tags.Format<"uuid">>(),
          waitlistId: waitlist1.id,
        },
      );
    },
  );
}
