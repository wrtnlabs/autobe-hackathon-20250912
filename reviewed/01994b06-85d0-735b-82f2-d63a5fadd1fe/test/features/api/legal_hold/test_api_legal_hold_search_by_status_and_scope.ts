import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLegalHold";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLegalHold";

/**
 * Validate legal hold search and filtering by status and scope (subject_type)
 * for org admins.
 *
 * - Onboards a new org admin (A), creates two legal holds
 *   (patient_data/org_data),
 * - Validates unfiltered list returns both, then filters status/subject_type.
 * - Checks correct pagination, RBAC boundary, and error handling for bad
 *   parameters and unauth.
 */
export async function test_api_legal_hold_search_by_status_and_scope(
  connection: api.IConnection,
) {
  // 1. Create and login as org admin
  const emailA = typia.random<string & tags.Format<"email">>();
  const orgAdminA = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: emailA,
        full_name: RandomGenerator.name(),
        password: "12345adminA!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminA);

  // 2. Create two legal holds (patient-level/org-level) with different statuses
  const nowIso = new Date().toISOString();
  const patientHold =
    await api.functional.healthcarePlatform.organizationAdmin.legalHolds.create(
      connection,
      {
        body: {
          organization_id: orgAdminA.id,
          subject_type: "patient_data",
          subject_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph(),
          method: "manual",
          status: "active",
          effective_at: nowIso,
        } satisfies IHealthcarePlatformLegalHold.ICreate,
      },
    );
  typia.assert(patientHold);

  const orgHold =
    await api.functional.healthcarePlatform.organizationAdmin.legalHolds.create(
      connection,
      {
        body: {
          organization_id: orgAdminA.id,
          subject_type: "org_data",
          reason: RandomGenerator.paragraph(),
          method: "system",
          status: "released",
          effective_at: nowIso,
          release_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        } satisfies IHealthcarePlatformLegalHold.ICreate,
      },
    );
  typia.assert(orgHold);

  // 3. Index: No filter, should return both
  const allHoldsPage =
    await api.functional.healthcarePlatform.organizationAdmin.legalHolds.index(
      connection,
      {
        body: {
          organization_id: orgAdminA.id,
        } satisfies IHealthcarePlatformLegalHold.IRequest,
      },
    );
  typia.assert(allHoldsPage);
  TestValidator.predicate(
    "allHoldsPage includes both holds",
    allHoldsPage.data.some((lh) => lh.id === patientHold.id) &&
      allHoldsPage.data.some((lh) => lh.id === orgHold.id),
  );

  // 3.b. Filter by status
  const activePage =
    await api.functional.healthcarePlatform.organizationAdmin.legalHolds.index(
      connection,
      {
        body: {
          organization_id: orgAdminA.id,
          status: "active",
        } satisfies IHealthcarePlatformLegalHold.IRequest,
      },
    );
  typia.assert(activePage);
  TestValidator.equals(
    "activePage only contains active hold",
    activePage.data.length,
    1,
  );
  TestValidator.equals(
    "activePage hold is correct",
    activePage.data[0].id,
    patientHold.id,
  );

  // 3.c. Filter by subject_type
  const patientPage =
    await api.functional.healthcarePlatform.organizationAdmin.legalHolds.index(
      connection,
      {
        body: {
          organization_id: orgAdminA.id,
          subject_type: "patient_data",
        } satisfies IHealthcarePlatformLegalHold.IRequest,
      },
    );
  typia.assert(patientPage);
  TestValidator.predicate(
    "patientPage only contains patient_data",
    patientPage.data.every((lh) => lh.subject_type === "patient_data"),
  );
  TestValidator.predicate(
    "patientPage includes patientHold",
    patientPage.data.some((lh) => lh.id === patientHold.id),
  );

  const orgPage =
    await api.functional.healthcarePlatform.organizationAdmin.legalHolds.index(
      connection,
      {
        body: {
          organization_id: orgAdminA.id,
          subject_type: "org_data",
        } satisfies IHealthcarePlatformLegalHold.IRequest,
      },
    );
  typia.assert(orgPage);
  TestValidator.predicate(
    "orgPage only contains org_data",
    orgPage.data.every((lh) => lh.subject_type === "org_data"),
  );
  TestValidator.predicate(
    "orgPage includes orgHold",
    orgPage.data.some((lh) => lh.id === orgHold.id),
  );

  // 3.d. Pagination
  const paged =
    await api.functional.healthcarePlatform.organizationAdmin.legalHolds.index(
      connection,
      {
        body: {
          organization_id: orgAdminA.id,
          limit: 1,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IHealthcarePlatformLegalHold.IRequest,
      },
    );
  typia.assert(paged);
  TestValidator.equals(
    "pagination result: limit honored",
    paged.data.length,
    1,
  );
  TestValidator.equals(
    "pagination info, current page",
    paged.pagination.current,
    1,
  );

  // 4. RBAC - Create second org admin, check they see no holds for orgAdminA
  const emailB = typia.random<string & tags.Format<"email">>();
  const orgAdminB = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: emailB,
        full_name: RandomGenerator.name(),
        password: "12345adminB!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminB);
  // switch to B (join already logs in), then attempt search for A's org
  const bPage =
    await api.functional.healthcarePlatform.organizationAdmin.legalHolds.index(
      connection,
      {
        body: {
          organization_id: orgAdminA.id,
        } satisfies IHealthcarePlatformLegalHold.IRequest,
      },
    );
  typia.assert(bPage);
  TestValidator.equals(
    "orgAdminB cannot see orgAdminA legal holds",
    bPage.data.length,
    0,
  );

  // 5. Edge - filter for subject_id that doesn't exist
  const notFoundPage =
    await api.functional.healthcarePlatform.organizationAdmin.legalHolds.index(
      connection,
      {
        body: {
          organization_id: orgAdminA.id,
          subject_id: typia.random<string & tags.Format<"uuid">>(), // random UUID not used
        } satisfies IHealthcarePlatformLegalHold.IRequest,
      },
    );
  typia.assert(notFoundPage);
  TestValidator.equals(
    "no results found for non-existent subject_id",
    notFoundPage.data.length,
    0,
  );

  // 6. Error Cases
  // a. Invalid page/limit
  await TestValidator.error("should fail on negative page", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.legalHolds.index(
      connection,
      {
        body: {
          organization_id: orgAdminA.id,
          page: -1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IHealthcarePlatformLegalHold.IRequest,
      },
    );
  });
  await TestValidator.error("should fail on over-limit", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.legalHolds.index(
      connection,
      {
        body: {
          organization_id: orgAdminA.id,
          limit: 9999 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IHealthcarePlatformLegalHold.IRequest,
      },
    );
  });

  // b. Unauthenticated (simulate logout by passing connection with headers deleted)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should reject unauthenticated legal hold search",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.legalHolds.index(
        unauthConn,
        {
          body: {
            organization_id: orgAdminA.id,
          } satisfies IHealthcarePlatformLegalHold.IRequest,
        },
      );
    },
  );
}
