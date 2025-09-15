import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalImage";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * Test end-to-end flow of uploading a medical image as a doctor to the
 * correct patient record with encounter and proper role, including failure
 * and edge cases, and downstream verification.
 *
 * 1. Register a new organization admin and authenticate (for patient and
 *    record management).
 * 2. Register a new medical doctor, authenticate (for clinical actions).
 * 3. As admin, create a patient (unique email/identity/date_of_birth).
 * 4. As admin, create a patient record with required info, assign
 *    patient_user_id.
 * 5. As medical doctor, create an encounter for the patient record as the
 *    provider and ensure returned status is 'active'.
 * 6. As medical doctor, upload a new medical image under the patient record,
 *    referencing the active encounter and uploading user, with realistic
 *    image metadata/URI, and assert
 *
 *    - Image.ehr_encounter_id == encounter.id
 *    - Image.uploaded_by_user_id == doctor.id
 * 7. Validate the image appears correctly linked (e.g. by ids), has proper
 *    metadata, and check permission boundaries:
 *
 *    - Attempt upload as non-related doctor (should fail)
 *    - Attempt upload to invalid record/encounter (should fail)
 * 8. (If endpoint available) fetch image or list images for the patient record
 *    and validate returned image matches uploaded details.
 * 9. Confirm test passed for correct success and failure cases.
 */
export async function test_api_medical_image_upload_by_medical_doctor_complete_workflow(
  connection: api.IConnection,
) {
  // 1. Register and login as organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        password: "AdminPwd_1234",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);
  // Already logged in as admin

  // 2. Register and login as medical doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorNpi = RandomGenerator.alphaNumeric(10);
  const medicalDoctor = await api.functional.auth.medicalDoctor.join(
    connection,
    {
      body: {
        email: doctorEmail,
        full_name: RandomGenerator.name(3),
        npi_number: doctorNpi,
        password: "DocPwd_1234",
        specialty: RandomGenerator.name(1),
      } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
    },
  );
  typia.assert(medicalDoctor);
  // Already logged in as doctor, but will switch to admin for setup

  // 3. Switch back to admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPwd_1234",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4. Create patient as admin
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientBody = {
    email: patientEmail,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date("1980-01-01").toISOString(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.ICreate;
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      { body: patientBody },
    );
  typia.assert(patient);

  // 5. Create patient record as admin
  const patientRecordBody = {
    organization_id: orgAdmin.id,
    patient_user_id: patient.id,
    full_name: patient.full_name,
    dob: patient.date_of_birth,
    status: "active",
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      { body: patientRecordBody },
    );
  typia.assert(patientRecord);
  // Save record id for next steps

  // 6. Switch to doctor
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: "DocPwd_1234",
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  // 7. Create an EHR encounter for the patient record as this doctor
  const nowIso = new Date().toISOString();
  const encounterBody = {
    patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
    provider_user_id: medicalDoctor.id as string & tags.Format<"uuid">,
    encounter_type: "office_visit",
    encounter_start_at: nowIso,
    status: "active",
    notes: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IHealthcarePlatformEhrEncounter.ICreate;
  const encounter =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: encounterBody,
      },
    );
  typia.assert(encounter);
  TestValidator.equals(
    "encounter status is active",
    encounter.status,
    "active",
  );

  // 8. Upload a medical image for the patient's record and encounter as doctor
  const imageBody = {
    ehr_encounter_id: encounter.id,
    uploaded_by_user_id: medicalDoctor.id,
    image_type: RandomGenerator.pick(["DICOM", "JPEG", "PNG"] as const),
    image_uri: `https://test.images.hosted/${RandomGenerator.alphaNumeric(12)}.jpg`,
    image_metadata_json: JSON.stringify({
      width: 1024,
      height: 768,
      comment: RandomGenerator.paragraph({ sentences: 5 }),
    }),
  } satisfies IHealthcarePlatformMedicalImage.ICreate;
  const image =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.medicalImages.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: imageBody,
      },
    );
  typia.assert(image);
  TestValidator.equals(
    "image is linked to the correct encounter",
    image.ehr_encounter_id,
    encounter.id,
  );
  TestValidator.equals(
    "image uploaded_by_user_id matches doctor",
    image.uploaded_by_user_id,
    medicalDoctor.id,
  );

  // 9. Edge: Fail to upload with a non-related doctor (should not be allowed)
  // Register new doctor
  const rogueEmail = typia.random<string & tags.Format<"email">>();
  const rogueDoctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: rogueEmail,
      full_name: RandomGenerator.name(2),
      npi_number: RandomGenerator.alphaNumeric(10),
      password: "Rogue_1234",
      specialty: RandomGenerator.name(1),
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  typia.assert(rogueDoctor);
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: rogueEmail,
      password: "Rogue_1234",
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  await TestValidator.error(
    "upload must fail for unrelated doctor",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.medicalImages.create(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          body: {
            ...imageBody,
            uploaded_by_user_id: rogueDoctor.id, // Not related
          } satisfies IHealthcarePlatformMedicalImage.ICreate,
        },
      );
    },
  );

  // 10. Edge: Attempt to upload to a wrong record or encounter (should fail)
  await TestValidator.error(
    "upload must fail for invalid encounter",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.medicalImages.create(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          body: {
            ...imageBody,
            ehr_encounter_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IHealthcarePlatformMedicalImage.ICreate,
        },
      );
    },
  );

  // (Downstream: If API supported, fetch images/list and check uploaded -- omitted as no endpoint available)
}
