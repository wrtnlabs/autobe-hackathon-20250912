import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import { IPageIAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentTechReviewer";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a paginated, filtered list of technical reviewers from
 * ats_recruitment_techreviewers.
 *
 * This API endpoint enables privileged system administrators to search for,
 * filter, and page through all technical reviewer profiles within the
 * recruitment system. Results support filter by name, email, specialization,
 * and are always ordered (created_at desc). Soft-deleted reviewers are excluded
 * from results. Supports partial string matching on most fields, with safe
 * SQLite/Postgres compatibility (no mode: 'insensitive'). Pagination is
 * enforced and numbers are normalized for typia's integer branding. This
 * operation is strictly read-only and never exposes sensitive internal fields
 * such as password_hash. Only authenticated system admins can invoke this
 * endpoint.
 *
 * @param props - Properties for this operation
 * @param props.systemAdmin - The authenticated system administrator context
 * @param props.body - Search, filtering, and pagination options for reviewer
 *   records
 * @returns Paginated summary list of technical reviewer profiles
 *   (IAtsRecruitmentTechReviewer.ISummary[] with pagination)
 * @throws {Error} If database access fails or excessive query payloads are used
 */
export async function patchatsRecruitmentSystemAdminTechReviewers(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentTechReviewer.IRequest;
}): Promise<IPageIAtsRecruitmentTechReviewer.ISummary> {
  const { body } = props;
  // Normalize page/limit with branded uint32 types for typia, ensuring numbers
  const page =
    typeof body.page === "number" && isFinite(body.page) && body.page > 0
      ? body.page
      : 1;
  const limit =
    typeof body.limit === "number" &&
    isFinite(body.limit) &&
    body.limit > 0 &&
    body.limit <= 10000
      ? body.limit
      : 100; // Enforce sane default and max for admin directory
  const offset = (page - 1) * limit;
  const search = body.search?.trim();
  // Build where clause for Prisma: always exclude soft-deleted
  const where = {
    deleted_at: null,
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { specialization: { contains: search } },
          ],
        }
      : {}),
  };
  // Query total count and paginated records in parallel for efficiency
  const [records, data] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_techreviewers.count({ where }),
    MyGlobal.prisma.ats_recruitment_techreviewers.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        specialization: true,
        is_active: true,
      },
    }),
  ]);
  // Compose the return type with accurate DTO conformance and handling of nulls
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(records),
      pages: records === 0 ? 0 : Math.ceil(records / limit),
    },
    data: data.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      specialization:
        row.specialization === null ? undefined : row.specialization,
      is_active: row.is_active,
    })),
  };
}
