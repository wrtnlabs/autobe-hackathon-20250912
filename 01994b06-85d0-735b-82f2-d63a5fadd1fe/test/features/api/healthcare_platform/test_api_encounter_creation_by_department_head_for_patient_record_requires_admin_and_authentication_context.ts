import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate department head encounter creation for a patient record
 *
 * - Register and login as systemAdmin
 * - Create a patient record as systemAdmin (ORG/dept/patient linkage)
 * - Register and login as departmentHead user in same org/dept
 * - Invoke encounter creation as departmentHead on the patient record
 * - Error: Not authenticated
 * - Error: Invalid patientRecordId
 * - Success: Encounter created, linked to right patient/department/provider
 */
export async function test_api_encounter_creation_by_department_head_for_patient_record_requires_admin_and_authentication_context(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const sysadmin_email: string = typia.random<string & tags.Format<"email">>();
  const sysadmin_password: string = RandomGenerator.alphaNumeric(12);
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysadmin_email,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysadmin_email,
      password: sysadmin_password,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(systemAdmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadmin_email,
      provider: "local",
      provider_key: sysadmin_email,
      password: sysadmin_password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 2. Create a patient record as systemAdmin
  const patient_user_id: string = typia.random<string & tags.Format<"uuid">>();
  const organization_id: string = typia.random<string & tags.Format<"uuid">>();
  const department_id: string = typia.random<string & tags.Format<"uuid">>();
  const patient_record =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id,
          department_id,
          patient_user_id,
          full_name: RandomGenerator.name(),
          dob: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 365 * 30,
          ).toISOString(),
          status: "active",
          demographics_json: JSON.stringify({ race: "Asian", lang: "ko-KR" }),
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patient_record);

  // 3. Register and login as department head (same org/dept)
  const depthead_email = typia.random<string & tags.Format<"email">>();
  const depthead_password = RandomGenerator.alphaNumeric(12);
  const departmentHead = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: depthead_email,
        full_name: RandomGenerator.name(),
        password: depthead_password,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    },
  );
  typia.assert(departmentHead);

  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: depthead_email,
      password: depthead_password,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // 4. Fails: not authenticated (reset to unauthenticated conn)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthenticated user cannot create patient encounter",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.create(
        unauthConn,
        {
          patientRecordId: patient_record.id as string & tags.Format<"uuid">,
          body: {
            patient_record_id: patient_record.id as string &
              tags.Format<"uuid">,
            provider_user_id: departmentHead.id as string & tags.Format<"uuid">,
            encounter_type: RandomGenerator.pick([
              "office_visit",
              "inpatient_admission",
              "telemedicine",
            ] as const),
            encounter_start_at: new Date().toISOString(),
            status: "planned",
            notes: RandomGenerator.paragraph(),
          } satisfies IHealthcarePlatformEhrEncounter.ICreate,
        },
      );
    },
  );

  // 5. Fails: Invalid patientRecordId
  await TestValidator.error(
    "Invalid patientRecordId triggers error",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.create(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            patient_record_id: typia.random<string & tags.Format<"uuid">>(),
            provider_user_id: departmentHead.id as string & tags.Format<"uuid">,
            encounter_type: "office_visit",
            encounter_start_at: new Date().toISOString(),
            status: "planned",
            notes: RandomGenerator.paragraph(),
          } satisfies IHealthcarePlatformEhrEncounter.ICreate,
        },
      );
    },
  );

  // 6. Success: Create encounter as department head (authenticated)
  const now = new Date();
  const encounterCreateBody = {
    patient_record_id: patient_record.id as string & tags.Format<"uuid">,
    provider_user_id: departmentHead.id as string & tags.Format<"uuid">,
    encounter_type: "office_visit",
    encounter_start_at: now.toISOString(),
    status: "planned",
    notes: RandomGenerator.paragraph(),
  } satisfies IHealthcarePlatformEhrEncounter.ICreate;

  const encounter =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patient_record.id as string & tags.Format<"uuid">,
        body: encounterCreateBody,
      },
    );
  typia.assert(encounter);
  TestValidator.equals(
    "Encounter patient_record_id matches input",
    encounter.patient_record_id,
    patient_record.id as string & tags.Format<"uuid">,
  );
  TestValidator.equals(
    "Encounter provider_user_id matches department head",
    encounter.provider_user_id,
    departmentHead.id as string & tags.Format<"uuid">,
  );
  TestValidator.equals(
    "Encounter type is office_visit",
    encounter.encounter_type,
    "office_visit",
  );
  TestValidator.equals(
    "Encounter status is planned",
    encounter.status,
    "planned",
  );
  TestValidator.predicate(
    "Encounter start time close to now",
    Math.abs(new Date(encounter.encounter_start_at).getTime() - now.getTime()) <
      10000,
  );
}
