import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";

/**
 * E2E test for department head creating vitals measurement and business logic
 * validation
 *
 * Validates the business workflow for:
 *
 * - Department head registering and logging in
 * - Receptionist registering/logging in and creating a new patient & patient
 *   record
 * - Department head creating a new encounter
 * - Department head creating a valid vital for an encounter
 * - Business logic and error handling for invalid value, unauthorized user, and
 *   not found/deleted records
 *
 * Steps:
 *
 * 1. Register and login as department head
 * 2. Register and login as receptionist
 * 3. Receptionist creates patient
 * 4. Receptionist creates patient record
 * 5. Department head creates encounter
 * 6. Department head creates valid vital (happy path)
 * 7. Attempt vital creation with invalid out-of-bounds value (should fail)
 * 8. Attempt vital creation as unauthorized department head (should fail)
 * 9. Attempt vital creation with not-found patient record and not-found encounter
 *    (should fail)
 */
export async function test_api_vitals_creation_department_head_scenario_e2e(
  connection: api.IConnection,
) {
  // Register & login as Department Head (main)
  const deptHeadEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadPassword = "DeptH3ad#1234";
  const deptHead: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: {
        email: deptHeadEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: deptHeadPassword,
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    });
  typia.assert(deptHead);
  // Login as department head to verify flow
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadEmail,
      password: deptHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // Register & login as Receptionist (to create patient/patientRecord)
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistPassword = "Rec3pt10n!st#5678";
  const receptionist: IHealthcarePlatformReceptionist.IAuthorized =
    await api.functional.auth.receptionist.join(connection, {
      body: {
        email: receptionistEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    });
  typia.assert(receptionist);
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // Create patient
  const patient: IHealthcarePlatformPatient =
    await api.functional.healthcarePlatform.receptionist.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: new Date("1998-05-12T00:00:00Z").toISOString(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patient);

  // Create patient record
  const patientRecord: IHealthcarePlatformPatientRecord =
    await api.functional.healthcarePlatform.receptionist.patientRecords.create(
      connection,
      {
        body: {
          organization_id: typia.random<string>(),
          department_id: null,
          patient_user_id: patient.id,
          external_patient_number: null,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          gender: null,
          status: "active",
          demographics_json: null,
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // Switch back to department head user
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadEmail,
      password: deptHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // Create encounter as department head
  const encounter: IHealthcarePlatformEhrEncounter =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: deptHead.id as string & tags.Format<"uuid">,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          encounter_end_at: null,
          status: "active",
          notes: RandomGenerator.paragraph(),
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounter);

  // --- Vital Creation: Success ---
  const validVitalBody = {
    ehr_encounter_id: encounter.id as string & tags.Format<"uuid">,
    vital_type: "heart_rate",
    vital_value: 72,
    unit: "bpm",
    measured_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformVital.ICreate;
  const vital: IHealthcarePlatformVital =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.vitals.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        body: validVitalBody,
      },
    );
  typia.assert(vital);
  TestValidator.equals(
    "vital entry's type matches input",
    vital.vital_type,
    validVitalBody.vital_type,
  );
  TestValidator.equals(
    "vital entry's value matches input",
    vital.vital_value,
    validVitalBody.vital_value,
  );
  TestValidator.equals(
    "vital entry's unit matches input",
    vital.unit,
    validVitalBody.unit,
  );

  // --- Vital Creation: Out-of-bounds value (invalid) ---
  await TestValidator.error(
    "vital value dramatically out of bounds triggers error",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.vitals.create(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id as string & tags.Format<"uuid">,
          body: {
            ehr_encounter_id: encounter.id as string & tags.Format<"uuid">,
            vital_type: "heart_rate",
            vital_value: 1200,
            unit: "bpm",
            measured_at: new Date().toISOString(),
          } satisfies IHealthcarePlatformVital.ICreate,
        },
      );
    },
  );

  // --- Unauthorized department head tries to create vital ---
  const otherHead: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "OtherH3ad!@#567",
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    });
  typia.assert(otherHead);
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: otherHead.email,
      password: "OtherH3ad!@#567",
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });
  await TestValidator.error(
    "unauthorized department head cannot create vital",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.vitals.create(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id as string & tags.Format<"uuid">,
          body: validVitalBody,
        },
      );
    },
  );

  // --- Attempt to create a vital on deleted patient record or deleted encounter
  // Simulate by re-login as original department head
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadEmail,
      password: deptHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });
  // Simulate deletion by wrong ids
  await TestValidator.error(
    "using wrong patient record id triggers not found",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.vitals.create(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          encounterId: encounter.id as string & tags.Format<"uuid">,
          body: validVitalBody,
        },
      );
    },
  );
  await TestValidator.error(
    "using wrong encounter id triggers not found",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.vitals.create(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: typia.random<string & tags.Format<"uuid">>(),
          body: validVitalBody,
        },
      );
    },
  );
}
