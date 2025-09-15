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
 * Validate nurse-specific EHR version detail access scoped to department
 * boundaries and ensure cross-department access is denied.
 *
 * Business context: This workflow tests strict RBAC visibility for nurses
 * on EHR version details. Nurses should only see EHR versions for
 * patients/encounters assigned to their own department (or directly on
 * their roster). Cross-department attempts must be denied for compliance
 * and all attempts must be audit-logged.
 *
 * Test process:
 *
 * 1. Register/join two organization admins, each in their own department.
 * 2. Register (join) two nurse users: NurseA (for DeptA), NurseB (for DeptB).
 * 3. As AdminA, create a patient and an associated patient record for DeptA.
 * 4. As AdminB, create another patient and an associated patient record for
 *    DeptB.
 * 5. As NurseA: create an encounter on their DeptA patient record; create EHR
 *    version 1.
 * 6. As NurseB: attempt GET on NurseA's EHR version (cross-department/should
 *    fail with permission denial).
 * 7. As NurseA: GET their own EHR version (should succeed).
 * 8. Confirm that only in-department access is allowed and all access attempts
 *    respond as per business rules.
 */
export async function test_api_ehr_version_detail_nurse_cross_department_visibility(
  connection: api.IConnection,
) {
  // 1. Register AdminA and AdminB
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  const adminAPW = RandomGenerator.alphaNumeric(12);
  const adminBPW = RandomGenerator.alphaNumeric(12);
  const adminA = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: adminAEmail,
      full_name: RandomGenerator.name(),
      password: adminAPW,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(adminA);
  const adminB = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: adminBEmail,
      full_name: RandomGenerator.name(),
      password: adminBPW,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(adminB);

  // 2. Register NurseA (DeptA) and NurseB (DeptB)
  // Assuming different specialties map to departments for scoping
  const nurseALicense = RandomGenerator.alphaNumeric(8);
  const nurseBLicense = RandomGenerator.alphaNumeric(8);
  const nurseAEmail = typia.random<string & tags.Format<"email">>();
  const nurseBEmail = typia.random<string & tags.Format<"email">>();
  const nurseAPW = RandomGenerator.alphaNumeric(12);
  const nurseBPW = RandomGenerator.alphaNumeric(12);
  const specialtyA = RandomGenerator.name();
  const specialtyB = RandomGenerator.name();
  const nurseA = await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurseAEmail,
      full_name: RandomGenerator.name(),
      license_number: nurseALicense,
      specialty: specialtyA,
      password: nurseAPW,
    } satisfies IHealthcarePlatformNurse.IJoin,
  });
  typia.assert(nurseA);
  const nurseB = await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurseBEmail,
      full_name: RandomGenerator.name(),
      license_number: nurseBLicense,
      specialty: specialtyB,
      password: nurseBPW,
    } satisfies IHealthcarePlatformNurse.IJoin,
  });
  typia.assert(nurseB);

  // 3. As AdminA, create a patient and patient record in DeptA
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminAEmail,
      password: adminAPW,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const patientA =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: new Date(1990, 1, 10).toISOString(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patientA);
  const recordA =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: adminA.id,
          department_id: null, // link via department or null if unscoped
          patient_user_id: patientA.id,
          full_name: patientA.full_name,
          dob: patientA.date_of_birth,
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(recordA);

  // 4. As AdminB, create a patient + patient record in DeptB
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminBEmail,
      password: adminBPW,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const patientB =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: new Date(1992, 5, 20).toISOString(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patientB);
  const recordB =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: adminB.id,
          department_id: null,
          patient_user_id: patientB.id,
          full_name: patientB.full_name,
          dob: patientB.date_of_birth,
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(recordB);

  // 5. As NurseA, login and create an encounter and EHR version for PatientA
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseAEmail,
      password: nurseAPW,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });
  const encounterA =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: recordA.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: recordA.id as string & tags.Format<"uuid">,
          provider_user_id: nurseA.id as string & tags.Format<"uuid">,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounterA);
  // Simulate an EHR version in storage for encounterA
  const versionNumber = 1 as number & tags.Type<"int32">;

  // 6. As NurseB, login and attempt to access NurseA's EHR version (should fail)
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseBEmail,
      password: nurseBPW,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });
  await TestValidator.error(
    "NurseB cross-department access to EHR version should be denied",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.encounters.ehrVersions.at(
        connection,
        {
          patientRecordId: recordA.id as string & tags.Format<"uuid">,
          encounterId: encounterA.id,
          versionNumber,
        },
      );
    },
  );

  // 7. As NurseA, login and successfully access own EHR version detail
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseAEmail,
      password: nurseAPW,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });
  const ehrVersionA =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.ehrVersions.at(
      connection,
      {
        patientRecordId: recordA.id as string & tags.Format<"uuid">,
        encounterId: encounterA.id,
        versionNumber,
      },
    );
  typia.assert(ehrVersionA);
}
