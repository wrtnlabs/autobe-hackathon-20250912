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
 * Validate that a patient can retrieve their own uploaded medical image record,
 * and fail if trying to access another patient's image or without auth.
 *
 * 1. Register and auth patient (save email/password)
 * 2. Create patient entity for user
 * 3. Register and login system admin
 * 4. System admin creates a patient record for this patient
 * 5. Register and login a technician
 * 6. Technician uploads a new medical image for the patient's record
 * 7. Patient logs in, then retrieves their own medical image (should succeed)
 * 8. Register another patient + record, and try to retrieve image for other
 *    patient's record (should fail)
 * 9. Try to access the endpoint without a token (should fail)
 */
export async function test_api_medical_image_patient_retrieve_with_auth_dependencies(
  connection: api.IConnection,
) {
  // 1. Register patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientPassword = RandomGenerator.alphaNumeric(10) + "1A!";
  const patientBirth = new Date(1990, 2, 8).toISOString();
  const patientFullName = RandomGenerator.name(2);
  const joinPatient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: patientFullName,
      date_of_birth: patientBirth,
      password: patientPassword,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(joinPatient);

  // 2. Create patient entity (business record)
  const patientEntity =
    await api.functional.healthcarePlatform.patient.patients.create(
      connection,
      {
        body: {
          email: patientEmail as string & tags.Format<"email">,
          full_name: patientFullName,
          date_of_birth: patientBirth as string & tags.Format<"date-time">,
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(patientEntity);

  // 3. Register and login system admin
  const sysadminEmail = typia.random<string & tags.Format<"email">>();
  const sysadminPassword = RandomGenerator.alphaNumeric(10) + "$aA";
  const sysadminFullName = RandomGenerator.name(2);
  const sysadmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysadminEmail,
      full_name: sysadminFullName,
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(sysadmin);

  // 4. Create a patient record (system admin context)
  const patientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: typia.random<string>(),
          department_id: null,
          patient_user_id: patientEntity.id,
          full_name: patientEntity.full_name,
          dob: patientEntity.date_of_birth,
          gender: null,
          external_patient_number: null,
          demographics_json: null,
          status: "active",
        },
      },
    );
  typia.assert(patientRecord);

  // 5. Register technician
  const technicianEmail = typia.random<string & tags.Format<"email">>();
  const technicianPassword = RandomGenerator.alphaNumeric(8) + "Ab#";
  const technicianLicense = RandomGenerator.alphaNumeric(7);
  const technician = await api.functional.auth.technician.join(connection, {
    body: {
      email: technicianEmail,
      full_name: RandomGenerator.name(2),
      license_number: technicianLicense,
      specialty: "Radiology",
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(technician);

  // 6. Technician uploads a medical image
  const imageType = RandomGenerator.pick(["DICOM", "JPEG", "PNG"] as const);
  const imageUri =
    "https://img.example.com/image-" +
    RandomGenerator.alphaNumeric(12) +
    ".dcm";
  const medicalImage =
    await api.functional.healthcarePlatform.technician.patientRecords.medicalImages.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          ehr_encounter_id: patientRecord.id as string & tags.Format<"uuid">,
          uploaded_by_user_id: technician.id as string & tags.Format<"uuid">,
          image_type: imageType,
          image_uri: imageUri,
          image_metadata_json: null,
        },
      },
    );
  typia.assert(medicalImage);

  // 7. Patient retrieves their own image
  await api.functional.auth.patient.login(connection, {
    body: { email: patientEmail, password: patientPassword },
  });
  const retrieved =
    await api.functional.healthcarePlatform.patient.patientRecords.medicalImages.at(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        medicalImageId: medicalImage.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "retrieved medical image matches upload",
    retrieved,
    medicalImage,
  );

  // 8. Register another patient and record, try to fetch an image from other record
  const otherPatientEmail = typia.random<string & tags.Format<"email">>();
  const otherPatientPassword = RandomGenerator.alphaNumeric(12) + "#E";
  const otherPatientFullName = RandomGenerator.name(2);
  const otherPatientBirth = new Date(1995, 7, 21).toISOString();
  const otherPatient = await api.functional.auth.patient.join(connection, {
    body: {
      email: otherPatientEmail,
      full_name: otherPatientFullName,
      date_of_birth: otherPatientBirth,
      password: otherPatientPassword,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(otherPatient);

  const otherPatientEntity =
    await api.functional.healthcarePlatform.patient.patients.create(
      connection,
      {
        body: {
          email: otherPatient.email,
          full_name: otherPatientFullName,
          date_of_birth: otherPatientBirth,
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(otherPatientEntity);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    },
  });
  const otherRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: typia.random<string>(),
          department_id: null,
          patient_user_id: otherPatientEntity.id,
          full_name: otherPatientEntity.full_name,
          dob: otherPatientEntity.date_of_birth,
          gender: null,
          external_patient_number: null,
          demographics_json: null,
          status: "active",
        },
      },
    );
  typia.assert(otherRecord);

  // Log back in as original patient
  await api.functional.auth.patient.login(connection, {
    body: { email: patientEmail, password: patientPassword },
  });
  await TestValidator.error(
    "patient cannot retrieve image from another record",
    async () => {
      await api.functional.healthcarePlatform.patient.patientRecords.medicalImages.at(
        connection,
        {
          patientRecordId: otherRecord.id as string & tags.Format<"uuid">,
          medicalImageId: medicalImage.id as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // 9. Try with missing token
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.healthcarePlatform.patient.patientRecords.medicalImages.at(
      unauthConn,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        medicalImageId: medicalImage.id as string & tags.Format<"uuid">,
      },
    );
  });
}
