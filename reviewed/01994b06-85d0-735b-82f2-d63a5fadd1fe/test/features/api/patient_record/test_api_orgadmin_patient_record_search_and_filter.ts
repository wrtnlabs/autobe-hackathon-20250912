import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformPatientRecord";

/**
 * Organization admin performs complex search and filtering on patient
 * records.
 *
 * This test validates that search supports the following:
 *
 * 1. Department/org ID filtering, patient status, demographics, search by name
 * 2. Only records from allowed organizations/departments are included (RBAC)
 * 3. Pagination metadata and correct page structure
 * 4. Soft-deleted patient records are excluded by default (cannot be checked
 *    directly in ISummary as no `deleted_at` in response)
 * 5. Searching with a valid-but-no-matches filter returns empty results with
 *    proper pagination
 * 6. Submitting a malformed org or department ID triggers a validation error
 * 7. Onboarding flow and role authentication for org admin prior to search
 *
 * Steps:
 *
 * 1. Register and authenticate as organization admin
 * 2. Execute a patient records search with a complex, multi-criteria filter
 *    (department/org/status/name/demographics)
 * 3. Validate response: all records belong to correct org/department, status
 *    matches filter, pagination is correct
 * 4. Run a search with guaranteed no matches (e.g., nonexistent patient name)
 * 5. Validate that result set is empty but pagination metadata is present and
 *    correct (pages, records, etc.)
 * 6. Run a search with include_deleted true (by default no soft-deleted in
 *    summary response)
 * 7. Submit search with invalid org ID and confirm a validation error is
 *    returned
 */
export async function test_api_orgadmin_patient_record_search_and_filter(
  connection: api.IConnection,
) {
  // 1. Register & authenticate as organization admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert(orgAdmin);

  // Re-login to establish a fresh session
  const loginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const loggedIn = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loggedIn);

  // 2. Perform patient record search with multiple filters
  const searchFilter = {
    organization_id: orgAdmin.id,
    status: "active",
    demographics_contains: "Korean",
    page: 1 satisfies number,
    page_size: 10 satisfies number,
  } satisfies IHealthcarePlatformPatientRecord.IRequest;
  const searchResult =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.index(
      connection,
      { body: searchFilter },
    );
  typia.assert(searchResult);
  // 3. Validate RBAC, status, pagination
  for (const record of searchResult.data) {
    TestValidator.equals(
      "record organization_id matches filter",
      record.organization_id,
      searchFilter.organization_id,
    );
    TestValidator.equals(
      "record status matches filter",
      record.status,
      searchFilter.status,
    );
    if (searchFilter.demographics_contains)
      TestValidator.predicate(
        "record full_name contains demographic keyword when filtering by demographics_contains",
        record.full_name.includes(searchFilter.demographics_contains!) ||
          (record.gender !== undefined &&
            record.gender !== null &&
            record.gender!.includes(searchFilter.demographics_contains!)),
      );
    // Soft-deleted records cannot be checked, deleted_at is not in ISummary
  }
  // Pagination checks
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    searchFilter.page,
  );
  TestValidator.predicate(
    "pagination limit matches or greater than results count",
    searchResult.pagination.limit >= searchResult.data.length,
  );
  TestValidator.predicate(
    "pagination pages is correct",
    searchResult.pagination.pages > 0 &&
      searchResult.pagination.pages ===
        Math.ceil(
          searchResult.pagination.records / searchResult.pagination.limit,
        ),
  );
  // 4. Search with guaranteed empty result (nonexistent name query)
  const emptySearchFilter = {
    organization_id: orgAdmin.id,
    full_name: RandomGenerator.name(2) + "_nonexistent",
    page: 1 satisfies number,
    page_size: 1 satisfies number,
  } satisfies IHealthcarePlatformPatientRecord.IRequest;
  const emptyResult =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.index(
      connection,
      { body: emptySearchFilter },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search result returns empty array",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result pagination current",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty result pagination records",
    emptyResult.pagination.records,
    0,
  );

  // 5. Search with include_deleted true, expect same as default (soft-deleted cannot be tested in summary response)
  const deletedFilter = {
    organization_id: orgAdmin.id,
    include_deleted: true,
    page: 1 satisfies number,
    page_size: 10 satisfies number,
  } satisfies IHealthcarePlatformPatientRecord.IRequest;
  const deletedResult =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.index(
      connection,
      { body: deletedFilter },
    );
  typia.assert(deletedResult);
  // No way to check soft-deleted

  // 6. Search with invalid organization_id (malformed UUID) to trigger validation error
  await TestValidator.error(
    "invalid organization_id returns validation error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.index(
        connection,
        {
          body: {
            organization_id: "not-a-uuid" satisfies string,
            page: 1,
            page_size: 1,
          } satisfies IHealthcarePlatformPatientRecord.IRequest,
        },
      );
    },
  );
}
