import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformPatientRecord";

/**
 * Tests that a nurse can successfully query patient records using valid
 * criteria, and cannot access with bad credentials or unauthorized filters.
 *
 * Steps:
 *
 * 1. Register a nurse with valid business email, legal full name, license number,
 *    optionally specialty and phone.
 * 2. Log in as that nurse to acquire authorization.
 * 3. Query patient records with a valid/realistic filter body (including at least
 *    organization_id, department_id, patient_user_id, full_name, dob).
 * 4. Verify the returned structure and record content, ensure all fields are of
 *    correct type and values are plausible.
 * 5. Try the record search with a completely wrong UUID (should return empty or
 *    error by business logic but not type error).
 * 6. Try record search without authentication (connection without Authorization
 *    header) and expect an error.
 * 7. Optionally, attempt a search with filters for an organization/department the
 *    nurse should not have access to (simulate forbidden case; expect business
 *    logic error, not a type error).
 */
export async function test_api_patient_record_update_by_nurse_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Register nurse
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@business-hospital.com`,
    full_name: RandomGenerator.name(2),
    license_number: RandomGenerator.alphaNumeric(10),
    specialty: RandomGenerator.pick(["ICU", "Cardiology", "ER", null]),
    phone: RandomGenerator.mobile(),
    password: "TestSecure!2024",
  } satisfies IHealthcarePlatformNurse.IJoin;
  const nurse = await api.functional.auth.nurse.join(connection, {
    body: joinBody,
  });
  typia.assert(nurse);

  // 2. Log in as nurse
  const loggedIn = await api.functional.auth.nurse.login(connection, {
    body: { email: joinBody.email, password: joinBody.password! },
  });
  typia.assert(loggedIn);

  // 3. Query patient records with valid filters (organization_id in UUID format)
  const requestBody = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    department_id: undefined,
    patient_user_id: undefined,
    full_name: RandomGenerator.name(2),
    dob: new Date(1990, 5, 23).toISOString(),
    gender: RandomGenerator.pick(["male", "female", "other"]),
    status: "active",
    external_patient_number: "PAT2024-0355",
    demographics_contains: undefined,
    page: 1 as number,
    page_size: 10 as number,
  } satisfies IHealthcarePlatformPatientRecord.IRequest;
  const page =
    await api.functional.healthcarePlatform.nurse.patientRecords.index(
      connection,
      { body: requestBody },
    );
  typia.assert(page);
  TestValidator.predicate(
    "page contains data or is empty",
    Array.isArray(page.data),
  );

  if (page.data.length > 0) {
    page.data.forEach((record) => {
      typia.assert(record);
      TestValidator.equals(
        "organization ID matches filter",
        record.organization_id,
        requestBody.organization_id,
      );
      if (requestBody.full_name) {
        TestValidator.predicate(
          "record full_name contains filter",
          record.full_name.includes(requestBody.full_name),
        );
      }
    });
  }

  // 4. Query with wrong UUID (simulate empty or error case; expect business logic outcome)
  const requestWrongBody = {
    organization_id: "00000000-0000-0000-0000-000000000000",
    page: 1 as number,
    page_size: 5 as number,
  } satisfies IHealthcarePlatformPatientRecord.IRequest;
  const wrongPage =
    await api.functional.healthcarePlatform.nurse.patientRecords.index(
      connection,
      { body: requestWrongBody },
    );
  typia.assert(wrongPage);
  TestValidator.equals(
    "empty or no-matching page (wrong org UUID)",
    wrongPage.data.length,
    0,
  );

  // 5. Try without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated query should error", async () => {
    await api.functional.healthcarePlatform.nurse.patientRecords.index(
      unauthConn,
      { body: requestBody },
    );
  });
}
