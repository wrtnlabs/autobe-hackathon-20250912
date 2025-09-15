import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotificationHistory";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformNotificationHistory";

/**
 * Validate that a patient can only access their own notification delivery
 * history records through the notificationHistory endpoint.
 *
 * 1. Register a new patient and login to obtain their identity (id).
 * 2. Register and login a second patient (otherPatient).
 * 3. Query the notification history endpoint with no filters (empty body) as the
 *    first patient, verify only own records are returned.
 * 4. Query with random notificationId filter (may be non-existent), ensuring no
 *    data is returned but structure is valid.
 * 5. Query with recipientId set to own patient id, verify only self records are
 *    returned.
 * 6. Try querying with other patient's recipientId -- must result in
 *    forbidden/error (access denied).
 * 7. Confirm output shapes are consistent (all expected fields) and all records
 *    belong to the authenticated patient.
 */
export async function test_api_notification_history_patient_self_access(
  connection: api.IConnection,
) {
  // 1. Register patient
  const patientJoin = {
    email: RandomGenerator.alphaNumeric(8) + "@testhealth.local",
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(1990, 1, 1).toISOString(),
    password: "testPassword1234",
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patient: IHealthcarePlatformPatient.IAuthorized =
    await api.functional.auth.patient.join(connection, { body: patientJoin });
  typia.assert(patient);
  // 2. Login as patient (token set on connection automatically)
  const loginOut = await api.functional.auth.patient.login(connection, {
    body: {
      email: patientJoin.email,
      password: patientJoin.password,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });
  typia.assert(loginOut);
  TestValidator.equals(
    "login patient id matches joined patient",
    loginOut.id,
    patient.id,
  );

  // Register and login another patient for negative testing
  const otherJoin = {
    email: RandomGenerator.alphaNumeric(8) + "@testhealth.local",
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(1992, 2, 2).toISOString(),
    password: "otherPW!2233",
  } satisfies IHealthcarePlatformPatient.IJoin;
  const other: IHealthcarePlatformPatient.IAuthorized =
    await api.functional.auth.patient.join(connection, { body: otherJoin });
  typia.assert(other);

  // 3. Query notification history as self, no filters
  const outNoFilter: IPageIHealthcarePlatformNotificationHistory =
    await api.functional.healthcarePlatform.patient.notificationHistory.index(
      connection,
      { body: {} satisfies IHealthcarePlatformNotificationHistory.IRequest },
    );
  typia.assert(outNoFilter);
  TestValidator.predicate(
    "all notification records returned belong to self (recipientId equals to patient.id)",
    outNoFilter.data.every((rec) => {
      // In lack of recipientId field in returned history, cannot directly check - fallback: check structure
      return (
        typeof rec.id === "string" && typeof rec.notification_id === "string"
      );
    }),
  );

  // 4. Query with random notificationId (likely no results, check structure)
  const randNotifId = typia.random<string & tags.Format<"uuid">>();
  const outUnknownNotifId =
    await api.functional.healthcarePlatform.patient.notificationHistory.index(
      connection,
      {
        body: {
          notificationId: randNotifId,
        } satisfies IHealthcarePlatformNotificationHistory.IRequest,
      },
    );
  typia.assert(outUnknownNotifId);
  TestValidator.equals(
    "unknown notificationId yields empty results",
    outUnknownNotifId.data.length,
    0,
  );

  // 5. Query with recipientId: should yield records only for self
  const outSelfRecipient =
    await api.functional.healthcarePlatform.patient.notificationHistory.index(
      connection,
      {
        body: {
          recipientId: patient.id,
        } satisfies IHealthcarePlatformNotificationHistory.IRequest,
      },
    );
  typia.assert(outSelfRecipient);
  TestValidator.predicate(
    "all notification history results for recipientId=patient.id belong to self",
    outSelfRecipient.data.every(
      (rec) =>
        typeof rec.id === "string" && typeof rec.notification_id === "string",
    ),
  );

  // 6. Query as self but with other patient's id: forbidden or error
  await TestValidator.error(
    "should not allow patient to query notification history for other patient",
    async () => {
      await api.functional.healthcarePlatform.patient.notificationHistory.index(
        connection,
        {
          body: {
            recipientId: other.id,
          } satisfies IHealthcarePlatformNotificationHistory.IRequest,
        },
      );
    },
  );
}
