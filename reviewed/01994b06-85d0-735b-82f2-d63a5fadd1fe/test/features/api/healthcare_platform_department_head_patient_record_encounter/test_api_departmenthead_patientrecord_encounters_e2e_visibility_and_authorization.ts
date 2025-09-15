import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEhrEncounter";

/**
 * Department head can view all encounters for a patient record in their
 * department (created by doctor or nurse), but cannot access encounters for
 * patient records in other departments.
 *
 * This test verifies that:
 *
 * 1. A department head can retrieve all encounters associated with a patient
 *    record in their department (even if the encounters were recorded by
 *    users with other roles).
 * 2. Department heads from a different department are not authorized to
 *    retrieve those same encounters.
 *
 * Steps:
 *
 * 1. Register an organization admin (OrgAdmin).
 * 2. Register and login department head A for department deptA.
 * 3. Register and login department head B for department deptB (distinct from
 *    deptA).
 * 4. Register a patient.
 * 5. OrgAdmin creates a patient record assigned to patient and department
 *    deptA, capturing org id from OrgAdmin's profile.
 * 6. Register and login medical doctor for department deptA.
 * 7. Register and login nurse for department deptA.
 * 8. Medical doctor creates an encounter for the patient record.
 * 9. Nurse creates a separate encounter for the same patient record.
 * 10. Department head A requests all encounters for the patient record and sees
 *     both encounters.
 * 11. Department head B attempts to request encounters for the patient record
 *     and is denied (authorization failure).
 */
export async function test_api_departmenthead_patientrecord_encounters_e2e_visibility_and_authorization(
  connection: api.IConnection,
) {
  // 1. Register organization admin
  const orgAdminEmail: string = `${RandomGenerator.alphaNumeric(8)}@orgadmin.test`;
  const orgAdminPassword: string = RandomGenerator.alphaNumeric(10);
  const orgAdminJoinBody = {
    email: orgAdminEmail,
    full_name: RandomGenerator.name(),
    password: orgAdminPassword,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAdminJoinBody },
  );
  typia.assert(orgAdmin);
  const orgId = orgAdmin.id; // This is the organization admin's id, but per schema, patientRecord.organization_id comes from orgId

  // 2. Register and login department head A for a random department deptA
  const deptAId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const deptAEmail: string = `${RandomGenerator.alphaNumeric(8)}@deptA.test`;
  const deptAName: string = RandomGenerator.name();
  const deptAJoinBody = {
    email: deptAEmail,
    full_name: deptAName,
    password: RandomGenerator.alphaNumeric(10),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const deptAHead = await api.functional.auth.departmentHead.join(connection, {
    body: deptAJoinBody,
  });
  typia.assert(deptAHead);

  // 3. Register and login department head B for a different random department deptB
  let deptBId: string & tags.Format<"uuid"> = deptAId;
  while (deptBId === deptAId)
    deptBId = typia.random<string & tags.Format<"uuid">>();
  const deptBEmail: string = `${RandomGenerator.alphaNumeric(8)}@deptB.test`;
  const deptBJoinBody = {
    email: deptBEmail,
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(10),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const deptBHead = await api.functional.auth.departmentHead.join(connection, {
    body: deptBJoinBody,
  });
  typia.assert(deptBHead);

  // 4. Register patient
  const patientEmail: string = `${RandomGenerator.alphaNumeric(8)}@patient.test`;
  const patientPassword: string = RandomGenerator.alphaNumeric(10);
  const patientJoinBody = {
    email: patientEmail,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(2000, 0, 1).toISOString(),
    password: patientPassword,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patient = await api.functional.auth.patient.join(connection, {
    body: patientJoinBody,
  });
  typia.assert(patient);

  // 5. Org admin logs in (for record creation)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // OrgAdmin creates patient record for patient and deptA
  const patientRecordCreateBody = {
    organization_id: orgId,
    department_id: deptAId,
    patient_user_id: patient.id,
    full_name: patient.full_name,
    dob: patient.date_of_birth,
    status: "active",
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      { body: patientRecordCreateBody },
    );
  typia.assert(patientRecord);

  // 6. Register and login medical doctor for deptA
  const medDocEmail: string = `${RandomGenerator.alphaNumeric(8)}@doctor.test`;
  const medDocPassword: string = RandomGenerator.alphaNumeric(10);
  const medDocJoinBody = {
    email: medDocEmail,
    full_name: RandomGenerator.name(),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: medDocPassword,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const medDoc = await api.functional.auth.medicalDoctor.join(connection, {
    body: medDocJoinBody,
  });
  typia.assert(medDoc);

  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: medDocEmail,
      password: medDocPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  // 7. Register and login nurse for deptA
  const nurseEmail: string = `${RandomGenerator.alphaNumeric(8)}@nurse.test`;
  const nursePassword: string = RandomGenerator.alphaNumeric(10);
  const nurseJoinBody = {
    email: nurseEmail,
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(8),
    password: nursePassword,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformNurse.IJoin;
  const nurse = await api.functional.auth.nurse.join(connection, {
    body: nurseJoinBody,
  });
  typia.assert(nurse);

  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePassword,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  // 8. Medical doctor creates an encounter
  const doctorEncounterCreate = {
    patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
    provider_user_id: medDoc.id as string & tags.Format<"uuid">,
    encounter_type: "office_visit",
    encounter_start_at: new Date().toISOString(),
    status: "completed",
    notes: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IHealthcarePlatformEhrEncounter.ICreate;
  const doctorEncounter =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: doctorEncounterCreate,
      },
    );
  typia.assert(doctorEncounter);

  // 9. Nurse creates a separate encounter
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePassword,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });
  const nurseEncounterCreate = {
    patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
    provider_user_id: nurse.id as string & tags.Format<"uuid">,
    encounter_type: "emergency",
    encounter_start_at: new Date().toISOString(),
    status: "active",
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHealthcarePlatformEhrEncounter.ICreate;
  const nurseEncounter =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: nurseEncounterCreate,
      },
    );
  typia.assert(nurseEncounter);

  // 10. Department head A logs in and retrieves encounters (should see both)
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptAEmail,
      password: deptAJoinBody.password!,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });
  const encounterPageA =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.index(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {}, // No extra filters
      },
    );
  typia.assert(encounterPageA);
  TestValidator.predicate(
    "Department head A sees both doctor and nurse encounters",
    Array.isArray(encounterPageA.data) &&
      [doctorEncounter.id, nurseEncounter.id].every((eid) =>
        encounterPageA.data.some((enc) => enc.id === eid),
      ),
  );

  // 11. Department head B logs in and tries to retrieve encounters (should fail)
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptBEmail,
      password: deptBJoinBody.password!,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });
  await TestValidator.error(
    "Department head B cannot access encounters for patient record in department A",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.index(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          body: {},
        },
      );
    },
  );
}
