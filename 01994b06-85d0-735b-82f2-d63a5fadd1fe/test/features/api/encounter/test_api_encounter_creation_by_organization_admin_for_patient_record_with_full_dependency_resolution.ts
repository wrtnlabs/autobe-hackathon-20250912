import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * E2E scenario: Create an encounter as an organization admin for a patient
 * record with all role/auth/patient dependencies satisfied.
 *
 * 1. Register a system admin and login (to create patient record, which is a
 *    system admin-only operation).
 * 2. As system admin, create a patient user (simulate as typia.random, as
 *    there is no explicit API for it – will generate a UUID for
 *    patient_user_id for patient record creation).
 * 3. As system admin, create a patient record: collect organization_id from
 *    admin, patient_user_id generated, full_name, dob, status, and
 *    necessary fields. Validate response.
 * 4. Register an organization admin and login (role switch), so future API
 *    calls use org admin for RBAC.
 * 5. As organization admin, create an encounter for the earlier created
 *    patient record. Use patient_record.id, org admin's id as
 *    provider_user_id. Include required fields: encounter_type,
 *    encounter_start_at, status, plus sample notes. Validate correct
 *    linkage: encounter.patient_record_id matches patient_record.id,
 *    provider_user_id matches logged-in org admin, status/encounter_type
 *    set, and notes match input.
 * 6. Business logic test: Attempt to create an encounter unauthenticated
 *    (simulate by clearing connection headers; server should reject).
 * 7. Business logic test: Attempt to create an encounter against a
 *    non-existent patient record UUID and validate error response.
 */
export async function test_api_encounter_creation_by_organization_admin_for_patient_record_with_full_dependency_resolution(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin (who can create patient records)
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = "sysAdminPW@1234";
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminJoin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 2. Simulate creation of a patient user UUID (no direct API for patient user creation available). Patient user is required by patient record
  const patientUserId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create patient record as system admin (using org id from system admin, patient user id, etc)
  const patientRecordBody = {
    organization_id: sysAdminJoin.id, // org uuid; since system admin's id acts as org unique id
    patient_user_id: patientUserId,
    full_name: RandomGenerator.name(),
    dob: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 30).toISOString(), // 30 years ago
    status: "active",
  } satisfies IHealthcarePlatformPatientRecord.ICreate;

  const patientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      { body: patientRecordBody },
    );
  typia.assert(patientRecord);

  // 4. Register and login as organization admin (role switch, for subsequent encounter creation)
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = "orgAdminPW@1234";
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
        provider: "local",
        provider_key: orgAdminEmail,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 5. As org admin, create an encounter for the patient record (link patientRecord.id and orgAdmin's id)
  const encounterBody = {
    patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
    provider_user_id: orgAdminJoin.id as string & tags.Format<"uuid">,
    encounter_type: "office_visit",
    encounter_start_at: new Date().toISOString(),
    status: "planned",
    notes: RandomGenerator.paragraph(),
  } satisfies IHealthcarePlatformEhrEncounter.ICreate;

  const encounter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: encounterBody,
      },
    );
  typia.assert(encounter);
  TestValidator.equals(
    "Encounter's patient_record_id matches patient record",
    encounter.patient_record_id,
    patientRecord.id,
  );
  TestValidator.equals(
    "Encounter's provider_user_id matches organization admin id",
    encounter.provider_user_id,
    orgAdminJoin.id,
  );
  TestValidator.equals(
    "Encounter notes matches input",
    encounter.notes,
    encounterBody.notes,
  );
  TestValidator.equals(
    "Encounter type matches input",
    encounter.encounter_type,
    encounterBody.encounter_type,
  );
  TestValidator.equals(
    "Encounter status matches input",
    encounter.status,
    encounterBody.status,
  );

  // 6. Attempt to create encounter unauthenticated (headers cleared)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Should reject unauthenticated encounter creation",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.create(
        unauthConn,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          body: encounterBody,
        },
      );
    },
  );

  // 7. Attempt to create encounter for non-existent patient record
  await TestValidator.error(
    "Should reject creation for non-existent patient record",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.create(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          body: encounterBody,
        },
      );
    },
  );
}
