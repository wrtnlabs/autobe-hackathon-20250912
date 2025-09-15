import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalImage";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Validate technician hard-deletes a medical image from a patient record,
 * enforcing business rules (ownership, authorization), success, and error
 * scenarios.
 *
 * 1. Register and login as system admin (creates patient record)
 * 2. Register and login technician (uploads image)
 * 3. Technician uploads an image to the patient record
 * 4. Technician deletes the image (success - hard delete)
 * 5. Attempt to delete same image again (should fail 404)
 * 6. Another technician tries to delete (should fail 403 - forbidden)
 * 7. Attempt delete with invalid IDs (should fail 404)
 */
export async function test_api_technician_delete_patient_medical_image(
  connection: api.IConnection,
) {
  // Step 1: Register and login as system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  {
    const sysAdminJoin = await api.functional.auth.systemAdmin.join(
      connection,
      {
        body: {
          email: sysAdminEmail,
          full_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          provider: "local",
          provider_key: sysAdminEmail,
          password: sysAdminPassword,
        } satisfies IHealthcarePlatformSystemAdmin.IJoin,
      },
    );
    typia.assert(sysAdminJoin);
  }
  {
    const sysAdminLogin = await api.functional.auth.systemAdmin.login(
      connection,
      {
        body: {
          email: sysAdminEmail,
          provider: "local",
          provider_key: sysAdminEmail,
          password: sysAdminPassword,
        } satisfies IHealthcarePlatformSystemAdmin.ILogin,
      },
    );
    typia.assert(sysAdminLogin);
  }

  // Step 2: Create a patient record as system admin
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const patientUserId = typia.random<string & tags.Format<"uuid">>();
  const patientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgId,
          patient_user_id: patientUserId,
          full_name: RandomGenerator.name(),
          dob: new Date().toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // Step 3: Register and login technician (image uploader)
  const technicianEmail = typia.random<string & tags.Format<"email">>();
  const technicianPassword = RandomGenerator.alphaNumeric(12);
  const technicianLicense = RandomGenerator.alphaNumeric(10);
  let technicianId = "";
  {
    const technicianJoin = await api.functional.auth.technician.join(
      connection,
      {
        body: {
          email: technicianEmail,
          full_name: RandomGenerator.name(),
          license_number: technicianLicense,
          specialty: "Radiology",
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformTechnician.IJoin,
      },
    );
    typia.assert(technicianJoin);
    technicianId = technicianJoin.id;
  }
  {
    const technicianLogin = await api.functional.auth.technician.login(
      connection,
      {
        body: {
          email: technicianEmail,
          password: technicianPassword,
        } satisfies IHealthcarePlatformTechnician.ILogin,
      },
    );
    typia.assert(technicianLogin);
  }

  // Step 4: Technician uploads a medical image to the patient record
  const ehrEncounterId = typia.random<string & tags.Format<"uuid">>();
  const medicalImage =
    await api.functional.healthcarePlatform.technician.patientRecords.medicalImages.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          ehr_encounter_id: ehrEncounterId,
          uploaded_by_user_id: technicianId,
          image_type: "DICOM",
          image_uri: "https://example.com/image.dcm",
        } satisfies IHealthcarePlatformMedicalImage.ICreate,
      },
    );
  typia.assert(medicalImage);

  // Step 5: Technician deletes the medical image (happy path)
  await api.functional.healthcarePlatform.technician.patientRecords.medicalImages.erase(
    connection,
    {
      patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
      medicalImageId: medicalImage.id,
    },
  );

  // Step 6: Deleting already deleted/non-existent image returns error (404)
  await TestValidator.error(
    "should fail deleting non-existent image",
    async () => {
      await api.functional.healthcarePlatform.technician.patientRecords.medicalImages.erase(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          medicalImageId: medicalImage.id,
        },
      );
    },
  );

  // Step 7: Another technician tries to delete (should fail 403)
  const otherTechEmail = typia.random<string & tags.Format<"email">>();
  const otherTechPassword = RandomGenerator.alphaNumeric(12);
  const otherTechLicense = RandomGenerator.alphaNumeric(10);
  {
    const otherTechJoin = await api.functional.auth.technician.join(
      connection,
      {
        body: {
          email: otherTechEmail,
          full_name: RandomGenerator.name(),
          license_number: otherTechLicense,
          specialty: "Radiology",
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformTechnician.IJoin,
      },
    );
    typia.assert(otherTechJoin);
  }
  {
    await api.functional.auth.technician.login(connection, {
      body: {
        email: otherTechEmail,
        password: otherTechPassword,
      } satisfies IHealthcarePlatformTechnician.ILogin,
    });
  }
  await TestValidator.error(
    "forbidden: only uploader or authorized technician can delete",
    async () => {
      await api.functional.healthcarePlatform.technician.patientRecords.medicalImages.erase(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          medicalImageId: medicalImage.id,
        },
      );
    },
  );

  // Step 8: Deleting with invalid/non-existent IDs (404)
  await TestValidator.error(
    "should fail on non-existent patientRecordId",
    async () => {
      await api.functional.healthcarePlatform.technician.patientRecords.medicalImages.erase(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          medicalImageId: medicalImage.id,
        },
      );
    },
  );
  await TestValidator.error(
    "should fail on non-existent medicalImageId",
    async () => {
      await api.functional.healthcarePlatform.technician.patientRecords.medicalImages.erase(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          medicalImageId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
