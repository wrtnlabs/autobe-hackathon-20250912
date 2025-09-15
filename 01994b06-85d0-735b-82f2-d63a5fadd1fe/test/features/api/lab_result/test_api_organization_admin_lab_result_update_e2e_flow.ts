import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * E2E scenario for updating lab results as an organization administrator.
 *
 * 1. Register as organization admin and login.
 * 2. Create a patient via patient join, then create a patient profile for the
 *    organization.
 * 3. As org admin, create a patient record referencing the patient id and all
 *    required fields.
 * 4. As org admin, create a clinical encounter referencing the patientRecordId
 *    (and admin/provider id as responsible party - using the admin
 *    themselves as provider for simplicity).
 * 5. As org admin, create a lab result for that encounter, using required
 *    fields (e.g., test name, lab_integration_id, etc).
 * 6. As org admin, update the lab result's mutable fields (test_name,
 *    test_result_value_json, result_flag, resulted_at, status) using the
 *    labResultId.
 * 7. Validate that the lab result has been updated as expected (returned
 *    object matches updated fields).
 * 8. Attempt to update a non-existent labResultId, and assert error is
 *    returned.
 * 9. Simulate another actor (e.g., a patient user), login as that user, and
 *    attempt to update the lab result as a user not authorized as org
 *    admin. Assert error is returned for lack of permission.
 */
export async function test_api_organization_admin_lab_result_update_e2e_flow(
  connection: api.IConnection,
) {
  // 1. Register and login as organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: adminPassword,
        provider: undefined,
        provider_key: undefined,
      },
    },
  );
  typia.assert(orgAdminJoin);

  // Already authenticated: adminJoin attaches JWT to connection
  // 2. Create patient (patient join) and then create their patient record
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientPassword = RandomGenerator.alphaNumeric(12);
  const patientJoin = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date(1990, 1, 1).toISOString(),
      phone: RandomGenerator.mobile(),
      password: patientPassword,
      provider: undefined,
      provider_key: undefined,
    },
  });
  typia.assert(patientJoin);

  // 3. As org admin, create patient record referencing patient id
  const patientProfile =
    await api.functional.healthcarePlatform.patient.patients.create(
      connection,
      {
        body: {
          email: patientJoin.email,
          full_name: patientJoin.full_name,
          date_of_birth: patientJoin.date_of_birth,
          phone: patientJoin.phone ?? undefined,
        },
      },
    );
  typia.assert(patientProfile);
  // Required for PatientRecord.ICreate: organization_id (admin does not have org ID in entity; using a random UUID for now)
  // In production, org id would be acquired from the admin context/ JWT/ session
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: organizationId,
          department_id: null,
          patient_user_id: patientProfile.id,
          external_patient_number: null,
          full_name: patientProfile.full_name,
          dob: patientProfile.date_of_birth,
          gender: null,
          status: "active",
          demographics_json: null,
        },
      },
    );
  typia.assert(patientRecord);

  // 4. Create clinical encounter (using org admin as provider user)
  const encounter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: orgAdminJoin.id as string & tags.Format<"uuid">,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          encounter_end_at: null,
          status: "active",
          notes: RandomGenerator.paragraph(),
        },
      },
    );
  typia.assert(encounter);

  // 5. Create lab result for encounter
  // Normally lab_integration_id should come from an existing entity; using random
  const labIntegrationId = typia.random<string & tags.Format<"uuid">>();
  const originalLabResult =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.labResults.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        body: {
          ehr_encounter_id: encounter.id as string & tags.Format<"uuid">,
          lab_integration_id: labIntegrationId,
          test_name: "CBC",
          test_result_value_json: JSON.stringify({ wbc: 12, rbc: 4.5 }),
          result_flag: "normal",
          resulted_at: new Date().toISOString(),
          status: "completed",
        },
      },
    );
  typia.assert(originalLabResult);

  // 6. Update lab result fields
  const updatedFields = {
    test_name: "CBC-Diff",
    test_result_value_json: JSON.stringify({ wbc: 11, rbc: 4.8, diff: true }),
    result_flag: "abnormal",
    resulted_at: new Date().toISOString(),
    status: "revised",
  };
  const updatedLabResult =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.labResults.update(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        labResultId: originalLabResult.id as string & tags.Format<"uuid">,
        body: updatedFields,
      },
    );
  typia.assert(updatedLabResult);

  TestValidator.equals(
    "lab result was updated as expected",
    updatedLabResult.test_name,
    updatedFields.test_name,
  );
  TestValidator.equals(
    "lab result flag updated as expected",
    updatedLabResult.result_flag,
    updatedFields.result_flag,
  );
  TestValidator.equals(
    "lab result status updated as expected",
    updatedLabResult.status,
    updatedFields.status,
  );
  TestValidator.equals(
    "lab result JSON updated as expected",
    updatedLabResult.test_result_value_json,
    updatedFields.test_result_value_json,
  );

  // 7. Error: update non-existent labResultId
  await TestValidator.error(
    "updating non-existent lab result must fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.labResults.update(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id as string & tags.Format<"uuid">,
          labResultId: typia.random<string & tags.Format<"uuid">>(), // random non-existent id
          body: updatedFields,
        },
      );
    },
  );

  // 8. Error: attempt update as patient (not authorized)
  //   a. Patient login
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientEmail,
      password: patientPassword,
    },
  });
  //   b. Try updating as patient
  await TestValidator.error(
    "patient cannot update a clinical lab result as admin",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.labResults.update(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id as string & tags.Format<"uuid">,
          labResultId: originalLabResult.id as string & tags.Format<"uuid">,
          body: updatedFields,
        },
      );
    },
  );
}
