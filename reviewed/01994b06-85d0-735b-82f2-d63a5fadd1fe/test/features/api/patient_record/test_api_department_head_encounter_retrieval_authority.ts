import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * Validate that a department head can retrieve a patient encounter and that
 * access control is enforced for department scope.
 *
 * 1. Register and log in as an organization admin
 * 2. Register and log in as a department head (same org)
 * 3. Register and log in as a medical doctor
 * 4. Create a patient record
 * 5. Medical doctor creates an encounter record
 * 6. Department head retrieves the encounter by patient record and encounter ID
 *    (success)
 * 7. Attempt to retrieve a nonexistent encounter (expect error)
 * 8. Attempt to retrieve the encounter from an unrelated department head (expect
 *    error)
 */
export async function test_api_department_head_encounter_retrieval_authority(
  connection: api.IConnection,
) {
  // 1. Register and login as Organization Admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = "Password@1234";
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);
  const organizationId = orgAdmin.id;

  // 2. Register and login as Department Head (aligned to org)
  const deptHeadEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadPassword = "Password@1234";
  const deptHead = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: deptHeadEmail,
      full_name: RandomGenerator.name(),
      password: deptHeadPassword,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
  });
  typia.assert(deptHead);
  const deptHeadId = deptHead.id;

  // 3. Register and login as Medical Doctor (will be the provider)
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = "Password@1234";
  const doctorNpi = RandomGenerator.alphaNumeric(10);
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: doctorNpi,
      password: doctorPassword,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  typia.assert(doctor);

  // 4. Switch to org admin; create a patient user (simulate with new UUID)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const patientUserId = typia.random<string & tags.Format<"uuid">>();
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: organizationId as string,
          patient_user_id: patientUserId,
          full_name: RandomGenerator.name(),
          dob: new Date("1990-01-01T00:00:00Z").toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // 5. Doctor login and create an encounter
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  const encounterCreate = {
    patient_record_id: patientRecord.id,
    provider_user_id: doctor.id,
    encounter_type: "office_visit",
    encounter_start_at: new Date().toISOString(),
    status: "active",
    notes: RandomGenerator.content({ paragraphs: 2 }),
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

  // 6. Department Head login and retrieve encounter
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadEmail,
      password: deptHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });
  const retrieved =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.at(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "retrieved encounter should match",
    retrieved.id,
    encounter.id,
  );
  TestValidator.equals(
    "encounter patient_record_id should match",
    retrieved.patient_record_id,
    patientRecord.id,
  );
  TestValidator.equals(
    "encounter provider_user_id should match",
    retrieved.provider_user_id,
    doctor.id,
  );

  // 7. 404 for nonexistent encounterId
  const fakeEncounterId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("404 for non-existent encounterId", async () => {
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.at(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: fakeEncounterId,
      },
    );
  });

  // 8. 403 for department head with mismatched access (register another department head not part of org)
  // Simulate a department head for unrelated access
  const otherDeptEmail = typia.random<string & tags.Format<"email">>();
  const otherDeptPassword = "Password@1234";
  await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: otherDeptEmail,
      full_name: RandomGenerator.name(),
      password: otherDeptPassword,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
  });
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: otherDeptEmail,
      password: otherDeptPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });
  await TestValidator.error(
    "403 forbidden for department head out-of-scope",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.at(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id,
        },
      );
    },
  );
}
