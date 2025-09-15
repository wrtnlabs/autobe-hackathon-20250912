import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrVersion";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEhrVersion";

/**
 * Full department head EHR version patch test.
 *
 * 1. Register System Admin
 * 2. Login System Admin
 * 3. System Admin creates Patient Record (random but structurally valid ICreate
 *    DTO)
 * 4. Register Department Head
 * 5. Login Department Head
 * 6. Department Head creates Encounter for patient
 * 7. Department Head PATCHes EHR versions for encounter (using their session and
 *    correct UUIDs)
 * 8. Verifies new version appears in audit/version history (fetch after PATCH,
 *    expect membership by submitter matching department head)
 * 9. Permission negative: Try PATCH as system admin (should fail)
 * 10. Duplicate PATCH (business edge: should either create new version or trigger
 *     conflict) - validate response
 */
export async function test_api_ehr_version_departmenthead_patch_e2e(
  connection: api.IConnection,
) {
  // Step 1: Register System Admin
  const sysadminEmail: string = typia.random<string & tags.Format<"email">>();
  const sysadminJoin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysadminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: sysadminEmail,
        password: "safepassword123",
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(sysadminJoin);

  // Step 2: Login System Admin
  const sysadminAuth: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: sysadminEmail,
        provider: "local",
        provider_key: sysadminEmail,
        password: "safepassword123",
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    });
  typia.assert(sysadminAuth);

  // Step 3: System Admin creates Patient Record
  const patientRecordCreate = {
    organization_id: typia.random<string>(),
    department_id: null,
    patient_user_id: typia.random<string>(),
    external_patient_number: null,
    full_name: RandomGenerator.name(),
    dob: new Date().toISOString(),
    gender: RandomGenerator.pick(["male", "female", null]),
    status: "active",
    demographics_json: null,
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const patientRecord: IHealthcarePlatformPatientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      {
        body: patientRecordCreate,
      },
    );
  typia.assert(patientRecord);

  // Step 4: Register Department Head
  const departmentHeadEmail = typia.random<string & tags.Format<"email">>();
  const departmentHeadJoin: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: {
        email: departmentHeadEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "verysecurepass",
        sso_provider: null,
        sso_provider_key: null,
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    });
  typia.assert(departmentHeadJoin);

  // Step 5: Login Department Head
  const departmentHeadAuth: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.login(connection, {
      body: {
        email: departmentHeadEmail,
        password: "verysecurepass",
        sso_provider: null,
        sso_provider_key: null,
      } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
    });
  typia.assert(departmentHeadAuth);

  // Step 6: Department Head creates Encounter
  const encounterCreate = {
    patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
    provider_user_id: departmentHeadAuth.id as string & tags.Format<"uuid">,
    encounter_type: "office_visit",
    encounter_start_at: new Date().toISOString(),
    encounter_end_at: null,
    status: "active",
    notes: RandomGenerator.paragraph(),
  } satisfies IHealthcarePlatformEhrEncounter.ICreate;

  const encounter: IHealthcarePlatformEhrEncounter =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: encounterCreate,
      },
    );
  typia.assert(encounter);

  // Step 7: PATCH EHR Versions as department head
  const versionRequest = {
    ehr_encounter_id: encounter.id,
    submitted_by_user_id: departmentHeadAuth.id,
    version_number: null,
    created_at_from: null,
    created_at_to: null,
    reason_for_update: null,
    page: 0,
    limit: 10,
    sort: null,
    order: null,
  } satisfies IHealthcarePlatformEhrVersion.IRequest;

  const patchResult: IPageIHealthcarePlatformEhrVersion =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.ehrVersions.index(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        body: versionRequest,
      },
    );
  typia.assert(patchResult);
  TestValidator.predicate(
    "patched EHR versions contain at least one entry",
    patchResult.data.length >= 1,
  );
  TestValidator.predicate(
    "every returned version relates to this encounter and was submitted by the department head",
    patchResult.data.every(
      (v) =>
        v.ehr_encounter_id === encounter.id &&
        v.submitted_by_user_id === departmentHeadAuth.id,
    ),
  );

  // Step 8: Try PATCH as system admin (should fail - no permission)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      provider: "local",
      provider_key: sysadminEmail,
      password: "safepassword123",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  await TestValidator.error(
    "system admin cannot patch EHR versions",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.ehrVersions.index(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id as string & tags.Format<"uuid">,
          body: versionRequest,
        },
      );
    },
  );

  // Step 9: Duplicate PATCH (business edge)
  const secondPatch: IPageIHealthcarePlatformEhrVersion =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.ehrVersions.index(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        body: versionRequest,
      },
    );
  typia.assert(secondPatch);
  TestValidator.equals(
    "PATCH with same request yields consistent version history",
    patchResult.data,
    secondPatch.data,
  );
}
