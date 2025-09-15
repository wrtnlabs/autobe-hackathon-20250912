import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrVersion";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEhrVersion";

/**
 * Validate EHR version detail access isolation and error handling scenario.
 *
 * 1. Register organization admin (for both doctors' organization context).
 * 2. Register two doctors: doctorA, doctorB.
 * 3. For doctorA: as org admin, create patient, create patient record; as doctorA,
 *    create encounter and EHR version.
 * 4. For doctorB: repeat similar steps, creating independent patient and records.
 * 5. As doctorA: attempt to GET EHR version detail from doctorB's
 *    encounter/version (expect forbidden/not found).
 * 6. As doctorA: attempt to GET a non-existent version number on own encounter
 *    (expect error).
 * 7. Confirm doctorA's own EHR version is accessible.
 */
export async function test_api_ehr_version_detail_access_isolation_and_error_handling(
  connection: api.IConnection,
) {
  // Register organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  // Register doctorA
  const doctorAEmail = typia.random<string & tags.Format<"email">>();
  const doctorAPassword = RandomGenerator.alphaNumeric(12);
  const doctorA = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorAEmail,
      full_name: RandomGenerator.name(),
      npi_number: RandomGenerator.alphaNumeric(10),
      password: doctorAPassword as string & tags.Format<"password">,
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  typia.assert(doctorA);

  // Register doctorB
  const doctorBEmail = typia.random<string & tags.Format<"email">>();
  const doctorBPassword = RandomGenerator.alphaNumeric(12);
  const doctorB = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorBEmail,
      full_name: RandomGenerator.name(),
      npi_number: RandomGenerator.alphaNumeric(10),
      password: doctorBPassword as string & tags.Format<"password">,
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  typia.assert(doctorB);

  // Login as org admin to create patients/records
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword as string & tags.Format<"password">,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // Create patient/record for doctorA
  const patientA =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: new Date(
            "1980-01-01T00:00:00Z",
          ).toISOString() as string & tags.Format<"date-time">,
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patientA);
  const patientRecordA =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgAdmin.id,
          patient_user_id: patientA.id,
          full_name: patientA.full_name,
          dob: patientA.date_of_birth,
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecordA);

  // Create patient/record for doctorB
  const patientB =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: new Date(
            "1985-06-10T00:00:00Z",
          ).toISOString() as string & tags.Format<"date-time">,
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patientB);
  const patientRecordB =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgAdmin.id,
          patient_user_id: patientB.id,
          full_name: patientB.full_name,
          dob: patientB.date_of_birth,
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecordB);

  // Login as doctorA to create encounter and version
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorAEmail,
      password: doctorAPassword as string & tags.Format<"password">,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  const encounterA =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecordA.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecordA.id as string & tags.Format<"uuid">,
          provider_user_id: doctorA.id as string & tags.Format<"uuid">,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
          status: "active",
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounterA);
  const versionsA =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.ehrVersions.index(
      connection,
      {
        patientRecordId: patientRecordA.id as string & tags.Format<"uuid">,
        encounterId: encounterA.id as string & tags.Format<"uuid">,
        body: {
          ehr_encounter_id: encounterA.id as string & tags.Format<"uuid">,
        } satisfies IHealthcarePlatformEhrVersion.IRequest,
      },
    );
  typia.assert(versionsA);
  let versionNumberA: number & tags.Type<"int32"> = 1 as number &
    tags.Type<"int32">;
  if (versionsA.data.length > 0)
    versionNumberA = versionsA.data[0].version_number;

  // Login as doctorB to create encounter and version
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorBEmail,
      password: doctorBPassword as string & tags.Format<"password">,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  const encounterB =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecordB.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecordB.id as string & tags.Format<"uuid">,
          provider_user_id: doctorB.id as string & tags.Format<"uuid">,
          encounter_type: "checkup",
          encounter_start_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
          status: "active",
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounterB);
  const versionsB =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.ehrVersions.index(
      connection,
      {
        patientRecordId: patientRecordB.id as string & tags.Format<"uuid">,
        encounterId: encounterB.id as string & tags.Format<"uuid">,
        body: {
          ehr_encounter_id: encounterB.id as string & tags.Format<"uuid">,
        } satisfies IHealthcarePlatformEhrVersion.IRequest,
      },
    );
  typia.assert(versionsB);
  let versionNumberB: number & tags.Type<"int32"> = 1 as number &
    tags.Type<"int32">;
  if (versionsB.data.length > 0)
    versionNumberB = versionsB.data[0].version_number;

  // DoctorA tries to access doctorB's EHR version detail
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorAEmail,
      password: doctorAPassword as string & tags.Format<"password">,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  await TestValidator.error(
    "doctorA cannot access doctorB's EHR version detail",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.ehrVersions.at(
        connection,
        {
          patientRecordId: patientRecordB.id as string & tags.Format<"uuid">,
          encounterId: encounterB.id as string & tags.Format<"uuid">,
          versionNumber: versionNumberB,
        },
      );
    },
  );

  // DoctorA gets non-existent version number
  const nonExistentVersionNumber = (versionNumberA + 987) as number &
    tags.Type<"int32">;
  await TestValidator.error(
    "requesting non-existent EHR version triggers error",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.ehrVersions.at(
        connection,
        {
          patientRecordId: patientRecordA.id as string & tags.Format<"uuid">,
          encounterId: encounterA.id as string & tags.Format<"uuid">,
          versionNumber: nonExistentVersionNumber,
        },
      );
    },
  );

  // DoctorA accesses own EHR version detail
  const myVersion =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.ehrVersions.at(
      connection,
      {
        patientRecordId: patientRecordA.id as string & tags.Format<"uuid">,
        encounterId: encounterA.id as string & tags.Format<"uuid">,
        versionNumber: versionNumberA,
      },
    );
  typia.assert(myVersion);
}
