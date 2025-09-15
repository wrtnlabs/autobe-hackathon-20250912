import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalImage";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Validate technician updating metadata of an uploaded medical image.
 *
 * This function verifies that a technician can update metadata/classification
 * of an already uploaded medical image. The scenario establishes multiple roles
 * (technician & organization admin), proper resource creation (patient, patient
 * record, image), and validates permission boundaries and business rules.
 *
 * 1. Register and authenticate as a technician.
 * 2. Register and authenticate as organization admin (to create patient/records).
 * 3. As admin, create a patient and related patient record.
 * 4. As technician, upload a new medical image to the patient record.
 * 5. As technician, update that medical image's metadata using PUT.
 * 6. Validate the update (field values changed as expected).
 * 7. Attempt error by updating with invalid patientRecordId or medicalImageId
 *    (should fail).
 */
export async function test_api_technician_update_medical_image_metadata(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as technician (keep session after join, because join returns IAuthorized w/ token)
  const technicianEmail = typia.random<string & tags.Format<"email">>();
  const techRegister = await api.functional.auth.technician.join(connection, {
    body: {
      email: technicianEmail,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(10),
      specialty: "Radiology",
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(techRegister);

  // 2. Register as organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: adminPassword,
      },
    },
  );
  typia.assert(orgAdmin);

  // 3. Authenticate as org admin using the same password for actions
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });

  // 4. Admin: Create patient
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: new Date("1985-06-15T00:00:00Z").toISOString(),
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(patient);

  // 5. Admin: Create patient record
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgAdmin.id,
          patient_user_id: patient.id,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          status: "active",
        },
      },
    );
  typia.assert(patientRecord);

  // 6. Switch to (still authenticated) technician session for subsequent technician actions (already authenticated)
  // 7. Technician: Upload a new medical image
  const medicalImage =
    await api.functional.healthcarePlatform.technician.patientRecords.medicalImages.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          ehr_encounter_id: patientRecord.id as string & tags.Format<"uuid">,
          uploaded_by_user_id: techRegister.id,
          image_type: "DICOM",
          image_uri: "https://images.example.com/abc.dcm",
          image_metadata_json: JSON.stringify({ modality: "CT", series: "S1" }),
        },
      },
    );
  typia.assert(medicalImage);

  // 8. As technician, update the medical image metadata
  const updateBody = {
    image_type: "JPEG",
    image_metadata_json: JSON.stringify({
      modality: "MR",
      annotation: "Retested",
    }),
  };
  const updateResult =
    await api.functional.healthcarePlatform.technician.patientRecords.medicalImages.update(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        medicalImageId: medicalImage.id,
        body: updateBody,
      },
    );
  typia.assert(updateResult);
  TestValidator.equals(
    "image_type should be updated",
    updateResult.image_type,
    updateBody.image_type,
  );
  TestValidator.equals(
    "metadata JSON should be updated",
    updateResult.image_metadata_json,
    updateBody.image_metadata_json,
  );

  // Negative Test: Try invalid patientRecordId
  await TestValidator.error(
    "update fails with invalid patientRecordId",
    async () => {
      await api.functional.healthcarePlatform.technician.patientRecords.medicalImages.update(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          medicalImageId: medicalImage.id,
          body: updateBody,
        },
      );
    },
  );

  // Negative Test: Try invalid medicalImageId
  await TestValidator.error(
    "update fails with invalid medicalImageId",
    async () => {
      await api.functional.healthcarePlatform.technician.patientRecords.medicalImages.update(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          medicalImageId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
}
