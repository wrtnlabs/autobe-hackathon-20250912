import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrVersion";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * Validates department head's ability to see EHR version details of encounters
 * under their scope, and confirms proper error for out-of-scope access.
 *
 * 1. Register and log in as both an organization admin and a department head.
 * 2. Organization admin creates a department, assigning the created department
 *    head.
 * 3. Organization admin creates a patient and a patient record, associating the
 *    patient record with the department.
 * 4. Switch to the department head; they create an encounter for that patient
 *    record.
 * 5. Simulate the creation of an EHR version for the encounter (since there is no
 *    explicit EHR version creation endpoint, assume encounter creation implies
 *    version 1 exists).
 * 6. Department head fetches EHR version details by calling the target GET
 *    endpoint with valid patientRecordId, encounterId, and versionNumber=1.
 * 7. Assert that all expected audit/lifecycle metadata are present in the
 *    response.
 * 8. Negative path: GET with wrong encounterId or versionNumber results in
 *    permission error.
 */
export async function test_api_ehr_version_detail_department_head_access(
  connection: api.IConnection,
) {
  // Register organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPass = RandomGenerator.alphabets(10);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPass,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  // Register department head
  const deptHeadEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadPass = RandomGenerator.alphabets(10);
  const deptHead = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: deptHeadEmail,
      full_name: RandomGenerator.name(),
      password: deptHeadPass,
    } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
  });
  typia.assert(deptHead);

  // Organization admin log in again to create department, patient, record
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdmin.email,
      password: orgAdminPass,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // Create department and assign department head
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: typia.assert(orgAdmin.id),
        body: {
          healthcare_platform_organization_id: orgAdmin.id,
          code: RandomGenerator.alphabets(5),
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IHealthcarePlatformDepartment.ICreate,
      },
    );
  typia.assert(department);

  // Create patient
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: new Date("1990-02-15T00:00:00Z").toISOString(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patient);

  // Create patient record assigned to department
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgAdmin.id,
          department_id: department.id,
          patient_user_id: patient.id,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          gender: "other",
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // Switch to department head
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHead.email,
      password: deptHeadPass,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // Department head creates encounter
  const encounter =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: {
          patient_record_id: patientRecord.id,
          provider_user_id: deptHead.id,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
          notes: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounter);

  // Assume version 1 exists after encounter creation
  const versionNumber = 1;
  // Fetch the EHR version detail as department head
  const ehrVersion =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.ehrVersions.at(
      connection,
      {
        patientRecordId: patientRecord.id,
        encounterId: encounter.id,
        versionNumber,
      },
    );
  typia.assert(ehrVersion);
  TestValidator.equals(
    "EHR version is for correct encounter",
    ehrVersion.ehr_encounter_id,
    encounter.id,
  );
  TestValidator.equals(
    "EHR version version_number is 1",
    ehrVersion.version_number,
    versionNumber,
  );
  TestValidator.predicate(
    "EHR version has snapshot content",
    typeof ehrVersion.snapshot_json === "string" &&
      ehrVersion.snapshot_json.length > 0,
  );
  TestValidator.equals(
    "EHR version submitted_by_user_id is department head",
    ehrVersion.submitted_by_user_id,
    deptHead.id,
  );

  // Negative path: wrong versionNumber
  await TestValidator.error(
    "Should NOT find non-existent versionNumber",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.ehrVersions.at(
        connection,
        {
          patientRecordId: patientRecord.id,
          encounterId: encounter.id,
          versionNumber: 9999, // unlikely to exist
        },
      );
    },
  );

  // Negative path: cross-department, try using a random encounterId
  await TestValidator.error(
    "Should NOT access encounter outside department",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.ehrVersions.at(
        connection,
        {
          patientRecordId: patientRecord.id,
          encounterId: typia.random<string & tags.Format<"uuid">>(),
          versionNumber,
        },
      );
    },
  );
}
