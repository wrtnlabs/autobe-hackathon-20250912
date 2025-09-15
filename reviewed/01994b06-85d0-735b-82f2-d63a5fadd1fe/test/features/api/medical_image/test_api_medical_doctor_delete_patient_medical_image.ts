import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalImage";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * E2E flow for medical doctor deleting a medical image from a patient record.
 *
 * 1. Register a system admin and login.
 * 2. Create a patient record as system admin.
 * 3. Register a medical doctor and login.
 * 4. Upload a medical image as that doctor.
 * 5. Delete the uploaded image (should succeed).
 * 6. Attempt deletion again (should result in error - not found).
 * 7. Register a second medical doctor and login as them.
 * 8. Attempt to delete an image not uploaded by this doctor (should error -
 *    unauthorized or not found).
 */
export async function test_api_medical_doctor_delete_patient_medical_image(
  connection: api.IConnection,
) {
  // 1. System admin register and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: adminEmail,
      password: "P@ssw0rd123",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);

  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: "P@ssw0rd123",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 2. Create patient record
  const patientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: typia.random<string>(),
          department_id: null,
          patient_user_id: typia.random<string>(),
          external_patient_number: RandomGenerator.alphaNumeric(8),
          full_name: RandomGenerator.name(),
          dob: new Date(1990, 0, 1).toISOString(),
          gender: null,
          status: "active",
          demographics_json: null,
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // 3. Register and login medical doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const npi = RandomGenerator.alphaNumeric(10);
  const doctorJoin = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: npi,
      password: "DoctorPW!234",
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  typia.assert(doctorJoin);

  const doctorLogin = await api.functional.auth.medicalDoctor.login(
    connection,
    {
      body: {
        email: doctorEmail,
        password: "DoctorPW!234",
      } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
    },
  );
  typia.assert(doctorLogin);

  // 4. Doctor uploads medical image
  const imageUpload =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.medicalImages.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          ehr_encounter_id: typia.random<string & tags.Format<"uuid">>(),
          uploaded_by_user_id: doctorJoin.id as string & tags.Format<"uuid">,
          image_type: RandomGenerator.pick(["DICOM", "JPEG", "PNG"] as const),
          image_uri: `https://images.example.com/${RandomGenerator.alphaNumeric(8)}.jpg`,
        } satisfies IHealthcarePlatformMedicalImage.ICreate,
      },
    );
  typia.assert(imageUpload);

  // 5. Doctor deletes image (should succeed)
  await api.functional.healthcarePlatform.medicalDoctor.patientRecords.medicalImages.erase(
    connection,
    {
      patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
      medicalImageId: imageUpload.id,
    },
  );

  // 6. Try to delete again (should error)
  await TestValidator.error(
    "deleting already-deleted medical image (should 404)",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.medicalImages.erase(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          medicalImageId: imageUpload.id,
        },
      );
    },
  );

  // 7. Register second doctor
  const doctorEmail2 = typia.random<string & tags.Format<"email">>();
  const npi2 = RandomGenerator.alphaNumeric(10);
  const doctorJoin2 = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail2,
      full_name: RandomGenerator.name(),
      npi_number: npi2,
      password: "DoctorPW2!234",
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  typia.assert(doctorJoin2);

  // 8. Login as second doctor
  const doctorLogin2 = await api.functional.auth.medicalDoctor.login(
    connection,
    {
      body: {
        email: doctorEmail2,
        password: "DoctorPW2!234",
      } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
    },
  );
  typia.assert(doctorLogin2);

  // 9. Attempt deletion by second doctor (should error: unauthorized or not found)
  await TestValidator.error(
    "second doctor cannot delete (already deleted or unauthorized)",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.medicalImages.erase(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          medicalImageId: imageUpload.id,
        },
      );
    },
  );
}
