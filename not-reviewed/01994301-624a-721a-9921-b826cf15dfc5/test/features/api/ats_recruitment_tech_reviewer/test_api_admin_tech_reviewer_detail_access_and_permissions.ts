import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate detail retrieval of tech reviewer accounts by system admin,
 * including permission enforcement and error responses.
 *
 * 1. Register as system admin & login.
 * 2. Create a tech reviewer.
 * 3. As admin, fetch reviewer detail by id & validate all fields except sensitive
 *    ones.
 * 4. Try fetching with non-existent id (expect 404), with reviewer account (expect
 *    forbidden), and unauthenticated (expect forbidden).
 * 5. Confirm the handling of deleted (soft-deleted) reviewer accounts (cannot test
 *    soft-delete directly but check that deleted_at=null on new accounts).
 */
export async function test_api_admin_tech_reviewer_detail_access_and_permissions(
  connection: api.IConnection,
) {
  // 1. Register as system admin & login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();

  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(adminJoin);
  // login again to refresh context (simulate realistic admin session)
  const adminAuth = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  typia.assert(adminAuth);

  // 2. Create a tech reviewer
  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewerPassword = RandomGenerator.alphaNumeric(10);
  const reviewerName = RandomGenerator.name();
  const specialization = RandomGenerator.paragraph({ sentences: 1 });

  const reviewerAuth = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
      name: reviewerName,
      specialization,
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  typia.assert(reviewerAuth);

  // 3. As admin, fetch reviewer by id
  // (admin connection is currently set from last login)
  const reviewerDetail =
    await api.functional.atsRecruitment.systemAdmin.techReviewers.at(
      connection,
      {
        techReviewerId: reviewerAuth.id,
      },
    );
  typia.assert(reviewerDetail);
  TestValidator.equals(
    "reviewer id matches",
    reviewerDetail.id,
    reviewerAuth.id,
  );
  TestValidator.equals("email matches", reviewerDetail.email, reviewerEmail);
  TestValidator.equals("name matches", reviewerDetail.name, reviewerName);
  TestValidator.equals(
    "specialization matches",
    reviewerDetail.specialization,
    specialization,
  );
  TestValidator.equals("is_active is true", reviewerDetail.is_active, true);
  TestValidator.equals("deleted_at is null", reviewerDetail.deleted_at, null);
  TestValidator.predicate(
    "created_at is ISO format",
    typeof reviewerDetail.created_at === "string" &&
      reviewerDetail.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is ISO format",
    typeof reviewerDetail.updated_at === "string" &&
      reviewerDetail.updated_at.includes("T"),
  );

  // 4. Try with non-existent id
  const badUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching non-existent techReviewerId returns error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.techReviewers.at(
        connection,
        {
          techReviewerId: badUuid,
        },
      );
    },
  );

  // 5. Permissions: reviewer tries to fetch own detail as admin endpoint (forbidden)
  // Switch connection authentication to reviewer
  await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
      name: reviewerName,
      specialization,
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  // login as reviewer (obtains reviewer JWT on connection)
  // Equivalent to join (token is set on connection.headers automatically by SDK)
  await TestValidator.error(
    "reviewer cannot access system admin reviewer detail endpoint",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.techReviewers.at(
        connection,
        {
          techReviewerId: reviewerAuth.id,
        },
      );
    },
  );
  // 6. Permissions: unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot access system admin reviewer detail endpoint",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.techReviewers.at(
        unauthConn,
        {
          techReviewerId: reviewerAuth.id,
        },
      );
    },
  );
  // 7. If soft-delete API is available, we would test deleted_at flows. Since not present, only check deleted_at: null above.
}
