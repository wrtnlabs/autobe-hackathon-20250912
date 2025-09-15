import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrVersion";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * Validates nurse access and audit boundaries for EHR version detail retrieval.
 *
 * 1. Organization admin registers and logs in, then creates a patient and
 *    associates a patient record.
 * 2. Nurse is registered and logs in.
 * 3. Nurse creates an encounter tied to the patient record (where nurse is
 *    provider).
 * 4. Nurse fetches EHR version detail for the encounter/version and validates
 *    audit fields and scoping.
 * 5. Negative: Try to access a different patient record (not owned by this nurse)
 *    – should fail.
 * 6. Negative: Try to fetch a non-existent version number (should error).
 */
export async function test_api_ehr_version_detail_nurse_access_and_safety(
  connection: api.IConnection,
) {
  // 1. Organization admin registration and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 2. Create a patient and patient record
  const patEmail = typia.random<string & tags.Format<"email">>();
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: patEmail,
          full_name: RandomGenerator.name(),
          date_of_birth: new Date("1980-01-01").toISOString(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patient);
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgAdmin.id,
          department_id: null,
          patient_user_id: patient.id,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          gender: undefined,
          status: "active",
          demographics_json: null,
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // 3. Nurse registration and login
  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nursePassword = RandomGenerator.alphaNumeric(16);
  const nurseLicense = RandomGenerator.alphaNumeric(8);
  const nurse = await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurseEmail,
      full_name: RandomGenerator.name(),
      license_number: nurseLicense,
      phone: RandomGenerator.mobile(),
      password: nursePassword,
    } satisfies IHealthcarePlatformNurse.IJoin,
  });
  typia.assert(nurse);
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePassword,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  // 4. Nurse creates an encounter
  const encounter =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: nurse.id as string & tags.Format<"uuid">,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
          notes: "Initial nurse encounter for test.",
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounter);
  // 5. Fetch EHR version detail (version_number = 1)
  const versionNumber = 1 as number & tags.Type<"int32">;
  const ehrVersion =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.ehrVersions.at(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        versionNumber: versionNumber,
      },
    );
  typia.assert(ehrVersion);
  TestValidator.equals(
    "EHR version provider matches nurse",
    ehrVersion.submitted_by_user_id,
    nurse.id,
  );
  TestValidator.equals(
    "EHR version encounter matches",
    ehrVersion.ehr_encounter_id,
    encounter.id,
  );
  TestValidator.equals(
    "EHR version number is 1",
    ehrVersion.version_number,
    versionNumber,
  );

  // 6. Negative: Create a second patient/record (not assigned to nurse) then test nurse access is denied
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const patient2 =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: new Date("1995-06-15").toISOString(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patient2);
  const patientRecord2 =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgAdmin.id,
          department_id: null,
          patient_user_id: patient2.id,
          full_name: patient2.full_name,
          dob: patient2.date_of_birth,
          gender: null,
          status: "active",
          demographics_json: null,
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord2);
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePassword,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });
  await TestValidator.error(
    "Nurse denied access to EHR version for unrelated patient",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.encounters.ehrVersions.at(
        connection,
        {
          patientRecordId: patientRecord2.id as string & tags.Format<"uuid">,
          encounterId: typia.random<string & tags.Format<"uuid">>(),
          versionNumber: 1 as number & tags.Type<"int32">,
        },
      );
    },
  );
  // 7. Negative: Non-existent version number for legal encounter
  await TestValidator.error(
    "Non-existent version number triggers error",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.encounters.ehrVersions.at(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id as string & tags.Format<"uuid">,
          versionNumber: 999 as number & tags.Type<"int32">,
        },
      );
    },
  );
}
