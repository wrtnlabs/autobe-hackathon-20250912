import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalImage";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * Validates a nurse updating annotation or clinical description for an existing
 * patient medical image.
 *
 * 1. Register and login as organization admin to bootstrap test data.
 * 2. Register a patient as admin.
 * 3. Register a nurse and login as nurse.
 * 4. Register a medical doctor (for image upload), login as doctor.
 * 5. Create a patient record (admin).
 * 6. As doctor, upload a medical image for the patient record.
 * 7. As nurse, update the medical image metadata via nurse API.
 * 8. Validate update was successful, metadata is updated.
 * 9. Negative test: As another nurse, attempt update on the image (should fail).
 */
export async function test_api_nurse_update_medical_image_annotation(
  connection: api.IConnection,
) {
  // 1. Register and login as organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: "securePwd123",
      },
    },
  );
  typia.assert(orgAdminJoin);

  // 2. Register a patient (admin context already set)
  const patientCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    date_of_birth: new Date("1990-01-22T00:00:00Z").toISOString(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.ICreate;
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: patientCreateBody,
      },
    );
  typia.assert(patient);

  // 3. Register and login as nurse
  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nurseJoin = await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurseEmail,
      full_name: RandomGenerator.name(),
      password: "NursePwd1!",
      license_number: RandomGenerator.alphaNumeric(8),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(nurseJoin);
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: "NursePwd1!",
    },
  });

  // 4. Register medical doctor (will upload the image), then login as doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorJoin = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: RandomGenerator.alphaNumeric(10),
      password: "DoctorPwd1!",
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(doctorJoin);
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: "DoctorPwd1!",
    },
  });

  // 5. As admin, create a patient record
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "securePwd123",
    },
  });
  const patientRecordCreateBody = {
    organization_id: orgAdminJoin.id,
    patient_user_id: patient.id,
    full_name: patient.full_name,
    dob: patient.date_of_birth,
    status: "active",
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      { body: patientRecordCreateBody },
    );
  typia.assert(patientRecord);

  // 6. As doctor, upload a medical image for the patient record
  await api.functional.auth.medicalDoctor.login(connection, {
    body: { email: doctorEmail, password: "DoctorPwd1!" },
  });
  const imageCreateBody = {
    ehr_encounter_id: patientRecord.id as string & tags.Format<"uuid">,
    uploaded_by_user_id: doctorJoin.id,
    image_type: RandomGenerator.pick(["DICOM", "JPEG", "PNG"] as const),
    image_uri: "https://cdn.testbucket.com/medical-scan/test-img-1.jpg",
    image_metadata_json: JSON.stringify({ desc: "Original annotations" }),
  } satisfies IHealthcarePlatformMedicalImage.ICreate;
  const image =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.medicalImages.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: imageCreateBody,
      },
    );
  typia.assert(image);

  // 7. As nurse, login again and update the medical image metadata
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: "NursePwd1!",
    },
  });
  const newMeta = JSON.stringify({ desc: "Updated annotation by nurse" });
  const updateBody = {
    image_metadata_json: newMeta,
  } satisfies IHealthcarePlatformMedicalImage.IUpdate;
  const updatedImage =
    await api.functional.healthcarePlatform.nurse.patientRecords.medicalImages.update(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        medicalImageId: image.id as string & tags.Format<"uuid">,
        body: updateBody,
      },
    );
  typia.assert(updatedImage);
  TestValidator.equals(
    "medical image annotation is updated",
    updatedImage.image_metadata_json,
    newMeta,
  );

  // 8. (Edge) Register a 2nd nurse and attempt unauthorized update
  const outsiderNurseEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.nurse.join(connection, {
    body: {
      email: outsiderNurseEmail,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(8),
      password: "Nurse222pwd!",
      phone: RandomGenerator.mobile(),
    },
  });
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: outsiderNurseEmail,
      password: "Nurse222pwd!",
    },
  });
  await TestValidator.error(
    "unauthorized nurse cannot update another patient's medical image",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.medicalImages.update(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          medicalImageId: image.id as string & tags.Format<"uuid">,
          body: {
            image_metadata_json: JSON.stringify({ desc: "Hacked annotation" }),
          },
        },
      );
    },
  );
}
