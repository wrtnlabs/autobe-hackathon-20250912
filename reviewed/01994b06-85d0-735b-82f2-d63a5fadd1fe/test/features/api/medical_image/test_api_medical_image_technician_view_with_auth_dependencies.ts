import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalImage";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Validate technician's ability to view a specific medical image with full
 * dependency/auth steps and access control enforcement.
 *
 * 1. Register and login as technician
 * 2. Register patient
 * 3. Create a patient user entity
 * 4. Register system admin and login (for record creation)
 * 5. Create patient record under system admin
 * 6. Upload medical image as technician for mock EHR encounter to the patient
 *    record
 * 7. Retrieve uploaded medical image as technician and validate metadata
 * 8. Attempt retrieval with unauthenticated technician (missing token) and expect
 *    failure
 * 9. Attempt retrieval of a medical image using incorrect patientRecordId to
 *    verify access enforcement.
 */
export async function test_api_medical_image_technician_view_with_auth_dependencies(
  connection: api.IConnection,
) {
  // 1. Register technician
  const technicianEmail =
    RandomGenerator.name(2).replace(" ", "_") + "@techcorp.com";
  const technicianPassword = RandomGenerator.alphaNumeric(12);
  const technicianJoin = await api.functional.auth.technician.join(connection, {
    body: {
      email: technicianEmail,
      full_name: RandomGenerator.name(2),
      license_number: RandomGenerator.alphaNumeric(8),
      specialty: RandomGenerator.pick([
        "Radiology",
        "Cardiology",
        "Oncology",
        null,
      ]),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(technicianJoin);

  // 2. Technician login
  const technicianLogin = await api.functional.auth.technician.login(
    connection,
    {
      body: {
        email: technicianEmail,
        password: technicianPassword,
      },
    },
  );
  typia.assert(technicianLogin);

  // 3. Register patient (auth)
  const patientEmail = RandomGenerator.name(2).replace(" ", "_") + "@user.com";
  const patientPassword = RandomGenerator.alphaNumeric(12);
  const patientJoin = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(2),
      date_of_birth: new Date("1990-01-01T00:00:00Z").toISOString(),
      phone: RandomGenerator.mobile(),
      password: patientPassword,
    },
  });
  typia.assert(patientJoin);

  // 4. Create patient user entity
  const patientProfile =
    await api.functional.healthcarePlatform.patient.patients.create(
      connection,
      {
        body: {
          email: patientEmail,
          full_name: patientJoin.full_name,
          date_of_birth: patientJoin.date_of_birth,
          phone: patientJoin.phone ?? undefined,
        },
      },
    );
  typia.assert(patientProfile);

  // 5. Register system admin and login
  const adminEmail =
    RandomGenerator.name(2).replace(" ", "_") + "@adminorg.com";
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(adminJoin);
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(adminLogin);

  // 6. Create patient record under admin organization
  const patientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: adminJoin.id, // If org id and admin id differ, adjust accordingly
          department_id: null,
          patient_user_id: patientProfile.id,
          external_patient_number: RandomGenerator.alphaNumeric(10),
          full_name: patientProfile.full_name,
          dob: patientProfile.date_of_birth,
          gender: RandomGenerator.pick(["male", "female", "nonbinary", null]),
          status: "active",
          demographics_json: null,
        },
      },
    );
  typia.assert(patientRecord);

  // 7. Upload medical image as the technician for a mock EHR encounter
  const ehrEncounterId = typia.random<string & tags.Format<"uuid">>();
  const imageCreateBody = {
    ehr_encounter_id: ehrEncounterId,
    uploaded_by_user_id: technicianJoin.id,
    image_type: RandomGenerator.pick(["DICOM", "JPEG", "PNG"]),
    image_uri:
      "https://cdn.testhospital.com/medimage/" +
      RandomGenerator.alphaNumeric(15) +
      ".dcm",
    image_metadata_json: JSON.stringify({
      study: RandomGenerator.paragraph({ sentences: 2 }),
      modality: RandomGenerator.pick(["CT", "MR", "XR"]),
    }),
  } satisfies IHealthcarePlatformMedicalImage.ICreate;
  const uploadedImage =
    await api.functional.healthcarePlatform.technician.patientRecords.medicalImages.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: imageCreateBody,
      },
    );
  typia.assert(uploadedImage);

  // 8. Retrieve the image as the technician and verify metadata matches
  const retrievedImage =
    await api.functional.healthcarePlatform.technician.patientRecords.medicalImages.at(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        medicalImageId: uploadedImage.id,
      },
    );
  typia.assert(retrievedImage);
  TestValidator.equals(
    "retrieved image id matches",
    retrievedImage.id,
    uploadedImage.id,
  );
  TestValidator.equals(
    "EHR encounter id matches",
    retrievedImage.ehr_encounter_id,
    ehrEncounterId,
  );
  TestValidator.equals(
    "uploaded by uid matches",
    retrievedImage.uploaded_by_user_id,
    technicianJoin.id,
  );

  // 9. Attempt image retrieval with missing/invalid technician authentication (simulate unauthenticated request)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated technician cannot view image",
    async () => {
      await api.functional.healthcarePlatform.technician.patientRecords.medicalImages.at(
        unauthConn,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          medicalImageId: uploadedImage.id,
        },
      );
    },
  );

  // 10. Attempt to view the image with wrong patientRecordId
  const wrongPatientRecordId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "cannot view image using wrong patientRecordId",
    async () => {
      await api.functional.healthcarePlatform.technician.patientRecords.medicalImages.at(
        connection,
        {
          patientRecordId: wrongPatientRecordId,
          medicalImageId: uploadedImage.id,
        },
      );
    },
  );
}
