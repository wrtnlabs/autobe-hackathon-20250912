import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * End-to-end test verifying department head can update a patient record
 * encounter and negative/permission boundaries:
 *
 * 1. Register org admin and department head; login both.
 * 2. Org admin creates a patient record owned by target organization/department.
 * 3. Department head creates an encounter for that patient.
 * 4. Department head updates the encounter fully (all updatable fields).
 * 5. Partial update: department head updates only one field.
 * 6. Attempt invalid update as department head (e.g. empty status) – should fail
 *    business validation.
 * 7. Switch to org admin role, attempt to update same encounter – should fail
 *    authorization.
 */
export async function test_api_encounter_update_by_department_head_e2e(
  connection: api.IConnection,
) {
  // Register org admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const organizationAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(organizationAdmin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // Register department head
  const deptHeadEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadPassword = RandomGenerator.alphaNumeric(12);
  const deptHead = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: deptHeadEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: deptHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
  });
  typia.assert(deptHead);

  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadEmail,
      password: deptHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // Organization admin creates a patient record in department
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const patientUserId = typia.random<string & tags.Format<"uuid">>();
  const departmentId = typia.random<string & tags.Format<"uuid">>();
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: deptHead.id, // assign org to dept head for scenario
          department_id: departmentId,
          patient_user_id: patientUserId,
          full_name: RandomGenerator.name(),
          dob: new Date("1989-05-20").toISOString(),
          gender: RandomGenerator.pick(["male", "female", "other"] as const),
          status: "active",
          demographics_json: JSON.stringify({ race: "Asian", language: "ko" }),
          external_patient_number: RandomGenerator.alphaNumeric(8),
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // Department head creates an encounter for patient
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadEmail,
      password: deptHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });
  const encounter =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: deptHead.id as string & tags.Format<"uuid">,
          encounter_type: RandomGenerator.pick([
            "office_visit",
            "inpatient_admission",
            "telemedicine",
            "emergency",
          ] as const),
          encounter_start_at: new Date().toISOString(),
          encounter_end_at: null,
          status: "active",
          notes: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounter);

  // Department head updates the encounter fully
  const updateFieldsFull = {
    status: "completed",
    notes: RandomGenerator.paragraph({ sentences: 2 }),
    encounter_type: RandomGenerator.pick([
      "office_visit",
      "inpatient_admission",
      "telemedicine",
      "emergency",
    ] as const),
    encounter_start_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    encounter_end_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformEhrEncounter.IUpdate;
  const updatedEncounter =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.update(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        body: updateFieldsFull,
      },
    );
  typia.assert(updatedEncounter);
  TestValidator.equals(
    "status should be updated",
    updatedEncounter.status,
    updateFieldsFull.status,
  );
  TestValidator.equals(
    "notes should be updated",
    updatedEncounter.notes,
    updateFieldsFull.notes,
  );
  TestValidator.equals(
    "encounter_type should be updated",
    updatedEncounter.encounter_type,
    updateFieldsFull.encounter_type,
  );
  TestValidator.equals(
    "encounter_start_at should be updated",
    updatedEncounter.encounter_start_at,
    updateFieldsFull.encounter_start_at,
  );
  TestValidator.equals(
    "encounter_end_at should be updated",
    updatedEncounter.encounter_end_at,
    updateFieldsFull.encounter_end_at,
  );

  // Department head partial update (notes only)
  const updateFieldsPartial = {
    notes: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IHealthcarePlatformEhrEncounter.IUpdate;
  const partiallyUpdatedEncounter =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.update(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        body: updateFieldsPartial,
      },
    );
  typia.assert(partiallyUpdatedEncounter);
  TestValidator.equals(
    "notes should be updated (partial)",
    partiallyUpdatedEncounter.notes,
    updateFieldsPartial.notes,
  );

  // Attempt update with invalid status value (empty string)
  await TestValidator.error("should fail on invalid status", async () => {
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.update(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        body: { status: "" } satisfies IHealthcarePlatformEhrEncounter.IUpdate,
      },
    );
  });

  // Org admin tries to update: should be forbidden
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "org admin should not update encounter as head",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.update(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id as string & tags.Format<"uuid">,
          body: {
            notes: "hijack attempt",
          } satisfies IHealthcarePlatformEhrEncounter.IUpdate,
        },
      );
    },
  );
}
