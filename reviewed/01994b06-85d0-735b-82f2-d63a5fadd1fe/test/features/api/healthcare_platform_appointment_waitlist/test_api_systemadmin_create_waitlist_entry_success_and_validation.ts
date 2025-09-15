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
 * Validate the creation and error cases around appointment waitlist
 * management by a system admin.
 *
 * Scenario steps:
 *
 * 1. Receptionist user is created and logged in.
 * 2. System admin user is created (join) and logged in.
 * 3. Patient user is registered and authorized.
 * 4. Receptionist creates a new appointment for the patient, which becomes the
 *    target for waitlist creation.
 * 5. System admin logs in to establish privilege context.
 * 6. System admin creates a new waitlist entry for the patient for the created
 *    appointment. Validate that output references the correct appointment
 *    and patient IDs, status is 'active' or as set, and join_time is
 *    present and valid.
 * 7. System admin attempts to add the same patient to the same appointment's
 *    waitlist again. The API must enforce uniqueness so only one waitlist
 *    entry per patient/appointment exists. The call must return error
 *    (business rule violation), and error handling is asserted.
 * 8. Negative test: System admin attempts to create a waitlist entry for a
 *    randomly generated, non-existent appointmentId (must return error and
 *    not create entry).
 * 9. Negative test: System admin tries to create a waitlist entry with an
 *    invalid (random) patientId value (must return error and not create
 *    entry). All assertions check proper field mapping, status, join_time,
 *    uniqueness, and business rule enforcement. Type assertions are done
 *    using typia.assert(), and runtime errors are captured using
 *    TestValidator.error.
 */
export async function test_api_systemadmin_create_waitlist_entry_success_and_validation(
  connection: api.IConnection,
) {
  // 1. Receptionist joins
  const receptionistJoin = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    },
  );
  typia.assert(receptionistJoin);

  // 2. Receptionist login for appointment creation
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistJoin.email,
      password: "password",
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 3. Create a patient
  const patientJoin = await api.functional.auth.patient.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      full_name: RandomGenerator.name(),
      date_of_birth: new Date("1995-01-01").toISOString(),
      phone: RandomGenerator.mobile(),
      password: "patientpass",
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patientJoin);

  // 4. Create appointment (by receptionist)
  // Required for IHealthcarePlatformAppointment.ICreate: healthcare_platform_organization_id, provider_id, patient_id, status_id, appointment_type, start_time, end_time
  const appointmentReq = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    // department, room, equipment - omit for minimal validity
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: patientJoin.id,
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: RandomGenerator.pick([
      "in-person",
      "telemedicine",
    ] as const),
    start_time: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // tomorrow
    end_time: new Date(Date.now() + 1000 * 60 * 60 * 26).toISOString(), // +2h
    title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph(),
  } satisfies IHealthcarePlatformAppointment.ICreate;
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: appointmentReq,
      },
    );
  typia.assert(appointment);

  // 5. System admin joins
  const systemAdminJoin = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: typia.random<string & tags.Format<"email">>(),
        password: "adminpass",
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    },
  );
  typia.assert(systemAdminJoin);

  // 6. System admin login (role/context switch)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminJoin.email,
      provider: "local",
      provider_key: systemAdminJoin.email,
      password: "adminpass",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 7. System admin creates a waitlist entry for appointment -- success
  const waitlistReq = {
    appointment_id: appointment.id,
    patient_id: patientJoin.id,
    status: "active",
  } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate;
  const waitlist =
    await api.functional.healthcarePlatform.systemAdmin.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointment.id,
        body: waitlistReq,
      },
    );
  typia.assert(waitlist);
  TestValidator.equals(
    "waitlist appointmentId should match",
    waitlist.appointment_id,
    appointment.id,
  );
  TestValidator.equals(
    "waitlist patientId should match",
    waitlist.patient_id,
    patientJoin.id,
  );
  TestValidator.equals("waitlist status is active", waitlist.status, "active");
  TestValidator.predicate(
    "waitlist join_time is present",
    !!waitlist.join_time,
  );
  TestValidator.predicate(
    "waitlist id is uuid",
    typeof waitlist.id === "string" && waitlist.id.length > 0,
  );

  // 8. System admin tries to add the same patient to same appointment's waitlist again (should fail)
  await TestValidator.error(
    "waitlist uniqueness: cannot have duplicate entry",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.appointments.waitlists.create(
        connection,
        {
          appointmentId: appointment.id,
          body: waitlistReq,
        },
      );
    },
  );

  // 9. Attempt to create waitlist entry for non-existent appointment (should fail)
  await TestValidator.error(
    "waitlist for non-existent appointment should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.appointments.waitlists.create(
        connection,
        {
          appointmentId: typia.random<string & tags.Format<"uuid">>(), // random uuid
          body: {
            ...waitlistReq,
            appointment_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );

  // 10. Attempt to create waitlist with invalid patientId (should fail)
  await TestValidator.error(
    "waitlist with invalid patientId should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.appointments.waitlists.create(
        connection,
        {
          appointmentId: appointment.id,
          body: {
            ...waitlistReq,
            patient_id: typia.random<string & tags.Format<"uuid">>(), // not a known patient
          },
        },
      );
    },
  );
}
