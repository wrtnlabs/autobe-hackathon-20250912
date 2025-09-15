import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalImage";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * Scenario validates whether a medical doctor can update the clinical context
 * (metadata) of a previously uploaded medical image for a patient record. The
 * test does the following:
 *
 * 1. Register and login as organization admin to create a patient and their
 *    patient record.
 * 2. Register and login as a medical doctor for test actions.
 * 3. Create a patient as organization admin.
 * 4. Create a patient record linked to the patient as organization admin.
 * 5. Switch to medical doctor context and upload a medical image for that patient
 *    record.
 * 6. Update the image's metadata and confirm the change reflects in response.
 * 7. Attempt the update with a different doctor (should fail for insufficient
 *    permissions).
 * 8. Attempt the update with a mismatched patient record (should fail - not
 *    found/forbidden). Both success and negative (boundary) paths are validated
 *    for correct authorization and business logic.
 */
export async function test_api_medical_doctor_update_medical_image_context(
  connection: api.IConnection,
) {
  // 1. Register an organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(10);
  const orgAdmin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgAdmin);
  // 2. Login as organization admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  // 3. Create patient
  const patientInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    date_of_birth: new Date("1980-01-01T00:00:00Z").toISOString(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.ICreate;
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      { body: patientInput },
    );
  typia.assert(patient);
  // 4. Create patient record
  const patientRecordInput = {
    organization_id: orgAdmin.id,
    patient_user_id: patient.id,
    full_name: patient.full_name,
    dob: patient.date_of_birth,
    status: "active",
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      { body: patientRecordInput },
    );
  typia.assert(patientRecord);
  const patientRecordId = typia.assert<string & tags.Format<"uuid">>(
    patientRecord.id as string,
  );
  // 5. Register a medical doctor
  const docEmail = typia.random<string & tags.Format<"email">>();
  const docPassword = RandomGenerator.alphaNumeric(12);
  const docNPI = RandomGenerator.alphaNumeric(10);
  const medicalDoctor = await api.functional.auth.medicalDoctor.join(
    connection,
    {
      body: {
        email: docEmail,
        full_name: RandomGenerator.name(),
        npi_number: docNPI,
        password: docPassword,
      } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
    },
  );
  typia.assert(medicalDoctor);
  // 6. Login as the medical doctor
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: docEmail,
      password: docPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  // 7. Upload a medical image (doctor uploads)
  const medicalImageInput = {
    ehr_encounter_id: patientRecordId,
    uploaded_by_user_id: medicalDoctor.id,
    image_type: "DICOM",
    image_uri: "https://storage.org/test-image.dcm",
    image_metadata_json: JSON.stringify({
      StudyID: "12345",
      Series: "CT",
      Note: "initial scan",
    }),
  } satisfies IHealthcarePlatformMedicalImage.ICreate;
  const medicalImage =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.medicalImages.create(
      connection,
      {
        patientRecordId: patientRecordId,
        body: medicalImageInput,
      },
    );
  typia.assert(medicalImage);
  // 8. Update the image's metadata
  const updateInput = {
    image_type: "JPEG",
    image_metadata_json: JSON.stringify({
      StudyID: "12345-updated",
      Series: "CT",
      Note: "rescan after contrast",
    }),
  } satisfies IHealthcarePlatformMedicalImage.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.medicalImages.update(
      connection,
      {
        patientRecordId: patientRecordId,
        medicalImageId: medicalImage.id,
        body: updateInput,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated image_type",
    updated.image_type,
    updateInput.image_type,
  );
  TestValidator.equals(
    "updated metadata json",
    updated.image_metadata_json,
    updateInput.image_metadata_json,
  );
  // 9. Negative: Try updating as a different medical doctor (should fail)
  const otherDocEmail = typia.random<string & tags.Format<"email">>();
  const otherDocPassword = RandomGenerator.alphaNumeric(12);
  const otherDocNPI = RandomGenerator.alphaNumeric(10);
  const otherDoc = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: otherDocEmail,
      full_name: RandomGenerator.name(),
      npi_number: otherDocNPI,
      password: otherDocPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  typia.assert(otherDoc);
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: otherDocEmail,
      password: otherDocPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  await TestValidator.error("update by other doctor fails", async () => {
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.medicalImages.update(
      connection,
      {
        patientRecordId: patientRecordId,
        medicalImageId: medicalImage.id,
        body: updateInput,
      },
    );
  });
  // 10. Negative: Use mismatched patient record id
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: docEmail,
      password: docPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  const fakePatientRecordId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update with mismatched patient record id fails",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.medicalImages.update(
        connection,
        {
          patientRecordId: fakePatientRecordId,
          medicalImageId: medicalImage.id,
          body: updateInput,
        },
      );
    },
  );
}
