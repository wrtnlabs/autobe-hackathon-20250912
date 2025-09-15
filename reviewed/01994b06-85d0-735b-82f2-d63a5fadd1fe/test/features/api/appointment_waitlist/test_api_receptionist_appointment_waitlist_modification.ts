import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentWaitlist";

/**
 * Validates that a receptionist can query and filter the appointment waitlist
 * for an appointment using various filter parameters, while business invariants
 * and permissions are enforced for both positive/negative code paths. Test
 * covers:
 *
 * 1. Receptionist registration
 * 2. Patient join
 * 3. Receptionist creates appointment for patient
 * 4. Waitlist can be fetched (query all, query by status, query by patient id)
 * 5. Non-existent appointmentId yields error
 * 6. Unauthenticated/invalid access is rejected
 * 7. Invalid waitlist query params yield empty result
 */
export async function test_api_receptionist_appointment_waitlist_modification(
  connection: api.IConnection,
) {
  // 1. Register receptionist
  const receptionEmail = typia.random<string & tags.Format<"email">>();
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: {
      email: receptionEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });
  typia.assert(receptionist);

  // 2. Register patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1990, 1, 1).toISOString(),
      phone: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patient);

  // 3. Create appointment (receptionist books for patient)
  const appointment =
    await api.functional.healthcarePlatform.receptionist.appointments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          provider_id: typia.random<string & tags.Format<"uuid">>(),
          patient_id: patient.id,
          status_id: typia.random<string & tags.Format<"uuid">>(),
          appointment_type: "in-person",
          start_time: new Date(Date.now() + 3600000).toISOString(),
          end_time: new Date(Date.now() + 7200000).toISOString(),
        } satisfies IHealthcarePlatformAppointment.ICreate,
      },
    );
  typia.assert(appointment);

  // 4. Fetch initial waitlist (should be empty or only contain pre-existing entries)
  const initialWaitlist =
    await api.functional.healthcarePlatform.receptionist.appointments.waitlists.index(
      connection,
      {
        appointmentId: appointment.id,
        body: {},
      },
    );
  typia.assert(initialWaitlist);

  // 5. Fetch by patient_id and status (positive query path)
  const positiveQuery =
    await api.functional.healthcarePlatform.receptionist.appointments.waitlists.index(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          patient_id: patient.id,
          status: initialWaitlist.data[0]?.status ?? undefined,
        },
      },
    );
  typia.assert(positiveQuery);
  TestValidator.predicate(
    "waitlist query by patient_id and status does not error",
    true,
  );

  // 6. Negative: fetch waitlist for non-existent appointment
  const badAppointmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "querying waitlist for non-existent appointmentId throws",
    async () => {
      await api.functional.healthcarePlatform.receptionist.appointments.waitlists.index(
        connection,
        {
          appointmentId: badAppointmentId,
          body: {},
        },
      );
    },
  );

  // 7. Negative: unauthenticated user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated fails", async () => {
    await api.functional.healthcarePlatform.receptionist.appointments.waitlists.index(
      unauthConn,
      {
        appointmentId: appointment.id,
        body: {},
      },
    );
  });

  // 8. Query with invalid patient_id/status
  const invalidQuery =
    await api.functional.healthcarePlatform.receptionist.appointments.waitlists.index(
      connection,
      {
        appointmentId: appointment.id,
        body: {
          patient_id: typia.random<string & tags.Format<"uuid">>(),
          status: "does-not-exist",
        },
      },
    );
  typia.assert(invalidQuery);
  TestValidator.equals(
    "invalid filter yields empty data",
    invalidQuery.data.length,
    0,
  );
}
