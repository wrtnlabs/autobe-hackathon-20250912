import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * End-to-end update scenario for lab results as a department head.
 *
 * - Register and login as organizationAdmin (for patient record creation)
 * - Register and login as departmentHead (for encounter/lab result and update)
 * - Register and login as patient (for patient creation)
 * - Create patient
 * - Create patient record (organizationAdmin -> needs org id from org admin
 *   profile)
 * - Create encounter (departmentHead)
 * - Create initial lab result (departmentHead)
 * - Update lab result (departmentHead) with new values
 * - Validate update: fetch result and check updated fields
 * - Negative test: attempt update as patient (should error)
 * - Negative test: attempt to update non-existent labResultId (should error)
 */
export async function test_api_department_head_lab_result_update_e2e_flow(
  connection: api.IConnection,
) {
  // 1. Register and login as organizationAdmin
  const orgAdminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: "TestAdmin123!",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;

  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: orgAdminJoinInput,
    },
  );
  typia.assert(orgAdmin);

  // 2. Register and login as departmentHead
  const deptHeadJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: "TestDeptHead456!",
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;

  const deptHead = await api.functional.auth.departmentHead.join(connection, {
    body: deptHeadJoinInput,
  });
  typia.assert(deptHead);

  // 3. Register and login as patient
  const patientJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    date_of_birth: new Date("1985-05-05").toISOString(),
    password: "userPassword789!",
  } satisfies IHealthcarePlatformPatient.IJoin;

  const patient = await api.functional.auth.patient.join(connection, {
    body: patientJoinInput,
  });
  typia.assert(patient);

  // 4. Create patient
  const newPatient =
    await api.functional.healthcarePlatform.patient.patients.create(
      connection,
      {
        body: {
          email: patient.email,
          full_name: patient.full_name,
          date_of_birth: patient.date_of_birth,
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(newPatient);

  // 5. Create patient record (as organization admin)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminJoinInput.email,
      password: orgAdminJoinInput.password,
    },
  });
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgAdmin.id,
          patient_user_id: newPatient.id,
          full_name: newPatient.full_name,
          dob: newPatient.date_of_birth,
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // 6. Create encounter (as department head)
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadJoinInput.email,
      password: deptHeadJoinInput.password,
    },
  });
  const encounter =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: deptHead.id as string & tags.Format<"uuid">,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounter);

  // 7. Create initial lab result
  const labResult =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.labResults.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id,
        body: {
          ehr_encounter_id: encounter.id,
          lab_integration_id: typia.random<string & tags.Format<"uuid">>(),
          test_name: RandomGenerator.paragraph({ sentences: 2 }),
          test_result_value_json: JSON.stringify({
            value: RandomGenerator.alphaNumeric(8),
          }),
          result_flag: RandomGenerator.pick([
            "normal",
            "abnormal",
            "critical",
            "corrected",
          ] as const),
          resulted_at: new Date().toISOString(),
          status: "completed",
        } satisfies IHealthcarePlatformLabResult.ICreate,
      },
    );
  typia.assert(labResult);

  // 8. Update the lab result (departmentHead logged in already)
  const updatedTestName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedResultFlag = RandomGenerator.pick([
    "normal",
    "abnormal",
    "critical",
    "corrected",
  ] as const);
  const updatedStatus = RandomGenerator.pick([
    "pending",
    "completed",
    "revised",
    "cancelled",
  ] as const);

  const updateBody = {
    test_name: updatedTestName,
    result_flag: updatedResultFlag,
    status: updatedStatus,
  } satisfies IHealthcarePlatformLabResult.IUpdate;

  const updatedLabResult =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.labResults.update(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id,
        labResultId: labResult.id,
        body: updateBody,
      },
    );
  typia.assert(updatedLabResult);
  TestValidator.equals(
    "LabResult test_name updated",
    updatedLabResult.test_name,
    updatedTestName,
  );
  TestValidator.equals(
    "LabResult result_flag updated",
    updatedLabResult.result_flag,
    updatedResultFlag,
  );
  TestValidator.equals(
    "LabResult status updated",
    updatedLabResult.status,
    updatedStatus,
  );

  // Negative test: update as patient (should error)
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientJoinInput.email,
      password: patientJoinInput.password,
    },
  });
  await TestValidator.error(
    "Patient cannot update lab result (RBAC)",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.labResults.update(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id,
          labResultId: labResult.id,
          body: {
            test_name: "Injected by patient should fail",
          } satisfies IHealthcarePlatformLabResult.IUpdate,
        },
      );
    },
  );

  // Negative test: update non-existent labResultId
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadJoinInput.email,
      password: deptHeadJoinInput.password,
    },
  });
  await TestValidator.error("Update non-existent lab result ID", async () => {
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.labResults.update(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id,
        labResultId: typia.random<string & tags.Format<"uuid">>(),
        body: updateBody,
      },
    );
  });
}
