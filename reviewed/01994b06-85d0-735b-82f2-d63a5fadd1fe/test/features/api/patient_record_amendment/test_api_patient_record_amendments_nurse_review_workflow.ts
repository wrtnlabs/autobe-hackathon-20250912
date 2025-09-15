import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRecordAmendment";

/**
 * Validate the nurse review workflow for record amendments.
 *
 * This workflow covers:
 *
 * 1. Onboard and authenticate system admin (Admin joins and logs in).
 * 2. Admin creates a patient record for testing.
 * 3. Onboard and authenticate nurse.
 * 4. Nurse creates an amendment (assigning self as reviewer).
 * 5. Nurse searches for amendments filtering by reviewed_by_user_id and
 *    approval_status.
 * 6. Validates proper nurse access and business rule enforcement.
 * 7. Negative case: unauthorized nurse cannot access amendments of records where
 *    they don't have permission.
 */
export async function test_api_patient_record_amendments_nurse_review_workflow(
  connection: api.IConnection,
) {
  // 1. System admin onboarding
  const adminEmail = RandomGenerator.alphaNumeric(10) + "@enterprise-corp.com";
  const adminPassword = RandomGenerator.alphaNumeric(12);
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
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    },
  });

  // 2. Admin creates patient record
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const patientUserId = typia.random<string & tags.Format<"uuid">>();
  const patientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: organizationId,
          patient_user_id: patientUserId,
          full_name: RandomGenerator.name(2),
          dob: new Date(1990, 0, 1).toISOString(),
          status: "active",
        },
      },
    );
  typia.assert(patientRecord);

  // 3. Nurse onboarding and authentication
  const nurseEmail = RandomGenerator.alphaNumeric(10) + "@hospital.org";
  const nursePassword = RandomGenerator.alphaNumeric(12);
  const nurseJoin = await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurseEmail,
      full_name: RandomGenerator.name(2),
      license_number: RandomGenerator.alphaNumeric(10),
      specialty: "ICU",
      phone: RandomGenerator.mobile(),
      password: nursePassword,
    },
  });
  typia.assert(nurseJoin);
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: nursePassword,
    },
  });

  // 4. Nurse creates an amendment (assigning self as reviewer)
  const amendment =
    await api.functional.healthcarePlatform.nurse.patientRecords.recordAmendments.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          submitted_by_user_id: nurseJoin.id as string & tags.Format<"uuid">,
          reviewed_by_user_id: nurseJoin.id as string & tags.Format<"uuid">,
          amendment_type: "correction",
          old_value_json: JSON.stringify({ field: "old" }),
          new_value_json: JSON.stringify({ field: "new" }),
          rationale: "Regulatory update.",
          approval_status: "pending",
        },
      },
    );
  typia.assert(amendment);

  // 5. Nurse searches for amendments filtered by self/review status
  const amendmentPage =
    await api.functional.healthcarePlatform.nurse.patientRecords.recordAmendments.index(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          reviewed_by_user_id: nurseJoin.id as string & tags.Format<"uuid">,
          approval_status: "pending",
        },
      },
    );
  typia.assert(amendmentPage);
  TestValidator.predicate(
    "amendments are returned for correct reviewer and approval status",
    amendmentPage.data.length > 0 &&
      amendmentPage.data.some((a) => a.id === amendment.id),
  );

  // 6. Negative: unrelated nurse cannot access the amendment via filtering
  const otherNurseEmail = RandomGenerator.alphaNumeric(10) + "@hospital.org";
  const otherNursePassword = RandomGenerator.alphaNumeric(12);
  const otherNurse = await api.functional.auth.nurse.join(connection, {
    body: {
      email: otherNurseEmail,
      full_name: RandomGenerator.name(2),
      license_number: RandomGenerator.alphaNumeric(10),
      specialty: "ER",
      phone: RandomGenerator.mobile(),
      password: otherNursePassword,
    },
  });
  typia.assert(otherNurse);
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: otherNurseEmail,
      password: otherNursePassword,
    },
  });

  await TestValidator.error(
    "unauthorized nurse cannot retrieve amendment records of patient not assigned",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.recordAmendments.index(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          body: {
            reviewed_by_user_id: otherNurse.id as string & tags.Format<"uuid">,
            approval_status: "pending",
          },
        },
      );
    },
  );
}
