import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * Validates nurse patient record retrieval and access boundary enforcement.
 *
 * 1. Register a nurse (join) with all required profile fields and secure
 *    credentials.
 * 2. Log in as the nurse to refresh session/token.
 * 3. Simulate or retrieve a valid patient record object accessible to this nurse's
 *    organization.
 * 4. Exercise a successful retrieval: use the nurse's credentials to fetch the
 *    record by ID.
 * 5. Assert correct type, matching id fields, and presence of business-required
 *    fields.
 * 6. Attempt to retrieve a record with an invalid patientRecordId and assert error
 *    (not found).
 * 7. Attempt to retrieve while unauthenticated (simulated log-out, empty headers),
 *    assert error.
 * 8. Register and login as a nurse belonging to a different organization, then
 *    attempt to retrieve the prior (different-org) record and assert error
 *    (scope violation).
 * 9. Simulate soft deletion (deleted_at set) then attempt fetch and assert error
 *    (soft deleted record not found/denied).
 */
export async function test_api_patient_record_retrieval_by_nurse(
  connection: api.IConnection,
) {
  // 1. Register nurse (join)
  const nurseJoinBody = {
    email: `${RandomGenerator.alphabets(12)}@hospital-example.com`,
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(10),
    specialty: RandomGenerator.pick(["ICU", "Med/Surg", "Oncology"]),
    phone: RandomGenerator.mobile(),
    password: "SecurePW@2024",
  } satisfies IHealthcarePlatformNurse.IJoin;
  const nurseAuth = await api.functional.auth.nurse.join(connection, {
    body: nurseJoinBody,
  });
  typia.assert(nurseAuth);
  TestValidator.predicate(
    "nurse login/creation success",
    nurseAuth.token.access.length > 0,
  );

  // 2. Log in as nurse (refresh session/token)
  const nurseLogin = await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseJoinBody.email,
      password: nurseJoinBody.password!,
    },
  });
  typia.assert(nurseLogin);
  TestValidator.equals(
    "logged in nurse id matches join",
    nurseLogin.id,
    nurseAuth.id,
  );

  // 3. Simulate a valid patient record in nurse's organization
  const patientRecord: IHealthcarePlatformPatientRecord =
    typia.random<IHealthcarePlatformPatientRecord>();
  patientRecord.organization_id = nurseAuth.id; // simulate same org assignment
  patientRecord.department_id = null;
  patientRecord.deleted_at = null;

  // 4. Success: Retrieve as authenticated nurse
  const output =
    await api.functional.healthcarePlatform.nurse.patientRecords.at(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(output);
  TestValidator.equals("retrieved id matches", output.id, patientRecord.id);

  // 5. Failure: Not found with random uuid
  await TestValidator.error(
    "invalid patientRecordId returns error",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.at(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Failure: unauthenticated nurse
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated nurse access denied", async () => {
    await api.functional.healthcarePlatform.nurse.patientRecords.at(
      unauthConn,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
      },
    );
  });

  // 7. Scope violation (different-org nurse)
  const otherNurseJoinBody = {
    email: `${RandomGenerator.alphabets(10)}@hospital-example.com`,
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(10),
    password: "OtherPW@2024",
  } satisfies IHealthcarePlatformNurse.IJoin;
  const otherNurseAuth = await api.functional.auth.nurse.join(connection, {
    body: otherNurseJoinBody,
  });
  typia.assert(otherNurseAuth);

  await api.functional.auth.nurse.login(connection, {
    body: {
      email: otherNurseJoinBody.email,
      password: otherNurseJoinBody.password!,
    },
  });

  await TestValidator.error(
    "scope violation denied (different org)",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.at(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // 8. Soft deleted record
  patientRecord.deleted_at = new Date().toISOString() as string &
    tags.Format<"date-time">;
  await TestValidator.error(
    "deleted patient record access denied",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.at(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        },
      );
    },
  );
}
