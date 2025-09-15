import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformComplianceConsent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceConsent";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformComplianceConsent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformComplianceConsent";

/**
 * Validate system admin can search compliance consents cross-organization with
 * advanced filters and edge scenarios.
 *
 * 1. Register and authenticate as system admin with valid (business) email,
 *    metadata.
 * 2. Create randomized filter combinations (org_id, subject_id, policy_version_id,
 *    granted status, time windows).
 * 3. As system admin, perform a search with common filter for all orgs (no
 *    org_id), check response structure and fields.
 * 4. Search with a specific organization id (from a random consent), validate
 *    results only include that org.
 * 5. Search filtering by status (active granted/revoked/expired), check correct
 *    field population, and pagination.
 * 6. Search with non-existent org/subject ID, validate empty or error response,
 *    ensure no forbidden leakage.
 * 7. Search with mismatching policy_version_id for edge case: expect empty.
 * 8. For each non-empty page, check audit fields and summary details match DTO.
 */
export async function test_api_compliance_consent_search_by_sysadmin_with_cross_org_scope(
  connection: api.IConnection,
) {
  // Register and authenticate as system admin
  const email = `admin+${RandomGenerator.alphaNumeric(8)}@enterprise-test.com`;
  const joinBody = {
    email,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: email,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysadmin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(sysadmin);
  TestValidator.equals("email matches", sysadmin.email, email);

  // 1. Search with NO filters (all orgs): must get list (if records exist)
  const allResult =
    await api.functional.healthcarePlatform.systemAdmin.complianceConsents.index(
      connection,
      { body: {} satisfies IHealthcarePlatformComplianceConsent.IRequest },
    );
  typia.assert(allResult);
  TestValidator.predicate(
    "pagination present",
    allResult.pagination && typeof allResult.pagination.current === "number",
  );
  // Save some consent/org for next filters if present
  let someOrgId: string | undefined,
    someSubjectId: string | undefined,
    somePolicyVersionId: string | undefined;
  if (allResult.data.length > 0) {
    const first = allResult.data[0];
    someOrgId = first.organization_id;
    someSubjectId = first.subject_id ?? undefined;
    somePolicyVersionId = first.policy_version_id;
    // Check audit fields and summary
    for (const consent of allResult.data) {
      // Check required fields
      TestValidator.predicate(
        "has id",
        typeof consent.id === "string" && consent.id.length > 0,
      );
      TestValidator.predicate(
        "org id format",
        typeof consent.organization_id === "string",
      );
      TestValidator.predicate(
        "policy version id format",
        typeof consent.policy_version_id === "string",
      );
      TestValidator.predicate(
        "consent_type present",
        typeof consent.consent_type === "string",
      );
      TestValidator.predicate(
        "granted boolean",
        typeof consent.granted === "boolean",
      );
      TestValidator.predicate(
        "consent_at date",
        typeof consent.consent_at === "string",
      );
      TestValidator.predicate(
        "created_at present",
        typeof consent.created_at === "string",
      );
      TestValidator.predicate(
        "updated_at present",
        typeof consent.updated_at === "string",
      );
    }
  }

  // 2. Filter by specific organization, if any exists
  if (someOrgId) {
    const orgResult =
      await api.functional.healthcarePlatform.systemAdmin.complianceConsents.index(
        connection,
        {
          body: {
            organization_id: someOrgId,
          } satisfies IHealthcarePlatformComplianceConsent.IRequest,
        },
      );
    typia.assert(orgResult);
    for (const consent of orgResult.data) {
      TestValidator.equals("org filter", consent.organization_id, someOrgId);
    }
  }

  // 3. Filter by granted status (active consents)
  const activeResult =
    await api.functional.healthcarePlatform.systemAdmin.complianceConsents.index(
      connection,
      {
        body: {
          granted: true,
          page: 1,
          limit: 5,
        } satisfies IHealthcarePlatformComplianceConsent.IRequest,
      },
    );
  typia.assert(activeResult);
  for (const consent of activeResult.data) {
    TestValidator.equals("active consent granted", consent.granted, true);
  }

  // 4. Filter for revoked/expired consents (by false, revoked_at present?)
  const revokedResult =
    await api.functional.healthcarePlatform.systemAdmin.complianceConsents.index(
      connection,
      {
        body: {
          granted: false,
          page: 1,
          limit: 5,
        } satisfies IHealthcarePlatformComplianceConsent.IRequest,
      },
    );
  typia.assert(revokedResult);
  for (const consent of revokedResult.data) {
    TestValidator.equals(
      "revoked consent granted false",
      consent.granted,
      false,
    );
  }

  // 5. Filter for specific subject, if any subject_id exists
  if (someSubjectId) {
    const subjectResult =
      await api.functional.healthcarePlatform.systemAdmin.complianceConsents.index(
        connection,
        {
          body: {
            subject_id: someSubjectId,
          } satisfies IHealthcarePlatformComplianceConsent.IRequest,
        },
      );
    typia.assert(subjectResult);
    for (const consent of subjectResult.data) {
      TestValidator.equals("subject filter", consent.subject_id, someSubjectId);
    }
  }

  // 6. Edge case: Non-existent org, expect empty
  const fakeUuid = typia.random<string & tags.Format<"uuid">>();
  const fakeOrgResult =
    await api.functional.healthcarePlatform.systemAdmin.complianceConsents.index(
      connection,
      {
        body: {
          organization_id: fakeUuid,
        } satisfies IHealthcarePlatformComplianceConsent.IRequest,
      },
    );
  typia.assert(fakeOrgResult);
  TestValidator.equals(
    "fake org filter results empty",
    fakeOrgResult.data.length,
    0,
  );

  // 7. Edge case: Non-existent subject, expect empty
  const fakeSubjectResult =
    await api.functional.healthcarePlatform.systemAdmin.complianceConsents.index(
      connection,
      {
        body: {
          subject_id: fakeUuid,
        } satisfies IHealthcarePlatformComplianceConsent.IRequest,
      },
    );
  typia.assert(fakeSubjectResult);
  TestValidator.equals(
    "fake subject filter results empty",
    fakeSubjectResult.data.length,
    0,
  );

  // 8. Edge case: Non-matching policy_version_id
  if (somePolicyVersionId) {
    // Try combining real org and fake policy version to ensure empty
    const conflictingResult =
      await api.functional.healthcarePlatform.systemAdmin.complianceConsents.index(
        connection,
        {
          body: {
            organization_id: someOrgId,
            policy_version_id: fakeUuid,
          } satisfies IHealthcarePlatformComplianceConsent.IRequest,
        },
      );
    typia.assert(conflictingResult);
    TestValidator.equals(
      "conflicting org/policy produces empty",
      conflictingResult.data.length,
      0,
    );
  }

  // 9. Pagination checks: limit=1, page=2, validate structure
  const paginatedResult =
    await api.functional.healthcarePlatform.systemAdmin.complianceConsents.index(
      connection,
      {
        body: {
          page: 2,
          limit: 1,
        } satisfies IHealthcarePlatformComplianceConsent.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit match",
    paginatedResult.pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination current page is 2",
    paginatedResult.pagination.current,
    2,
  );
}
