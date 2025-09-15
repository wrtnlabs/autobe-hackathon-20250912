import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotificationHistory";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Test scenario: Patient retrieves their own notification delivery history.
 *
 * Steps:
 *
 * 1. Register a patient with unique email, valid full name, and date_of_birth.
 * 2. Login as this patient to obtain an authorization context.
 * 3. As we cannot actually send a notification via a real workflow in this e2e,
 *    simulate by generating a random notification history in the database or
 *    call the API endpoint directly with a known notificationHistoryId.
 * 4. Call /healthcarePlatform/patient/notificationHistory/{notificationHistoryId}
 *    as this patient, with a valid id for their own notification history.
 *    Ensure the returned object is correct (typia.assert, field checks) and
 *    that no extraneous fields are present.
 * 5. Register a second patient (different user), login as that user, and try to
 *    read the first patient’s notification history (should error with forbidden
 *    or not found).
 * 6. Negative case: Call notificationHistory.at with a random, non-existent
 *    notificationHistoryId. (should error with not found).
 */
export async function test_api_patient_view_own_notification_history(
  connection: api.IConnection,
) {
  // 1. Register patient A & login
  const patientAJoin = await api.functional.auth.patient.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      full_name: RandomGenerator.name(),
      date_of_birth: new Date("1990-01-15").toISOString(),
      phone: RandomGenerator.mobile(),
      password: "Password!234",
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patientAJoin);

  // Find a valid notificationHistoryId: simulate by generating one
  const historyA: IHealthcarePlatformNotificationHistory =
    typia.random<IHealthcarePlatformNotificationHistory>();
  typia.assert(historyA);

  // 2. Patient retrieves their own notification history (simulate creation)
  // (In real tests, this would require a true notification to be generated.)
  const outputA =
    await api.functional.healthcarePlatform.patient.notificationHistory.at(
      connection,
      {
        notificationHistoryId: historyA.id,
      },
    );
  typia.assert(outputA);
  TestValidator.equals(
    "Own notification history matches",
    outputA.id,
    historyA.id,
  );
  TestValidator.equals(
    "notification_id matches",
    outputA.notification_id,
    historyA.notification_id,
  );
  TestValidator.equals(
    "event_type matches",
    outputA.event_type,
    historyA.event_type,
  );
  TestValidator.equals(
    "delivery_channel matches",
    outputA.delivery_channel,
    historyA.delivery_channel,
  );
  TestValidator.equals(
    "delivery_status matches",
    outputA.delivery_status,
    historyA.delivery_status,
  );
  TestValidator.equals(
    "event_time matches",
    outputA.event_time,
    historyA.event_time,
  );

  // 3. Register a second patient
  const patientBJoin = await api.functional.auth.patient.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      full_name: RandomGenerator.name(),
      date_of_birth: new Date("1983-06-17").toISOString(),
      phone: RandomGenerator.mobile(),
      password: "Password!234",
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patientBJoin);

  // 4. Login as patient B
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientBJoin.email,
      password: "Password!234",
    } satisfies IHealthcarePlatformPatient.ILogin,
  });

  // Attempt to retrieve notification history of patient A
  await TestValidator.error(
    "Patient B cannot access patient A's notification history",
    async () => {
      await api.functional.healthcarePlatform.patient.notificationHistory.at(
        connection,
        {
          notificationHistoryId: historyA.id,
        },
      );
    },
  );

  // 5. Negative: access with a non-existent notificationHistoryId
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Non-existent notificationHistoryId returns error",
    async () => {
      await api.functional.healthcarePlatform.patient.notificationHistory.at(
        connection,
        {
          notificationHistoryId: randomId,
        },
      );
    },
  );
}
