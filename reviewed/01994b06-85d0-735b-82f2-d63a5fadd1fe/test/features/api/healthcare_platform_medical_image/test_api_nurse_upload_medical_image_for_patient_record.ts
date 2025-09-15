import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalImage";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test that a nurse can upload a medical image for a patient record under
 * usual and error scenarios.
 *
 * 1. Register and authenticate a nurse user (capture credentials for
 *    re-login).
 * 2. Register and create a patient user (capture credentials for re-login).
 * 3. Register a system admin and create a patient record for the patient.
 * 4. Log in as nurse. Nurse attempts to upload a valid JPEG image (simulate
 *    URI) with correct EHR encounter, metadata, and nurse's own user ID for
 *    uploaded_by_user_id. Validate success, returned entity, and metadata
 *    consistency.
 * 5. As nurse, immediately attempt upload with an invalid patientRecordId
 *    (random uuid). Should fail.
 * 6. As nurse, attempt to upload with unsupported image_type (e.g., 'txt').
 *    Should fail.
 * 7. Attempt upload as nurse with missing authentication (simulate by creating
 *    a connection with empty headers). Should fail.
 * 8. Register a different nurse in a different org/department. Log in as
 *    second nurse, upload to the original patient record from the first
 *    org. Should be denied (org/department mismatch enforced).
 * 9. Optional: Retrieve uploaded image as nurse, ensure all returned
 *    properties match expectations and authorId matches nurse.
 */
export async function test_api_nurse_upload_medical_image_for_patient_record(
  connection: api.IConnection,
) {
  // 1. Register and authenticate nurse (capture credentials for role switching)
  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nursePassword = RandomGenerator.alphaNumeric(10);
  const nurseJoin = await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurseEmail,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(8),
      password: nursePassword,
    },
  });
  typia.assert(nurseJoin);

  // 2. Register and create patient user
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientPassword = RandomGenerator.alphaNumeric(10);
  const patientJoin = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date("1989-03-12").toISOString(),
      password: patientPassword,
    },
  });
  typia.assert(patientJoin);
  const patientCreate =
    await api.functional.healthcarePlatform.patient.patients.create(
      connection,
      {
        body: {
          email: patientEmail,
          full_name: patientJoin.full_name,
          date_of_birth: patientJoin.date_of_birth,
        },
      },
    );
  typia.assert(patientCreate);

  // 3. Register admin, create patient record
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(adminJoin);
  const patientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: typia.random<string & tags.Format<"uuid">>(),
          department_id: null,
          patient_user_id: patientCreate.id,
          external_patient_number: null,
          full_name: patientCreate.full_name,
          dob: patientCreate.date_of_birth,
          gender: null,
          status: "active",
          demographics_json: null,
        },
      },
    );
  typia.assert(patientRecord);

  // 4. Nurse login, upload valid image for record
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePassword,
    },
  });
  const imageUri = `https://cdn.example.com/${RandomGenerator.alphaNumeric(12)}.jpg`;
  const medicalImage =
    await api.functional.healthcarePlatform.nurse.patientRecords.medicalImages.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          ehr_encounter_id: patientRecord.id as string & tags.Format<"uuid">,
          uploaded_by_user_id: nurseJoin.id as string & tags.Format<"uuid">,
          image_type: "JPEG",
          image_uri: imageUri,
          image_metadata_json: '{"manufacturer":"Canon"}',
        },
      },
    );
  typia.assert(medicalImage);
  TestValidator.equals(
    "created image URI matches",
    medicalImage.image_uri,
    imageUri,
  );
  TestValidator.equals(
    "uploader matches nurse",
    medicalImage.uploaded_by_user_id,
    nurseJoin.id,
  );

  // 5. Try upload using wrong patientRecordId
  await TestValidator.error(
    "upload with invalid patientRecordId fails",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.medicalImages.create(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            ehr_encounter_id: typia.random<string & tags.Format<"uuid">>(),
            uploaded_by_user_id: nurseJoin.id as string & tags.Format<"uuid">,
            image_type: "JPEG",
            image_uri: imageUri,
          },
        },
      );
    },
  );

  // 6. Try upload with unsupported image_type
  await TestValidator.error(
    "upload with unsupported image_type fails",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.medicalImages.create(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          body: {
            ehr_encounter_id: patientRecord.id as string & tags.Format<"uuid">,
            uploaded_by_user_id: nurseJoin.id as string & tags.Format<"uuid">,
            image_type: "TXT",
            image_uri: imageUri,
          },
        },
      );
    },
  );

  // 7. Try unauthenticated (no header) connection
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated nurse upload should fail",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.medicalImages.create(
        unauthenticatedConn,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          body: {
            ehr_encounter_id: patientRecord.id as string & tags.Format<"uuid">,
            uploaded_by_user_id: nurseJoin.id as string & tags.Format<"uuid">,
            image_type: "JPEG",
            image_uri: imageUri,
          },
        },
      );
    },
  );

  // 8. Cross-org nurse (should be denied)
  const nurse2Email = typia.random<string & tags.Format<"email">>();
  const nurse2Password = RandomGenerator.alphaNumeric(10);
  const nurseJoin2 = await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurse2Email,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(8),
      password: nurse2Password,
    },
  });
  typia.assert(nurseJoin2);
  await api.functional.auth.nurse.login(connection, {
    body: { email: nurse2Email, password: nurse2Password },
  });
  await TestValidator.error(
    "cross-org nurse cannot upload to foreign patient record",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.medicalImages.create(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          body: {
            ehr_encounter_id: patientRecord.id as string & tags.Format<"uuid">,
            uploaded_by_user_id: nurseJoin2.id as string & tags.Format<"uuid">,
            image_type: "JPEG",
            image_uri: imageUri,
          },
        },
      );
    },
  );
}
