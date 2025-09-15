import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrVersion";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEhrVersion";

/**
 * End-to-end scenario: a medical doctor submits (searches for) a new version of
 * the EHR for an existing patient encounter, including business flows and
 * edge-case error handling. Covers:
 *
 * 1. Medical doctor registers and authenticates.
 * 2. System admin registers and authenticates.
 * 3. System admin creates patient record.
 * 4. Doctor creates encounter under patient record.
 * 5. Doctor PATCHes for EHR version listing with proper filters.
 * 6. Validates response for correctness (version_number, links, audit fields).
 * 7. Tests error for PATCH with invalid encounterId, unauthenticated, and
 *    wrong-role sessions.
 */
export async function test_api_ehr_version_medicaldoctor_patch_e2e(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: adminEmail,
    password: "adminPASSWORD1!",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoin,
  });
  typia.assert(admin);

  // 2. Register and authenticate as medical doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorJoin = {
    email: doctorEmail,
    full_name: RandomGenerator.name(),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: "doctorPASS1@",
    specialty: RandomGenerator.name(1),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: doctorJoin,
  });
  typia.assert(doctor);

  // 3. System admin creates a patient record
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: "adminPASSWORD1!",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  const patientRecordCreate = {
    organization_id: typia.random<string>(),
    department_id: null,
    patient_user_id: typia.random<string>(),
    external_patient_number: RandomGenerator.alphaNumeric(9),
    full_name: RandomGenerator.name(),
    dob: new Date("1985-01-01").toISOString(),
    gender: RandomGenerator.pick(["male", "female", "other"] as const),
    status: "active",
    demographics_json: JSON.stringify({ ethnicity: "test" }),
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const patientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      { body: patientRecordCreate },
    );
  typia.assert(patientRecord);

  // 4. Medical doctor logs in, then creates encounter
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: "doctorPASS1@",
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  const encounterCreate = {
    patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
    provider_user_id: doctor.id as string & tags.Format<"uuid">,
    encounter_type: RandomGenerator.pick([
      "office_visit",
      "telemedicine",
      "emergency",
      "inpatient",
    ] as const),
    encounter_start_at: new Date().toISOString(),
    encounter_end_at: null,
    status: "active",
    notes: RandomGenerator.paragraph(),
  } satisfies IHealthcarePlatformEhrEncounter.ICreate;
  const encounter =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: encounterCreate,
      },
    );
  typia.assert(encounter);

  // 5. Medical doctor submits/searches EHR version for this encounter
  const ehrVersionRequest = {
    ehr_encounter_id: encounter.id,
    submitted_by_user_id: doctor.id,
    version_number: 1,
    created_at_from: null,
    created_at_to: null,
    reason_for_update: "routine",
    page: 0,
    limit: 10,
    sort: "created_at",
    order: "desc",
  } satisfies IHealthcarePlatformEhrVersion.IRequest;
  const versions =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.ehrVersions.index(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        body: ehrVersionRequest,
      },
    );
  typia.assert(versions);
  // Confirm at least one version present, matches input
  TestValidator.predicate(
    "at least one ehr version exists",
    versions.data.length > 0,
  );
  TestValidator.equals(
    "ehr_encounter_id matches",
    versions.data[0].ehr_encounter_id,
    encounter.id,
  );
  TestValidator.equals(
    "submitted_by_user_id matches",
    versions.data[0].submitted_by_user_id,
    doctor.id,
  );
  TestValidator.predicate(
    "version_number >= 1",
    versions.data[0].version_number >= 1,
  );
  TestValidator.predicate(
    "snapshot_json exists",
    typeof versions.data[0].snapshot_json === "string" &&
      versions.data[0].snapshot_json.length > 0,
  );
  TestValidator.equals(
    "reason_for_update matches",
    versions.data[0].reason_for_update,
    "routine",
  );

  // 6. PATCH with invalid encounterId (random UUID), expect error
  await TestValidator.error(
    "patching non-existent encounterId should fail",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.ehrVersions.index(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: typia.random<string & tags.Format<"uuid">>(),
          body: ehrVersionRequest,
        },
      );
    },
  );

  // 7. PATCH while unauthenticated (no headers): should be denied
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "patching while unauthenticated is denied",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.ehrVersions.index(
        unauthConn,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id as string & tags.Format<"uuid">,
          body: ehrVersionRequest,
        },
      );
    },
  );

  // 8. PATCH as system admin (wrong role): should be denied
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: "adminPASSWORD1!",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  await TestValidator.error("patch as non-doctor is denied", async () => {
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.ehrVersions.index(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        body: ehrVersionRequest,
      },
    );
  });
}
