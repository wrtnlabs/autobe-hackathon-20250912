import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * Validate organization admin's ability to access patient record details with
 * all business constraints.
 *
 * 1. Register an organization admin and login, saving credentials.
 * 2. Create a new patient record attached to the admin's organization (with random
 *    patient user id, org id, valid dates).
 * 3. Retrieve the created patient record by ID and check that all returned
 *    business fields match the initially created patient record.
 * 4. Register/login a second organization admin, create a second patient record in
 *    a different organization, and attempt access to the first record. Expect
 *    error (e.g., not found/access denied).
 * 5. Attempt to retrieve a patient record with an invalid/nonsense UUID, expect
 *    error.
 * 6. After explicit logout (by removing/replacing token or using a new
 *    connection), try retrieving the valid patient record and expect error.
 */
export async function test_api_patient_record_organization_admin_access_and_details(
  connection: api.IConnection,
) {
  // 1. Register and login as organization admin (ORG-A)
  const orgAdminJoinA = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdminA = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAdminJoinA },
  );
  typia.assert(orgAdminA);
  TestValidator.equals(
    "org admin email matches",
    orgAdminA.email,
    orgAdminJoinA.email,
  );

  // 2. Create a patient record under ORG-A
  const patientUserId = typia.random<string & tags.Format<"uuid">>();
  const prBody = {
    organization_id: orgAdminA.id,
    department_id: null,
    patient_user_id: patientUserId,
    external_patient_number: RandomGenerator.alphaNumeric(8),
    full_name: RandomGenerator.name(),
    dob: new Date("1984-03-15").toISOString(),
    gender: RandomGenerator.pick(["male", "female", "other", null]),
    status: RandomGenerator.pick([
      "active",
      "inactive",
      "deceased",
      "transferred",
    ]),
    demographics_json: JSON.stringify({
      race: RandomGenerator.name(1),
      language: RandomGenerator.name(1),
    }),
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const createdRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      { body: prBody },
    );
  typia.assert(createdRecord);
  TestValidator.equals(
    "patient record organization id",
    createdRecord.organization_id,
    orgAdminA.id,
  );
  TestValidator.equals(
    "patient record full name matches",
    createdRecord.full_name,
    prBody.full_name,
  );

  // 3. Retrieve by ID, check all business fields
  const getOutput =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.at(
      connection,
      { patientRecordId: createdRecord.id as string & tags.Format<"uuid"> },
    );
  typia.assert(getOutput);
  TestValidator.equals(
    "get matches create: organization_id",
    getOutput.organization_id,
    prBody.organization_id,
  );
  TestValidator.equals(
    "get matches create: patient_user_id",
    getOutput.patient_user_id,
    prBody.patient_user_id,
  );
  TestValidator.equals(
    "get matches create: full_name",
    getOutput.full_name,
    prBody.full_name,
  );
  TestValidator.equals("get matches create: dob", getOutput.dob, prBody.dob);
  TestValidator.equals(
    "get matches create: status",
    getOutput.status,
    prBody.status,
  );

  // 4. Register and login as a second organization admin (ORG-B)
  const orgAdminJoinB = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdminB = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAdminJoinB },
  );
  typia.assert(orgAdminB);

  // Switch context to ORG-B session (their token is installed)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminJoinB.email,
      password: orgAdminJoinB.password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4b. Try to retrieve ORG-A's patient record as ORG-B (should fail)
  await TestValidator.error(
    "other org admin cannot access foreign patient record",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.at(
        connection,
        { patientRecordId: createdRecord.id as string & tags.Format<"uuid"> },
      );
    },
  );

  // 4c. ORG-B creates its own record for completeness (not required, but could help future cross-org checks)
  const patientUserIdB = typia.random<string & tags.Format<"uuid">>();
  const prBodyB = {
    organization_id: orgAdminB.id,
    department_id: null,
    patient_user_id: patientUserIdB,
    external_patient_number: RandomGenerator.alphaNumeric(8),
    full_name: RandomGenerator.name(),
    dob: new Date("1992-07-12").toISOString(),
    gender: RandomGenerator.pick(["male", "female", "other", null]),
    status: RandomGenerator.pick([
      "active",
      "inactive",
      "deceased",
      "transferred",
    ]),
    demographics_json: JSON.stringify({
      race: RandomGenerator.name(1),
      language: RandomGenerator.name(1),
    }),
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const createdRecordB =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      { body: prBodyB },
    );
  typia.assert(createdRecordB);
  TestValidator.equals(
    "ORG-B new record has ORG-B org id",
    createdRecordB.organization_id,
    orgAdminB.id,
  );

  // 5. Try to retrieve using a random invalid UUID
  await TestValidator.error(
    "error on retrieving a non-existent record id",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.at(
        connection,
        { patientRecordId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );

  // 6. Use new connection (simulate session/logout loss)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot access patient records",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.at(
        unauthConn,
        { patientRecordId: createdRecord.id as string & tags.Format<"uuid"> },
      );
    },
  );
}
