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
 * Assess patient self-service update capabilities for their own appointment
 * waitlist entry: cancel/removal and edit allowed status (not promote),
 * validate security and business rules.
 *
 * 1. Register and login as patient.
 * 2. Register and login as receptionist.
 * 3. Receptionist creates an appointment.
 * 4. Patient joins waitlist for that appointment.
 * 5. Patient updates their own waitlist status (e.g., to "removed").
 * 6. Validate status/rationale have changed and timestamps/audit are updated.
 * 7. Patient attempts invalid updates (forbidden status, editing other's entry)
 *    and system blocks these with error.
 */
export async function test_api_patient_update_own_appointment_waitlist_intent(
  connection: api.IConnection,
) {
  // 1. Register and login as patient
  const patientEmail = `${RandomGenerator.alphaNumeric(10)}@health.test`;
  const patientPassword = RandomGenerator.alphaNumeric(12);
  const patientJoin = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(2000, 1, 1).toISOString(),
      password: patientPassword,
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patientJoin);

  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientEmail,
      password: patientPassword,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });

  // 2. Register and login as receptionist
  const receptionistEmail = `${RandomGenerator.alphaNumeric(10)}@receptionist.test`;
  const receptionistPassword = RandomGenerator.alphaNumeric(12);
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

  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail as string & tags.Format<"email">,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 3. Receptionist creates an appointment
  const appointmentCreate =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          provider_id: typia.random<string & tags.Format<"uuid">>(),
          patient_id: patientJoin.id,
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: "in-person",
          start_time: new Date(Date.now() + 3600_000).toISOString(),
          end_time: new Date(Date.now() + 7200_000).toISOString(),
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointmentCreate);

  // 4. Patient logs back in and joins the waitlist
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientEmail,
      password: patientPassword,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });

  const waitlistJoin =
    await api.functional.healthcarePlatform.patient.appointments.waitlists.create(
      connection,
      {
        appointmentId: appointmentCreate.id,
        body: {
          appointment_id: appointmentCreate.id,
          patient_id: patientJoin.id,
        } satisfies IHealthcarePlatformAppointmentWaitlist.ICreate,
      },
    );
  typia.assert(waitlistJoin);

  // 5. Patient updates their own waitlist status to "removed"
  const updatedWaitlist =
    await api.functional.healthcarePlatform.patient.appointments.waitlists.update(
      connection,
      {
        appointmentId: appointmentCreate.id,
        waitlistId: waitlistJoin.id,
        body: {
          status: "removed",
        } satisfies IHealthcarePlatformAppointmentWaitlist.IUpdate,
      },
    );
  typia.assert(updatedWaitlist);

  TestValidator.notEquals(
    "waitlist status should change after self update",
    waitlistJoin.status,
    updatedWaitlist.status,
  );
  TestValidator.equals(
    "waitlist status should be 'removed'",
    updatedWaitlist.status,
    "removed",
  );
  TestValidator.predicate(
    "waitlist updated_at changed after update",
    waitlistJoin.updated_at !== updatedWaitlist.updated_at,
  );

  // 6. Attempt forbidden update: use a status only staff should set (e.g., "promoted")
  await TestValidator.error(
    "patient cannot promote own waitlist entry",
    async () => {
      await api.functional.healthcarePlatform.patient.appointments.waitlists.update(
        connection,
        {
          appointmentId: appointmentCreate.id,
          waitlistId: waitlistJoin.id,
          body: {
            status: "promoted",
          } satisfies IHealthcarePlatformAppointmentWaitlist.IUpdate,
        },
      );
    },
  );

  // 7. Register a second patient (attacker) and ensure cannot edit other's entry
  const attackerEmail = `${RandomGenerator.alphaNumeric(10)}@health.test`;
  const attackerPassword = RandomGenerator.alphaNumeric(12);
  const attackerJoin = await api.functional.auth.patient.join(connection, {
    body: {
      email: attackerEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1999, 1, 1).toISOString(),
      password: attackerPassword,
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(attackerJoin);

  await api.functional.auth.patient.login(connection, {
    body: {
      email: attackerEmail,
      password: attackerPassword,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });

  await TestValidator.error(
    "patient cannot edit another patient's waitlist entry",
    async () => {
      await api.functional.healthcarePlatform.patient.appointments.waitlists.update(
        connection,
        {
          appointmentId: appointmentCreate.id,
          waitlistId: waitlistJoin.id,
          body: {
            status: "removed",
          } satisfies IHealthcarePlatformAppointmentWaitlist.IUpdate,
        },
      );
    },
  );
}
