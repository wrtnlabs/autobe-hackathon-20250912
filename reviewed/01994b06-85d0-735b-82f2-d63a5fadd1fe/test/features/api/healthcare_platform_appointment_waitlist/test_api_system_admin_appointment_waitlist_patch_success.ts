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
 * System admin retrieves and searches the waitlist for a specific
 * appointment (filters supported by patient_id, status, join_time).
 *
 * Business flow:
 *
 * 1. System admin user joins and logs in for top-level privilege.
 * 2. Receptionist joins and logs in.
 * 3. Receptionist creates a new appointment, assigning one patient for initial
 *    creation.
 * 4. Patient A and Patient B both join the platform; both receive unique ids.
 * 5. Both patients join the waitlist for the created appointment.
 * 6. System admin queries the waitlist with and without filters to verify both
 *    patients' entries are correctly listed and can be filtered.
 *
 * Assertions:
 *
 * - Both patients appear in waitlist when not filtering.
 * - Patient A can be filtered precisely with patient_id.
 * - Patient B can be filtered precisely with patient_id.
 * - Filtering by status "active" returns both
 * - Filtering by join_time returns expected patient(s)
 */
export async function test_api_system_admin_appointment_waitlist_patch_success(
  connection: api.IConnection,
) {
  // 1. System admin joins and logs in
  const adminEmail = RandomGenerator.alphaNumeric(6) + "@bizexample.com";
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 2. Receptionist joins and logs in
  const receptionistEmail =
    RandomGenerator.alphaNumeric(6) + "@bizreception.com";
  const receptionistPassword = RandomGenerator.alphaNumeric(10);
  const receptionistJoin = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: receptionistEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    },
  );
  typia.assert(receptionistJoin);
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 3. Create initial patient for appointment assignment (needed by appointment schema)
  const initialPatientEmail =
    RandomGenerator.alphaNumeric(8) + "@patientmail.com";
  const initialPatientPassword = RandomGenerator.alphaNumeric(10);
  const initialPatientJoin = await api.functional.auth.patient.join(
    connection,
    {
      body: {
        email: initialPatientEmail,
        full_name: RandomGenerator.name(),
        password: initialPatientPassword,
        date_of_birth: new Date("1990-01-01").toISOString(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformPatient.IJoin,
    },
  );
  typia.assert(initialPatientJoin);
  await api.functional.auth.patient.login(connection, {
    body: {
      email: initialPatientEmail,
      password: initialPatientPassword,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });

  // 4. Receptionist creates the appointment (assign initial patient)
  const appointmentCreate: IHealthcarePlatformAppointment.ICreate = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    // department_id can be optional
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: initialPatientJoin.id,
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: "in-person",
    start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // one hour from now
    end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // two hours from now
    title: RandomGenerator.paragraph(),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: appointmentCreate,
      },
    );
  typia.assert(appointment);

  // 5. Patient A joins and logs in
  const patientAEmail = RandomGenerator.alphaNumeric(8) + "@patientmail.com";
  const patientAPassword = RandomGenerator.alphaNumeric(10);
  const patientA = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientAEmail,
      full_name: RandomGenerator.name(),
      password: patientAPassword,
      date_of_birth: new Date("1995-05-01").toISOString(),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patientA);
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientAEmail,
      password: patientAPassword,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });

  // 6. Patient B joins and logs in
  const patientBEmail = RandomGenerator.alphaNumeric(8) + "@patientmail.com";
  const patientBPassword = RandomGenerator.alphaNumeric(10);
  const patientB = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientBEmail,
      full_name: RandomGenerator.name(),
      password: patientBPassword,
      date_of_birth: new Date("1997-10-10").toISOString(),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patientB);
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientBEmail,
      password: patientBPassword,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });

  // 7. Both patients join the waitlist for the appointment (as themselves, after logging in)
  const waitlistA =
    await api.functional.healthcarePlatform.patient.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          appointment_id: appointment.id,
          patient_id: patientA.id,
          // Let join_time and status be assigned by backend (status defaults to active)
        } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate,
      },
    );
  typia.assert(waitlistA);

  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientBEmail,
      password: patientBPassword,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });
  const waitlistB =
    await api.functional.healthcarePlatform.patient.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          appointment_id: appointment.id,
          patient_id: patientB.id,
        } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate,
      },
    );
  typia.assert(waitlistB);

  // 8. Switch back to system admin (log in)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 9a. Retrieve full waitlist, unfiltered
  const waitlistResult =
    await api.functional.healthcarePlatform.systemAdmin.appointments.waitlists.index(
      connection,
      {
        appointmentId: appointment.id,
        body: {},
      },
    );
  typia.assert(waitlistResult);
  TestValidator.predicate(
    "both patients appear in waitlist (unfiltered)",
    waitlistResult.data.some((w) => w.patient_id === patientA.id) &&
      waitlistResult.data.some((w) => w.patient_id === patientB.id),
  );

  // 9b. Filter by patient_id (A)
  const filterResultA =
    await api.functional.healthcarePlatform.systemAdmin.appointments.waitlists.index(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          patient_id: patientA.id,
        } satisfies IHealthcarePlatformAppointmentWaitlist.IRequest,
      },
    );
  typia.assert(filterResultA);
  TestValidator.equals(
    "waitlist filtered by patient A id has 1 result",
    filterResultA.data.length,
    1,
  );
  TestValidator.equals(
    "waitlist entry's patient_id matches patient A",
    filterResultA.data[0]?.patient_id,
    patientA.id,
  );

  // 9c. Filter by patient_id (B)
  const filterResultB =
    await api.functional.healthcarePlatform.systemAdmin.appointments.waitlists.index(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          patient_id: patientB.id,
        } satisfies IHealthcarePlatformAppointmentWaitlist.IRequest,
      },
    );
  typia.assert(filterResultB);
  TestValidator.equals(
    "waitlist filtered by patient B id has 1 result",
    filterResultB.data.length,
    1,
  );
  TestValidator.equals(
    "waitlist entry's patient_id matches patient B",
    filterResultB.data[0]?.patient_id,
    patientB.id,
  );

  // 9d. Filter by status 'active' (should get both)
  const filterResultStatusActive =
    await api.functional.healthcarePlatform.systemAdmin.appointments.waitlists.index(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          status: "active",
        } satisfies IHealthcarePlatformAppointmentWaitlist.IRequest,
      },
    );
  typia.assert(filterResultStatusActive);
  TestValidator.predicate(
    "waitlist filtered by status 'active' includes both A and B",
    filterResultStatusActive.data.some((w) => w.patient_id === patientA.id) &&
      filterResultStatusActive.data.some((w) => w.patient_id === patientB.id),
  );

  // 9e. Filter by join_time_from (should get both, as both joined after appointment creation)
  const joinFrom = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const filterResultJoinTime =
    await api.functional.healthcarePlatform.systemAdmin.appointments.waitlists.index(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          join_time_from: joinFrom,
        } satisfies IHealthcarePlatformAppointmentWaitlist.IRequest,
      },
    );
  typia.assert(filterResultJoinTime);
  TestValidator.predicate(
    "waitlist join_time_from filter returns at least both A and B",
    filterResultJoinTime.data.some((w) => w.patient_id === patientA.id) &&
      filterResultJoinTime.data.some((w) => w.patient_id === patientB.id),
  );
}
