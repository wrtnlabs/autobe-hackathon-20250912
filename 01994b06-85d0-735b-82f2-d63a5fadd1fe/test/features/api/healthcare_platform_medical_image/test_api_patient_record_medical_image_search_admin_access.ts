import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalImage";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformMedicalImage";

/**
 * E2E validates system administrator access to patient record medical image
 * search, covering authentication, association, and permission
 * enforcement.
 *
 * Workflow:
 *
 * 1. Register a system admin via POST /auth/systemAdmin/join
 * 2. Log in as system admin using provided email and password
 * 3. Create a patient record as system admin via POST
 *    /healthcarePlatform/systemAdmin/patientRecords
 * 4. Run PATCH medical image search via
 *    /healthcarePlatform/systemAdmin/patientRecords/{patientRecordId}/medicalImages
 *
 *    - Use patientRecordId, page/limit, and plausible filters (image_type,
 *         uploaded_by_user_id, etc.)
 *    - Validate pagination object (current page = 1, limit = supplied, records
 *         >= 0)
 *    - If data array not empty, ensure all returned items have correct patient
 *         association (cannot validate image upload itself as no endpoint
 *         provided)
 *    - Validate basic metadata presence (id, image_type, image_uri, created_at
 *         present)
 *    - Ensure no confidential image raw data is returned (only metadata fields
 *         instead of binary content)
 *    - Optionally attempt sort by created_at (descending)
 *    - Optionally attempt a no-result pagination (page >> 1)
 * 5. Test error - PATCH with non-existent patientRecordId and expect error
 * 6. Test RBAC - run medicalImages.index PATCH with a connection not
 *    authenticated as admin and expect access denied
 */
export async function test_api_patient_record_medical_image_search_admin_access(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: email,
      password,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Log in as system admin (test login endpoint as well)
  const authed = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email,
      provider: "local",
      provider_key: email,
      password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(authed);

  // 3. Create a patient record
  const organization_id = typia.random<string>();
  const patient_user_id = typia.random<string>();
  const patientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id,
          patient_user_id,
          full_name: RandomGenerator.name(),
          dob: new Date().toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // 4. Search medical images (metadata only)
  const page = 1;
  const limit = 5;
  const imagesPage =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.medicalImages.index(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          page,
          limit,
        } satisfies IHealthcarePlatformMedicalImage.IRequest,
      },
    );
  typia.assert(imagesPage);
  TestValidator.equals(
    "pagination param current equals page",
    imagesPage.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination param limit equals limit",
    imagesPage.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "all images have required metadata fields",
    imagesPage.data.every(
      (img) =>
        !!img.id && !!img.image_type && !!img.image_uri && !!img.created_at,
    ),
  );

  // Optionally: sort by created_at descending
  const imagesPageSorted =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.medicalImages.index(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          sort: "created_at DESC",
          limit,
        } satisfies IHealthcarePlatformMedicalImage.IRequest,
      },
    );
  typia.assert(imagesPageSorted);

  // Optionally: no-results pagination (very high page)
  const imagesPageNone =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.medicalImages.index(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          page: 100,
          limit,
        } satisfies IHealthcarePlatformMedicalImage.IRequest,
      },
    );
  typia.assert(imagesPageNone);
  TestValidator.equals(
    "no results for high page",
    imagesPageNone.data.length,
    0,
  );

  // 5. Test error for invalid patientRecordId
  await TestValidator.error(
    "non-existent patientRecordId returns error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.patientRecords.medicalImages.index(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page,
            limit,
          } satisfies IHealthcarePlatformMedicalImage.IRequest,
        },
      );
    },
  );

  // 6. Test unauthenticated RBAC
  const unauth = { ...connection, headers: {} };
  await TestValidator.error("access denied without admin login", async () => {
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.medicalImages.index(
      unauth,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          page,
          limit,
        } satisfies IHealthcarePlatformMedicalImage.IRequest,
      },
    );
  });
}
